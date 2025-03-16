import { MenuBar } from '../components/menu-bar'
import { ThemeToggle } from '../components/theme-toggle'

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <MenuBar />
      <main className="flex-1 p-4">{children}</main>
      <div className="p-4">
        <ThemeToggle />
      </div>
    </div>
  )
}
