
'use client'

import './globals.css';
import { AppShell } from '@/components/app-shell';
import { Toaster } from "@/components/ui/toaster"
import { usePathname } from 'next/navigation';
import { UserProvider } from '@/hooks/use-user';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  // The login page and the entire /site/... route group are public.
  const isPublicPage = pathname === '/' || pathname.startsWith('/site') || pathname.startsWith('/register') || pathname.startsWith('/listings');

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>DealFlow</title>
        <meta name="description" content="A professional real estate deal management app." />
        <link rel="icon" href="/logo.png" sizes="any" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossOrigin=""/>
      </head>
      <body className="font-body antialiased">
        <UserProvider>
            <div className="flex min-h-screen flex-col">
                {isPublicPage ? (
                  children
                ) : (
                  <AppShell>
                      {children}
                  </AppShell>
                )}
                <Toaster />
            </div>
        </UserProvider>
      </body>
    </html>
  );
}
