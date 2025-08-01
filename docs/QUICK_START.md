# Quick Start - Running Server Locally (No Docker)

Follow these steps to run the IoT Tracking Server locally without Docker.

## 📋 Prerequisites

- Node.js 18+ installed
- MongoDB Atlas account (or local MongoDB)
- Redis (optional - for rate limiting)

## 🚀 Step-by-Step Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration

**Option A: Interactive Setup (Recommended)**
```bash
npm run setup
```
This will guide you through creating the `.env` file with secure keys.

**Option B: Manual Setup**
```bash
# Copy the example file
cp env.example .env

# Edit the .env file with your settings
```

### 3. Configure MongoDB Connection

Edit your `.env` file and update the MongoDB URI:

**For MongoDB Atlas:**
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
DB_NAME=iot_tracking
```

**For Local MongoDB:**
```env
MONGODB_URI=mongodb://localhost:27017
DB_NAME=iot_tracking
```

### 4. Generate API Key

If you didn't use the setup script, generate a secure API key:
```bash
node -e "console.log('API_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
```

Add this to your `.env` file.

### 5. Optional: Redis Setup

**If you have Redis installed locally:**
```env
REDIS_URL=redis://localhost:6379
```

**If you don't have Redis:**
The server will work without Redis - it will use memory-based rate limiting instead.

### 6. Start the Server

**Development Mode (with auto-reload):**
```bash
npm run dev
```

**Production Mode:**
```bash
npm start
```

### 7. Verify Server is Running

Open your browser or use curl:
```bash
curl http://localhost:3000/health
```

You should see:
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T12:00:00.000Z",
  "uptime": 1.234,
  "version": "1.0.0",
  "environment": "development"
}
```

## 🧪 Test the API

### Option 1: Use the Test Script
```bash
npm run test-api http://localhost:3000 your_api_key_here
```

### Option 2: Manual Testing with curl

**Test device registration:**
```bash
curl --location 'http://localhost:3000/api/v1/device/register' \
--header 'Content-Type: application/json' \
--header 'X-API-Key: your_api_key_here' \
--data '{
  "deviceId": "ESP32_001",
  "name": "Test Device",
  "description": "My first test device"
}'
```

**Test location update:**
```bash
curl --location 'http://localhost:3000/api/v1/device/update-data' \
--header 'Content-Type: application/json' \
--header 'X-API-Key: your_api_key_here' \
--data '{
  "deviceId": "ESP32_001",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "batteryVoltage": 3.7
}'
```

## 📝 Complete .env Example

```env
# Server Configuration
NODE_ENV=development
PORT=3000
API_VERSION=v1

# MongoDB Configuration (REQUIRED)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
DB_NAME=iot_tracking

# Redis Configuration (OPTIONAL)
REDIS_URL=redis://localhost:6379

# Authentication (REQUIRED)
JWT_SECRET=your_very_secure_jwt_secret_at_least_32_characters_long
API_KEY=your_secure_api_key_for_devices

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
ALERT_RATE_LIMIT_MAX=10

# Logging
LOG_LEVEL=info

# CORS
ALLOWED_ORIGINS=*
```

## 🛠️ Troubleshooting

### MongoDB Connection Issues
- Verify your connection string is correct
- Check if your IP is whitelisted in MongoDB Atlas
- Ensure the database user has read/write permissions

### API Key Issues
- Make sure your API key is set in the `.env` file
- Use the exact key when making requests
- Check that the `X-API-Key` header is included

### Port Already in Use
If port 3000 is busy, change it in `.env`:
```env
PORT=3001
```

### Redis Connection Issues
If Redis connection fails, the server will continue with memory-based rate limiting. Check logs for warnings.

## 📊 Server Logs

The server logs will show:
- ✅ Successful startup
- 🔗 MongoDB connection status
- 📡 Redis connection status (if configured)
- 🌐 Server listening on port
- 📝 Request/response logs

## 🎯 Next Steps

1. **Import the API Collection** using `docs/API_COLLECTION.md`
2. **Test ESP32 routes** (routes #1-7) with your API key
3. **Test Frontend routes** (routes #8-25) for your React app
4. **Set up your ESP32 code** to send data to the server
5. **Monitor logs** to see data flowing in

## 🚀 Ready to Go!

Your IoT Tracking Server is now running locally at `http://localhost:3000`

### 📚 Documentation Files
- **API Collection:** `docs/API_COLLECTION.md` - Complete API documentation organized by client type
- **Architecture Plan:** `docs/arch/iot_server_plan.md` - Detailed technical specifications
- **Quick Start:** `docs/QUICK_START.md` - This file for local setup instructions

Use your API key from the `.env` file to authenticate requests, and refer to the API collection for complete examples organized by ESP32 vs React frontend usage! 🎉