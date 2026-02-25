'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  BookOpen, 
  LayoutDashboard, 
  GraduationCap, 
  User, 
  LogOut, 
  Menu, 
  X 
} from 'lucide-react'

interface NavbarProps {
  userRole: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN' | 'SUPERADMIN'
  userName: string
}

export default function Navbar({ userRole, userName }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const getNavItems = () => {
    switch (userRole) {
      case 'STUDENT':
        return [
          { href: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { href: '/student/courses', label: 'Courses', icon: BookOpen },
          { href: '/student/profile', label: 'Profile', icon: User },
        ]
      case 'INSTRUCTOR':
        return [
          { href: '/instructor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { href: '/instructor/courses', label: 'My Courses', icon: BookOpen },
          { href: '/instructor/students', label: 'Students', icon: User },
        ]
      case 'ADMIN':
      case 'SUPERADMIN':
        return [
          { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { href: '/admin/users', label: 'Users', icon: User },
          { href: '/admin/courses', label: 'Courses', icon: BookOpen },
        ]
      default:
        return []
    }
  }

  const navItems = getNavItems()

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-lg sticky top-0 z-50 backdrop-blur-lg bg-opacity-80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href={`/${userRole.toLowerCase()}/dashboard`} className="flex items-center space-x-2">
              <GraduationCap className="h-8 w-8 text-primary-600" />
              <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
                LMS Pro
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              )
            })}
            
            <div className="flex items-center space-x-3 pl-4 border-l border-gray-300 dark:border-gray-700">
              <div className="text-right">
                <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                  {userName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {userRole === 'SUPERADMIN' ? 'Super Admin' : 
                   userRole === 'ADMIN' ? 'Admin' :
                   userRole === 'INSTRUCTOR' ? 'Instructor' : 'Student'}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all duration-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
              >
                <LogOut className="h-5 w-5" />
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 animate-slide-down">
          <div className="px-4 pt-2 pb-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              )
            })}
            
            <div className="pt-3 border-t border-gray-200 dark:border-gray-800">
              <p className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                Logged in as: <span className="font-medium text-gray-900 dark:text-white">{userName}</span>
              </p>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all duration-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
              >
                <LogOut className="h-5 w-5" />
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
