require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

// Route imports
const authRoutes = require('./routes/auth');
const articleRoutes = require('./routes/articles');
// const chatRoutes = require('./routes/chat'); // Assume chat route exists

// Middleware imports
const {
  helmetConfig,
  corsConfig,
  mongoSanitizeConfig,
  globalErrorHandler
} = require('./middleware/security');

// Initialize Express App
const app = express();

// --- Core Middleware ---
app.use(helmetConfig);
app.use(corsConfig);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(mongoSanitizeConfig);

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/articles', articleRoutes);

// Apply rate limiter specifically to chat endpoints (if chat route was mounted)
// app.use('/api/chat', chatRateLimiter, chatRoutes);

// --- Global Error Handling ---
app.use(globalErrorHandler);

// --- Database Connection & Server Startup ---
const PORT = process.env.PORT || 5000;
let server;

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('[DB] Connected to MongoDB Atlas successfully.');
    
    server = app.listen(PORT, () => {
      console.log(`[SERVER] Running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
    });
  })
  .catch((err) => {
    console.error('[DB] MongoDB connection failed:', err.message);
    process.exit(1); // Exit if DB fails
  });

// --- Graceful Shutdown ---
const gracefulShutdown = (signal) => {
  console.log(`\n[SERVER] Received ${signal}. Starting graceful shutdown...`);
  
  if (server) {
    server.close(() => {
      console.log('[SERVER] HTTP server closed.');
      
      // Close database connection
      mongoose.connection.close(false, () => {
        console.log('[DB] MongoDB connection closed.');
        process.exit(0);
      });
    });
    
    // Force close after 10s if connections linger
    setTimeout(() => {
      console.error('[SERVER] Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
