import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Pairprep | Your Branch. Your Semester. Your Preparation.',
  description:
    'The centralized academic platform for B.Tech students across all 4 years and branches at MNNIT Allahabad. Access notes, PYQs, exam papers, syllabus, and student productivity tools.',
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
        <Suspense fallback={<div className="h-16 border-b border-slate-200/80 bg-white" />}>
          <Navbar />
        </Suspense>
        <main className="flex-1 flex flex-col">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
