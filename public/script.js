document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('tripForm');
    const message = document.getElementById('message');
    
    // Store original button texts
    document.querySelectorAll('button').forEach(btn => {
        btn.dataset.originalText = btn.innerHTML;
    });
    
    // Add progress indicator
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
        position: fixed; top: 0; left: 0; width: 0%; height: 3px;
        background: linear-gradient(45deg, #667eea, #764ba2);
        transition: width 0.3s ease; z-index: 1000;
    `;
    document.body.appendChild(progressBar);
    
    // Update progress based on form completion
    function updateProgress() {
        const progress = (currentStep / totalSteps) * 100;
        progressBar.style.width = progress + '%';
    }
    
    form.addEventListener('input', updateProgress);
    form.addEventListener('change', updateProgress);
    
    // Load and display trips
    async function loadTrips() {
        try {
            const response = await fetch('/api/trips');
            const trips = await response.json();
            displayTrips(trips);
        } catch (error) {
            console.error('Failed to load trips:', error);
        }
    }
    
    function displayTrips(trips) {
        const tripsList = document.getElementById('tripsList');
        
        if (trips.length === 0) {
            tripsList.innerHTML = '<div class="no-trips">No trips recorded yet</div>';
            return;
        }
        
        tripsList.innerHTML = trips.map(trip => `
            <div class="trip-card">
                <div class="trip-header">
                    <span class="trip-number">Trip #${trip.trip_number}</span>
                    <div>
                        <span class="trip-date">${new Date(trip.created_at).toLocaleDateString()}</span>
                        <button class="delete-btn" data-trip-id="${trip.id}">×</button>
                    </div>
                </div>
                <div class="trip-details">
                    <div class="trip-detail"><strong>🚗 Mode:</strong> ${trip.mode}</div>
                    <div class="trip-detail"><strong>📍 Distance:</strong> ${trip.distance}km</div>
                    <div class="trip-detail"><strong>🎯 Purpose:</strong> ${trip.purpose}</div>
                    <div class="trip-detail"><strong>👥 Companions:</strong> ${trip.companions}</div>
                    <div class="trip-detail"><strong>🔄 Frequency:</strong> ${trip.frequency}</div>
                    <div class="trip-detail"><strong>💰 Cost:</strong> $${trip.cost}</div>
                </div>
            </div>
        `).join('');
        
        // Add event listeners for delete buttons
        tripsList.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const tripId = this.getAttribute('data-trip-id');
                console.log('Delete button clicked for trip ID:', tripId);
                deleteTrip(tripId);
            });
        });
    }
    
    // Delete trip function
    async function deleteTrip(tripId) {
        if (!confirm('Delete this trip?')) return;
        
        console.log('=== DELETE OPERATION START ===');
        console.log('Trip ID to delete:', tripId);
        console.log('URL will be:', `/api/trips/${tripId}`);
        
        try {
            const response = await fetch(`/api/trips/${tripId}`, {
                method: 'DELETE'
            });
            
            console.log('Response received:');
            console.log('- Status:', response.status);
            console.log('- Status Text:', response.statusText);
            console.log('- Content-Type:', response.headers.get('content-type'));
            console.log('- URL:', response.url);
            
            const text = await response.text();
            console.log('Raw response:', text);
            
            let result;
            try {
                result = JSON.parse(text);
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                showMessage('❌ Invalid server response', 'error');
                return;
            }
            
            if (response.ok) {
                showMessage('🗑️ Trip deleted successfully!', 'success');
                loadTrips();
            } else {
                showMessage('❌ ' + (result.error || 'Delete failed'), 'error');
            }
        } catch (error) {
            console.error('Network error:', error);
            showMessage('🌐 Network error: ' + error.message, 'error');
        }
        
        console.log('=== DELETE OPERATION END ===');
    }
    
    // Multi-step form navigation
    let currentStep = 1;
    const totalSteps = 4;
    
    window.nextStep = function() {
        if (validateCurrentStep()) {
            document.getElementById(`step${currentStep}`).style.display = 'none';
            document.getElementById(`dot${currentStep}`).classList.remove('active');
            document.getElementById(`dot${currentStep}`).classList.add('completed');
            
            currentStep++;
            document.getElementById(`step${currentStep}`).style.display = 'block';
            document.getElementById(`dot${currentStep}`).classList.add('active');
            
            updateProgress();
        }
    };
    
    window.prevStep = function() {
        document.getElementById(`step${currentStep}`).style.display = 'none';
        document.getElementById(`dot${currentStep}`).classList.remove('active');
        
        currentStep--;
        document.getElementById(`step${currentStep}`).style.display = 'block';
        document.getElementById(`dot${currentStep}`).classList.remove('completed');
        document.getElementById(`dot${currentStep}`).classList.add('active');
        
        updateProgress();
    };
    
    function validateCurrentStep() {
        const currentStepElement = document.getElementById(`step${currentStep}`);
        const requiredFields = currentStepElement.querySelectorAll('[required]');
        
        for (let field of requiredFields) {
            if (!field.value.trim()) {
                field.focus();
                showMessage('Please fill in all required fields', 'error');
                return false;
            }
        }
        return true;
    }
    
    // Test API connectivity
    async function testAPI() {
        try {
            const response = await fetch('/api/test');
            const result = await response.json();
            console.log('API test result:', result);
        } catch (error) {
            console.error('API test failed:', error);
        }
    }
    
    // Load trips on page load
    loadTrips();
    testAPI();
    
    // Location detection with enhanced UX
    document.getElementById('detectOrigin').addEventListener('click', () => {
        detectLocation('origin');
        updateProgress();
    });
    
    document.getElementById('detectDestination').addEventListener('click', () => {
        detectLocation('destination');
        updateProgress();
    });
    
    function detectLocation(type) {
        const button = document.getElementById(type === 'origin' ? 'detectOrigin' : 'detectDestination');
        button.dataset.originalText = button.innerHTML;
        setButtonLoading(button, true);
        
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    
                    if (type === 'origin') {
                        document.getElementById('originLat').value = lat.toFixed(6);
                        document.getElementById('originLng').value = lng.toFixed(6);
                        document.getElementById('startTime').value = new Date().toISOString().slice(0, 16);
                    } else {
                        document.getElementById('destinationLat').value = lat.toFixed(6);
                        document.getElementById('destinationLng').value = lng.toFixed(6);
                        document.getElementById('endTime').value = new Date().toISOString().slice(0, 16);
                    }
                    
                    setButtonLoading(button, false);
                    showMessage('📍 Location detected successfully!', 'success');
                    updateProgress();
                },
                (error) => {
                    setButtonLoading(button, false);
                    showMessage('❌ Location detection failed. Please enter manually.', 'error');
                }
            );
        } else {
            setButtonLoading(button, false);
            showMessage('❌ Geolocation not supported by browser.', 'error');
        }
    }
    
    // Auto-calculate distance
    function calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
    // Auto-fill distance when coordinates change with animation
    ['originLat', 'originLng', 'destinationLat', 'destinationLng'].forEach(id => {
        document.getElementById(id).addEventListener('input', () => {
            const oLat = parseFloat(document.getElementById('originLat').value);
            const oLng = parseFloat(document.getElementById('originLng').value);
            const dLat = parseFloat(document.getElementById('destinationLat').value);
            const dLng = parseFloat(document.getElementById('destinationLng').value);
            
            if (oLat && oLng && dLat && dLng) {
                const distance = calculateDistance(oLat, oLng, dLat, dLng);
                const distanceField = document.getElementById('distance');
                distanceField.style.background = 'linear-gradient(45deg, #28a745, #20c997)';
                distanceField.style.color = 'white';
                distanceField.value = distance.toFixed(2);
                
                setTimeout(() => {
                    distanceField.style.background = '';
                    distanceField.style.color = '';
                }, 1000);
            }
        });
    });
    
    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            trip_number: parseInt(document.getElementById('tripNumber').value),
            origin_lat: parseFloat(document.getElementById('originLat').value),
            origin_lng: parseFloat(document.getElementById('originLng').value),
            start_time: document.getElementById('startTime').value,
            destination_lat: parseFloat(document.getElementById('destinationLat').value),
            destination_lng: parseFloat(document.getElementById('destinationLng').value),
            end_time: document.getElementById('endTime').value,
            mode: document.getElementById('mode').value,
            distance: parseFloat(document.getElementById('distance').value),
            purpose: document.getElementById('purpose').value,
            companions: parseInt(document.getElementById('companions').value),
            frequency: document.getElementById('frequency').value,
            cost: parseFloat(document.getElementById('cost').value)
        };
        
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.dataset.originalText = submitBtn.innerHTML;
        setButtonLoading(submitBtn, true);
        
        try {
            const response = await fetch('/api/trips', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                setButtonLoading(submitBtn, false);
                showMessage('✅ Trip saved successfully!', 'success');
                form.reset();
                currentStep = 1;
                // Reset to step 1
                document.querySelectorAll('.step').forEach(step => step.style.display = 'none');
                document.getElementById('step1').style.display = 'block';
                document.querySelectorAll('.step-dot').forEach(dot => {
                    dot.classList.remove('active', 'completed');
                });
                document.getElementById('dot1').classList.add('active');
                updateProgress();
                loadTrips(); // Refresh trips list
                // Add celebration effect
                document.body.style.animation = 'none';
                setTimeout(() => {
                    document.body.style.animation = 'backgroundShift 10s ease-in-out infinite alternate';
                }, 100);
            } else {
                setButtonLoading(submitBtn, false);
                showMessage('❌ Error: ' + result.error, 'error');
            }
        } catch (error) {
            setButtonLoading(submitBtn, false);
            showMessage('🌐 Network error. Please try again.', 'error');
        }
    });
    
    function showMessage(text, type) {
        message.textContent = text;
        message.className = `${type} show`;
        setTimeout(() => {
            message.className = type;
            setTimeout(() => {
                message.textContent = '';
                message.className = '';
            }, 300);
        }, 3000);
    }
    
    // Add form field animations
    document.querySelectorAll('input, select').forEach(field => {
        field.addEventListener('focus', function() {
            this.parentElement.style.transform = 'scale(1.02)';
        });
        
        field.addEventListener('blur', function() {
            this.parentElement.style.transform = 'scale(1)';
        });
    });
    
    // Add loading state to buttons
    function setButtonLoading(button, loading) {
        if (loading) {
            button.disabled = true;
            button.innerHTML = '⏳ Loading...';
        } else {
            button.disabled = false;
            button.innerHTML = button.dataset.originalText;
        }
    }
});