'use client';

import React, { useState } from 'react';
import { DEMO_PRACTICE_QUESTIONS } from '@/data/practiceQuestionsData';
import { QuestionCard } from './QuestionCard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  RotateCcw,
  Trophy,
  Filter,
  Info,
} from 'lucide-react';

export function QuizSession() {
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [quizFinished, setQuizFinished] = useState<boolean>(false);

  const filteredQuestions =
    selectedSubject === 'all'
      ? DEMO_PRACTICE_QUESTIONS
      : DEMO_PRACTICE_QUESTIONS.filter((q) => q.subjectId === selectedSubject);

  const currentQ = filteredQuestions[currentIndex];

  const handleNext = () => {
    if (currentIndex + 1 < filteredQuestions.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setQuizFinished(true);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setQuizFinished(false);
  };

  const progressPercentage =
    filteredQuestions.length > 0
      ? ((currentIndex + 1) / filteredQuestions.length) * 100
      : 0;

  return (
    <div className="space-y-6">
      {/* Demonstration Banner */}
      <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/40 p-4 text-xs text-amber-900 dark:text-amber-200 flex gap-3">
        <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Demonstration Question Bank:</span> These practice questions represent standard undergraduate engineering concepts curated to test algorithmic, systems, and mathematical aptitude. They are sample exercises and not official leaked MNNIT examination questions.
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-semibold uppercase text-slate-500">
            Topic Filter:
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => {
                setSelectedSubject('all');
                handleRestart();
              }}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                selectedSubject === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              All Topics ({DEMO_PRACTICE_QUESTIONS.length})
            </button>
            <button
              onClick={() => {
                setSelectedSubject('cs-13101');
                handleRestart();
              }}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                selectedSubject === 'cs-13101'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Data Structures
            </button>
            <button
              onClick={() => {
                setSelectedSubject('cs-15101');
                handleRestart();
              }}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                selectedSubject === 'cs-15101'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Operating Systems
            </button>
            <button
              onClick={() => {
                setSelectedSubject('ma-11101');
                handleRestart();
              }}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                selectedSubject === 'ma-11101'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Mathematics I
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Question {currentIndex + 1} of {filteredQuestions.length}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Quiz Body */}
      {quizFinished ? (
        <Card className="max-w-xl mx-auto text-center p-8 space-y-4">
          <div className="h-16 w-16 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
            <Trophy className="h-8 w-8" />
          </div>

          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
            Practice Session Completed!
          </h3>

          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
            You reviewed all {filteredQuestions.length} practice questions in this set. Regular revision builds exam confidence for MNNIT Midsems and Endsems.
          </p>

          <div className="pt-4 flex justify-center gap-3">
            <Button variant="primary" onClick={handleRestart}>
              <RotateCcw className="h-4 w-4 mr-2" /> Practice Again
            </Button>
          </div>
        </Card>
      ) : currentQ ? (
        <QuestionCard
          key={currentQ.id}
          question={currentQ}
          questionNumber={currentIndex + 1}
          totalQuestions={filteredQuestions.length}
          onNext={handleNext}
          isLast={currentIndex + 1 === filteredQuestions.length}
        />
      ) : (
        <div className="text-center py-12 text-sm text-slate-500">
          No questions found for the selected topic.
        </div>
      )}
    </div>
  );
}
