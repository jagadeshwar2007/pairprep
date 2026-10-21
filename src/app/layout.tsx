import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Geist, Geist_Mono, Newsreader } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { ToastProvider } from '@/components/ui/Toast';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const display = Newsreader({
  variable: '--font-newsreader',
  subsets: ['latin'],
  style: ['normal', 'italic'],
});

export const metadata: Metadata = {
  title: {
    default: 'PairPrep | Study resources for MNNIT B.Tech',
    template: '%s | PairPrep',
  },
  description:
    'Find notes, previous-year papers and study tools organised by branch, semester and subject for B.Tech students at MNNIT Allahabad.',
  keywords: [
    'MNNIT',
    'PairPrep',
    'MNNIT Allahabad',
    'B.Tech',
    'PYQ',
    'Notes',
    'GPA Calculator',
    'Attendance Calculator',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink selection:bg-indigo-200">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg"
        >
          Skip to content
        </a>
        <ToastProvider>
          <Suspense fallback={<div className="h-16 border-b border-slate-200 bg-white" />}>
            <Navbar />
          </Suspense>
          <main id="main" className="flex-1 flex flex-col">
            {children}
          </main>
          <Footer />
        </ToastProvider>
      </body>
    </html>
  );
}
