import { apiClient } from './client';

export interface GraphNode {
  id: string;
  name: string;
  description?: string;
  bloomLevel: string;
  difficulty: number;
  isThresholdConcept: boolean;
  x?: number;
  y?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  relation: string;
  strength: number;
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface Controversy {
  id: string;
  topic: string;
  proView: string;
  proEvidence: string;
  conView: string;
  conEvidence: string;
  confidence: number;
}

export interface ControversyListResponse {
  controversies: Controversy[];
}

export interface QuizQuestion {
  id: string;
  dimension: string;
  bloomLevel: string;
  difficulty: number;
  questionType: string;
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
  knowledgePoints: string[];
}

export interface QuizGenerateResponse {
  quizzes: QuizQuestion[];
  total: number;
}

export interface QuizSubmitRequest {
  courseId: string;
  questionId: string;
  userAnswer: string;
  timeSpent?: number;
}

export interface QuizSubmitResponse {
  isCorrect: boolean;
  score: number;
  explanation?: string;
  feedback?: string;
}

export interface ProgressResponse {
  question1: boolean;
  question2: boolean;
  question3: boolean;
  overallProgress: number;
}

export const threeAskApi = {
  // 第一问：生成知识图谱
  generateGraph: (courseId: string): Promise<KnowledgeGraph> => {
    return apiClient.post(`/three-ask/graph/generate/${courseId}`);
  },

  // 第一问：增量更新图谱
  updateGraph: (courseId: string, docId: string): Promise<KnowledgeGraph> => {
    return apiClient.post(`/three-ask/graph/update/${courseId}`, { doc_id: docId });
  },

  // 第二问：检测争议
  detectControversy: (courseId: string): Promise<{ status: string; message: string }> => {
    return apiClient.post(`/three-ask/controversy/detect/${courseId}`);
  },

  // 第二问：获取争议列表
  getControversies: (courseId: string): Promise<ControversyListResponse> => {
    return apiClient.get(`/three-ask/controversy/${courseId}`);
  },

  // 第三问：生成测评题目
  generateQuiz: (courseId: string): Promise<QuizGenerateResponse> => {
    return apiClient.post(`/three-ask/quiz/generate/${courseId}`);
  },

  // 第三问：提交答案
  submitQuiz: (req: QuizSubmitRequest): Promise<QuizSubmitResponse> => {
    return apiClient.post('/three-ask/quiz/submit', req);
  },

  // 第三问：完成测评
  completeQuiz: (courseId: string): Promise<{ success: boolean; message: string; data?: { accuracy: number } }> => {
    return apiClient.post(`/three-ask/quiz/${courseId}/complete`);
  },

  // 获取三问进度
  getProgress: (courseId: string): Promise<ProgressResponse> => {
    return apiClient.get(`/three-ask/progress/${courseId}`);
  },
};
