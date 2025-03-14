import { useEffect } from 'react'
import { ThemeToggle } from './components/theme-toggle'

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
