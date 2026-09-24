import './globals.css'

export const metadata = { title: 'EUMTrade – Trading Journal' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
