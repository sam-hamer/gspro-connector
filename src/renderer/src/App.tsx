import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { MenuBar } from './components/menu-bar'
import HomePage from './app/page'
import GolfShotsPage from './app/golf-shots/page'
import SettingsPage from './app/settings/page'

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
    <div className="flex flex-col h-screen bg-background text-foreground">
      <MenuBar />
      <main className="flex-1 p-4">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/golf-shots" element={<GolfShotsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
