import { create } from 'zustand';
import { knowledgeApi, Document } from '../api/knowledge';

interface LearningStore {
  documents: Document[];
  loading: boolean;
  error: string | null;
  currentCourseId: string | null;

  setCurrentCourse: (courseId: string) => void;
  fetchDocuments: (courseId?: string) => Promise<void>;
  uploadDocument: (courseId: string, file: File, onProgress?: (p: number) => void) => Promise<void>;
  deleteDocument: (docId: string) => Promise<void>;
}

export const useLearningStore = create<LearningStore>((set, get) => ({
  documents: [],
  loading: false,
  error: null,
  currentCourseId: null,

  setCurrentCourse: (courseId: string) => {
    set({ currentCourseId: courseId });
  },

  fetchDocuments: async (courseId?: string) => {
    const cid = courseId || get().currentCourseId;
    if (!cid) return;

    set({ loading: true, error: null });
    try {
      const res = await knowledgeApi.list(cid);
      set({ documents: res.documents, loading: false });
    } catch (e: any) {
      set({ error: e.message || '加载资料失败', loading: false });
    }
  },

  uploadDocument: async (courseId: string, file: File, onProgress?: (p: number) => void) => {
    set({ loading: true, error: null });
    try {
      await knowledgeApi.upload(courseId, file, onProgress);
      // 重新加载资料列表
      const res = await knowledgeApi.list(courseId);
      set({ documents: res.documents, loading: false });
    } catch (e: any) {
      set({ error: e.message || '上传失败', loading: false });
    }
  },

  deleteDocument: async (docId: string) => {
    try {
      await knowledgeApi.delete(docId);
      set((state) => ({
        documents: state.documents.filter((d) => d.id !== docId),
      }));
    } catch (e: any) {
      set({ error: e.message || '删除失败' });
    }
  },
}));
