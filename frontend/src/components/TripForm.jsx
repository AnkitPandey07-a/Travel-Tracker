import { useState } from 'react'

const TripForm = ({ onTripSaved, showMessage }) => {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    tripNumber: '',
    originLat: '',
    originLng: '',
    startTime: '',
    destinationLat: '',
    destinationLng: '',
    endTime: '',
    mode: '',
    distance: '',
    purpose: '',
    companions: '',
    frequency: '',
    cost: ''
  })

  const totalSteps = 4

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Auto-calculate distance when coordinates change
    if (['originLat', 'originLng', 'destinationLat', 'destinationLng'].includes(field)) {
      const { originLat, originLng, destinationLat, destinationLng } = { ...formData, [field]: value }
      if (originLat && originLng && destinationLat && destinationLng) {
        const distance = calculateDistance(
          parseFloat(originLat), parseFloat(originLng),
          parseFloat(destinationLat), parseFloat(destinationLng)
        )
        setFormData(prev => ({ ...prev, distance: distance.toFixed(2) }))
      }
    }
  }

  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  const detectLocation = (type) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude.toFixed(6)
          const lng = position.coords.longitude.toFixed(6)
          const time = new Date().toISOString().slice(0, 16)
          
          if (type === 'origin') {
            setFormData(prev => ({ ...prev, originLat: lat, originLng: lng, startTime: time }))
          } else {
            setFormData(prev => ({ ...prev, destinationLat: lat, destinationLng: lng, endTime: time }))
          }
          
          showMessage('📍 Location detected successfully!', 'success')
        },
        () => showMessage('❌ Location detection failed', 'error')
      )
    } else {
      showMessage('❌ Geolocation not supported', 'error')
    }
  }

  const validateStep = (step) => {
    const requiredFields = {
      1: ['tripNumber'],
      2: ['originLat', 'originLng', 'startTime'],
      3: ['destinationLat', 'destinationLng', 'endTime'],
      4: ['mode', 'distance', 'purpose', 'companions', 'frequency', 'cost']
    }
    
    return requiredFields[step].every(field => formData[field])
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1)
    } else {
      showMessage('Please fill in all required fields', 'error')
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => prev - 1)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateStep(4)) {
      showMessage('Please fill in all required fields', 'error')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trip_number: parseInt(formData.tripNumber),
          origin_lat: parseFloat(formData.originLat),
          origin_lng: parseFloat(formData.originLng),
          start_time: formData.startTime,
          destination_lat: parseFloat(formData.destinationLat),
          destination_lng: parseFloat(formData.destinationLng),
          end_time: formData.endTime,
          mode: formData.mode,
          distance: parseFloat(formData.distance),
          purpose: formData.purpose,
          companions: parseInt(formData.companions),
          frequency: formData.frequency,
          cost: parseFloat(formData.cost)
        })
      })

      if (response.ok) {
        setFormData({
          tripNumber: '', originLat: '', originLng: '', startTime: '',
          destinationLat: '', destinationLng: '', endTime: '', mode: '',
          distance: '', purpose: '', companions: '', frequency: '', cost: ''
        })
        setCurrentStep(1)
        onTripSaved()
      } else {
        const result = await response.json()
        showMessage('❌ Error: ' + result.error, 'error')
      }
    } catch (error) {
      showMessage('🌐 Network error', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="step-indicator">
        {[1, 2, 3, 4].map(step => (
          <div key={step} className={`step-dot ${step === currentStep ? 'active' : step < currentStep ? 'completed' : ''}`}>
            {step}
          </div>
        ))}
      </div>

      {currentStep === 1 && (
        <div className="step">
          <h3>Step 1: Trip Information</h3>
          <div className="form-group">
            <label>Trip Number:</label>
            <input
              type="number"
              value={formData.tripNumber}
              onChange={(e) => handleInputChange('tripNumber', e.target.value)}
              required
            />
          </div>
          <button type="button" className="next-btn" onClick={nextStep}>Next</button>
        </div>
      )}

      {currentStep === 2 && (
        <div className="step">
          <h3>Step 2: Origin Location</h3>
          <div className="location-section">
            <button type="button" onClick={() => detectLocation('origin')}>
              Detect Current Location
            </button>
            <div className="form-row">
              <input
                type="number"
                placeholder="Latitude"
                step="any"
                value={formData.originLat}
                onChange={(e) => handleInputChange('originLat', e.target.value)}
                required
              />
              <input
                type="number"
                placeholder="Longitude"
                step="any"
                value={formData.originLng}
                onChange={(e) => handleInputChange('originLng', e.target.value)}
                required
              />
            </div>
            <input
              type="datetime-local"
              value={formData.startTime}
              onChange={(e) => handleInputChange('startTime', e.target.value)}
              required
            />
          </div>
          <div className="step-buttons">
            <button type="button" className="prev-btn" onClick={prevStep}>Previous</button>
            <button type="button" className="next-btn" onClick={nextStep}>Next</button>
          </div>
        </div>
      )}

      {currentStep === 3 && (
        <div className="step">
          <h3>Step 3: Destination Location</h3>
          <div className="location-section">
            <button type="button" onClick={() => detectLocation('destination')}>
              Detect Current Location
            </button>
            <div className="form-row">
              <input
                type="number"
                placeholder="Latitude"
                step="any"
                value={formData.destinationLat}
                onChange={(e) => handleInputChange('destinationLat', e.target.value)}
                required
              />
              <input
                type="number"
                placeholder="Longitude"
                step="any"
                value={formData.destinationLng}
                onChange={(e) => handleInputChange('destinationLng', e.target.value)}
                required
              />
            </div>
            <input
              type="datetime-local"
              value={formData.endTime}
              onChange={(e) => handleInputChange('endTime', e.target.value)}
              required
            />
          </div>
          <div className="step-buttons">
            <button type="button" className="prev-btn" onClick={prevStep}>Previous</button>
            <button type="button" className="next-btn" onClick={nextStep}>Next</button>
          </div>
        </div>
      )}

      {currentStep === 4 && (
        <div className="step">
          <h3>Step 4: Trip Details</h3>
          <div className="form-group">
            <label>Mode of Transport:</label>
            <select value={formData.mode} onChange={(e) => handleInputChange('mode', e.target.value)} required>
              <option value="">Select Mode</option>
              <option value="walking">Walking</option>
              <option value="cycling">Cycling</option>
              <option value="car">Car</option>
              <option value="bus">Bus</option>
              <option value="train">Train</option>
              <option value="flight">Flight</option>
            </select>
          </div>
          <div className="form-group">
            <label>Distance (km):</label>
            <input
              type="number"
              step="0.1"
              value={formData.distance}
              onChange={(e) => handleInputChange('distance', e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Trip Purpose:</label>
            <select value={formData.purpose} onChange={(e) => handleInputChange('purpose', e.target.value)} required>
              <option value="">Select Purpose</option>
              <option value="work">Work</option>
              <option value="education">Education</option>
              <option value="shopping">Shopping</option>
              <option value="recreation">Recreation</option>
              <option value="medical">Medical</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label>Number of Companions:</label>
            <input
              type="number"
              min="0"
              value={formData.companions}
              onChange={(e) => handleInputChange('companions', e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Frequency:</label>
            <select value={formData.frequency} onChange={(e) => handleInputChange('frequency', e.target.value)} required>
              <option value="">Select Frequency</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="rarely">Rarely</option>
            </select>
          </div>
          <div className="form-group">
            <label>Cost ($):</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.cost}
              onChange={(e) => handleInputChange('cost', e.target.value)}
              required
            />
          </div>
          <div className="step-buttons">
            <button type="button" className="prev-btn" onClick={prevStep}>Previous</button>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? '⏳ Saving...' : 'Save Trip'}
            </button>
          </div>
        </div>
      )}
    </form>
  )
}

export default TripForm