export type Trade = {
  id?: string
  trade_date: string
  symbol: string
  side: 'long' | 'short'
  entry_price: number | null
  exit_price: number | null
  size: number
  fees: number
  pnl: number
  setup: string
  notes: string
}

export const money = (n: number) =>
  (n < 0 ? '-' : '') + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const sum = (a: Trade[]) => a.reduce((s, x) => s + x.pnl, 0)

export function stats(L: Trade[]) {
  const w = L.filter(x => x.pnl > 0), l = L.filter(x => x.pnl < 0)
  const gw = sum(w), gl = -sum(l), net = sum(L)
  return {
    n: L.length, net,
    winRate: L.length ? (w.length / L.length) * 100 : 0,
    profitFactor: gl ? gw / gl : gw ? Infinity : 0,
    expectancy: L.length ? net / L.length : 0,
    avgWin: w.length ? gw / w.length : 0,
    avgLoss: l.length ? gl / l.length : 0,
  }
}

const ALIASES: Record<string, string[]> = {
  date: ['date', 'open time', 'opentime', 'time', 'open date', 'entry time', 'close time'],
  symbol: ['symbol', 'instrument', 'pair', 'item'],
  side: ['side', 'type', 'direction', 'action'],
  entry: ['entry', 'entry price', 'open price', 'price', 'open'],
  exit: ['exit', 'exit price', 'close price', 'close'],
  size: ['size', 'volume', 'lots', 'qty', 'quantity'],
  fees: ['fees', 'commission', 'fee'],
  pnl: ['pnl', 'profit', 'p&l', 'net p&l', 'net profit', 'profit/loss'],
  setup: ['setup', 'tag', 'tags', 'strategy'],
}

const num = (v: unknown) => {
  const n = parseFloat(String(v ?? '').replace(/[\s,$]/g, ''))
  return isNaN(n) ? null : n
}
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function splitLine(l: string, d: string) {
  const out: string[] = []
  let c = '', q = false
  for (const ch of l) {
    if (ch === '"') q = !q
    else if (ch === d && !q) { out.push(c); c = '' }
    else c += ch
  }
  out.push(c)
  return out.map(s => s.trim())
}

export function parseCSV(text: string): Trade[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []
  const d = [',', ';', '\t'].sort((a, b) => lines[0].split(b).length - lines[0].split(a).length)[0]
  const head = splitLine(lines[0], d).map(s => s.toLowerCase())
  const col: Record<string, number> = {}
  for (const k in ALIASES) col[k] = head.findIndex(h => ALIASES[k].includes(h))

  const out: Trade[] = []
  for (const line of lines.slice(1)) {
    const r = splitLine(line, d)
    const v = (k: string) => (col[k] < 0 ? '' : r[col[k]] ?? '')
    let date = v('date').slice(0, 10).replace(/[./]/g, '-')
    if (!/^\d{4}-\d\d-\d\d$/.test(date)) {
      const p = new Date(v('date'))
      if (isNaN(p.getTime())) continue
      date = ymd(p)
    }
    const side = /sell|short/i.test(v('side')) ? 'short' : 'long'
    const entry = num(v('entry')), exit = num(v('exit'))
    const size = num(v('size')) ?? 0, fees = Math.abs(num(v('fees')) ?? 0)
    let pnl = num(v('pnl'))
    if (pnl == null) {
      if (entry == null || exit == null) continue
      pnl = (exit - entry) * size * (side === 'short' ? -1 : 1) - fees
    }
    const symbol = v('symbol').toUpperCase()
    if (!symbol) continue
    out.push({ trade_date: date, symbol, side, entry_price: entry, exit_price: exit, size, fees, pnl: +pnl.toFixed(2), setup: v('setup'), notes: '' })
  }
  return out
}
