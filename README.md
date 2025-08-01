# IoT Tracking Server

A robust Node.js server for ESP32-based IoT tracking systems with SIM800L GSM and NEO6M GPS modules. Built with MongoDB Atlas for data storage and Docker for containerization.

## 🚀 Features

- **Real-time Location Tracking**: GPS coordinates, speed, course, and altitude
- **Battery Monitoring**: Voltage tracking with configurable low-battery alerts
- **Alert System**: Comprehensive alerting for low battery, tampering, temperature, and geofencing
- **Rate Limiting**: Redis-based rate limiting to prevent abuse
- **Time Series Storage**: Optimized MongoDB time series collections for location data
- **RESTful API**: Clean, documented REST API endpoints
- **Docker Support**: Full containerization with multi-stage builds
- **Security**: Helmet.js, CORS, input validation, and API key authentication
- **Monitoring**: Health checks, logging, and error handling
- **Scalable**: Horizontal scaling support with Redis

## 📋 Prerequisites

- Node.js 18+ 
- MongoDB Atlas account (or local MongoDB)
- Redis (optional, for rate limiting)
- Docker & Docker Compose (for containerized deployment)

## 🛠️ Installation

### Option 1: Local Development

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd iot-tracking-server
npm install
```

2. **Create environment file:**
```bash
cp .env.example .env
```

3. **Configure environment variables:**
```env
# Server Configuration
NODE_ENV=development
PORT=3000
API_VERSION=v1

# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
DB_NAME=iot_tracking

# Redis Configuration (optional)
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your_very_secure_jwt_secret_at_least_32_characters_long
API_KEY=your_secure_api_key_for_devices

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
ALERT_RATE_LIMIT_MAX=10

# Logging
LOG_LEVEL=info

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

4. **Start the server:**
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

### Option 2: Docker Deployment

1. **Create environment file:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

2. **Start with Docker Compose:**
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f iot-server

# Stop services
docker-compose down
```

3. **For production deployment:**
```bash
# Build and start
docker-compose -f docker-compose.yml up -d --build

# Scale the application
docker-compose up -d --scale iot-server=3
```

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api/v1
```

### Authentication
All API endpoints require authentication via API Key in the header:
```http
X-API-Key: your_api_key_here
```

### Device Endpoints

#### Update Device Location
```http
POST /api/v1/device/update-data
Content-Type: application/json
X-API-Key: your_api_key

{
  "deviceId": "ESP32_001",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "batteryVoltage": 3.7,
  "altitude": 10.5,
  "speed": 25.2,
  "course": 180,
  "accuracy": 5.0,
  "satellites": 8,
  "signalStrength": -75,
  "temperature": 22.5,
  "digitalInputs": {
    "pin2": true,
    "pin4": false
  },
  "analogInputs": {
    "A0": 512,
    "A1": 256
  }
}
```

#### Get Device History
```http
GET /api/v1/device/ESP32_001/history?startDate=2024-01-01&endDate=2024-01-31&limit=100&page=1
X-API-Key: your_api_key
```

#### Get Current Location
```http
GET /api/v1/device/ESP32_001/current
X-API-Key: your_api_key
```

#### Register Device
```http
POST /api/v1/device/register
Content-Type: application/json
X-API-Key: your_api_key

{
  "deviceId": "ESP32_001",
  "name": "Vehicle Tracker 1",
  "description": "Primary vehicle tracking device",
  "batteryThreshold": 20,
  "alertSettings": {
    "vibrationEnabled": true,
    "tamperingEnabled": true,
    "lowBatteryEnabled": true,
    "geofenceEnabled": false
  }
}
```

#### List All Devices
```http
GET /api/v1/device/list?isActive=true&status=online&limit=50&page=1
X-API-Key: your_api_key
```

### Alert Endpoints

#### Create Alert
```http
POST /api/v1/alert
Content-Type: application/json
X-API-Key: your_api_key

{
  "deviceId": "ESP32_001",
  "alertType": "vibration",
  "severity": "high",
  "title": "Vibration Detected",
  "message": "Unexpected vibration detected on device",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "data": {
    "threshold": 5.0,
    "detected": 8.2
  }
}
```

#### Get Alerts
```http
GET /api/v1/alert?deviceId=ESP32_001&alertType=low_battery&severity=high&isResolved=false&limit=50&page=1
X-API-Key: your_api_key
```

#### Get Alert Statistics
```http
GET /api/v1/alert/stats?deviceId=ESP32_001&startDate=2024-01-01&endDate=2024-01-31
X-API-Key: your_api_key
```

#### Resolve Alert
```http
PUT /api/v1/alert/alert_id_here/resolve
Content-Type: application/json
X-API-Key: your_api_key

{
  "resolvedBy": "admin",
  "resolutionNotes": "Issue fixed, device serviced"
}
```

#### Acknowledge Alert
```http
PUT /api/v1/alert/alert_id_here/acknowledge
Content-Type: application/json
X-API-Key: your_api_key

{
  "acknowledgedBy": "operator"
}
```

### Response Format
All API responses follow this format:
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "timestamp": "2024-01-15T12:00:00.000Z",
  "data": {
    // Response data here
  }
}
```

Error responses:
```json
{
  "success": false,
  "message": "Error description",
  "timestamp": "2024-01-15T12:00:00.000Z",
  "errors": [
    {
      "field": "latitude",
      "message": "Latitude must be between -90 and 90"
    }
  ]
}
```

## 🔧 ESP32 Integration

### Arduino Code Example
```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* serverURL = "https://your-server.com/api/v1/device/update-data";
const char* apiKey = "your_api_key";

void sendLocationData(float lat, float lng, float batteryVoltage) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverURL);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-API-Key", apiKey);
    
    DynamicJsonDocument doc(1024);
    doc["deviceId"] = "ESP32_001";
    doc["latitude"] = lat;
    doc["longitude"] = lng;
    doc["batteryVoltage"] = batteryVoltage;
    doc["signalStrength"] = WiFi.RSSI();
    doc["timestamp"] = millis();
    
    String jsonString;
    serializeJson(doc, jsonString);
    
    int httpResponseCode = http.POST(jsonString);
    if (httpResponseCode > 0) {
      Serial.println("Data sent successfully");
    } else {
      Serial.println("Error sending data");
    }
    
    http.end();
  }
}
```

## 🏗️ Architecture

### Database Schema

#### Time Series Collection (LocationData)
- Optimized for high-frequency GPS data
- Automatic data expiration (configurable)
- Geospatial indexing for location queries
- Efficient aggregation for analytics

#### Device Management
- Device registration and configuration
- Battery threshold settings
- Alert preferences
- Last seen tracking

#### Alert System
- Severity levels: low, medium, high, critical
- Alert types: vibration, tampering, low_battery, geofence, temperature
- Resolution tracking and analytics

### Rate Limiting Strategy
- Device-specific limits for location updates (60/minute)
- Alert-specific limits to prevent spam (10/minute)
- IP-based general limits for API access
- Redis-backed distributed rate limiting

### Security Features
- API key authentication
- Input validation and sanitization
- CORS protection
- Helmet.js security headers
- Rate limiting and DDoS protection
- SQL injection prevention

## 📊 Monitoring & Logging

### Health Check
```http
GET /health
```

Returns server status, uptime, memory usage, and database connectivity.

### Logging
- Structured JSON logging with Winston
- Request/response logging
- Error tracking with stack traces
- Device activity monitoring
- Alert generation logs

### Metrics
- Request rates and response times
- Database query performance
- Alert statistics and trends
- Device online/offline status
- Battery level distributions

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production) | `development` |
| `PORT` | Server port | `3000` |
| `MONGODB_URI` | MongoDB connection string | Required |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `API_KEY` | Master API key for devices | Required |
| `JWT_SECRET` | JWT signing secret | Required |
| `LOG_LEVEL` | Logging level (debug/info/warn/error) | `info` |
| `ALLOWED_ORIGINS` | CORS allowed origins | `*` |

### Rate Limits
- **Device Updates**: 60 requests/minute per device
- **Alerts**: 10 requests/minute per device  
- **General API**: 100 requests/15 minutes per IP
- **Authentication**: 5 attempts/15 minutes per IP

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production (Docker)
```bash
docker-compose up -d --build
```

### Environment-specific Configurations

#### Development
- Detailed error messages
- Console logging enabled
- CORS allows all origins
- Relaxed rate limiting

#### Production
- Generic error messages
- File-based logging
- Strict CORS policy
- Enforced rate limiting
- Process monitoring

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 📝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🐛 Troubleshooting

### Common Issues

**MongoDB Connection Failed**
- Verify MongoDB URI and credentials
- Check network connectivity
- Ensure database exists

**Redis Connection Failed**
- Redis is optional for basic functionality
- Server will use memory-based rate limiting as fallback
- Check Redis URL and service status

**Rate Limit Exceeded**
- Implement exponential backoff in client
- Check rate limit headers in response
- Consider upgrading to higher limits

**Device Not Updating**
- Verify API key is correct
- Check device ID format (alphanumeric, 3-50 chars)
- Ensure Content-Type is application/json

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Support

For support, please open an issue on GitHub or contact the development team.

---

Built with ❤️ for IoT tracking applications