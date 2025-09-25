import { useState, useEffect } from 'react'
import InteractiveTripForm from './components/InteractiveTripForm'
import TripsList from './components/TripsList'








function App() {
  const [trips, setTrips] = useState([])
  const [message, setMessage] = useState({ text: '', type: '' })

  const loadTrips = async () => {
    try {
      console.log('Loading trips from /api/trips')
      const response = await fetch('/api/trips')
      console.log('Response status:', response.status)
      
      if (!response.ok) {
        console.error('Server error:', response.status, response.statusText)
        setTrips([])
        return
      }
      
      const text = await response.text()
      console.log('Raw response length:', text.length)
      
      if (!text.trim()) {
        console.log('Empty response, setting empty trips array')
        setTrips([])
        return
      }
      
      try {
        const data = JSON.parse(text)
        console.log('Parsed trips data:', data)
        setTrips(Array.isArray(data) ? data : [])
      } catch (parseError) {
        console.error('JSON parse error:', parseError)
        console.error('Raw text that failed to parse:', text)
        setTrips([])
      }
    } catch (error) {
      console.error('Network error loading trips:', error)
      setTrips([])
    }
  }

  const showMessage = (text, type) => {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 3000)
  }

  const handleTripSaved = () => {
    showMessage('✅ Trip saved successfully!', 'success')
    loadTrips()
  }

  const handleTripDeleted = () => {
    showMessage('🗑️ Trip deleted successfully!', 'success')
    loadTrips()
  }

  useEffect(() => {
    loadTrips()
  }, [])

  return (
    <div className="container">
      <h1>Travel Trip Tracker</h1>
      
      <InteractiveTripForm onTripSaved={handleTripSaved} showMessage={showMessage} />
      
      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}
      
      <TripsList trips={trips} onTripDeleted={handleTripDeleted} showMessage={showMessage} />
    </div>
  )
}

export default App