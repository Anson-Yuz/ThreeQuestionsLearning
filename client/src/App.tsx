import { Routes, Route, Navigate } from 'react-router-dom'
import TabBarLayout from './components/layout/TabBarLayout'
import Home from './pages/Home'
import LearningSpace from './pages/LearningSpace'
import QuizCenter from './pages/QuizCenter'
import Profile from './pages/Profile'

// 包装组件：隐藏 TabBar 的 TabBarLayout
const HideTabBarWrapper = ({ children }: { children: React.ReactNode }) => (
  <TabBarLayout hideTabBar>{children}</TabBarLayout>
)

function App() {
  return (
    <Routes>
      <Route path="/" element={<TabBarLayout />}>
        <Route index element={<Navigate to="/home" replace />} />
        <Route path="home" element={<Home />} />
        <Route path="profile" element={<Profile />} />
        <Route path="learning/:courseId" element={<LearningSpace />} />
        <Route path="quiz/:courseId" element={<QuizCenter />} />
      </Route>
    </Routes>
  )
}

export default App