import { useState, useEffect } from 'react'

const InteractiveTripForm = ({ onTripSaved, showMessage }) => {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const [progress, setProgress] = useState(25)
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [formData, setFormData] = useState({
    tripNumber: '',
    originLat: '',
    originLng: '',
    originPlace: '',
    startTime: '',
    destinationLat: '',
    destinationLng: '',
    destinationPlace: '',
    endTime: '',
    mode: '',
    distance: '',
    purpose: '',
    companions: '',
    frequency: '',
    cost: ''
  })

  const totalSteps = 4

  const calculatePrice = (mode, distance, companions = 0, purpose = '') => {
    if (!mode || !distance) return 0
    
    const basePrices = {
      walking: 0,
      cycling: 5, // Bike rental/maintenance
      car: 12, // Fuel per km
      bus: 8, // Per km
      train: 6, // Per km
      flight: 4500 // Base price + per km
    }
    
    let price = basePrices[mode] * parseFloat(distance)
    
    // Flight special calculation
    if (mode === 'flight') {
      price = 4500 + (parseFloat(distance) * 3) // Base + per km
    }
    
    // Companion multiplier
    if (companions > 0 && ['car', 'flight'].includes(mode)) {
      price *= (1 + companions * 0.3) // 30% more per companion
    }
    
    // Purpose-based adjustments
    if (purpose === 'medical') price *= 1.5 // Emergency surge
    if (purpose === 'work') price *= 1.2 // Peak hours
    if (purpose === 'education') price *= 0.8 // Student discount
    
    // Eco-friendly bonus
    if (['walking', 'cycling'].includes(mode)) {
      price = Math.max(0, price - 20) // Eco bonus
    }
    
    // Weekend surge (random factor for realism)
    const isWeekend = new Date().getDay() % 6 === 0
    if (isWeekend && ['car', 'bus'].includes(mode)) {
      price *= 1.3
    }
    
    return Math.round(price)
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Auto-suggest for destination place
    if (field === 'destinationPlace' && value.length > 2) {
      getSuggestions(value)
    } else if (field === 'destinationPlace' && value.length <= 2) {
      setShowSuggestions(false)
    }
    
    if (['originLat', 'originLng', 'destinationLat', 'destinationLng'].includes(field)) {
      const { originLat, originLng, destinationLat, destinationLng } = { ...formData, [field]: value }
      if (originLat && originLng && destinationLat && destinationLng) {
        const distance = calculateDistance(
          parseFloat(originLat), parseFloat(originLng),
          parseFloat(destinationLat), parseFloat(destinationLng)
        )
        const distanceKm = distance.toFixed(2)
        setFormData(prev => ({ ...prev, distance: distanceKm }))
        
        // Auto-calculate price if mode is selected
        if (formData.mode) {
          const autoPrice = calculatePrice(
            formData.mode,
            distanceKm,
            parseInt(formData.companions) || 0,
            formData.purpose
          )
          if (autoPrice > 0) {
            setFormData(prev => ({ ...prev, distance: distanceKm, cost: autoPrice }))
            showMessage(`📍 Distance: ${distanceKm}km • 💰 Cost: ₹${autoPrice}`, 'success')
          }
        }
      }
    }
    
    // Auto-calculate price when mode, distance, companions, or purpose changes
    if (['mode', 'distance', 'companions', 'purpose'].includes(field)) {
      const updatedData = { ...formData, [field]: value }
      const autoPrice = calculatePrice(
        updatedData.mode,
        updatedData.distance,
        parseInt(updatedData.companions) || 0,
        updatedData.purpose
      )
      if (autoPrice > 0) {
        setFormData(prev => ({ ...prev, [field]: value, cost: autoPrice }))
        if (autoPrice !== parseInt(formData.cost)) {
          showMessage(`💰 Updated cost: ₹${autoPrice} (${updatedData.distance}km)`, 'info')
        }
        return
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

  const getSuggestions = async (query) => {
    if (query.length < 3) return
    
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', India')}&limit=5&addressdetails=1&countrycodes=in`)
      const results = await response.json()
      
      if (results && results.length > 0) {
        const suggestionList = results.map(place => ({
          name: place.display_name,
          lat: place.lat,
          lon: place.lon
        }))
        setSuggestions(suggestionList)
        setShowSuggestions(true)
      }
    } catch (error) {
      console.log('Suggestions failed:', error)
    }
  }

  const selectSuggestion = (suggestion) => {
    const lat = parseFloat(suggestion.lat).toFixed(6)
    const lng = parseFloat(suggestion.lon).toFixed(6)
    const time = new Date().toISOString().slice(0, 16)
    const placeName = suggestion.name.split(',').slice(0, 3).join(', ')
    
    console.log('Selecting suggestion:', { lat, lng, placeName })
    
    setFormData(prev => ({ 
      ...prev, 
      destinationLat: lat, 
      destinationLng: lng, 
      destinationPlace: placeName,
      endTime: time 
    }))
    
    setShowSuggestions(false)
    showMessage(`📍 Selected: ${placeName}`, 'success')
  }

  const searchDestination = async () => {
    const query = formData.destinationPlace.trim()
    if (!query) {
      showMessage('Please enter a pincode or place name', 'error')
      return
    }

    showMessage('🔍 Searching...', 'info')
    
    try {
      let results = []
      
      // Try multiple search strategies
      const searchQueries = [
        `${query}, India`,
        query,
        `pincode ${query}, India`
      ]
      
      for (const searchQuery of searchQueries) {
        try {
          console.log('Searching for:', searchQuery)
          const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1&countrycodes=in`)
          
          if (!response.ok) {
            console.log('API response not ok:', response.status)
            continue
          }
          
          const data = await response.json()
          console.log('Search results:', data)
          
          if (data && data.length > 0) {
            results = data
            break
          }
        } catch (apiError) {
          console.log('API call failed:', apiError)
          continue
        }
      }
      
      if (results.length > 0) {
        const place = results[0]
        const lat = parseFloat(place.lat).toFixed(6)
        const lng = parseFloat(place.lon).toFixed(6)
        const time = new Date().toISOString().slice(0, 16)
        
        // Extract detailed place name
        let placeName = place.display_name
        if (placeName.includes(',')) {
          placeName = placeName.split(',').slice(0, 3).join(', ')
        }
        
        console.log('Found location:', { lat, lng, placeName })
        
        setFormData(prev => ({ 
          ...prev, 
          destinationLat: lat, 
          destinationLng: lng, 
          destinationPlace: placeName,
          endTime: time 
        }))
        
        showMessage(`📍 Found: ${placeName}`, 'success')
      } else {
        showMessage('❌ Location not found. Try: pincode (110001) or place name (Delhi)', 'error')
      }
    } catch (error) {
      console.error('Search error:', error)
      showMessage('❌ Search failed. Check internet connection.', 'error')
    }
  }

  const detectLocation = async (type) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude.toFixed(6)
          const lng = position.coords.longitude.toFixed(6)
          const time = new Date().toISOString().slice(0, 16)
          
          // Get exact place name using reverse geocoding
          let placeName = 'Current Location'
          try {
            const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`)
            const data = await response.json()
            
            // Build very detailed address with exact location
            const addressParts = []
            
            // Street/Road name
            if (data.localityInfo?.informative?.[0]?.name) {
              addressParts.push(data.localityInfo.informative[0].name)
            }
            
            // Neighborhood/Area (most specific)
            if (data.localityInfo?.administrative?.[4]?.name) {
              addressParts.push(data.localityInfo.administrative[4].name)
            } else if (data.localityInfo?.administrative?.[3]?.name) {
              addressParts.push(data.localityInfo.administrative[3].name)
            }
            
            // District/Suburb
            if (data.localityInfo?.administrative?.[2]?.name) {
              addressParts.push(data.localityInfo.administrative[2].name)
            }
            
            // City/Town
            if (data.locality) {
              addressParts.push(data.locality)
            } else if (data.city) {
              addressParts.push(data.city)
            }
            
            // State/Province
            if (data.principalSubdivision) {
              addressParts.push(data.principalSubdivision)
            }
            
            // Find nearby colleges and places of interest
            let nearbyPlaces = []
            try {
              // Search for nearby educational institutions and landmarks
              const nearbyResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=json&lat=${lat}&lon=${lng}&addressdetails=1&limit=10&radius=1000&amenity=university,college,school&building=university,college,school`)
              const nearbyData = await nearbyResponse.json()
              
              // Also search for other points of interest
              const poiResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=json&lat=${lat}&lon=${lng}&addressdetails=1&limit=5&radius=500&amenity=hospital,shopping_mall,restaurant,bank,library,museum`)
              const poiData = await poiResponse.json()
              
              // Combine and filter results
              const allNearby = [...nearbyData, ...poiData]
              nearbyPlaces = allNearby
                .filter(place => place.display_name && place.lat && place.lon)
                .map(place => {
                  const distance = calculateDistance(
                    parseFloat(lat), parseFloat(lng),
                    parseFloat(place.lat), parseFloat(place.lon)
                  )
                  return {
                    name: place.display_name.split(',')[0],
                    type: place.amenity || place.building || 'landmark',
                    distance: distance.toFixed(2)
                  }
                })
                .filter(place => parseFloat(place.distance) < 1) // Within 1km
                .sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance))
                .slice(0, 3) // Top 3 closest
            } catch (error) {
              console.log('Nearby places search failed:', error)
            }
            
            // Create detailed place name with nearby landmarks
            let baseAddress = addressParts.length > 0 ? 
                             addressParts.slice(0, Math.min(4, addressParts.length)).join(', ') :
                             'Current Location'
            
            if (nearbyPlaces.length > 0) {
              const nearbyText = nearbyPlaces.map(p => `${p.name} (${p.distance}km)`).join(', ')
              placeName = `${baseAddress} • Near: ${nearbyText}`
            } else {
              placeName = baseAddress
            }
                       
            console.log('Full geocoding data:', data)
            console.log('Nearby places:', nearbyPlaces)
            console.log('Final place name:', placeName)
          } catch (error) {
            console.log('Geocoding failed, using default name')
          }
          
          if (type === 'origin') {
            setFormData(prev => ({ ...prev, originLat: lat, originLng: lng, originPlace: placeName, startTime: time }))
          } else {
            setFormData(prev => ({ ...prev, destinationLat: lat, destinationLng: lng, destinationPlace: placeName, endTime: time }))
          }
          
          showMessage(type === 'origin' ? `📍 Origin set with nearby places` : `📍 Current location set as destination`, 'success')
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
      setShake(true)
      setTimeout(() => setShake(false), 500)
      showMessage('Please fill in all required fields', 'error')
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => prev - 1)
  }

  useEffect(() => {
    setProgress((currentStep / totalSteps) * 100)
  }, [currentStep])

  const addRippleEffect = (e) => {
    const button = e.currentTarget
    button.classList.add('button-ripple')
    setTimeout(() => button.classList.remove('button-ripple'), 600)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    console.log('=== SAVING TRIP NOW ===')
    console.log('Form data:', formData)

    const payload = {
      trip_number: parseInt(formData.tripNumber) || Math.floor(Math.random() * 1000),
      origin_lat: parseFloat(formData.originLat) || 0,
      origin_lng: parseFloat(formData.originLng) || 0,
      origin_place: formData.originPlace || 'Unknown Location',
      start_time: formData.startTime || new Date().toISOString(),
      destination_lat: parseFloat(formData.destinationLat) || 0,
      destination_lng: parseFloat(formData.destinationLng) || 0,
      destination_place: formData.destinationPlace || 'Unknown Location',
      end_time: formData.endTime || new Date().toISOString(),
      mode: formData.mode || 'car',
      distance: parseFloat(formData.distance) || 1,
      purpose: formData.purpose || 'other',
      companions: parseInt(formData.companions) || 0,
      frequency: formData.frequency || 'rarely',
      cost: parseFloat(formData.cost) || 0
    }
    
    console.log('Sending payload:', payload)

    setLoading(true)
    try {
      const response = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      console.log('Response status:', response.status)
      console.log('Response headers:', response.headers.get('content-type'))
      
      let result = {}
      const text = await response.text()
      console.log('Raw response:', text)
      
      if (text) {
        try {
          result = JSON.parse(text)
        } catch (parseError) {
          console.error('JSON parse error:', parseError)
          showMessage('❌ Invalid server response', 'error')
          return
        }
      }
      
      console.log('Parsed response data:', result)

      if (response.ok) {
        console.log('Trip saved successfully!')
        showMessage('✅ Trip saved successfully!', 'success')
        setFormData({
          tripNumber: '', originLat: '', originLng: '', originPlace: '', startTime: '',
          destinationLat: '', destinationLng: '', destinationPlace: '', endTime: '', mode: '',
          distance: '', purpose: '', companions: '', frequency: '', cost: ''
        })
        setCurrentStep(1)
        onTripSaved()
      } else {
        console.log('Server error:', result)
        showMessage('❌ Error: ' + (result.error || 'Unknown error'), 'error')
      }
    } catch (error) {
      console.error('Network error:', error)
      showMessage('🌐 Network error: ' + error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="progress-bar" style={{ width: `${progress}%` }}></div>
      <form onSubmit={handleSubmit} className={shake ? 'shake' : ''}>
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
            <button 
              type="button" 
              className="next-btn floating" 
              onClick={(e) => { addRippleEffect(e); nextStep(); }}
            >
              Next →
            </button>
          </div>
        )}

        {currentStep === 2 && (
          <div className="step">
            <h3>Step 2: Origin Location</h3>
            <div className="location-section">
              <button 
                type="button" 
                className="floating"
                onClick={(e) => { addRippleEffect(e); detectLocation('origin'); }}
              >
                📍 Detect Current Location
              </button>
              <input
                type="text"
                placeholder="Place name (e.g., Home, Office, Mall)"
                value={formData.originPlace}
                onChange={(e) => handleInputChange('originPlace', e.target.value)}
                style={{ marginBottom: '10px' }}
              />
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
              <button 
                type="button" 
                className="prev-btn" 
                onClick={(e) => { addRippleEffect(e); prevStep(); }}
              >
                ← Previous
              </button>
              <button 
                type="button" 
                className="next-btn" 
                onClick={(e) => { addRippleEffect(e); nextStep(); }}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="step">
            <h3>Step 3: Destination Location</h3>
            <div className="location-section">
              <div className="destination-options">
                <div className="search-container">
                  <input
                    type="text"
                    placeholder="Enter pincode or place name (e.g., 110001, Delhi University)"
                    value={formData.destinationPlace}
                    onChange={(e) => handleInputChange('destinationPlace', e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchDestination())}
                    onFocus={() => formData.destinationPlace.length > 2 && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    style={{ marginBottom: '10px', width: '100%' }}
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="suggestions-dropdown">
                      {suggestions.map((suggestion, index) => (
                        <div 
                          key={index} 
                          className="suggestion-item"
                          onClick={() => selectSuggestion(suggestion)}
                        >
                          📍 {suggestion.name.split(',').slice(0, 3).join(', ')}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button 
                  type="button" 
                  className="floating"
                  onClick={(e) => { addRippleEffect(e); searchDestination(); }}
                >
                  🔍 Search Destination
                </button>
                <button 
                  type="button" 
                  className="floating secondary"
                  onClick={(e) => { addRippleEffect(e); detectLocation('destination'); }}
                  style={{ marginLeft: '10px' }}
                >
                  📍 Use Current Location
                </button>
              </div>
              <div className="form-row">
                <input
                  type="number"
                  placeholder="Latitude"
                  step="any"
                  value={formData.destinationLat}
                  onChange={(e) => handleInputChange('destinationLat', e.target.value)}
                  required
                  readOnly
                  style={{ backgroundColor: '#f8f9fa' }}
                />
                <input
                  type="number"
                  placeholder="Longitude"
                  step="any"
                  value={formData.destinationLng}
                  onChange={(e) => handleInputChange('destinationLng', e.target.value)}
                  required
                  readOnly
                  style={{ backgroundColor: '#f8f9fa' }}
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
              <button 
                type="button" 
                className="prev-btn" 
                onClick={(e) => { addRippleEffect(e); prevStep(); }}
              >
                ← Previous
              </button>
              <button 
                type="button" 
                className="next-btn" 
                onClick={(e) => { addRippleEffect(e); nextStep(); }}
              >
                Next →
              </button>
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
                <option value="walking">🚶 Walking</option>
                <option value="cycling">🚴 Cycling</option>
                <option value="car">🚗 Car</option>
                <option value="bus">🚌 Bus</option>
                <option value="train">🚆 Train</option>
                <option value="flight">✈️ Flight</option>
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
                <option value="work">💼 Work</option>
                <option value="education">📚 Education</option>
                <option value="shopping">🛒 Shopping</option>
                <option value="recreation">🎯 Recreation</option>
                <option value="medical">🏥 Medical</option>
                <option value="other">📋 Other</option>
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
                <option value="daily">📅 Daily</option>
                <option value="weekly">📆 Weekly</option>
                <option value="monthly">🗓️ Monthly</option>
                <option value="rarely">⏰ Rarely</option>
              </select>
            </div>
            <div className="form-group">
              <label>Cost (₹): {formData.cost > 0 && <span style={{fontSize: '12px', color: '#28a745'}}>✨ Auto-calculated</span>}</label>
              <input
                type="number"
                step="1"
                min="0"
                value={formData.cost}
                onChange={(e) => handleInputChange('cost', e.target.value)}
                required
                style={{ backgroundColor: formData.cost > 0 ? '#f0fff4' : 'white' }}
              />
              {formData.mode === 'walking' && <div style={{fontSize: '11px', color: '#28a745', marginTop: '5px'}}>🌱 Eco-friendly choice!</div>}
              {formData.mode === 'cycling' && <div style={{fontSize: '11px', color: '#28a745', marginTop: '5px'}}>🚴 Great for health & environment!</div>}
              {formData.purpose === 'education' && <div style={{fontSize: '11px', color: '#007bff', marginTop: '5px'}}>🎓 Student discount applied!</div>}
              {formData.purpose === 'medical' && <div style={{fontSize: '11px', color: '#dc3545', marginTop: '5px'}}>🏥 Emergency pricing</div>}
            </div>
            <div className="step-buttons">
              <button 
                type="button" 
                className="prev-btn" 
                onClick={(e) => { addRippleEffect(e); prevStep(); }}
              >
                ← Previous
              </button>
              <button 
                type="submit" 
                className={`submit-btn ${loading ? '' : 'bounce'}`}
                disabled={loading}
                onClick={addRippleEffect}
              >
                {loading ? '⏳ Saving...' : '💾 Save Trip'}
              </button>
            </div>
          </div>
        )}
      </form>
    </>
  )
}

export default InteractiveTripForm