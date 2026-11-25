import type { Metadata, Viewport } from 'next'
import './globals.css'
import SmoothScrollProvider from '@/components/motion/SmoothScrollProvider'
import ScrollProgressBar from '@/components/motion/ScrollProgressBar'
import ChatWithKamna from '@/components/ChatWithKamna'

export const metadata: Metadata = {
  title: 'Kamna Bhardwaj | Personal Branding & Content Creation',
  description:
    'Kamna Bhardwaj is a personal brand strategist, content creator, storyteller and ghostwriter helping founders, coaches and creators build brands people trust.',
  openGraph: {
    title: 'Kamna Bhardwaj | Personal Branding & Content Creation',
    description: 'Building my brand while teaching you to build yours.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#0c0b0a',
  width: 'device-width',
  initialScale: 1,
}

const themeInitScript = `(function(){try{var t=localStorage.getItem('kb-theme');var d=t==='light'?'light':'dark';var r=document.documentElement;r.dataset.theme=d;r.style.colorScheme=d;}catch(e){document.documentElement.dataset.theme='dark';}})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Applies the saved theme before paint so light mode never flashes dark. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ScrollProgressBar />
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
        <ChatWithKamna />
      </body>
    </html>
  )
}
