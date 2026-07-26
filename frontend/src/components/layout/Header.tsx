/**
 * CultureFlow — Top Header Bar
 */

import { Menu, Bell, Sun, Moon, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { cn, getInitials } from '@/utils'
import { useState, useEffect } from 'react'

interface HeaderProps {
  onMenuClick: () => void
  title?: string
}

export default function Header({ onMenuClick, title }: HeaderProps) {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    const dark = stored !== 'light'
    setIsDark(dark)
    document.documentElement.classList.toggle('dark', dark)
  }, [])

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <header className="flex items-center gap-3 px-4 sm:px-6 h-16 border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm shrink-0">
      {/* Mobile menu toggle */}
      <button
        onClick={onMenuClick}
        className="lg:hidden btn-ghost btn-md p-2"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Page title */}
      {title && (
        <h1 className="text-base font-semibold text-gray-100 hidden sm:block">{title}</h1>
      )}

      {/* Search shortcut */}
      <button
        onClick={() => navigate('/search')}
        className={cn(
          'hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg',
          'bg-gray-800 border border-gray-700 text-gray-500',
          'hover:border-gray-600 hover:text-gray-400 transition-colors text-sm',
          'cursor-text flex-1 max-w-xs'
        )}
        aria-label="Search"
      >
        <Search className="w-4 h-4 shrink-0" />
        <span>Search anything…</span>
        <kbd className="ml-auto text-xs bg-gray-700/60 px-1.5 py-0.5 rounded font-mono text-gray-500">
          /
        </kbd>
      </button>

      <div className="flex items-center gap-1 ml-auto">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="btn-ghost btn-md p-2"
          aria-label="Toggle theme"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications (placeholder) */}
        <button
          className="btn-ghost btn-md p-2 relative"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-teal-400 rounded-full" />
        </button>

        {/* User avatar */}
        <button
          onClick={() => navigate('/profile')}
          className="w-8 h-8 rounded-full bg-teal-600/30 border border-teal-600/40
                     flex items-center justify-center ml-1 hover:border-teal-500
                     transition-colors"
          aria-label="Profile"
        >
          <span className="text-xs font-semibold text-teal-300">
            {user ? getInitials(user.full_name) : '?'}
          </span>
        </button>
      </div>
    </header>
  )
}
