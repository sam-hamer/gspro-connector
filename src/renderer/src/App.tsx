import { Button } from './components/ui/button'

function App(): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground">
      <div className="text-3xl font-bold">GSPro Connector</div>
      <Button variant="success" className="cursor-pointer">
        Click me
      </Button>
    </div>
  )
}

export default App
