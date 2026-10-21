import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
        <li>
          <Link href="/" className="inline-block rounded px-1 py-2 hover:text-indigo-700 hover:underline">
            Home
          </Link>
        </li>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="flex items-center gap-1 min-w-0">
              <ChevronRight className="h-3 w-3 shrink-0 text-slate-300" aria-hidden="true" />
              {isLast || !item.href ? (
                <span aria-current={isLast ? 'page' : undefined} className="truncate py-2 font-medium text-slate-800 max-w-[16rem]">
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className="inline-block rounded px-1 py-2 hover:text-indigo-700 hover:underline truncate max-w-[10rem] sm:max-w-none">
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
