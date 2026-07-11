import './globals.css'
import { Providers } from './providers'

export const metadata = {
  title: 'FOOTUP — The social network for amateur football',
  description: 'Create your 5-a-side or 7-a-side team, challenge rivals, climb 10 divisions with a real ELO ranking, and become the best amateur football team.',
  keywords: ['football', 'soccer', 'calcio', '5-a-side', '7-a-side', 'amateur football', 'ELO ranking', 'tournaments'],
  openGraph: {
    title: 'FOOTUP — The social network for amateur football',
    description: 'Team identity. ELO ranking. 10 divisions. Real rivalries.',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: 'FOOTUP', description: 'The social network for amateur football' },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: 'dark' }}>
      <head>
        <script dangerouslySetInnerHTML={{__html:'window.addEventListener("error",function(e){if(e.error instanceof DOMException&&e.error.name==="DataCloneError"&&e.message&&e.message.includes("PerformanceServerTiming")){e.stopImmediatePropagation();e.preventDefault()}},true);'}} />
      </head>
      <body className="bg-slate-950 text-slate-100 antialiased selection:bg-emerald-500/30">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
