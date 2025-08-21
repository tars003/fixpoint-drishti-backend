# IoT Device Server Integration Guide

Complete guide for integrating IoT devices with the IoT Tracking Server API.

## 📋 Overview

This guide covers the essential API endpoints that your IoT devices need to communicate with:
- **Data Transmission**: Send sensor data and GPS location
- **Alert Generation**: Send critical alerts and notifications
- **Authentication**: Secure API access with API keys

**Note**: Device registration is handled manually in the database. Each device will be pre-programmed with its unique `deviceId`.

---

## 🔐 Authentication & Security

All API requests require authentication using an API key in the header, and **data payloads must be JWT-encoded** for security.

### Required Headers
```
Content-Type: application/json
X-API-Key: your_api_key_here
```

### JWT Payload Encryption
- **All data sent to `/update-data` and `/alert` endpoints must be JWT-encoded**
- **Shared Secret**: Both device and server use the same secret key for JWT encoding/decoding
- **Token Expiration**: JWT tokens expire in 5 minutes (prevents replay attacks)
- **Algorithm**: HMAC SHA-256 (HS256)

### JWT Configuration
```
JWT_SECRET = "your_shared_jwt_secret_here"  // Same as server
JWT_EXPIRY = 300  // 5 minutes in seconds
ISSUER = "esp32"  // Token issuer identifier
```

---

## 📡 Primary Data Endpoint

### **POST /api/v1/device/update-data**

This is your **main endpoint** - ESP32 devices send location data and sensor readings here.

#### Request URL
```
POST https://your-server.com/api/v1/device/update-data
```

#### Required Headers
```
Content-Type: application/json
X-API-Key: your_api_key_here
```

#### Payload Structure

The payload must be JWT-encoded before sending. The JWT token contains the following data:

**Required Fields:**
- `deviceId` (string): Unique device identifier (3-50 alphanumeric characters)
- `latitude` (number): GPS latitude (-90 to 90)
- `longitude` (number): GPS longitude (-180 to 180) 
- `batteryVoltage` (number): Battery voltage in volts (0-50V)

**Optional Fields:**
- `altitude` (number): Height in meters (-1000 to 50000)
- `speed` (number): Speed in km/h (0-1000)
- `course` (number): Direction in degrees (0-360)
- `accuracy` (number): GPS accuracy in meters (>= 0)
- `satellites` (number): Number of GPS satellites (0-50)
- `batteryPercentage` (number): Battery level percentage (0-100)
- `signalStrength` (number): Signal strength in dBm (-120 to 0)
- `temperature` (number): Temperature in Celsius (-50 to 100)
- `humidity` (number): Humidity percentage (0-100)
- `digitalInputs` (object): Digital pin states (key: string, value: boolean)
- `analogInputs` (object): Analog sensor readings (key: string, value: 0-1024)
- `timestamp` (string): ISO 8601 timestamp (optional, server uses current time if not provided)

#### JWT Token Structure
**Raw Data (Before JWT Encoding):**
```json
{
  "deviceId": "DEVICE_001",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "batteryVoltage": 3.7,
  "batteryPercentage": 85,
  "altitude": 10.5,
  "speed": 25.2,
  "course": 180,
  "accuracy": 5.0,
  "satellites": 8,
  "signalStrength": -75,
  "temperature": 22.5,
  "humidity": 65,
  "digitalInputs": {
    "pin2": true,
    "pin4": false,
    "ignition": true
  },
  "analogInputs": {
    "A0": 512,
    "A1": 256,
    "fuel_level": 800
  },
  "timestamp": "2025-01-15T12:30:00.000Z"
}
```

**Actual Request Body (JWT Encoded):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkZXZpY2VJZCI6IkRFVklDRV8wMDEiLCJsYXRpdHVkZSI6NDAuNzEyOCwibG9uZ2l0dWRlIjotNzQuMDA2MCwiYmF0dGVyeVZvbHRhZ2UiOjMuNywiYmF0dGVyeVBlcmNlbnRhZ2UiOjg1LCJhbHRpdHVkZSI6MTAuNSwiaXNzIjoiZXNwMzIiLCJpYXQiOjE3MzY5NTEwMDAsImV4cCI6MTczNjk1MTMwMH0.signature"
}
```

#### Success Response (200)
```json
{
  "success": true,
  "message": "Location data updated successfully",
  "data": {
    "deviceId": "DEVICE_001",
    "timestamp": "2025-01-15T12:30:00.000Z",
    "batteryStatus": "good",
    "alertsCreated": 0,
    "location": {
      "latitude": 40.7128,
      "longitude": -74.0060
    }
  },
  "timestamp": "2025-01-15T12:30:00.000Z"
}
```

---

## 🚨 Alert Generation Endpoint

### **POST /api/v1/alert**

Send critical alerts (emergencies, system failures, etc.) to this endpoint.

#### Request URL
```
POST https://your-server.com/api/v1/alert
```

#### Required Headers
```
Content-Type: application/json
X-API-Key: your_api_key_here
```

#### Payload Structure

The alert payload must be JWT-encoded before sending. The JWT token contains the following data:

**Required Fields:**
- `deviceId` (string): Unique device identifier
- `alertType` (string): One of: `vibration`, `tampering`, `low_battery`, `geofence`, `offline`, `temperature`, `custom`
- `message` (string): Alert description (1-500 characters)

**Optional Fields:**
- `severity` (string): `low`, `medium`, `high`, `critical` (default: `medium`)
- `title` (string): Alert title (1-100 characters)
- `latitude` (number): GPS latitude where alert occurred
- `longitude` (number): GPS longitude where alert occurred
- `data` (object): Additional alert-specific data

#### JWT Token Structure
**Raw Alert Data (Before JWT Encoding):**
```json
{
  "deviceId": "DEVICE_001",
  "alertType": "custom",
  "severity": "high",
  "title": "Emergency Button Pressed",
  "message": "SOS button was pressed by user",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "data": {
    "buttonPin": "D2",
    "pressCount": 3,
    "batteryLevel": 85
  }
}
```

**Actual Request Body (JWT Encoded):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkZXZpY2VJZCI6IkRFVklDRV8wMDEiLCJhbGVydFR5cGUiOiJjdXN0b20iLCJzZXZlcml0eSI6ImhpZ2giLCJ0aXRsZSI6IkVtZXJnZW5jeSBCdXR0b24gUHJlc3NlZCIsIm1lc3NhZ2UiOiJTT1MgYnV0dG9uIHdhcyBwcmVzc2VkIGJ5IHVzZXIiLCJsYXRpdHVkZSI6NDAuNzEyOCwibG9uZ2l0dWRlIjotNzQuMDA2MCwiZGF0YSI6eyJidXR0b25QaW4iOiJEMiIsInByZXNzQ291bnQiOjMsImJhdHRlcnlMZXZlbCI6ODV9LCJpc3MiOiJlc3AzMiIsImlhdCI6MTczNjk1MTAwMCwiZXhwIjoxNzM2OTUxMzAwfQ.signature"
}
```

#### Success Response (201)
```json
{
  "success": true,
  "message": "Alert created successfully",
  "data": {
    "alertId": "60f7b8c8d1a2b3c4e5f6g7h8",
    "deviceId": "DEVICE_001",
    "alertType": "custom",
    "severity": "high",
    "title": "Emergency Button Pressed",
    "message": "SOS button was pressed by user",
    "timestamp": "2025-01-15T12:30:00.000Z",
    "isResolved": false,
    "location": {
      "latitude": 40.7128,
      "longitude": -74.0060
    }
  },
  "timestamp": "2025-01-15T12:30:00.000Z"
}
```

---

## 💻 Implementation Requirements

### JWT Token Creation
The device must create JWT tokens with the following specifications:

**JWT Header:**
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**JWT Claims (Payload):**
- Include all sensor/alert data as claims
- **Required Claims:**
  - `iss`: "esp32" (issuer)
  - `iat`: Current timestamp (issued at)
  - `exp`: `iat + 300` (expires in 5 minutes)
- **Data Claims:** All sensor data fields as individual claims

**JWT Signature:**
- Algorithm: HMAC SHA-256 (HS256)
- Secret: Shared between device and server
- Must match server's `JWT_PAYLOAD_SECRET`

### Implementation Flow
1. **Collect sensor data** → Create JSON object
2. **Generate JWT token** → Sign with shared secret
3. **Create request payload** → `{"token": "jwt_string_here"}`
4. **Send HTTP POST** → With proper headers
5. **Handle response** → Process HTTP status codes

### Technical Considerations
- **Memory Management**: JWT tokens can be large (1-3KB)
- **Time Synchronization**: Accurate timestamps prevent token expiration issues
- **Error Handling**: Implement retry logic for failed JWT creation
- **Security**: Never log or transmit the JWT secret key

---

## 🔧 Error Handling

### HTTP Response Codes

| Code | Meaning | Action |
|------|---------|---------|
| **200** | ✅ Success (data updated) | Continue normal operation |
| **201** | ✅ Success (alert created) | Continue normal operation |
| **400** | ❌ Bad Request | Check JWT token format/validation |
| **401** | ❌ Unauthorized | Check API key or JWT token expired |
| **404** | ❌ Not Found | Check server URL |
| **429** | ❌ Rate Limited | Reduce sending frequency |
| **500** | ❌ Server Error | Retry after delay |

### JWT-Specific Error Messages

| Error | Description | Solution |
|-------|-------------|----------|
| **JWT token required** | No token in request body | Ensure JWT token is in `{"token": "..."}` format |
| **Invalid JWT token format** | Malformed JWT | Check JWT creation process and secret key |
| **JWT token has expired** | Token older than 5 minutes | Generate new JWT token |
| **JWT token not yet valid** | Token issued in future | Check ESP32 clock/NTP sync |

### Error Response Format
```json
{
  "success": false,
  "message": "Invalid location data",
  "errors": [
    {
      "field": "latitude",
      "message": "Latitude must be between -90 and 90"
    }
  ],
  "timestamp": "2025-01-15T12:30:00.000Z"
}
```

### Error Handling Strategy
**Recommended approach for handling different response codes:**

- **200/201**: Success - Continue normal operation
- **400**: Bad Request - Check JWT token format and data validation
- **401**: Unauthorized - Verify API key and JWT token expiration
- **429**: Rate Limited - Implement exponential backoff (increase send interval)
- **500**: Server Error - Implement retry logic with delays
- **Network Errors**: Check connectivity and retry with backoff

---

## 📊 Data Validation Rules

### Location Data
- **deviceId**: 3-50 alphanumeric characters
- **latitude**: -90 to 90 degrees
- **longitude**: -180 to 180 degrees
- **batteryVoltage**: 0-50 volts (required)
- **speed**: 0-1000 km/h
- **course**: 0-360 degrees
- **temperature**: -50 to 100°C
- **humidity**: 0-100%
- **analogInputs**: Values 0-1024

### Alert Data
- **alertType**: `vibration`, `tampering`, `low_battery`, `geofence`, `offline`, `temperature`, `custom`
- **severity**: `low`, `medium`, `high`, `critical`
- **message**: 1-500 characters (required)
- **title**: 1-100 characters

---

## ⚡ Performance Recommendations

### Data Transmission Frequency
- **Normal operation**: Every 30-60 seconds
- **Moving/active**: Every 15-30 seconds  
- **Stationary**: Every 2-5 minutes
- **Emergency**: Immediate

### Battery Optimization
- **Deep Sleep**: Use device sleep modes between transmissions
- **Adaptive Intervals**: Increase send intervals when stationary
- **Conditional Sending**: Only send data when values change significantly
- **Power Management**: Disable unnecessary peripherals between readings

### Retry Logic
- **Maximum Retries**: 3 attempts per request
- **Exponential Backoff**: 1s, 2s, 4s delays between retries
- **Success Conditions**: HTTP 200/201 response codes
- **Failure Handling**: Log errors and continue with next scheduled transmission

---

## 🚀 Testing Your Integration

### 1. JWT Token Generation for Testing

First, create JWT tokens for testing. You can use the server's utility function or online JWT generators.

**Example using Node.js:**
```javascript
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'your_shared_jwt_secret_here'; // Same as device

// Test data payload
const locationData = {
  deviceId: "DEVICE_001",
  latitude: 40.7128,
  longitude: -74.0060,
  batteryVoltage: 3.7,
  batteryPercentage: 85
};

// Create JWT token (expires in 5 minutes)
const token = jwt.sign(locationData, JWT_SECRET, {
  expiresIn: '5m',
  issuer: 'esp32',
  algorithm: 'HS256'
});

console.log('JWT Token:', token);
```

### 2. Test Data Transmission with JWT
```bash
# Generate JWT token first, then use it:
curl -X POST "https://your-server.com/api/v1/device/update-data" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkZXZpY2VJZCI6IkRFVklDRV8wMDEiLCJsYXRpdHVkZSI6NDAuNzEyOCwibG9uZ2l0dWRlIjotNzQuMDA2MCwiYmF0dGVyeVZvbHRhZ2UiOjMuNywiaXNzIjoiZXNwMzIiLCJpYXQiOjE3MzY5NTEwMDAsImV4cCI6MTczNjk1MTMwMH0.YOUR_SIGNATURE_HERE"
  }'
```

### 3. Test Alert Generation with JWT
```bash
# Generate JWT token for alert data, then use it:
curl -X POST "https://your-server.com/api/v1/alert" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkZXZpY2VJZCI6IkRFVklDRV8wMDEiLCJhbGVydFR5cGUiOiJjdXN0b20iLCJzZXZlcml0eSI6ImhpZ2giLCJtZXNzYWdlIjoiVGVzdCBhbGVydCBmcm9tIGRldmljZSIsImlzcyI6ImVzcDMyIiwiaWF0IjoxNzM2OTUxMDAwLCJleHAiOjE3MzY5NTEzMDB9.YOUR_SIGNATURE_HERE"
  }'
```

### 3. Monitor Device Output
Look for these status indicators in your device logs:
- Network connectivity established
- JWT token creation successful
- HTTP request sent successfully
- Server response received and parsed
- Error codes and descriptions for debugging

---

## 📋 Pre-Deployment Checklist

### Device Configuration
- [ ] **Network credentials** configured correctly
- [ ] **API key** provided and valid
- [ ] **JWT secret key** matches server configuration
- [ ] **JWT library** installed and functioning
- [ ] **Device ID** is unique and matches database entry
- [ ] **Server URL** is correct (https/http)
- [ ] **Data transmission interval** is appropriate for use case
- [ ] **Error handling** implemented for all HTTP codes
- [ ] **Battery monitoring** and low battery alerts working
- [ ] **Emergency alerts** tested and functional
- [ ] **GPS/location data** readings are accurate
- [ ] **Sensor integrations** validated
- [ ] **JWT token creation** tested successfully

### Server Configuration
- [ ] **JWT_PAYLOAD_SECRET** environment variable set
- [ ] **JWT secret** shared securely with IoT devices
- [ ] **JWT middleware** enabled on update-data and alert routes
- [ ] **Token expiration** configured (default: 5 minutes)

### Environment Variables
Add this to your server's `.env` file:
```bash
# JWT Secret for IoT device payload encryption
JWT_PAYLOAD_SECRET=your_secure_jwt_secret_key_here_2025
```

⚠️ **Security Note**: Use a strong, unique secret key (minimum 32 characters) and never commit it to version control.

---

## 🆘 Troubleshooting

### Common Issues

**"HTTP Error: -1"**
- Check WiFi connection
- Verify server URL is accessible
- Test with curl/Postman first

**"HTTP Error: 401"**  
- Verify API key is correct
- Check header format: `X-API-Key: your_key`

**"HTTP Error: 400"**
- Validate JWT token format
- Check JWT secret key matches server
- Ensure all required fields are present in JWT payload
- Verify data types and ranges

**"HTTP Error: 401" (Unauthorized)**
- Check API key is correct
- Verify JWT token hasn't expired (5-minute limit)
- Ensure JWT secret matches server secret

**"JWT token creation fails on device"**
- Check JWT library is installed and configured correctly
- Verify JWT secret key matches server configuration
- Ensure sufficient memory allocated for JWT operations
- Check system time sync for accurate timestamps
- Validate JSON payload structure before JWT encoding

**"Data not appearing in dashboard"**
- Confirm deviceId matches database entry
- Check server logs for JWT decoding errors
- Verify JWT payload contains all required fields
- Check device logs for JWT creation success messages
- Ensure all required data fields are present in JWT claims

---

**Server API Version**: v1  
**Last Updated**: January 2025  
**JWT Token Expiry**: 5 minutes

For technical support, contact your backend development team with device logs, HTTP response codes, and specific error messages.
