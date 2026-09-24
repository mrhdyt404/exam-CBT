import Dexie, { Table } from 'dexie';
import { AnswerItem, ExamBundle } from './types';

export class CBTDatabase extends Dexie {
  answers!: Table<AnswerItem, [string, string]>; // Composite primary key: [exam_id, question_id]
  bundles!: Table<ExamBundle, string>;           // Primary key: exam_id

  constructor() {
    super('CBTClientDB');
    this.version(1).stores({
      answers: '[exam_id+question_id], exam_id, synced',
      bundles: 'exam_id',
    });
  }
}

export const cbtDB = new CBTDatabase();

// Helper: Save answer locally
export async function saveLocalAnswer(
  examId: string,
  questionId: string,
  selectedOption: string,
  isDoubt: boolean,
  synced: boolean = false
) {
  const item: AnswerItem = {
    exam_id: examId,
    question_id: questionId,
    selected_option: selectedOption,
    is_doubt: isDoubt,
    timestamp: new Date().toISOString(),
    synced,
  };
  await cbtDB.answers.put(item);
  return item;
}

// Helper: Get all answers for an exam
export async function getLocalAnswers(examId: string): Promise<Record<string, AnswerItem>> {
  const list = await cbtDB.answers.where('exam_id').equals(examId).toArray();
  const map: Record<string, AnswerItem> = {};
  for (const item of list) {
    map[item.question_id] = item;
  }
  return map;
}

// Helper: Get unsynced answers (for network reconnection queue flush)
export async function getUnsyncedAnswers(examId: string): Promise<AnswerItem[]> {
  return cbtDB.answers.where({ exam_id: examId, synced: false }).toArray();
}

// Helper: Mark answer as synced
export async function markAnswerSynced(examId: string, questionId: string) {
  await cbtDB.answers.update([examId, questionId], { synced: true });
}

// Helper: Cache exam bundle
export async function cacheLocalBundle(bundle: ExamBundle) {
  await cbtDB.bundles.put(bundle);
}

export async function getLocalBundle(examId: string): Promise<ExamBundle | undefined> {
  return cbtDB.bundles.get(examId);
}
