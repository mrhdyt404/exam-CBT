'use client';

import React from 'react';
import { User, LogOut, CheckCircle2 } from 'lucide-react';
import { TimerClock } from './TimerClock';
import { NetworkBadge } from './NetworkBadge';

interface NavbarProps {
  examId: string;
  examTitle: string;
  durationMinutes: number;
  userName: string;
  onTimeUp: () => void;
  onSubmitClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  examId,
  examTitle,
  durationMinutes,
  userName,
  onTimeUp,
  onSubmitClick,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full bg-slate-900/90 backdrop-blur-md border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Branding & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center font-black text-white text-lg shadow-lg shrink-0">
            CBT
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-white truncate">{examTitle}</h1>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <User className="w-3.5 h-3.5" />
              <span className="truncate">{userName || 'Peserta Ujian'}</span>
            </div>
          </div>
        </div>

        {/* Center: Network & Timer */}
        <div className="flex items-center gap-3 shrink-0">
          <NetworkBadge examId={examId} />
          <TimerClock initialMinutes={durationMinutes} onTimeUp={onTimeUp} />
        </div>

        {/* Right: Submit Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={onSubmitClick}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold px-4 py-2 rounded-xl text-sm shadow-lg shadow-emerald-950/50 transition-all active:scale-95 shrink-0"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span className="hidden sm:inline">Selesai Ujian</span>
          </button>
        </div>
      </div>
    </header>
  );
};
