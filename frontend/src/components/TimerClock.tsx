'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface TimerClockProps {
  initialMinutes: number;
  onTimeUp: () => void;
}

export const TimerClock: React.FC<TimerClockProps> = ({ initialMinutes, onTimeUp }) => {
  const [secondsLeft, setSecondsLeft] = useState(initialMinutes * 60);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Initialize Web Worker for background precision timer
    if (typeof window !== 'undefined') {
      const worker = new Worker('/timer-worker.js');
      workerRef.current = worker;

      worker.postMessage({ action: 'START', duration: initialMinutes * 60 });

      worker.onmessage = (e) => {
        const { type, remainingSeconds } = e.data;
        if (type === 'TICK') {
          setSecondsLeft(remainingSeconds);
        } else if (type === 'TIME_UP') {
          setSecondsLeft(0);
          onTimeUp();
        }
      };

      return () => {
        worker.postMessage({ action: 'STOP' });
        worker.terminate();
      };
    }
  }, [initialMinutes, onTimeUp]);

  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;

  const isUrgent = secondsLeft < 300; // less than 5 minutes

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-sm sm:text-base font-bold shadow-lg border transition-all ${
        isUrgent
          ? 'bg-rose-950/80 text-rose-300 border-rose-600 animate-pulse'
          : 'bg-slate-900/90 text-sky-300 border-slate-700/80 backdrop-blur-md'
      }`}
    >
      {isUrgent ? (
        <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
      ) : (
        <Clock className="w-5 h-5 text-sky-400 shrink-0" />
      )}
      <div className="tracking-wider">
        <span>{String(hours).padStart(2, '0')}</span>:
        <span>{String(minutes).padStart(2, '0')}</span>:
        <span>{String(seconds).padStart(2, '0')}</span>
      </div>
    </div>
  );
};
