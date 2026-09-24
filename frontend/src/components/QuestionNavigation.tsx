'use client';

import React from 'react';
import { LayoutGrid } from 'lucide-react';
import { Question, AnswerItem } from '../lib/types';

interface QuestionNavigationProps {
  questions: Question[];
  answers: Record<string, AnswerItem>;
  currentIndex: number;
  onSelectIndex: (index: number) => void;
}

export const QuestionNavigation: React.FC<QuestionNavigationProps> = ({
  questions,
  answers,
  currentIndex,
  onSelectIndex,
}) => {
  // Count stats
  let answeredCount = 0;
  let doubtCount = 0;
  let unansweredCount = 0;

  questions.forEach((q) => {
    const ans = answers[q.id];
    if (ans && ans.selected_option) {
      if (ans.is_doubt) {
        doubtCount++;
      } else {
        answeredCount++;
      }
    } else {
      unansweredCount++;
    }
  });

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center gap-2 font-bold text-white mb-4 border-b border-slate-800 pb-3">
        <LayoutGrid className="w-5 h-5 text-sky-400" />
        <span>Daftar Nomor Soal</span>
      </div>

      {/* Legend & Stats */}
      <div className="grid grid-cols-3 gap-2 text-xs mb-6 font-semibold">
        <div className="flex items-center gap-1.5 p-2 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-emerald-300">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
          <span className="truncate">Dijawab: {answeredCount}</span>
        </div>
        <div className="flex items-center gap-1.5 p-2 rounded-lg bg-amber-950/60 border border-amber-800/80 text-amber-300">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
          <span className="truncate">Ragu: {doubtCount}</span>
        </div>
        <div className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-600 shrink-0" />
          <span className="truncate">Belum: {unansweredCount}</span>
        </div>
      </div>

      {/* Grid Numbers */}
      <div className="grid grid-cols-5 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
        {questions.map((q, idx) => {
          const ans = answers[q.id];
          const hasAnswer = ans && ans.selected_option;
          const isDoubt = ans && ans.is_doubt;
          const isCurrent = currentIndex === idx;

          let btnClass = 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'; // unanswered

          if (isDoubt) {
            btnClass = 'bg-amber-500 text-slate-950 font-black border-amber-400 shadow-md shadow-amber-950/50';
          } else if (hasAnswer) {
            btnClass = 'bg-emerald-600 text-white font-bold border-emerald-500 shadow-md shadow-emerald-950/50';
          }

          if (isCurrent) {
            btnClass += ' ring-2 ring-sky-400 ring-offset-2 ring-offset-slate-900 scale-105';
          }

          return (
            <button
              key={q.id}
              onClick={() => onSelectIndex(idx)}
              className={`h-11 rounded-xl text-sm font-bold flex flex-col items-center justify-center border transition-all relative ${btnClass}`}
            >
              <span>{idx + 1}</span>
              {hasAnswer && !isDoubt && (
                <span className="text-[10px] font-mono leading-none opacity-90">
                  {ans.selected_option}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
