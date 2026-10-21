'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { History } from 'lucide-react';
import { evaluateExpression, formatResult } from '@/lib/expression';

export function ScientificCalculator() {
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [isDegree, setIsDegree] = useState(true);

  const appendToExpr = (val: string) => {
    if (display === 'Error' || (display === '0' && !isNaN(Number(val)))) {
      setDisplay(val);
      setExpression(val);
    } else {
      setDisplay((prev) => prev + val);
      setExpression((prev) => prev + val);
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setExpression('');
  };

  const handleDelete = () => {
    if (display.length <= 1) {
      setDisplay('0');
      setExpression('');
    } else {
      setDisplay((prev) => prev.slice(0, -1));
      setExpression((prev) => prev.slice(0, -1));
    }
  };

  const safeEvaluate = () => {
    if (!expression.trim()) return;
    try {
      const formattedResult = formatResult(evaluateExpression(expression, { degrees: isDegree }));
      if (formattedResult === 'Error') throw new Error('Not a finite number');

      setHistory((prev) => [`${expression} = ${formattedResult}`, ...prev.slice(0, 5)]);
      setDisplay(formattedResult);
      setExpression(formattedResult);
    } catch {
      setDisplay('Error');
      setExpression('');
    }
  };

  const buttons = [
    { label: isDegree ? 'DEG' : 'RAD', action: () => setIsDegree(!isDegree), variant: 'subtle' },
    { label: 'sin', action: () => appendToExpr('sin('), variant: 'subtle' },
    { label: 'cos', action: () => appendToExpr('cos('), variant: 'subtle' },
    { label: 'tan', action: () => appendToExpr('tan('), variant: 'subtle' },
    { label: 'C', action: handleClear, variant: 'danger' },

    { label: 'ln', action: () => appendToExpr('ln('), variant: 'subtle' },
    { label: 'log', action: () => appendToExpr('log('), variant: 'subtle' },
    { label: '√', action: () => appendToExpr('sqrt('), variant: 'subtle' },
    { label: '^', action: () => appendToExpr('^'), variant: 'subtle' },
    { label: '⌫', action: handleDelete, variant: 'outline' },

    { label: 'π', action: () => appendToExpr('π'), variant: 'subtle' },
    { label: '(', action: () => appendToExpr('('), variant: 'outline' },
    { label: ')', action: () => appendToExpr(')'), variant: 'outline' },
    { label: '%', action: () => appendToExpr('/100'), variant: 'outline' },
    { label: '÷', action: () => appendToExpr('÷'), variant: 'primary' },

    { label: '7', action: () => appendToExpr('7'), variant: 'outline' },
    { label: '8', action: () => appendToExpr('8'), variant: 'outline' },
    { label: '9', action: () => appendToExpr('9'), variant: 'outline' },
    { label: 'e', action: () => appendToExpr('e'), variant: 'subtle' },
    { label: '×', action: () => appendToExpr('×'), variant: 'primary' },

    { label: '4', action: () => appendToExpr('4'), variant: 'outline' },
    { label: '5', action: () => appendToExpr('5'), variant: 'outline' },
    { label: '6', action: () => appendToExpr('6'), variant: 'outline' },
    { label: '+/-', action: () => appendToExpr('*-1'), variant: 'subtle' },
    { label: '-', action: () => appendToExpr('-'), variant: 'primary' },

    { label: '1', action: () => appendToExpr('1'), variant: 'outline' },
    { label: '2', action: () => appendToExpr('2'), variant: 'outline' },
    { label: '3', action: () => appendToExpr('3'), variant: 'outline' },
    { label: '00', action: () => appendToExpr('00'), variant: 'outline' },
    { label: '+', action: () => appendToExpr('+'), variant: 'primary' },

    { label: '0', action: () => appendToExpr('0'), variant: 'outline' },
    { label: '.', action: () => appendToExpr('.'), variant: 'outline' },
    { label: '=', action: safeEvaluate, variant: 'secondary', span: 'col-span-3' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Card className="border-slate-300 dark:border-slate-800 shadow-lg p-5">
        {/* Screen */}
        <div className="rounded-xl bg-slate-900 text-white p-4 mb-5 text-right font-mono space-y-1">
          <div className="text-xs text-slate-400 min-h-[1.25rem] truncate">
            {expression || '0'}
          </div>
          <div className="text-3xl sm:text-4xl font-bold tracking-tight text-emerald-400 truncate">
            {display}
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 border-t border-slate-800">
            <span className="text-slate-400 font-semibold">{isDegree ? 'DEG' : 'RAD'} MODE</span>
            <span>Scientific calculator</span>
          </div>
        </div>

        {/* Buttons Grid */}
        <div className="grid grid-cols-5 gap-2 sm:gap-2.5">
          {buttons.map((btn, idx) => (
            <button
              key={idx}
              onClick={btn.action}
              className={`h-11 sm:h-12 rounded-xl text-sm font-semibold transition-all active:scale-95 flex items-center justify-center cursor-pointer ${
                btn.span || 'col-span-1'
              } ${
                btn.variant === 'primary'
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                  : btn.variant === 'secondary'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg'
                  : btn.variant === 'danger'
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 hover:bg-rose-100'
                  : btn.variant === 'subtle'
                  ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  : 'bg-white hover:bg-slate-50 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </Card>

      {/* History */}
      {history.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500 mb-2">
            <History className="h-3.5 w-3.5" />
            Recent Calculations
          </div>
          <div className="space-y-1 font-mono text-xs text-slate-600 dark:text-slate-300">
            {history.map((item, idx) => (
              <div key={idx} className="p-1.5 rounded bg-slate-50 dark:bg-slate-800/40 truncate">
                {item}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
