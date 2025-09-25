import { useState } from 'react'

const TripsList = ({ trips, onTripDeleted, showMessage }) => {
  const [deletingId, setDeletingId] = useState(null)
  
  const deleteTrip = async (tripId) => {
    console.log('Delete trip clicked for ID:', tripId)
    if (!confirm('Delete this trip?')) return

    setDeletingId(tripId)
    try {
      const response = await fetch(`/api/trips/${tripId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        onTripDeleted()
      } else {
        const result = await response.json()
        showMessage('❌ ' + (result.error || 'Failed to delete trip'), 'error')
      }
    } catch (error) {
      showMessage('🌐 Network error', 'error')
    } finally {
      setDeletingId(null)
    }
  }
  
  const deleteAllTrips = async () => {
    if (!confirm('Delete ALL trips? This cannot be undone!')) return
    
    setDeletingId('all')
    try {
      const response = await fetch('/api/trips', {
        method: 'DELETE'
      })
      
      if (response.ok) {
        const result = await response.json()
        showMessage(`🗑️ ${result.message}`, 'success')
        onTripDeleted()
      } else {
        const result = await response.json()
        showMessage('❌ ' + (result.error || 'Failed to delete all trips'), 'error')
      }
    } catch (error) {
      showMessage('🌐 Network error', 'error')
    } finally {
      setDeletingId(null)
    }
  }
  
  const addClickEffect = (e) => {
    const card = e.currentTarget
    card.style.transform = 'scale(0.98)'
    setTimeout(() => {
      card.style.transform = ''
    }, 150)
  }

  return (
    <div className="trips-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>My Trips</h2>
        {trips.length > 0 && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => window.open('/api/trips/export', '_blank')}
              style={{
                background: 'linear-gradient(45deg, #28a745, #20c997)',
                color: 'white',
                border: 'none',
                borderRadius: '20px',
                padding: '8px 16px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              💾 Save to File
            </button>
            <button 
              onClick={deleteAllTrips}
              disabled={deletingId === 'all'}
              style={{
                background: 'linear-gradient(45deg, #dc3545, #c82333)',
                color: 'white',
                border: 'none',
                borderRadius: '20px',
                padding: '8px 16px',
                fontSize: '12px',
                cursor: 'pointer',
                opacity: deletingId === 'all' ? 0.6 : 1
              }}
            >
              {deletingId === 'all' ? '⏳ Deleting...' : '🗑️ Delete All'}
            </button>
          </div>
        )}
      </div>
      <div id="tripsList">
        {trips.length === 0 ? (
          <div className="no-trips">No trips recorded yet</div>
        ) : (
          trips.map(trip => (
            <div 
              key={trip.id} 
              className="trip-card" 
              onClick={addClickEffect}
              style={{ opacity: deletingId === trip.id ? 0.5 : 1 }}
            >
              <div className="trip-header">
                <span className="trip-number">Trip #{trip.trip_number}</span>
                <div>
                  <span className="trip-date">
                    {new Date(trip.created_at).toLocaleDateString()}
                  </span>
                  <button 
                    className="delete-btn" 
                    onClick={(e) => { e.stopPropagation(); deleteTrip(trip.id); }}
                    title="Delete trip"
                    disabled={deletingId === trip.id}
                  >
                    {deletingId === trip.id ? '⏳' : '×'}
                  </button>
                </div>
              </div>
              <div className="trip-details">
                <div className="trip-detail">
                  <strong>🏠 From:</strong> {trip.origin_place || 'Unknown'}
                </div>
                <div className="trip-detail">
                  <strong>🎯 To:</strong> {trip.destination_place || 'Unknown'}
                </div>
                <div className="trip-detail">
                  <strong>🚗 Mode:</strong> {trip.mode}
                </div>
                <div className="trip-detail">
                  <strong>📍 Distance:</strong> {trip.distance}km
                </div>
                <div className="trip-detail">
                  <strong>🎯 Purpose:</strong> {trip.purpose}
                </div>
                <div className="trip-detail">
                  <strong>👥 Companions:</strong> {trip.companions}
                </div>
                <div className="trip-detail">
                  <strong>🔄 Frequency:</strong> {trip.frequency}
                </div>
                <div className="trip-detail">
                  <strong>💰 Cost:</strong> ₹{trip.cost}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default TripsList