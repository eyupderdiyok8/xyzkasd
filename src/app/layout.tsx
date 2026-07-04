import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import PwaProvider from '@/components/PwaProvider';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'suaritmaservisyazilimi.com.tr',
  description: 'Su arıtma servis firmaları için servis, filtre, müşteri ve tahsilat takip yazılımı',
  appleWebApp: { capable: true, title: 'suaritmaservisyazilimi.com.tr' },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#1e40af',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1e40af" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="suaritmaservisyazilimi.com.tr" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className={inter.className}>
        <PwaProvider>{children}</PwaProvider>
      </body>
    </html>
  );
}
