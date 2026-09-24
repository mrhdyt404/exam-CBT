export type Role = 'STUDENT' | 'ADMIN' | 'PROCTOR';

export interface User {
  id: string;
  username: string;
  full_name: string;
  role: Role;
  school?: string;
}

export interface Option {
  key: string;
  text: string;
}

export interface Question {
  id: string;
  exam_id: string;
  number: number;
  question_text: string;
  question_media?: string;
  options: Option[];
  weight: number;
}

export interface ExamBundle {
  exam_id: string;
  title: string;
  duration_minutes: number;
  randomize_order: boolean;
  questions: Question[];
  total_questions: number;
  bundle_hash: string;
}

export interface AnswerItem {
  exam_id: string;
  question_id: string;
  selected_option: string;
  is_doubt: boolean;
  timestamp: string;
  synced: boolean;
}

export interface ExamSession {
  id: string;
  exam_id: string;
  user_id: string;
  start_time: string;
  end_time?: string;
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'DISQUALIFIED';
  violation_count: number;
  final_score?: number;
}
