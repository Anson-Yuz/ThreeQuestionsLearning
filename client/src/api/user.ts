import { apiClient } from './client'

export interface WeeklyTrendItem {
  day: string
  value: number
  seconds: number
}

export const userApi = {
  getWeeklyTrend: (): Promise<{ trend: WeeklyTrendItem[] }> => {
    return apiClient.get('/user/weekly-trend')
  },

  exportData: async (): Promise<void> => {
    const response = await fetch('/api/user/export')
    if (!response.ok) throw new Error('导出失败')
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `learning_data_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  },
}