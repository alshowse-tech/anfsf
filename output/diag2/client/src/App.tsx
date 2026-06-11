// [generated]
import { useEffect, useState } from 'react'
import HelloWorld from './components/HelloWorld'

function App() {
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    // TODO: implement hello API call
    const fetchHello = async () => {
      const res = await fetch('/api/hello')
      const data = await res.json()
      setMessage(data.message)
    }
    fetchHello()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <HelloWorld message={message ?? 'Loading...'} />
    </div>
  )
}

export default App
