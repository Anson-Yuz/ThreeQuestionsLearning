import { apiClient } from './client';

export interface Document {
  id: string;
  courseId: string;
  title: string;
  contentPreview?: string;
  content?: string;
  filePath?: string;
  fileType?: string;
  source: 'user' | 'ai';
  createdAt: number;
}

export interface DocumentListResponse {
  documents: Document[];
}

export interface SearchRequest {
  courseId: string;
  query: string;
  topK?: number;
}

export interface SearchResult {
  content: string;
  score: number;
  metadata: Record<string, any>;
}

export interface SearchResponse {
  results: SearchResult[];
}

export const knowledgeApi = {
  // 上传资料
  upload: (courseId: string, file: File, onProgress?: (progress: number) => void): Promise<{ success: boolean; doc_id?: string }> => {
    const formData = new FormData();
    formData.append('course_id', courseId);
    formData.append('file', file);
    return apiClient.upload('/knowledge/upload', formData, onProgress);
  },

  // AI 智能补充资料
  aiFetch: (courseId: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.post(`/knowledge/ai-fetch/${courseId}`);
  },

  // 获取资料列表
  list: (courseId: string, source?: 'user' | 'ai'): Promise<DocumentListResponse> => {
    return apiClient.get('/knowledge/documents', { course_id: courseId, source });
  },

  // 获取单个资料详情
  get: (docId: string): Promise<Document> => {
    return apiClient.get(`/knowledge/documents/${docId}`);
  },

  // 删除资料
  delete: (docId: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.delete(`/knowledge/documents/${docId}`);
  },

  // 语义检索
  search: (courseId: string, query: string, topK: number = 5): Promise<SearchResponse> => {
    return apiClient.post('/knowledge/search', { course_id: courseId, query, top_k: topK });
  },
};
