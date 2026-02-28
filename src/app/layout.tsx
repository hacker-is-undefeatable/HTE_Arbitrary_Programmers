import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DualPath AI',
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
      <body className="bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
