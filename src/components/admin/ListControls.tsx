import React from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { queryString } from '@/lib/admin/query';

type Params = Record<string, string | number | undefined | null>;

/** Plain GET form: works without JavaScript and keeps the filters in the URL. */
export function SearchBox({
  action,
  value,
  placeholder,
  hidden = {},
}: {
  action: string;
  value: string;
  placeholder: string;
  hidden?: Params;
}) {
  return (
    <form action={action} method="get" role="search" className="relative w-full max-w-sm">
      {Object.entries(hidden).map(([k, v]) =>
        v === undefined || v === null || v === '' ? null : <input key={k} type="hidden" name={k} value={String(v)} />,
      )}
      <label htmlFor="admin-search" className="sr-only">{placeholder}</label>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        id="admin-search"
        name="q"
        defaultValue={value}
        placeholder={placeholder}
        maxLength={60}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-900"
      />
    </form>
  );
}

export function FilterTabs({
  basePath,
  param,
  current,
  options,
  keep = {},
}: {
  basePath: string;
  param: string;
  current: string;
  options: { id: string; label: string }[];
  keep?: Params;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Filter by ${param}`}>
      {options.map((o) => (
        <Link
          key={o.id}
          href={`${basePath}${queryString({ ...keep, [param]: o.id })}`}
          aria-current={current === o.id ? 'true' : undefined}
          className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
            current === o.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}

export function Pagination({
  basePath,
  page,
  total,
  size,
  params,
}: {
  basePath: string;
  page: number;
  total: number;
  size: number;
  params: Params;
}) {
  const pages = Math.max(1, Math.ceil(total / size));
  if (pages <= 1) {
    return <p className="text-xs text-slate-400">{total} {total === 1 ? 'result' : 'results'}</p>;
  }
  const href = (p: number) => `${basePath}${queryString({ ...params, page: p > 1 ? p : undefined })}`;
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between text-sm">
      {page > 1 ? <Link href={href(page - 1)} className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">← Previous</Link> : <span />}
      <span className="text-xs text-slate-500">Page {page} of {pages} • {total} results</span>
      {page < pages ? <Link href={href(page + 1)} className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">Next →</Link> : <span />}
    </nav>
  );
}
