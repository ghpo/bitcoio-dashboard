import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'bitcoio · Trading Dashboard',
  description: 'DeFi trading dashboard with live Bitflow prices, wallet management, and P&L tracking',
  icons: {
    icon: '/logo.jpg',
    apple: '/logo.jpg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body
        className="antialiased min-h-screen bg-[#060a08] overscroll-none"
        style={{ overscrollBehavior: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'rgba(20,22,20,0.95)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#ededed',
              fontSize: '13px',
              borderRadius: '12px',
              backdropFilter: 'blur(12px)',
            },
          }}
        />
      </body>
    </html>
  );
}
