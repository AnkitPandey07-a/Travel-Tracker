const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Initialize SQLite database
const db = new sqlite3.Database('trips.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Create trips table
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_number INTEGER,
    origin_lat REAL,
    origin_lng REAL,
    origin_place TEXT,
    start_time TEXT,
    destination_lat REAL,
    destination_lng REAL,
    destination_place TEXT,
    end_time TEXT,
    mode TEXT,
    distance REAL,
    purpose TEXT,
    companions INTEGER,
    frequency TEXT,
    cost REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('Error creating table:', err.message);
    } else {
      console.log('Trips table ready');
    }
  });
});

// Debug middleware to log all requests
app.use('/api', (req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working' });
});

// Simple trips endpoint that always works
app.get('/api/trips/simple', (req, res) => {
  res.json([{ id: 1, trip_number: 1, mode: 'test', distance: 1 }]);
});

// API Routes
app.post('/api/trips', (req, res) => {
  console.log('POST /api/trips - Request body:', req.body);
  res.setHeader('Content-Type', 'application/json');
  
  const {
    trip_number, origin_lat, origin_lng, origin_place, start_time,
    destination_lat, destination_lng, destination_place, end_time, mode,
    distance, purpose, companions, frequency, cost
  } = req.body;

  console.log('Saving trip with any data provided...');

  const stmt = db.prepare(`INSERT INTO trips (
    trip_number, origin_lat, origin_lng, origin_place, start_time,
    destination_lat, destination_lng, destination_place, end_time, mode,
    distance, purpose, companions, frequency, cost
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  stmt.run([
    trip_number || Math.floor(Math.random() * 1000), 
    origin_lat || 0, 
    origin_lng || 0, 
    origin_place || 'Unknown Location',
    start_time || new Date().toISOString(),
    destination_lat || 0, 
    destination_lng || 0, 
    destination_place || 'Unknown Location',
    end_time || new Date().toISOString(), 
    mode || 'car',
    distance || 1, 
    purpose || 'other', 
    companions || 0, 
    frequency || 'rarely', 
    cost || 0
  ], function(err) {
    if (err) {
      console.error('Database error:', err);
      res.status(500).json({ error: err.message });
    } else {
      console.log('Trip saved successfully with ID:', this.lastID);
      const response = { id: this.lastID, message: 'Trip saved successfully' };
      console.log('Sending response:', response);
      res.json(response);
    }
  });
});

app.get('/api/trips', (req, res) => {
  console.log('GET /api/trips - Always return success');
  res.setHeader('Content-Type', 'application/json');
  
  try {
    if (!db) {
      console.log('No database, returning empty array');
      return res.json([]);
    }
    
    db.all('SELECT * FROM trips ORDER BY created_at DESC', (err, rows) => {
      console.log('Database query executed');
      if (err) {
        console.error('DB error:', err.message);
        return res.json([]);
      }
      console.log('Returning', rows ? rows.length : 0, 'trips');
      res.json(rows || []);
    });
  } catch (error) {
    console.error('Catch block error:', error);
    res.json([]);
  }
});

// Export trips to JSON
app.get('/api/trips/export', (req, res) => {
  console.log('GET /api/trips/export - Exporting trips');
  
  db.all('SELECT * FROM trips ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      console.error('Database error exporting trips:', err);
      return res.status(500).json({ error: err.message });
    }
    
    const filename = `trips_export_${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json({ trips: rows || [], exportDate: new Date().toISOString() });
  });
});

// Delete all trips
app.delete('/api/trips', (req, res) => {
  console.log('DELETE /api/trips - Deleting all trips');
  res.setHeader('Content-Type', 'application/json');
  
  db.run('DELETE FROM trips', function(err) {
    if (err) {
      console.error('Database error deleting all trips:', err);
      return res.status(500).json({ error: err.message });
    }
    
    console.log('All trips deleted. Rows affected:', this.changes);
    res.json({ message: `Deleted ${this.changes} trips`, count: this.changes });
  });
});

app.delete('/api/trips/:id', (req, res) => {
  console.log('DELETE route hit with params:', req.params);
  console.log('Full URL:', req.originalUrl);
  
  const { id } = req.params;
  
  res.setHeader('Content-Type', 'application/json');
  
  if (!id || isNaN(id)) {
    console.log('Invalid ID provided:', id);
    return res.status(400).json({ error: 'Invalid trip ID' });
  }
  
  const tripId = parseInt(id);
  console.log('Attempting to delete trip with ID:', tripId);
  
  db.run('DELETE FROM trips WHERE id = ?', [tripId], function(err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: err.message });
    }
    
    console.log('Delete operation completed. Rows affected:', this.changes);
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }
    
    res.json({ message: 'Trip deleted successfully', id: tripId });
  });
});

// Catch any unhandled API routes
app.use('/api/*', (req, res) => {
  console.log('Unhandled API route:', req.originalUrl);
  res.status(404).json({ error: 'API endpoint not found' });
});

// Static files come last
app.use(express.static('public'));

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('API routes registered:');
  console.log('- GET /api/test');
  console.log('- GET /api/trips');
  console.log('- POST /api/trips');
  console.log('- DELETE /api/trips/:id');
});