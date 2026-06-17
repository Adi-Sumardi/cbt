import { create } from 'zustand';

interface Answer {
  answer: string;
  isDoubtful: boolean;
}

interface ExamStore {
  sessionId: string | null;
  currentQuestionIndex: number;
  answers: Record<string, Answer>;
  lastSaved: Date | null;
  isConnected: boolean;

  setSessionId: (id: string) => void;
  setCurrentQuestion: (index: number) => void;
  setAnswer: (questionId: string, answer: string) => void;
  toggleDoubtful: (questionId: string) => void;
  setLastSaved: (date: Date) => void;
  setConnected: (connected: boolean) => void;
  loadSavedAnswers: (answers: Record<string, string>) => void;
}

export const useExamStore = create<ExamStore>((set) => ({
  sessionId: null,
  currentQuestionIndex: 0,
  answers: {},
  lastSaved: null,
  isConnected: false,

  setSessionId: (id) => set({ sessionId: id }),
  setCurrentQuestion: (index) => set({ currentQuestionIndex: index }),

  setAnswer: (questionId, answer) =>
    set((state) => ({
      answers: {
        ...state.answers,
        [questionId]: { answer, isDoubtful: state.answers[questionId]?.isDoubtful ?? false },
      },
    })),

  toggleDoubtful: (questionId) =>
    set((state) => ({
      answers: {
        ...state.answers,
        [questionId]: {
          answer: state.answers[questionId]?.answer ?? '',
          isDoubtful: !state.answers[questionId]?.isDoubtful,
        },
      },
    })),

  setLastSaved: (date) => set({ lastSaved: date }),
  setConnected: (connected) => set({ isConnected: connected }),

  loadSavedAnswers: (savedAnswers) =>
    set({
      answers: Object.fromEntries(
        Object.entries(savedAnswers).map(([qId, data]) => {
          const parsed = JSON.parse(data as string);
          return [qId, { answer: parsed.answer, isDoubtful: parsed.isDoubtful }];
        }),
      ),
    }),
}));
