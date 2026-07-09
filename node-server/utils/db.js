const mongoose = require('mongoose');

let mongoConnected = false;

async function connectDB() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quality_inspection';
  
  try {
    // Set connection timeout to 3 seconds so it fails fast if not running
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 3000
    });
    mongoConnected = true;
    console.log('✅ MongoDB connection successful!');
  } catch (err) {
    console.warn('⚠️ MongoDB connection failed. Running with in-memory database fallback.');
    mongoConnected = false;
  }
}

function isConnected() {
  return mongoConnected;
}

const memoryInspections = [];

module.exports = { connectDB, isConnected, memoryInspections };
