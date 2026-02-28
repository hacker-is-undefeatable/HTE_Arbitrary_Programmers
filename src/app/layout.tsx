import type { Metadata } from 'next';
import './globals.css';
import CompanionWidget from './api/companion/CompanionWidget';

export const metadata: Metadata = {
  title: 'ScholorFly',
  description: 'Personalized AI-powered learning platform',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        {children}
        <CompanionWidget />
      </body>
    </html>
  );
}
