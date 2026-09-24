'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Activity,
  ShieldAlert,
  Clock,
  ArrowLeft,
  RefreshCw,
  Search,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';

interface ParticipantStatus {
  id: string;
  name: string;
  school: string;
  current_question: number;
  answered_count: number;
  violations: number;
  status: 'ONLINE' | 'OFFLINE' | 'SUBMITTED';
  last_ping: string;
}

export default function ProctorMonitorPage() {
  const router = useRouter();
  const [activeCount, setActiveCount] = useState(15420);
  const [examTitle] = useState('Simulasi Ujian Nasional Berbasis Komputer (CBT)');
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Simulated live monitoring data for 15k participants demonstration
  const [participants] = useState<ParticipantStatus[]>([
    {
      id: 'siswa01',
      name: 'Ahmad Pratama',
      school: 'SMA Negeri 1 Jakarta',
      current_question: 4,
      answered_count: 4,
      violations: 0,
      status: 'ONLINE',
      last_ping: '1 detik lalu',
    },
    {
      id: 'siswa02',
      name: 'Budi Santoso',
      school: 'SMA Negeri 1 Jakarta',
      current_question: 3,
      answered_count: 3,
      violations: 1,
      status: 'ONLINE',
      last_ping: '3 detik lalu',
    },
    {
      id: 'siswa03',
      name: 'Citra Dewi',
      school: 'SMA Negeri 3 Bandung',
      current_question: 5,
      answered_count: 5,
      violations: 0,
      status: 'SUBMITTED',
      last_ping: '1 menit lalu',
    },
    {
      id: 'siswa04',
      name: 'Dimas Setiawan',
      school: 'SMA Negeri 8 Jakarta',
      current_question: 2,
      answered_count: 2,
      violations: 2,
      status: 'ONLINE',
      last_ping: '5 detik lalu',
    },
    {
      id: 'siswa05',
      name: 'Eka Rahmawati',
      school: 'SMA Negeri 5 Surabaya',
      current_question: 4,
      answered_count: 4,
      violations: 0,
      status: 'ONLINE',
      last_ping: '2 detik lalu',
    },
  ]);

  const [violationsLog] = useState([
    {
      id: 'v1',
      user: 'Budi Santoso',
      type: 'TAB_SWITCH',
      detail: 'Pindah ke aplikasi browser eksternal',
      time: '19:45:10',
    },
    {
      id: 'v2',
      user: 'Dimas Setiawan',
      type: 'FULLSCREEN_EXIT',
      detail: 'Keluar dari mode layar penuh',
      time: '19:42:05',
    },
    {
      id: 'v3',
      user: 'Dimas Setiawan',
      type: 'DEVTOOLS_SHORTCUT',
      detail: 'Menekan kombinasi tombol F12',
      time: '19:39:20',
    },
  ]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setActiveCount((prev) => prev + Math.floor(Math.random() * 10 - 5));
      setIsRefreshing(false);
    }, 500);
  };

  const filtered = participants.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.school.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-8">
        <div>
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white mb-2 transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Portal</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-black text-white">{examTitle}</h1>
          <p className="text-xs sm:text-sm text-slate-400">Dashboard Pengawas & Monitoring Realtime (Live Proctoring)</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleManualRefresh}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm font-bold text-slate-200 transition-all shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`} />
            <span>Segarkan Data</span>
          </button>
        </div>
      </div>

      {/* Metric Cards (15k Concurrency Monitor) */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Peserta Ujian Aktif</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-400 font-mono">
            {activeCount.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-emerald-500/80 font-medium mt-1 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            <span>Real-time Redis Heartbeat</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Throughput Write Jawaban</span>
            <Activity className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-3xl font-black text-sky-400 font-mono">2.450 RPS</div>
          <div className="text-[11px] text-slate-400 mt-1">SLA Latensi: 0.82 ms (Write-Behind)</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Tingkat Pelanggaran</span>
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-amber-400 font-mono">0.03%</div>
          <div className="text-[11px] text-slate-400 mt-1">Anti-cheat otomatis mendeteksi tab</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Status Selesai</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-black text-indigo-400 font-mono">1.820</div>
          <div className="text-[11px] text-slate-400 mt-1">11.8% dari total 15.420 peserta</div>
        </div>
      </div>

      {/* Main Monitoring Section */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Participant Live Table */}
        <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-400" />
              <span>Daftar Peserta Terhubung</span>
            </h2>

            <div className="relative max-w-xs w-full">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari siswa / sekolah..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Nama Siswa</th>
                  <th className="py-3 px-4">Sekolah</th>
                  <th className="py-3 px-4 text-center">Posisi Soal</th>
                  <th className="py-3 px-4 text-center">Pelanggaran</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white">
                      <div>{p.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{p.id}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">{p.school}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-1 bg-slate-800 text-sky-300 rounded font-mono font-bold">
                        No. {p.current_question}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {p.violations > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-950 border border-rose-600 text-rose-300 font-bold">
                          {p.violations}x
                        </span>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {p.status === 'ONLINE' && (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-950 border border-emerald-600 text-emerald-300 text-[10px] font-bold">
                          ● Online
                        </span>
                      )}
                      {p.status === 'SUBMITTED' && (
                        <span className="px-2.5 py-1 rounded-full bg-indigo-950 border border-indigo-600 text-indigo-300 text-[10px] font-bold">
                          ✓ Selesai
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Live Violations Log */}
        <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-md">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <span>Audit Log Pelanggaran</span>
          </h2>

          <div className="space-y-3">
            {violationsLog.map((v) => (
              <div
                key={v.id}
                className="p-3.5 rounded-2xl bg-slate-950/80 border border-rose-900/40 flex flex-col gap-1"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-rose-400">{v.user}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{v.time}</span>
                </div>
                <div className="text-xs text-slate-300 font-semibold">{v.type}</div>
                <div className="text-[11px] text-slate-400">{v.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
