import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Moon, Sun, Menu } from 'lucide-react'
import { Button } from './ui/button'
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGolfBallTee, faGear, faHome } from '@fortawesome/free-solid-svg-icons'

export function MenuBar(): JSX.Element {
  const [mounted, setMounted] = useState(false)
  const location = useLocation()
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Prevent hydration mismatch by only rendering theme components after mount
  useEffect(() => {
    setMounted(true)
    window.darkMode.isDark().then(setIsDarkMode)
  }, [])

  const toggleTheme = async (): Promise<void> => {
    await window.darkMode.toggle()
    const newIsDark = await window.darkMode.isDark()
    setIsDarkMode(newIsDark)
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(newIsDark ? 'dark' : 'light')
  }

  const navItems = [
    { name: 'Home', href: '/', icon: faHome },
    { name: 'Golf Shots', href: '/golf-shots', icon: faGolfBallTee },
    { name: 'Settings', href: '/settings', icon: faGear }
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* App Name */}
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2">
            <FontAwesomeIcon icon={faGolfBallTee} />
            <span className="text-xl font-bold">GSPro Connector</span>
          </Link>
        </div>

        {/* Mobile Navigation */}
        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" aria-label="Menu">
              <Menu className="h-6 w-6 text-foreground" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[240px] sm:w-[300px]">
            <nav className="grid gap-6 pt-6">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`flex items-center gap-2 px-2 py-1 text-lg font-medium ${
                      location.pathname === item.href
                        ? 'text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <FontAwesomeIcon icon={Icon} className="h-5 w-5" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
            {/* Theme Toggle (Mobile) */}
            <div className="absolute bottom-4 right-4">
              {mounted && (
                <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
                  {isDarkMode ? (
                    <Moon className="h-5 w-5 text-foreground" />
                  ) : (
                    <Sun className="h-5 w-5 text-foreground" />
                  )}
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex md:items-center md:gap-6">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-2 px-2 py-1 text-sm font-medium ${
                  location.pathname === item.href
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <FontAwesomeIcon icon={Icon} className="h-4 w-4" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Theme Toggle (Desktop) */}
        <div className="hidden items-center gap-2 md:flex">
          {mounted && (
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
              {isDarkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
