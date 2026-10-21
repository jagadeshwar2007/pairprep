'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Menu, X, GraduationCap } from 'lucide-react';
import { Button, buttonClass } from '@/components/ui/Button';
import { SearchModal } from './SearchModal';
import { AuthModal } from './AuthModal';
import { cn } from '@/lib/utils';

export const NAV_LINKS = [
  { href: '/resources', label: 'Library' },
  { href: '/tools', label: 'Study tools' },
  { href: '/calendar', label: 'Calendar' },
  { href: '/practice', label: 'Practice' },
  { href: '/submit', label: 'Contribute' },
];

export function Brand({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn('flex min-h-10 items-center gap-2.5', className)} aria-label="PairPrep home">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-700 text-white">
        <GraduationCap className="h-[18px] w-[18px]" />
      </span>
      <span className="font-display text-xl font-semibold tracking-tight text-slate-900">PairPrep</span>
    </Link>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  // The mobile menu is "open" only for the page it was opened on, so navigating closes it.
  const mobileMenuOpen = menuFor === pathname;

  // "/" focuses search, unless the user is typing somewhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return;
      e.preventDefault();
      setSearchOpen(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Brand />

          <nav className="hidden md:flex items-center gap-1" aria-label="Main">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? 'page' : undefined}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive(link.href)
                    ? 'bg-indigo-50 text-indigo-800'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-500 transition-colors hover:border-slate-400 hover:text-slate-700 cursor-pointer"
              aria-label="Search the library"
            >
              <Search className="h-4 w-4" />
              <span className="hidden lg:inline">Search</span>
              <kbd className="hidden lg:inline rounded border border-slate-200 bg-slate-50 px-1.5 font-mono text-[10px] text-slate-500">
                /
              </kbd>
            </button>
            <Button variant="outline" size="sm" className="h-9" onClick={() => setAuthOpen(true)}>
              Sign in
            </Button>
          </div>

          <div className="flex md:hidden items-center gap-1">
            <button
              onClick={() => setSearchOpen(true)}
              className="rounded-lg p-2.5 text-slate-600 hover:bg-slate-100 cursor-pointer"
              aria-label="Search the library"
            >
              <Search className="h-5 w-5" />
            </button>
            <button
              onClick={() => setMenuFor(mobileMenuOpen ? null : pathname)}
              className="rounded-lg p-2.5 text-slate-700 hover:bg-slate-100 cursor-pointer"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav id="mobile-nav" aria-label="Mobile" className="md:hidden border-t border-slate-200 bg-white px-4 pb-5 pt-2">
            <ul className="space-y-0.5">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={isActive(link.href) ? 'page' : undefined}
                    className={cn(
                      'flex h-11 items-center rounded-lg px-3 text-[15px] font-medium',
                      isActive(link.href) ? 'bg-indigo-50 text-indigo-800' : 'text-slate-700 hover:bg-slate-100'
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <button
              onClick={() => {
                setMenuFor(null);
                setAuthOpen(true);
              }}
              className={buttonClass('outline', 'md', 'mt-3 w-full')}
            >
              Sign in
            </button>
          </nav>
        )}
      </header>

      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
