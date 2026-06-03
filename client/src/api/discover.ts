import { apiClient } from './client'

export interface DiscoverResult {
  url: string
  title: string
  snippet: string
  score: number
}

export interface SyncSearchResponse {
  results: DiscoverResult[]
  total: number
}

export interface ImportResult {
  imported: number
  failed: number
  skipped: number
  doc_ids: string[]
  course_id: string
  details: { url: string; reason: string }[]
}

export const discoverApi = {
  syncSearch: (query: string) =>
    apiClient.post<SyncSearchResponse>('/search/sync', { query }),

  start: (courseId: string, query: string) =>
    apiClient.post('/search/discover', { course_id: courseId, query }),

  importUrls: (urls: string[], query: string, courseId?: string) =>
    apiClient.post<ImportResult>('/search/import-urls', {
      urls,
      query,
      course_id: courseId || '',
    }),
}
