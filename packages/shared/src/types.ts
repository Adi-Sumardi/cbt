export type Role = 'ADMIN' | 'TEACHER' | 'STUDENT';
export type QuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'ESSAY';
export type ExamStatus = 'DRAFT' | 'ACTIVE' | 'FINISHED' | 'ARCHIVED';
export type SessionStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface QuestionOption {
  id: string;
  label: string;
  content: string;
  isCorrect?: boolean;
  order: number;
}

export interface Question {
  id: string;
  content: string;
  type: QuestionType;
  points: number;
  isNullified: boolean;
  order: number;
  imageUrl?: string;
  options: QuestionOption[];
}

export interface Exam {
  id: string;
  title: string;
  description?: string;
  duration: number;
  status: ExamStatus;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResult: boolean;
  passingScore: number;
  sebConfigKey?: string;
  questions: Question[];
}

export interface ExamSession {
  id: string;
  token: string;
  status: SessionStatus;
  startedAt?: string;
  submittedAt?: string;
  score?: number;
  examId: string;
  studentId: string;
}

export interface StudentAnswer {
  questionId: string;
  answer: string;
  isDoubtful: boolean;
  savedAt: string;
}
