import { create } from 'zustand';

interface QuizAnswer {
  questionId: string;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  dimension: string;
  timeSpent: number;
  explanation?: string;
}

interface QuizReport {
  accuracy: number;
  totalQuestions: number;
  correctCount: number;
  abilityScores: Record<string, number>;
  mistakes: Array<{
    question: string;
    userAnswer: string;
    correctAnswer: string;
    explanation: string;
  }>;
  suggestions: {
    weakAreas: string[];
    studyTips: string;
  };
  totalTime: number;
  averageTime: number;
}

interface QuizStore {
  currentCourseId: string | null;
  questions: any[];
  answers: QuizAnswer[];
  currentIndex: number;
  report: QuizReport | null;
  loading: boolean;
  error: string | null;

  setCourseId: (courseId: string) => void;
  setQuestions: (questions: any[]) => void;
  submitAnswer: (answer: QuizAnswer) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  setReport: (report: QuizReport) => void;
  reset: () => void;
}

export const useQuizStore = create<QuizStore>((set, get) => ({
  currentCourseId: null,
  questions: [],
  answers: [],
  currentIndex: 0,
  report: null,
  loading: false,
  error: null,

  setCourseId: (courseId: string) => {
    set({ currentCourseId: courseId });
  },

  setQuestions: (questions: any[]) => {
    set({ questions, currentIndex: 0, answers: [], report: null });
  },

  submitAnswer: (answer: QuizAnswer) => {
    set((state) => {
      const existingIdx = state.answers.findIndex(
        (a) => a.questionId === answer.questionId
      );
      const newAnswers = [...state.answers];
      if (existingIdx >= 0) {
        newAnswers[existingIdx] = answer;
      } else {
        newAnswers.push(answer);
      }
      return { answers: newAnswers };
    });
  },

  nextQuestion: () => {
    set((state) => ({
      currentIndex: Math.min(
        state.currentIndex + 1,
        state.questions.length - 1
      ),
    }));
  },

  prevQuestion: () => {
    set((state) => ({
      currentIndex: Math.max(state.currentIndex - 1, 0),
    }));
  },

  setReport: (report: QuizReport) => {
    set({ report });
  },

  reset: () => {
    set({
      currentCourseId: null,
      questions: [],
      answers: [],
      currentIndex: 0,
      report: null,
      loading: false,
      error: null,
    });
  },
}));
