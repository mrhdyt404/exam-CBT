'use client';

import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { apiFlushSyncQueue } from '../lib/api';

interface NetworkBadgeProps {
  examId: string;
}

export const NetworkBadge: React.FC<NetworkBadgeProps> = ({ examId }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    const handleOnline = async () => {
      setIsOnline(true);
      setIsSyncing(true);
      try {
        await apiFlushSyncQueue(examId);
      } finally {
        setIsSyncing(false);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic sync check every 15 seconds
    const interval = setInterval(async () => {
      if (navigator.onLine) {
        await apiFlushSyncQueue(examId);
      }
    }, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [examId]);

  if (!isOnline) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/80 border border-amber-600 text-amber-300 text-xs font-semibold animate-pulse">
        <WifiOff className="w-4 h-4" />
        <span>Mode Offline (Tersimpan Lokal)</span>
      </div>
    );
  }

  if (isSyncing) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-950/80 border border-blue-600 text-blue-300 text-xs font-semibold">
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        <span>Sinkronisasi...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-600/70 text-emerald-300 text-xs font-semibold shadow-sm">
      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
      <Wifi className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">Online & Terkoneksi</span>
    </div>
  );
};
