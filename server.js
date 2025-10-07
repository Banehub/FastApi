const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const fastingRoutes = require('./routes/fasting');
const exerciseRoutes = require('./routes/exercise');
const weightRoutes = require('./routes/weight');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());

// Enhanced JSON parser with better error handling
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf, encoding) => {
    try {
      // Try to parse the buffer
      const data = buf.toString();
      JSON.parse(data);
    } catch (e) {
      console.error('❌ JSON Parse Error:', {
        error: e.message,
        body: buf.toString().substring(0, 200),
        url: req.url,
        method: req.method,
        contentType: req.headers['content-type']
      });
      
      // Try to fix common JSON issues
      try {
        const data = buf.toString();
        let fixedData = data;
        
        // Handle double-encoded JSON
        if (data.startsWith('"') && data.endsWith('"')) {
          fixedData = data.slice(1, -1);
          fixedData = fixedData.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        }
        
        // Try parsing the fixed data
        JSON.parse(fixedData);
        console.log('✅ Fixed JSON parsing issue');
        
        // Replace the buffer with fixed data
        req.body = JSON.parse(fixedData);
        return;
      } catch (fixError) {
        console.error('❌ Could not fix JSON:', fixError.message);
        throw new Error('Invalid JSON format');
      }
    }
  }
}));
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
const MONGODB_URI = 'mongodb+srv://williefbeukes:dAZlNQUZCBcKBi58@cluster0.ra02y7n.mongodb.net/fastapi';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connected to MongoDB successfully');
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  process.exit(1);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/fasting', fastingRoutes);
app.use('/api/exercise', exerciseRoutes);
app.use('/api/weight', weightRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'API is running!', 
    timestamp: new Date().toISOString(),
    status: 'healthy'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!', 
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Global error handler for JSON parsing errors
app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    console.error('❌ JSON Syntax Error:', {
      message: error.message,
      body: error.body,
      url: req.url,
      method: req.method,
      headers: req.headers
    });
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON format in request body',
      code: 'INVALID_JSON'
    });
  }
  next(error);
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth/`);
  console.log(`🏃‍♂️ Fasting endpoints: http://localhost:${PORT}/api/fasting/`);
  console.log(`💪 Exercise endpoints: http://localhost:${PORT}/api/exercise/`);
  console.log(`⚖️ Weight endpoints: http://localhost:${PORT}/api/weight/`);
});
