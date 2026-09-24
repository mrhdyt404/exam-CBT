'use client';

import React, { useState } from 'react';
import { HelpCircle, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Question } from '../lib/types';

interface QuestionCardProps {
  question: Question;
  totalQuestions: number;
  selectedOption: string;
  isDoubt: boolean;
  onSelectOption: (optionKey: string) => void;
  onToggleDoubt: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  totalQuestions,
  selectedOption,
  isDoubt,
  onSelectOption,
  onToggleDoubt,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}) => {
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');

  const fontClasses = {
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 lg:p-8 shadow-xl backdrop-blur-md flex flex-col justify-between min-h-[600px]">
      {/* Card Header: Number & Font Resizer */}
      <div>
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-sm font-bold">
              Soal No. {question.number}
            </span>
            <span className="text-xs text-slate-400">
              dari {totalQuestions} Soal
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 mr-1">Ukuran Teks:</span>
            <button
              onClick={() => setFontSize('sm')}
              className={`px-2 py-1 text-xs font-bold rounded ${
                fontSize === 'sm' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              A-
            </button>
            <button
              onClick={() => setFontSize('base')}
              className={`px-2.5 py-1 text-xs font-bold rounded ${
                fontSize === 'base' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              A
            </button>
            <button
              onClick={() => setFontSize('lg')}
              className={`px-3 py-1 text-xs font-bold rounded ${
                fontSize === 'lg' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              A+
            </button>
          </div>
        </div>

        {/* Question Content */}
        <div
          className={`question-content text-slate-200 leading-relaxed font-normal mb-8 ${fontClasses[fontSize]}`}
          dangerouslySetInnerHTML={{ __html: question.question_text }}
        />

        {/* Options List */}
        <div className="space-y-3">
          {question.options.map((opt) => {
            const isSelected = selectedOption === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => onSelectOption(opt.key)}
                className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-4 ${
                  isSelected
                    ? 'bg-blue-900/40 border-blue-500 text-white ring-2 ring-blue-500/30 shadow-lg'
                    : 'bg-slate-800/50 hover:bg-slate-800 border-slate-700/60 text-slate-300 hover:border-slate-600'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg font-bold flex items-center justify-center shrink-0 text-sm transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {isSelected ? <Check className="w-4 h-4" /> : opt.key}
                </div>
                <div className={`pt-0.5 leading-normal ${fontClasses[fontSize]}`}>
                  {opt.text}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Card Footer: Navigation & Doubt Toggle */}
      <div className="border-t border-slate-800 pt-6 mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <button
          onClick={onToggleDoubt}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
            isDoubt
              ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md ring-2 ring-amber-500/20'
              : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-amber-400 hover:border-amber-500/50'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>{isDoubt ? 'Tandai Ragu-Ragu (Aktif)' : 'Ragu-Ragu'}</span>
        </button>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={onPrev}
            disabled={!hasPrev}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-white text-sm font-bold border border-slate-700 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Sebelumnya</span>
          </button>
          <button
            onClick={onNext}
            disabled={!hasNext}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-900/30 transition-all"
          >
            <span>Selanjutnya</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
