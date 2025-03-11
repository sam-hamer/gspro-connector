import { useEffect, useState } from 'react'

function ThemeToggle(): JSX.Element {
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    // Initialize the state
    window.darkMode.isDark().then(setIsDarkMode)
  }, [])

  const toggleTheme = async (): Promise<void> => {
    await window.darkMode.toggle()
    const newIsDark = await window.darkMode.isDark()
    setIsDarkMode(newIsDark)
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(newIsDark ? 'dark' : 'light')
  }

  const setSystemTheme = async (): Promise<void> => {
    await window.darkMode.system()
    const isDark = await window.darkMode.isDark()
    setIsDarkMode(isDark)
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(isDark ? 'dark' : 'light')
  }

  return (
    <div className="flex gap-4">
      <button
        className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md"
        onClick={toggleTheme}
      >
        {isDarkMode ? 'Switch to Light' : 'Switch to Dark'}
      </button>
      <button
        className="bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2 rounded-md"
        onClick={setSystemTheme}
      >
        System Theme
      </button>
    </div>
  )
}

function App(): JSX.Element {
  useEffect(() => {
    const initTheme = async (): Promise<void> => {
      await window.darkMode.system()
      const isDark = await window.darkMode.isDark()
      document.documentElement.classList.remove('light', 'dark')
      document.documentElement.classList.add(isDark ? 'dark' : 'light')
    }

    void initTheme()
  }, [])

  return (
    <div className="flex flex-col h-screen bg-background text-foreground p-4 gap-4">
      <div className="text-3xl font-bold">GSPro Connector</div>
      <ThemeToggle />
    </div>
  )
}

export default App
