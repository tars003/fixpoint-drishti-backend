require('dotenv').config();

const config = {
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT) || 3000,
  API_VERSION: process.env.API_VERSION || 'v1',
  
  // Database
  MONGODB_URI: process.env.MONGODB_URI,
  DB_NAME: process.env.DB_NAME || 'iot_tracking',
  
  // Redis
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // Authentication
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  API_KEY: process.env.API_KEY,
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  ALERT_RATE_LIMIT_MAX: parseInt(process.env.ALERT_RATE_LIMIT_MAX) || 10,
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  // CORS
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS?.split(',') || ['*'],
};

// Validate required environment variables
const requiredEnvVars = ['MONGODB_URI'];

const missingEnvVars = requiredEnvVars.filter(envVar => !config[envVar]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars);
  if (config.NODE_ENV === 'production') {
    process.exit(1);
  } else {
    console.warn('Warning: Some environment variables are missing. Using defaults for development.');
  }
}

module.exports = config;