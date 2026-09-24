'use client'
import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { Trade, money, parseCSV, stats } from '../lib/stats'

export default function Home() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true) })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])
  if (!ready) return null
  return session ? <Journal /> : <Auth />
}

function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [msg, setMsg] = useState('')
  async function go(e: React.FormEvent) {
    e.preventDefault()
    const { error } = mode === 'in'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })
    setMsg(error ? error.message : mode === 'up' ? 'Check your email to confirm, then sign in.' : '')
  }
  return (
    <main className="auth">
      <h1>EUM<span>Trade</span></h1>
      <p className="msg">Free trading journal.</p>
      <form onSubmit={go}>
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password (6+ characters)" value={password} onChange={e => setPassword(e.target.value)} minLength={6} required />
        <button>{mode === 'in' ? 'Sign in' : 'Create account'}</button>{' '}
        <button type="button" className="link" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
          {mode === 'in' ? 'Create an account' : 'I already have an account'}
        </button>
      </form>
      <p className="msg">{msg}</p>
    </main>
  )
}

function Journal() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [msg, setMsg] = useState('')
  const today = new Date().toISOString().slice(0, 10)

  async function load() {
    const { data, error } = await supabase.from('trades').select('*').order('trade_date')
    if (error) setMsg(error.message); else setTrades(data as Trade[])
  }
  useEffect(() => { load() }, [])

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const f = new FormData(form)
    const g = (k: string) => String(f.get(k) ?? '')
    const entry = parseFloat(g('entry')), exit = parseFloat(g('exit')), size = parseFloat(g('size')) || 0, fees = parseFloat(g('fees')) || 0
    const side = g('side') as Trade['side']
    let pnl = parseFloat(g('pnl'))
    if (isNaN(pnl)) {
      if (isNaN(entry) || isNaN(exit)) return setMsg('Enter a P&L, or both entry and exit prices.')
      pnl = (exit - entry) * size * (side === 'short' ? -1 : 1) - fees
    }
    const { error } = await supabase.from('trades').insert({
      trade_date: g('date'), symbol: g('symbol').toUpperCase(), side,
      entry_price: isNaN(entry) ? null : entry, exit_price: isNaN(exit) ? null : exit,
      size, fees, pnl: +pnl.toFixed(2), setup: g('setup'), notes: g('notes'),
    })
    if (error) return setMsg(error.message)
    form.reset(); setMsg('Trade added.'); load()
  }

  async function importFile(file: File) {
    const rows = parseCSV(await file.text())
    if (!rows.length) return setMsg('No trades found. The first row needs column names like date, symbol, profit.')
    const { error } = await supabase.from('trades').insert(rows)
    setMsg(error ? error.message : `Imported ${rows.length} trades.`); load()
  }

  async function remove(id: string) {
    await supabase.from('trades').delete().eq('id', id); load()
  }

  const s = stats(trades)
  let c = 0
  const pts = [0, ...trades.map(t => (c += t.pnl))]
  const mn = Math.min(...pts), mx = Math.max(...pts), r = mx - mn || 1
  const line = pts.map((v, i) => `${10 + (i * 620) / Math.max(pts.length - 1, 1)},${210 - ((v - mn) / r) * 200}`).join(' ')

  return (
    <main>
      <div className="top">
        <h1>EUM<span>Trade</span></h1>
        <button className="link" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </div>

      <div className="stats">
        {[
          ['Net P&L', money(s.net), s.net > 0 ? 'win' : s.net < 0 ? 'loss' : ''],
          ['Win rate', s.winRate.toFixed(1) + '%', ''],
          ['Profit factor', isFinite(s.profitFactor) ? s.profitFactor.toFixed(2) : '∞', ''],
          ['Expectancy', money(s.expectancy), s.expectancy > 0 ? 'win' : s.expectancy < 0 ? 'loss' : ''],
          ['Avg win / loss', `${money(s.avgWin)} / ${money(-s.avgLoss)}`, ''],
          ['Trades', String(s.n), ''],
        ].map(([a, b, k]) => <div className="stat" key={a}><span>{a}</span><b className={k}>{b}</b></div>)}
      </div>

      {trades.length > 0 && (
        <div className="sec"><svg viewBox="0 0 640 220" role="img" aria-label="Equity curve"><polyline className="line" points={line} /></svg></div>
      )}

      <form className="sec" onSubmit={add}>
        <div className="grid">
          <label>Date<input name="date" type="date" defaultValue={today} required /></label>
          <label>Symbol<input name="symbol" placeholder="EURUSD" required /></label>
          <label>Side<select name="side"><option value="long">Long</option><option value="short">Short</option></select></label>
          <label>Size<input name="size" type="number" step="any" /></label>
          <label>Entry<input name="entry" type="number" step="any" /></label>
          <label>Exit<input name="exit" type="number" step="any" /></label>
          <label>Fees<input name="fees" type="number" step="any" /></label>
          <label>P&L<input name="pnl" type="number" step="any" /></label>
          <label>Setup<input name="setup" placeholder="Order block" /></label>
        </div>
        <p><label>Notes<textarea name="notes" rows={2} /></label></p>
        <button>Add trade</button>
        <label style={{ marginLeft: 16 }}>Import CSV <input type="file" accept=".csv,.tsv,.txt" style={{ width: 'auto' }} onChange={e => e.target.files?.[0] && importFile(e.target.files[0])} /></label>
        <span className="msg" role="status"> {msg}</span>
      </form>

      <div className="sec wrap">
        <table>
          <thead><tr><th>Date</th><th>Symbol</th><th>Side</th><th>Size</th><th>P&L</th><th>Setup</th><th>Notes</th><th></th></tr></thead>
          <tbody>
            {[...trades].reverse().map(t => (
              <tr key={t.id}>
                <td>{t.trade_date}</td><td>{t.symbol}</td><td>{t.side}</td><td>{t.size}</td>
                <td className={t.pnl > 0 ? 'win' : t.pnl < 0 ? 'loss' : ''}>{money(t.pnl)}</td>
                <td>{t.setup}</td><td>{t.notes}</td>
                <td><button className="link" onClick={() => remove(t.id!)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
