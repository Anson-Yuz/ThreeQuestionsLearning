import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'light' | 'dark'

interface ThemeStore {
  theme: Theme
  isDark: boolean
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'light',
      isDark: false,

      setTheme: (theme) => {
        const isDark = theme === 'dark'
        if (isDark) {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
        set({ theme, isDark })
      },

      toggleTheme: () => {
        const newTheme = get().theme === 'light' ? 'dark' : 'light'
        get().setTheme(newTheme)
      }
    }),
    { name: 'theme-storage' }
  )
)

export const initTheme = () => {
  const saved = localStorage.getItem('theme-storage')
  if (saved) {
    try {
      const { state } = JSON.parse(saved)
      if (state.theme === 'dark') {
        document.documentElement.classList.add('dark')
      }
    } catch (e) {
      console.error('Failed to load theme', e)
    }
  }
}