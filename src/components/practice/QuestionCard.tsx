'use client';

import React, { useState } from 'react';
import { PracticeQuestion } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronRight,
  BookOpen,
} from 'lucide-react';

interface QuestionCardProps {
  question: PracticeQuestion;
  questionNumber: number;
  totalQuestions: number;
  onNext?: () => void;
  isLast?: boolean;
}

export function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  onNext,
  isLast = false,
}: QuestionCardProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  const handleSelect = (index: number) => {
    if (isSubmitted) return;
    setSelectedOption(index);
  };

  const handleSubmit = () => {
    if (selectedOption === null) return;
    setIsSubmitted(true);
  };

  const handleNextQuestion = () => {
    setSelectedOption(null);
    setIsSubmitted(false);
    if (onNext) onNext();
  };

  const isCorrect = selectedOption === question.correctAnswer;

  const difficultyVariant = {
    Easy: 'success' as const,
    Medium: 'warning' as const,
    Hard: 'danger' as const,
  }[question.difficulty];

  return (
    <Card className="max-w-3xl mx-auto p-6 sm:p-8 space-y-6 border-slate-200 dark:border-slate-800 shadow-sm">
      {/* Question Header & Meta */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50">
            Question {questionNumber} of {totalQuestions}
          </span>
          <Badge variant={difficultyVariant}>{question.difficulty}</Badge>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <BookOpen className="h-3.5 w-3.5 text-indigo-500" />
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {question.subjectName}
          </span>
          <span>•</span>
          <span>{question.topic}</span>
        </div>
      </div>

      {/* Question Statement */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 leading-relaxed">
          {question.question}
        </h3>

        {question.codeSnippet && (
          <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto border border-slate-800">
            <code>{question.codeSnippet}</code>
          </pre>
        )}
      </div>

      {/* Options List */}
      <div className="space-y-3">
        {question.options.map((option, index) => {
          const isSelected = selectedOption === index;
          const isTheCorrectOne = question.correctAnswer === index;

          let optionStyle =
            'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700';

          if (isSelected && !isSubmitted) {
            optionStyle =
              'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 shadow-xs ring-1 ring-indigo-600';
          } else if (isSubmitted) {
            if (isTheCorrectOne) {
              optionStyle =
                'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500';
            } else if (isSelected && !isTheCorrectOne) {
              optionStyle =
                'border-rose-500 bg-rose-50/80 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 ring-1 ring-rose-500';
            } else {
              optionStyle = 'opacity-40 border-slate-200 dark:border-slate-800';
            }
          }

          return (
            <button
              key={index}
              onClick={() => handleSelect(index)}
              disabled={isSubmitted}
              className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${optionStyle}`}
            >
              <div
                className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                  isSelected && !isSubmitted
                    ? 'bg-indigo-600 text-white'
                    : isSubmitted && isTheCorrectOne
                    ? 'bg-emerald-600 text-white'
                    : isSubmitted && isSelected && !isTheCorrectOne
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {String.fromCharCode(65 + index)}
              </div>

              <span className="flex-1 text-sm font-medium leading-relaxed">
                {option}
              </span>

              {isSubmitted && isTheCorrectOne && (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              )}
              {isSubmitted && isSelected && !isTheCorrectOne && (
                <XCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>

      {/* Explanation Box when submitted */}
      {isSubmitted && (
        <div
          className={`p-4 rounded-xl border text-sm space-y-2 animate-fadeIn ${
            isCorrect
              ? 'bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200'
              : 'bg-amber-50/70 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/40 text-amber-900 dark:text-amber-200'
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-sm">
            {isCorrect ? (
              <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" /> Correct Answer!
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                <HelpCircle className="h-4 w-4" /> Solution Breakdown
              </span>
            )}
          </div>
          <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
            {question.explanation}
          </p>
          {question.yearReference && (
            <div className="text-[11px] text-slate-400 pt-1">
              Source reference: {question.yearReference}
            </div>
          )}
        </div>
      )}

      {/* Footer Action Buttons */}
      <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
        <span className="text-xs text-slate-400">
          {selectedOption === null
            ? 'Select an option to check answer'
            : !isSubmitted
            ? 'Option selected. Submit to check.'
            : 'Review explanation above'}
        </span>

        {!isSubmitted ? (
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={selectedOption === null}
          >
            Check Answer
          </Button>
        ) : (
          <Button variant="primary" onClick={handleNextQuestion}>
            {isLast ? 'Complete Practice' : 'Next Question'}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </Card>
  );
}
