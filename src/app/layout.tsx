import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { CustomCursor } from '@/components/shared/CustomCursor'
import { FloatingParticles } from '@/components/shared/FloatingParticles'

export const metadata: Metadata = {
  title: 'Memoria — Your Memories, Unfiltered',
  description: 'A private, beautiful space for your friend group\'s photos and videos. Full quality, always.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.png',
    apple: '/apple-icon.png',
  },
  openGraph: {
    title: 'Memoria',
    description: 'Your memories, unfiltered.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#6558f5',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-dark-base text-white antialiased">
        <CustomCursor />
        <FloatingParticles />
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            className: 'toast-memoria',
            duration: 3000,
            style: {
              background: '#16161f',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'white',
              borderRadius: '16px',
              fontFamily: 'Space Grotesk, sans-serif',
            },
          }}
        />
      </body>
    </html>
  )
}
