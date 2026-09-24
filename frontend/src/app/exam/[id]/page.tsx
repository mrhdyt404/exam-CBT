'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '../../../components/Navbar';
import { QuestionCard } from '../../../components/QuestionCard';
import { QuestionNavigation } from '../../../components/QuestionNavigation';
import { AntiCheatGuard } from '../../../components/AntiCheatGuard';
import { SubmitModal } from '../../../components/SubmitModal';
import {
  apiGetExamBundle,
  apiStartExam,
  apiSaveAnswer,
  apiSendHeartbeat,
  apiSubmitExam,
} from '../../../lib/api';
import { getLocalAnswers } from '../../../lib/db';
import { ExamBundle, Question, AnswerItem, User } from '../../../lib/types';
import { CheckCircle, Award, Home, RotateCcw } from 'lucide-react';

export default function ExamSessionPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.id as string;

  const [bundle, setBundle] = useState<ExamBundle | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerItem>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Submit Modal state
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedScore, setCompletedScore] = useState<number | null>(null);

  // Initialize Exam Session & Offline Cache
  useEffect(() => {
    async function init() {
      try {
        const storedUser = localStorage.getItem('cbt_user');
        if (storedUser) {
          setCurrentUser(JSON.parse(storedUser));
        }

        // 1. Fetch Bundle (Offline-First cache enabled)
        const bundleData = await apiGetExamBundle(examId);
        setBundle(bundleData);

        // 2. Start / Resume Session
        try {
          await apiStartExam(examId);
        } catch (e) {
          console.warn('Session resume fallback');
        }

        // 3. Load Local Answers from IndexedDB
        const localAns = await getLocalAnswers(examId);
        setAnswers(localAns);
      } catch (err: any) {
        setError(err.message || 'Gagal memuat sesi ujian.');
      } finally {
        setLoading(false);
      }
    }

    if (examId) {
      init();
    }
  }, [examId]);

  // Periodic Heartbeat every 10s
  useEffect(() => {
    if (!bundle) return;
    const interval = setInterval(() => {
      apiSendHeartbeat(examId, currentIndex + 1);
    }, 10000);
    return () => clearInterval(interval);
  }, [examId, bundle, currentIndex]);

  // Select Option Handler
  const handleSelectOption = useCallback(
    async (optionKey: string) => {
      if (!bundle) return;
      const currentQuestion = bundle.questions[currentIndex];
      const prevAnswer = answers[currentQuestion.id];
      const isDoubt = prevAnswer ? prevAnswer.is_doubt : false;

      // Optimistic state update
      const updatedItem: AnswerItem = {
        exam_id: examId,
        question_id: currentQuestion.id,
        selected_option: optionKey,
        is_doubt: isDoubt,
        timestamp: new Date().toISOString(),
        synced: false,
      };

      setAnswers((prev) => ({
        ...prev,
        [currentQuestion.id]: updatedItem,
      }));

      // Background write to IndexedDB & Go API
      await apiSaveAnswer(examId, currentQuestion.id, optionKey, isDoubt);
    },
    [bundle, currentIndex, answers, examId]
  );

  // Toggle Doubt (Ragu-ragu)
  const handleToggleDoubt = useCallback(async () => {
    if (!bundle) return;
    const currentQuestion = bundle.questions[currentIndex];
    const prevAnswer = answers[currentQuestion.id];
    if (!prevAnswer) return;

    const nextDoubt = !prevAnswer.is_doubt;
    const updatedItem: AnswerItem = {
      ...prevAnswer,
      is_doubt: nextDoubt,
      timestamp: new Date().toISOString(),
      synced: false,
    };

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: updatedItem,
    }));

    await apiSaveAnswer(examId, currentQuestion.id, prevAnswer.selected_option, nextDoubt);
  }, [bundle, currentIndex, answers, examId]);

  // Submit Exam Handler
  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await apiSubmitExam(examId);
      setCompletedScore(res.final_score ?? 100);
      setIsSubmitModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Gagal mengirim ujian.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-950">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-slate-400 font-medium text-sm">Menyiapkan Lembar Ujian CBT...</p>
      </div>
    );
  }

  if (error || !bundle) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center">
          <p className="text-rose-400 font-semibold mb-4">{error || 'Ujian tidak ditemukan.'}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  // Completion Screen
  if (completedScore !== null) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 relative">
        <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-8 max-w-lg w-full text-center shadow-2xl backdrop-blur-md">
          <div className="w-20 h-20 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center text-emerald-400 mx-auto mb-6">
            <Award className="w-10 h-10" />
          </div>

          <h2 className="text-2xl font-black text-white mb-2">Ujian Berhasil Diselesaikan!</h2>
          <p className="text-slate-400 text-sm mb-6">
            Seluruh jawaban Anda telah berhasil diarsipkan dan dinilai oleh sistem secara aman.
          </p>

          <div className="p-6 bg-slate-950/80 rounded-2xl border border-slate-800 mb-8">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Nilai Akhir Ujian</div>
            <div className="text-5xl font-black text-emerald-400 font-mono">
              {completedScore.toFixed(1)}
            </div>
            <div className="text-xs text-slate-500 mt-2">Kriteria Ketuntasan Minimal: 75.0</div>
          </div>

          <button
            onClick={() => router.push('/')}
            className="w-full py-3.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-900/30 transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Kembali ke Halaman Utama</span>
          </button>
        </div>
      </main>
    );
  }

  const currentQuestion = bundle.questions[currentIndex];
  const currentAnswer = answers[currentQuestion.id];

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 pb-12">
      {/* Anti Cheat Enforcer */}
      <AntiCheatGuard examId={examId} />

      {/* Top Navigation */}
      <Navbar
        examId={examId}
        examTitle={bundle.title}
        durationMinutes={bundle.duration_minutes}
        userName={currentUser?.full_name || 'Peserta'}
        onTimeUp={() => setIsSubmitModalOpen(true)}
        onSubmitClick={() => setIsSubmitModalOpen(true)}
      />

      {/* Main Examination Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Active Question */}
        <div className="lg:col-span-8">
          <QuestionCard
            question={currentQuestion}
            totalQuestions={bundle.questions.length}
            selectedOption={currentAnswer?.selected_option || ''}
            isDoubt={currentAnswer?.is_doubt || false}
            onSelectOption={handleSelectOption}
            onToggleDoubt={handleToggleDoubt}
            onPrev={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            onNext={() => setCurrentIndex((prev) => Math.min(bundle.questions.length - 1, prev + 1))}
            hasPrev={currentIndex > 0}
            hasNext={currentIndex < bundle.questions.length - 1}
          />
        </div>

        {/* Right Column: Question Grid Navigation */}
        <div className="lg:col-span-4 sticky top-24">
          <QuestionNavigation
            questions={bundle.questions}
            answers={answers}
            currentIndex={currentIndex}
            onSelectIndex={(idx) => setCurrentIndex(idx)}
          />
        </div>
      </main>

      {/* Submit Confirmation Modal */}
      <SubmitModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onConfirmSubmit={handleConfirmSubmit}
        isSubmitting={isSubmitting}
        questions={bundle.questions}
        answers={answers}
      />
    </div>
  );
}
