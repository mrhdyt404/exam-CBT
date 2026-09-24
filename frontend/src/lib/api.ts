import {
  saveLocalAnswer,
  markAnswerSynced,
  getUnsyncedAnswers,
  cacheLocalBundle,
  getLocalBundle,
  getLocalAnswers,
} from './db';
import { ExamBundle, User, ExamSession } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('cbt_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// 1. Auth: Login
export async function apiLogin(username: string, password: string): Promise<{ token: string; user: User }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Login gagal, periksa username dan password.');
  }

  const data = await res.json();
  if (typeof window !== 'undefined') {
    localStorage.setItem('cbt_token', data.token);
    localStorage.setItem('cbt_user', JSON.stringify(data.user));
  }
  return data;
}

// 2. Exam: Fetch Bundle (Offline-First)
export async function apiGetExamBundle(examId: string): Promise<ExamBundle> {
  try {
    const res = await fetch(`${API_BASE}/exam/${examId}/bundle`, {
      headers: { ...getAuthHeader() },
    });

    if (res.ok) {
      const bundle: ExamBundle = await res.json();
      await cacheLocalBundle(bundle);
      return bundle;
    }
  } catch (err) {
    console.warn('[Offline Engine] Network fetch failed, falling back to IndexedDB cache...', err);
  }

  // Fallback to IndexedDB
  const cached = await getLocalBundle(examId);
  if (cached) return cached;
  throw new Error('Gagal mengambil paket soal. Periksa koneksi internet.');
}

// 3. Exam: Start Session
export async function apiStartExam(examId: string): Promise<{ session: ExamSession; answers: Record<string, any> }> {
  const res = await fetch(`${API_BASE}/exam/${examId}/start`, {
    method: 'POST',
    headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Gagal memulai sesi ujian.');
  }

  return res.json();
}

// 4. Answer: Save Answer (IndexedDB First -> Server Async Sync)
export async function apiSaveAnswer(
  examId: string,
  questionId: string,
  selectedOption: string,
  isDoubt: boolean
): Promise<{ synced: boolean }> {
  // 1. Instant local write to IndexedDB
  await saveLocalAnswer(examId, questionId, selectedOption, isDoubt, false);

  // 2. Optimistic server sync
  try {
    const res = await fetch(`${API_BASE}/answer/save`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exam_id: examId,
        question_id: questionId,
        selected_option: selectedOption,
        is_doubt: isDoubt,
        timestamp: new Date().toISOString(),
      }),
    });

    if (res.ok) {
      await markAnswerSynced(examId, questionId);
      return { synced: true };
    }
  } catch (err) {
    console.warn('[Offline Engine] Answer buffered in local IndexedDB. Will sync when online.');
  }

  return { synced: false };
}

// 5. Answer: Flush Pending Sync Queue on Reconnection
export async function apiFlushSyncQueue(examId: string): Promise<number> {
  const pending = await getUnsyncedAnswers(examId);
  if (pending.length === 0) return 0;

  try {
    const res = await fetch(`${API_BASE}/answer/sync-batch`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exam_id: examId,
        answers: pending,
      }),
    });

    if (res.ok) {
      for (const item of pending) {
        await markAnswerSynced(examId, item.question_id);
      }
      return pending.length;
    }
  } catch (err) {
    console.warn('[Offline Engine] Batch sync retry failed, retrying on next tick.');
  }

  return 0;
}

// 6. Proctor: Send Heartbeat
export async function apiSendHeartbeat(examId: string, currentNumber: number) {
  try {
    await fetch(`${API_BASE}/proctor/heartbeat`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ exam_id: examId, current_number: currentNumber }),
    });
  } catch (e) {
    // Ignore heartbeat network drops silently
  }
}

// 7. Proctor: Report Violation
export async function apiReportViolation(examId: string, type: string, details: string) {
  try {
    await fetch(`${API_BASE}/proctor/violation`, {
      method: 'POST',
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ exam_id: examId, type, details }),
    });
  } catch (e) {
    // Non-blocking
  }
}

// 8. Exam: Final Submit
export async function apiSubmitExam(examId: string): Promise<{ final_score: number }> {
  // Flush all pending offline answers first
  await apiFlushSyncQueue(examId);

  const res = await fetch(`${API_BASE}/exam/${examId}/submit`, {
    method: 'POST',
    headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Gagal submit ujian.');
  }

  return res.json();
}
