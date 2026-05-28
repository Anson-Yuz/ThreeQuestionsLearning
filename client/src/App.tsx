import { Routes, Route, Navigate } from 'react-router-dom'
import TabBarLayout from './components/layout/TabBarLayout'
import Home from './pages/Home'
import LearningSpace from './pages/LearningSpace'
import QuizCenter from './pages/QuizCenter'
import Profile from './pages/Profile'

function App() {
  return (
    <Routes>
      <Route path="/" element={<TabBarLayout />}>
        <Route index element={<Navigate to="/home" replace />} />
        <Route path="home" element={<Home />} />
        <Route path="profile" element={<Profile />} />
      </Route>
      <Route path="/learning/:courseId" element={<LearningSpace />} />
      <Route path="/quiz/:courseId" element={<QuizCenter />} />
    </Routes>
  )
}

export default App