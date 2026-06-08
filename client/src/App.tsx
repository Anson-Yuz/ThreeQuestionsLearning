import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import TabBarLayout from './components/layout/TabBarLayout'
import Home from './pages/Home'
import LearningSpace from './pages/LearningSpace'
import QuizCenter from './pages/QuizCenter'
import QuizPlay from './pages/QuizPlay'
import QuizReport from './pages/QuizReport'
import Profile from './pages/Profile'
import UploadHistory from './pages/UploadHistory'
import Settings from './pages/Settings'
import { initTheme } from './stores/themeStore'

function App() {
  useEffect(() => {
    initTheme()
  }, [])

  return (
    <Routes>
      <Route path="/" element={<TabBarLayout />}>
        <Route index element={<Navigate to="/home" replace />} />
               <Route path="home" element={<Home />} />
        <Route path="profile" element={<Profile />} />
        <Route path="upload-history" element={<UploadHistory />} />
        <Route path="settings" element={<Settings />} />
        <Route path="learning/:courseId" element={<LearningSpace />} />
        <Route path="quiz/:courseId" element={<QuizCenter />} />
      </Route>
      <Route path="/quiz/:courseId/play" element={<QuizPlay />} />
      <Route path="/quiz/:courseId/report" element={<QuizReport />} />
    </Routes>
  )
}

export default App