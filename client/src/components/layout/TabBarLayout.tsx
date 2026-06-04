import { Outlet, NavLink } from 'react-router-dom'
import { HomeIcon, PersonIcon } from '../ui/Icons'

interface TabBarLayoutProps {
  hideTabBar?: boolean
}

const TabBarLayout = ({ hideTabBar = false }: TabBarLayoutProps) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col">
      <main className="flex-1 pb-16">
        <Outlet />
      </main>

      {hideTabBar ? null : (
        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 safe-area-bottom">
          <div className="flex justify-around items-center h-14">
            <NavLink
              to="/home"
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-4 py-1 ${
                  isActive ? 'text-blue-500' : 'text-gray-400'
                }`
              }
            >
              <HomeIcon className="w-6 h-6" />
              <span className="text-[10px]">首页</span>
            </NavLink>

            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-4 py-1 ${
                  isActive ? 'text-blue-500' : 'text-gray-400'
                }`
              }
            >
              <PersonIcon className="w-6 h-6" />
              <span className="text-[10px]">我的</span>
            </NavLink>
          </div>
        </nav>
      )}
    </div>
  )
}

export default TabBarLayout