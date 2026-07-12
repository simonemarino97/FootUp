import './globals.css'
import { Providers } from './providers'

export const metadata = {
  title: 'FOOTUP — The social network for amateur football',
  description: 'Create your 5-a-side or 7-a-side team, challenge rivals, climb 10 divisions with a real ELO ranking, and become the best amateur football team.',
  keywords: ['football', 'soccer', 'calcio', '5-a-side', '7-a-side', 'amateur football', 'ELO ranking', 'tournaments'],
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png', sizes: '64x64' },
      { url: '/favicon-32.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: '/logo-256.png',
  },
  openGraph: {
    title: 'FOOTUP — The social network for amateur football',
    description: 'Team identity. ELO ranking. 10 divisions. Real rivalries.',
    type: 'website',
    images: ['/logo-256.png'],
  },
  twitter: { card: 'summary', title: 'FOOTUP', description: 'The social network for amateur football', images: ['/logo-256.png'] },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: 'dark' }}>
      <head>
        <script dangerouslySetInnerHTML={{__html:'window.addEventListener("error",function(e){if(e.error instanceof DOMException&&e.error.name==="DataCloneError"&&e.message&&e.message.includes("PerformanceServerTiming")){e.stopImmediatePropagation();e.preventDefault()}},true);'}} />
        <script dangerouslySetInnerHTML={{__html:`
(function(){
  function strip(){
    try{
      var sels=["#made-with-emergent","#emergent-badge","[data-emergent-badge]","a[href*=\\"emergent.sh\\"]","a[href*=\\"emergent.ai\\"]","a[href*=\\"emergent.com\\"]"];
      sels.forEach(function(s){document.querySelectorAll(s).forEach(function(el){try{el.remove()}catch(e){}})});
    }catch(e){}
  }
  if(document.readyState!=='loading')strip(); else document.addEventListener('DOMContentLoaded',strip);
  var mo=new MutationObserver(strip);
  if(document.body)mo.observe(document.body,{childList:true,subtree:true});
  else document.addEventListener('DOMContentLoaded',function(){mo.observe(document.body,{childList:true,subtree:true})});
})();`}} />
      </head>
      <body className="bg-slate-950 text-slate-100 antialiased selection:bg-emerald-500/30">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
