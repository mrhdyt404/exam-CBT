'use client';

import React from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { Question, AnswerItem } from '../lib/types';

interface SubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmSubmit: () => void;
  isSubmitting: boolean;
  questions: Question[];
  answers: Record<string, AnswerItem>;
}

export const SubmitModal: React.FC<SubmitModalProps> = ({
  isOpen,
  onClose,
  onConfirmSubmit,
  isSubmitting,
  questions,
  answers,
}) => {
  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl animate-fade-in relative">
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-5 right-5 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Konfirmasi Selesai Ujian</h3>
            <p className="text-xs text-slate-400">Pastikan seluruh jawaban Anda telah diperiksa</p>
          </div>
        </div>

        {/* Breakdown Card */}
        <div className="grid grid-cols-3 gap-3 p-4 bg-slate-950/80 rounded-2xl border border-slate-800 mb-6 text-center">
          <div className="p-3 bg-emerald-950/40 rounded-xl border border-emerald-800/40">
            <div className="text-2xl font-black text-emerald-400">{answeredCount}</div>
            <div className="text-xs text-emerald-300/80 font-medium">Terjawab</div>
          </div>
          <div className="p-3 bg-amber-950/40 rounded-xl border border-amber-800/40">
            <div className="text-2xl font-black text-amber-400">{doubtCount}</div>
            <div className="text-xs text-amber-300/80 font-medium">Ragu-ragu</div>
          </div>
          <div className="p-3 bg-rose-950/40 rounded-xl border border-rose-800/40">
            <div className="text-2xl font-black text-rose-400">{unansweredCount}</div>
            <div className="text-xs text-rose-300/80 font-medium">Belum Dijawab</div>
          </div>
        </div>

        {(unansweredCount > 0 || doubtCount > 0) && (
          <div className="flex items-start gap-2.5 p-3.5 bg-amber-950/40 border border-amber-600/50 rounded-xl text-amber-300 text-xs mb-6 leading-relaxed">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Perhatian: Anda masih memiliki <b>{unansweredCount} soal belum dijawab</b> dan <b>{doubtCount} soal bertanda ragu-ragu</b>. Jawaban yang belum tersimpan akan dianggap kosong.
            </span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm border border-slate-700 transition-all"
          >
            Batal & Cek Lagi
          </button>
          <button
            onClick={onConfirmSubmit}
            disabled={isSubmitting}
            className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-emerald-900/40 transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <span>Ya, Kirim Jawaban</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
