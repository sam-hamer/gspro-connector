export {}

declare global {
  interface Window {
    darkMode: {
      toggle: () => Promise<boolean>
      system: () => Promise<void>
      isDark: () => Promise<boolean>
    }
  }
}
