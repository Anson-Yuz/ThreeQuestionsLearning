import { apiClient } from './client';

export interface Course {
  id: string;
  title: string;
  keywords: string[];
  originalQuestion: string;
  status: 'active' | 'completed' | 'archived' | 'deleted';
  progress: number;
  threeAskProgress: {
    question1: boolean;
    question2: boolean;
    question3: boolean;
  };
  createdAt: number;
  lastAccessed: number;
}

export interface CreateCourseRequest {
  question: string;
}

export interface CreateCourseResponse {
  id: string;
  title: string;
  keywords: string[];
  originalQuestion: string;
  status: string;
  progress: number;
  threeAskProgress: {
    question1: boolean;
    question2: boolean;
    question3: boolean;
  };
  createdAt: number;
}

export interface CourseListResponse {
  courses: Course[];
  total: number;
}

export interface CourseSearchResult {
  id: string;
  title: string;
  description: string;
  snippet: string;
  score: number;
  keywords: string[];
  original_question?: string;
  status?: string;
  created_at?: number;
  updated_at?: number;
  doc_count?: number;
  chinese_ratio?: number;
}

export interface CourseSearchResponse {
  results: CourseSearchResult[];
  total: number;
  query: string;
}

export const coursesApi = {
  // 创建课程
  create: (question: string): Promise<CreateCourseResponse> => {
    return apiClient.post('/courses/create', { question });
  },

  // 获取课程列表
  list: (status?: string, limit: number = 50, offset: number = 0): Promise<CourseListResponse> => {
    return apiClient.get('/courses/list', { status, limit, offset });
  },

  // 搜索课程（FTS5 后端，< 50ms 响应）
  search: (q: string, topK: number = 10): Promise<CourseSearchResponse> => {
    return apiClient.get('/courses/search', { q, top_k: topK });
  },

  // 读取图谱缓存（命中即返回，未命中触发后台生成并返回 generating）
  getCachedGraph: (courseId: string): Promise<{
    status: 'ready' | 'generating'
    data: { nodes: any[]; links: any[] }
  }> => {
    return apiClient.get(`/courses/${courseId}/graph`);
  },

  // 获取单个课程详情
  get: (courseId: string): Promise<Course> => {
    return apiClient.get(`/courses/${courseId}`);
  },

  // 更新课程状态
  updateStatus: (courseId: string, status: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.patch(`/courses/${courseId}/status`, { status });
  },

  // 更新课程进度
  updateProgress: (courseId: string, progress: number): Promise<{ success: boolean; message: string }> => {
    return apiClient.patch(`/courses/${courseId}/progress`, { progress });
  },

  // 删除课程
  delete: (courseId: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.delete(`/courses/${courseId}`);
  },

  // 归档课程
  archive: (courseId: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.patch(`/courses/${courseId}/status`, { status: 'archived' });
  },

  // 恢复课程
  restore: (courseId: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.patch(`/courses/${courseId}/status`, { status: 'active' });
  },
};
