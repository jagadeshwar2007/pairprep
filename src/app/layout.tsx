import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Providers } from '@/components/Providers';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'PairPrep | Your Branch. Your Semester. Your Preparation.',
  description:
    'Reviewed previous-year question papers, notes, question banks and lab manuals for B.Tech students at MNNIT Allahabad, organised by department, semester and subject.',
  keywords: [
    'MNNIT',
    'Pairprep',
    'MNNIT Allahabad',
    'B.Tech',
    'PYQ',
    'Notes',
    'Engineering Resources',
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-indigo-500 selection:text-white">
        <Providers>
          <Suspense fallback={<div className="h-16 border-b border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900" />}>
            <Navbar />
          </Suspense>
          <main className="flex-1 flex flex-col">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
