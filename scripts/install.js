#!/usr/bin/env node

/**
 * Installation and setup script for IoT Tracking Server
 * Helps users set up the environment and configuration
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const crypto = require('crypto');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

const log = (color, message) => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
};

const generateSecureKey = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

const generateApiKey = (length = 32) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const createEnvFile = async () => {
  log('blue', '\n🔧 Setting up environment configuration...\n');

  const config = {
    NODE_ENV: 'development',
    PORT: '3000',
    API_VERSION: 'v1',
    DB_NAME: 'iot_tracking'
  };

  // MongoDB URI
  const mongoChoice = await question('Do you want to use MongoDB Atlas (cloud) or local MongoDB? (atlas/local) [atlas]: ') || 'atlas';
  
  if (mongoChoice.toLowerCase() === 'atlas') {
    config.MONGODB_URI = await question('Enter your MongoDB Atlas connection string: ') || 'mongodb+srv://username:password@cluster.mongodb.net/';
  } else {
    config.MONGODB_URI = await question('Enter your local MongoDB URI [mongodb://localhost:27017]: ') || 'mongodb://localhost:27017';
  }

  // Redis
  const useRedis = await question('Do you want to use Redis for rate limiting? (y/n) [y]: ') || 'y';
  if (useRedis.toLowerCase() === 'y') {
    config.REDIS_URL = await question('Enter Redis URL [redis://localhost:6379]: ') || 'redis://localhost:6379';
  } else {
    config.REDIS_URL = '# Redis disabled - using memory store';
  }

  // Security
  log('yellow', '\nGenerating secure keys...');
  config.JWT_SECRET = generateSecureKey(64);
  config.API_KEY = generateApiKey(32);
  log('green', `Generated JWT Secret: ${config.JWT_SECRET.substring(0, 16)}...`);
  log('green', `Generated API Key: ${config.API_KEY}`);

  // Optional settings
  config.JWT_EXPIRES_IN = '7d';
  config.RATE_LIMIT_WINDOW_MS = '900000';
  config.RATE_LIMIT_MAX_REQUESTS = '100';
  config.ALERT_RATE_LIMIT_MAX = '10';
  config.LOG_LEVEL = 'info';
  config.ALLOWED_ORIGINS = '*';

  // Create .env file content
  const envContent = `# IoT Tracking Server Configuration
# Generated on ${new Date().toISOString()}

# Server Configuration
NODE_ENV=${config.NODE_ENV}
PORT=${config.PORT}
API_VERSION=${config.API_VERSION}

# MongoDB Configuration
MONGODB_URI=${config.MONGODB_URI}
DB_NAME=${config.DB_NAME}

# Redis Configuration (for rate limiting)
REDIS_URL=${config.REDIS_URL}

# JWT Configuration
JWT_SECRET=${config.JWT_SECRET}
JWT_EXPIRES_IN=${config.JWT_EXPIRES_IN}

# API Key for device authentication
API_KEY=${config.API_KEY}

# Rate Limiting Configuration
RATE_LIMIT_WINDOW_MS=${config.RATE_LIMIT_WINDOW_MS}
RATE_LIMIT_MAX_REQUESTS=${config.RATE_LIMIT_MAX_REQUESTS}
ALERT_RATE_LIMIT_MAX=${config.ALERT_RATE_LIMIT_MAX}

# Logging Configuration
LOG_LEVEL=${config.LOG_LEVEL}

# CORS Configuration
ALLOWED_ORIGINS=${config.ALLOWED_ORIGINS}

# Optional: Multiple API Keys (comma-separated)
# API_KEYS=key1,key2,key3
`;

  const envPath = path.join(process.cwd(), '.env');
  
  if (fs.existsSync(envPath)) {
    const overwrite = await question('\n.env file already exists. Overwrite? (y/n) [n]: ') || 'n';
    if (overwrite.toLowerCase() !== 'y') {
      log('yellow', 'Skipping .env file creation.');
      return config;
    }
  }

  fs.writeFileSync(envPath, envContent);
  log('green', '✅ .env file created successfully!');

  return config;
};

const checkDependencies = () => {
  log('blue', '\n📦 Checking dependencies...\n');

  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    log('red', '❌ package.json not found. Please run this script from the project root.');
    process.exit(1);
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    log('green', `✅ Found package.json for ${packageJson.name} v${packageJson.version}`);
    
    // Check if node_modules exists
    const nodeModulesPath = path.join(process.cwd(), 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
      log('yellow', '⚠️  node_modules not found. Run "npm install" to install dependencies.');
      return false;
    }
    
    log('green', '✅ Dependencies appear to be installed');
    return true;
  } catch (error) {
    log('red', '❌ Error reading package.json:', error.message);
    process.exit(1);
  }
};

const createDirectories = () => {
  log('blue', '\n📁 Creating required directories...\n');

  const directories = ['logs', 'tmp'];
  
  for (const dir of directories) {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      log('green', `✅ Created directory: ${dir}`);
    } else {
      log('cyan', `ℹ️  Directory already exists: ${dir}`);
    }
  }
};

const showNextSteps = (config) => {
  log('blue', '\n🎉 Installation complete!\n');
  
  log('cyan', '📋 Next steps:');
  console.log('');
  
  if (!checkDependencies()) {
    console.log('1. Install dependencies:');
    log('yellow', '   npm install');
    console.log('');
  }
  
  console.log('2. Update your MongoDB connection string in .env:');
  log('yellow', '   MONGODB_URI=your_actual_mongodb_connection_string');
  console.log('');
  
  console.log('3. Start the development server:');
  log('yellow', '   npm run dev');
  console.log('');
  
  console.log('4. Test the API:');
  log('yellow', `   node scripts/test-api.js http://localhost:${config.PORT} ${config.API_KEY}`);
  console.log('');
  
  console.log('5. For production deployment:');
  log('yellow', '   docker-compose up -d --build');
  console.log('');
  
  log('green', '🔑 Your API Key: ' + config.API_KEY);
  log('cyan', '💡 Save this API key securely - you\'ll need it for device authentication!');
  console.log('');
  
  log('blue', '📚 Documentation: README.md');
  log('blue', '🐛 Issues: Check the troubleshooting section in README.md');
};

const main = async () => {
  console.log(`${colors.blue}
╔══════════════════════════════════════════════════════════════╗
║                   IoT Tracking Server Setup                 ║
║                                                              ║
║  This script will help you configure your IoT server        ║
║  with proper environment variables and security settings.    ║
╚══════════════════════════════════════════════════════════════╝${colors.reset}
`);

  try {
    checkDependencies();
    createDirectories();
    const config = await createEnvFile();
    showNextSteps(config);
    
  } catch (error) {
    log('red', '\n❌ Setup failed:');
    console.error(error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
};

// Handle script arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
IoT Tracking Server Setup Script

Usage: node scripts/install.js

This interactive script will:
- Create a .env configuration file
- Generate secure JWT secrets and API keys
- Set up MongoDB and Redis connection strings
- Create required directories
- Provide next steps for running the server

Options:
  --help, -h    Show this help message
  `);
  process.exit(0);
}

main().catch(console.error);