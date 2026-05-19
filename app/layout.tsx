import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'DevMarket — sell your dev tools in India',
  description: 'The marketplace for Indian developers. Sell scripts, templates, tools, and boilerplates. Get paid via UPI.',
  openGraph: {
    title: 'DevMarket — sell your dev tools in India',
    description: 'Templates, scripts, boilerplates, CLI tools. Upload once, sell forever. Get paid via UPI.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
