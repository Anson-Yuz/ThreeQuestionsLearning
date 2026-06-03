import { create } from 'zustand';
import { coursesApi, Course } from '../api/courses';

interface CourseStore {
  courses: Course[];
  loading: boolean;
  error: string | null;

  fetchCourses: (status?: string) => Promise<void>;
  createCourse: (question: string) => Promise<Course | null>;
  deleteCourse: (courseId: string) => Promise<void>;
  archiveCourse: (courseId: string) => Promise<void>;
  restoreCourse: (courseId: string) => Promise<void>;
}

export const useCourseStore = create<CourseStore>((set, get) => ({
  courses: [],
  loading: false,
  error: null,

  fetchCourses: async (status?: string) => {
    set({ loading: true, error: null });
    try {
      const res = await coursesApi.list(status);
      set({ courses: res.courses, loading: false });
    } catch (e: any) {
      set({ error: e.message || '加载课程失败', loading: false });
    }
  },

  createCourse: async (question: string) => {
    set({ loading: true, error: null });
    try {
      const course = await coursesApi.create(question);
      set((state) => ({
        courses: [course as unknown as Course, ...state.courses],
        loading: false,
      }));
      return course as unknown as Course;
    } catch (e: any) {
      set({ error: e.message || '创建课程失败', loading: false });
      return null;
    }
  },

  deleteCourse: async (courseId: string) => {
    try {
      await coursesApi.delete(courseId);
      set((state) => ({
        courses: state.courses.filter((c) => c.id !== courseId),
      }));
    } catch (e: any) {
      set({ error: e.message || '删除课程失败' });
    }
  },

  archiveCourse: async (courseId: string) => {
    try {
      await coursesApi.archive(courseId);
      set((state) => ({
        courses: state.courses.map((c) =>
          c.id === courseId ? { ...c, status: 'archived' as const } : c
        ),
      }));
    } catch (e: any) {
      set({ error: e.message || '归档失败' });
    }
  },

  restoreCourse: async (courseId: string) => {
    try {
      await coursesApi.restore(courseId);
      set((state) => ({
        courses: state.courses.map((c) =>
          c.id === courseId ? { ...c, status: 'active' as const } : c
        ),
      }));
    } catch (e: any) {
      set({ error: e.message || '恢复失败' });
    }
  },
}));
