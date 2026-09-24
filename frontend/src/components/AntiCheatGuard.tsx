'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { ShieldAlert, Maximize2 } from 'lucide-react';
import { apiReportViolation } from '../lib/api';

interface AntiCheatGuardProps {
  examId: string;
}

export const AntiCheatGuard: React.FC<AntiCheatGuardProps> = ({ examId }) => {
  const [violationCount, setViolationCount] = useState(0);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(true);

  const triggerViolation = useCallback(
    async (type: string, details: string) => {
      setViolationCount((prev) => {
        const next = prev + 1;
        setWarningMessage(`PERINGATAN! Pelanggaran terdeteksi: ${details}. (Total: ${next}x)`);
        return next;
      });
      await apiReportViolation(examId, type, details);
    },
    [examId]
  );

  const requestFullscreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(() => {});
    }
    setIsFullscreen(true);
    setWarningMessage(null);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Detect Tab Switch or App Minimize
    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerViolation('TAB_SWITCH', 'Meninggalkan tab ujian atau membuka aplikasi lain');
      }
    };

    // 2. Detect Focus Loss
    const handleWindowBlur = () => {
      triggerViolation('FOCUS_LOST', 'Fokus layar ujian terputus');
    };

    // 3. Fullscreen Change
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
        triggerViolation('FULLSCREEN_EXIT', 'Keluar dari mode layar penuh (Fullscreen)');
      } else {
        setIsFullscreen(true);
      }
    };

    // 4. Block DevTools, Inspect, Copy & Paste shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
        (e.ctrlKey && (e.key === 'u' || e.key === 'U')) ||
        (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'a'))
      ) {
        e.preventDefault();
        triggerViolation('DEVTOOLS_SHORTCUT', `Mencoba menekan kombinasi tombol terlarang: ${e.key}`);
      }
    };

    // 5. Block Context Menu (Right-Click)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [triggerViolation]);

  return (
    <>
      {/* Fullscreen Enforcer Modal */}
      {!isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500 rounded-2xl p-6 max-w-md w-full shadow-2xl text-center">
            <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto mb-4 animate-bounce" />
            <h3 className="text-xl font-bold text-white mb-2">Mode Layar Penuh Wajib Aktif</h3>
            <p className="text-slate-300 text-sm mb-6">
              Untuk menjaga integritas ujian, Anda harus berada dalam mode layar penuh (fullscreen). Segala aktivitas keluar dari layar dicatat oleh sistem proctoring.
            </p>
            <button
              onClick={requestFullscreen}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg transition-all"
            >
              <Maximize2 className="w-5 h-5" />
              Aktifkan Layar Penuh
            </button>
          </div>
        </div>
      )}

      {/* Real-time Warning Banner */}
      {warningMessage && isFullscreen && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 bg-rose-950/95 border border-rose-500 text-rose-200 px-6 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-fade-in max-w-lg">
          <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0" />
          <div className="text-xs sm:text-sm font-medium">{warningMessage}</div>
          <button
            onClick={() => setWarningMessage(null)}
            className="ml-auto text-rose-400 hover:text-white text-sm font-bold"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
};
