'use client'
import { Moon, Sun } from 'lucide-react'

import { Switch } from '../components/ui/switch'
import { useState } from 'react'
import { useEffect } from 'react'

export function ThemeToggle(): JSX.Element {
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    // Initialize the state
    window.electronAPI.darkMode.isDark().then(setIsDarkMode)
  }, [])

  const toggleTheme = async (): Promise<void> => {
    await window.electronAPI.darkMode.toggle()
    const newIsDark = await window.electronAPI.darkMode.isDark()
    setIsDarkMode(newIsDark)
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(newIsDark ? 'dark' : 'light')
  }

  return (
    <div className="flex items-center space-x-2 transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
      <Sun
        className={`h-[1.2rem] w-[1.2rem] transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          isDarkMode ? 'text-[#A1A1AA] scale-75 rotate-12' : 'text-foreground scale-100 rotate-0'
        }`}
      />
      <Switch
        checked={isDarkMode}
        onCheckedChange={toggleTheme}
        aria-label="Toggle theme"
        className="transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-110"
      />
      <Moon
        className={`h-[1.2rem] w-[1.2rem] transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          !isDarkMode ? 'text-[#A1A1AA] scale-75 rotate-12' : 'text-foreground scale-100 rotate-0'
        }`}
      />
    </div>
  )
}
