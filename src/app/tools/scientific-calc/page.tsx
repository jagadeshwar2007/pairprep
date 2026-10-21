import React from 'react';
import { Breadcrumbs } from '@/components/academic/Breadcrumbs';
import { ScientificCalculator } from '@/components/tools/ScientificCalculator';
import { Calculator } from 'lucide-react';

export const metadata = {
  title: 'Engineering Scientific Calculator | Pairprep MNNIT',
  description:
    'Online scientific calculator with trigonometry, logarithms, roots, and powers for MNNIT tutorial problem sheets.',
};

export default function ScientificCalcPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <Breadcrumbs
        items={[
          { label: 'Academic Tools', href: '/tools' },
          { label: 'Scientific Calculator' },
        ]}
      />

      <div className="text-center space-y-2 max-w-xl mx-auto">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200/50">
          <Calculator className="h-3.5 w-3.5" />
          Engineering Computations
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Scientific Calculator
        </h1>
        <p className="text-sm text-slate-500">
          Quickly evaluate trigonometric functions, logarithms, powers, and constants directly in your browser.
        </p>
      </div>

      <ScientificCalculator />
    </div>
  );
}
