'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, ArrowRight, Lock, User as UserIcon, Zap, CheckCircle, Wifi, Monitor } from 'lucide-react';
import { apiLogin } from '../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('siswa01');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await apiLogin(username, password);
      // If student, navigate to the default active exam
      if (res.user.role === 'ADMIN' || res.user.role === 'PROCTOR') {
        router.push('/admin/monitor');
      } else {
        router.push('/exam/e0000000-0000-0000-0000-000000000001');
      }
    } catch (err: any) {
      setError(err.message || 'Login gagal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Background glow decorations */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-emerald-600/10 rounded-full blur-2xl pointer-events-none" />

      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center z-10">
        {/* Left: Info & Specs */}
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-950/80 border border-blue-600/50 text-blue-300 text-xs font-semibold shadow-inner">
            <Zap className="w-3.5 h-3.5 text-blue-400" />
            <span>High-Concurrency CBT Engine (15.000++ VUs)</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
            Portal Asesmen & Ujian Online Nasional Simulasi Load Testing
          </h1>

          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Platform CBT generasi baru dengan arsitektur <b>Offline-First (IndexedDB)</b>, perlindungan anti-kecurangan proctoring pintar, dan sub-millisecond response time.
          </p>

          {/* System Highlights */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-start gap-3">
              <Wifi className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-white">Offline Resilient</div>
                <div className="text-[11px] text-slate-400">Pengerjaan lancar tanpa lag internet</div>
              </div>
            </div>
            <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-white">Anti-Cheat Guard</div>
                <div className="text-[11px] text-slate-400">Lock fullscreen & tab detection</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Login Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">Masuk ke Sesi Ujian</h2>
            <p className="text-xs text-slate-400 mt-1">Masukkan ID Peserta / Nomor Ujian Anda</p>
          </div>

          {error && (
            <div className="p-3.5 mb-6 rounded-xl bg-rose-950/80 border border-rose-600/60 text-rose-300 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Username / Nomor Peserta</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. siswa01"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Password / Token Ujian</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-mono"
                />
              </div>
            </div>

            {/* Quick Demo Credentials */}
            <div className="pt-1 text-[11px] text-slate-400">
              <span className="font-semibold text-slate-300">Akun Demo Cepat: </span>
              <button
                type="button"
                onClick={() => { setUsername('siswa01'); setPassword('password123'); }}
                className="text-sky-400 hover:underline mx-1"
              >
                Siswa 01
              </button>
              •
              <button
                type="button"
                onClick={() => { setUsername('admin'); setPassword('password123'); }}
                className="text-sky-400 hover:underline mx-1"
              >
                Admin Monitor
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-blue-900/40 transition-all active:scale-98"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Mulai Ujian Sekarang</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
