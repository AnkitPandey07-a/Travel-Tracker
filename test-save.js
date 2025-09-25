// Simple test to save a trip
const testTrip = {
  trip_number: 999,
  mode: 'test',
  distance: 5,
  purpose: 'test'
};

fetch('http://localhost:3000/api/trips', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(testTrip)
})
.then(res => res.json())
.then(data => console.log('Save result:', data))
.catch(err => console.error('Save error:', err));