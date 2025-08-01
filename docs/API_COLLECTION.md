# IoT Tracking Server - API Collection

Complete API documentation organized by client type, with curl examples for Postman import.

## 📱 **ESP32 Device Routes** (Used by IoT Hardware)

These routes are called directly by your ESP32 device code. Rate limits are higher to accommodate frequent location updates.

### Base Configuration for ESP32
- **Authentication:** API Key in header `X-API-Key`
- **Content-Type:** `application/json`
- **Rate Limits:** 60 requests/minute for location updates, 10/minute for alerts

---

### 🔧 **ESP32 - Core Routes**

#### 1. Health Check (Optional - Connectivity Test)
```bash
curl --location 'http://localhost:3000/health' \
--header 'Accept: application/json'
```
**Usage:** ESP32 can ping this to test server connectivity before sending data.

#### 2. Register Device (Optional - First Boot)
```bash
curl --location 'http://localhost:3000/api/v1/device/register' \
--header 'Content-Type: application/json' \
--header 'X-API-Key: your_api_key_here' \
--data '{
  "deviceId": "ESP32_001",
  "name": "Vehicle Tracker 1",
  "description": "Primary vehicle tracking device",
  "batteryThreshold": 20,
  "alertSettings": {
    "vibrationEnabled": true,
    "tamperingEnabled": true,
    "lowBatteryEnabled": true,
    "geofenceEnabled": false
  },
  "hardware": {
    "model": "ESP32-WROOM-32",
    "version": "1.0",
    "imei": "123456789012345"
  }
}'
```
**Usage:** Called once when ESP32 boots up for the first time, or when device configuration changes.

#### 3. Update Location Data ⭐ **MAIN ESP32 ROUTE**
```bash
curl --location 'http://localhost:3000/api/v1/device/update-data' \
--header 'Content-Type: application/json' \
--header 'X-API-Key: your_api_key_here' \
--data '{
  "deviceId": "ESP32_001",
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
  "timestamp": "2024-01-15T12:00:00.000Z"
}'
```
**Usage:** Called every 30-60 seconds by ESP32 to send GPS coordinates, battery status, and sensor readings.

---

### 🚨 **ESP32 - Alert Routes**

#### 4. Create Low Battery Alert
```bash
curl --location 'http://localhost:3000/api/v1/alert' \
--header 'Content-Type: application/json' \
--header 'X-API-Key: your_api_key_here' \
--data '{
  "deviceId": "ESP32_001",
  "alertType": "low_battery",
  "severity": "high",
  "title": "Low Battery Warning",
  "message": "Battery voltage is critically low: 3.2V (15%)",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "data": {
    "batteryVoltage": 3.2,
    "batteryPercentage": 15,
    "threshold": 20
  }
}'
```
**Usage:** ESP32 creates this alert when battery voltage drops below threshold.

#### 5. Create Vibration/Motion Alert
```bash
curl --location 'http://localhost:3000/api/v1/alert' \
--header 'Content-Type: application/json' \
--header 'X-API-Key: your_api_key_here' \
--data '{
  "deviceId": "ESP32_001",
  "alertType": "vibration",
  "severity": "medium",
  "title": "Vibration Detected",
  "message": "Unexpected vibration detected on device",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "data": {
    "vibrationLevel": 8.5,
    "threshold": 5.0,
    "duration": 15
  }
}'
```
**Usage:** ESP32 creates this when accelerometer detects unexpected movement.

#### 6. Create Temperature Alert
```bash
curl --location 'http://localhost:3000/api/v1/alert' \
--header 'Content-Type: application/json' \
--header 'X-API-Key: your_api_key_here' \
--data '{
  "deviceId": "ESP32_001",
  "alertType": "temperature",
  "severity": "critical",
  "title": "High Temperature Alert",
  "message": "Device temperature is above safe limits: 65°C",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "data": {
    "temperature": 65,
    "threshold": 60,
    "trend": "increasing"
  }
}'
```
**Usage:** ESP32 creates this when temperature sensor readings are outside safe range.

#### 7. Create Tampering Alert
```bash
curl --location 'http://localhost:3000/api/v1/alert' \
--header 'Content-Type: application/json' \
--header 'X-API-Key: your_api_key_here' \
--data '{
  "deviceId": "ESP32_001",
  "alertType": "tampering",
  "severity": "critical",
  "title": "Tampering Detected",
  "message": "Device enclosure has been opened or tampered with",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "data": {
    "tamperSwitch": false,
    "accelerometerShock": true,
    "detectionTime": "2024-01-15T12:30:00.000Z"
  }
}'
```
**Usage:** ESP32 creates this when tamper switch is triggered or sudden shock is detected.

---

### 📝 **ESP32 Arduino Code Example**

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* serverURL = "http://your-server.com/api/v1/device/update-data";
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
    doc["temperature"] = 25.0; // from sensor
    
    String jsonString;
    serializeJson(doc, jsonString);
    
    int httpResponseCode = http.POST(jsonString);
    if (httpResponseCode > 0) {
      Serial.println("✅ Data sent successfully");
    } else {
      Serial.println("❌ Error sending data");
    }
    
    http.end();
  }
}
```

---

## 🖥️ **React Frontend Routes** (Used by Web/Mobile Apps)

These routes are for your React dashboard, mobile app, or any client application that needs to view and manage device data.

### Base Configuration for Frontend
- **Authentication:** Same API Key in header `X-API-Key`
- **Rate Limits:** 100 requests/15 minutes for general API access
- **CORS:** Configured for web browser access

---

### 📊 **Frontend - Server Status**

#### 8. API Status
```bash
curl --location 'http://localhost:3000/api/v1/status' \
--header 'Accept: application/json'
```
**Usage:** Check if API is running and get version info.

#### 9. Root Endpoint
```bash
curl --location 'http://localhost:3000/' \
--header 'Accept: application/json'
```
**Usage:** API welcome message with endpoint documentation.

---

### 📱 **Frontend - Device Management**

#### 10. Get Device Current Location
```bash
curl --location 'http://localhost:3000/api/v1/device/ESP32_001/current' \
--header 'X-API-Key: your_api_key_here'
```
**Usage:** Display current position on map, battery status, last seen time.

#### 11. Get Device Location History
```bash
curl --location 'http://localhost:3000/api/v1/device/ESP32_001/history?startDate=2024-01-01&endDate=2024-01-31&limit=100&page=1' \
--header 'X-API-Key: your_api_key_here'
```
**Usage:** Show route history, create trip reports, analyze movement patterns.

#### 12. Get Device History with Date Range
```bash
curl --location 'http://localhost:3000/api/v1/device/ESP32_001/history?startDate=2024-01-15T00:00:00.000Z&endDate=2024-01-15T23:59:59.999Z&limit=50' \
--header 'X-API-Key: your_api_key_here'
```
**Usage:** Get specific day/time range for detailed analysis.

#### 13. List All Devices
```bash
curl --location 'http://localhost:3000/api/v1/device/list?limit=50&page=1' \
--header 'X-API-Key: your_api_key_here'
```
**Usage:** Device dashboard showing all registered devices with status.

#### 14. List Active Devices Only
```bash
curl --location 'http://localhost:3000/api/v1/device/list?isActive=true&status=online&limit=20' \
--header 'X-API-Key: your_api_key_here'
```
**Usage:** Filter devices by status (online/offline/inactive).

---

### 🚨 **Frontend - Alert Management**

#### 15. Get All Alerts
```bash
curl --location 'http://localhost:3000/api/v1/alert?limit=50&page=1' \
--header 'X-API-Key: your_api_key_here'
```
**Usage:** Alert dashboard showing all system alerts.

#### 16. Get Alerts by Device
```bash
curl --location 'http://localhost:3000/api/v1/alert?deviceId=ESP32_001&limit=20' \
--header 'X-API-Key: your_api_key_here'
```
**Usage:** Show alerts for specific device on device detail page.

#### 17. Get Unresolved Alerts
```bash
curl --location 'http://localhost:3000/api/v1/alert?isResolved=false&limit=50' \
--header 'X-API-Key: your_api_key_here'
```
**Usage:** Priority alert dashboard showing only active issues.

#### 18. Get Critical Alerts
```bash
curl --location 'http://localhost:3000/api/v1/alert?severity=critical&isResolved=false' \
--header 'X-API-Key: your_api_key_here'
```
**Usage:** Emergency dashboard for critical alerts requiring immediate attention.

#### 19. Get Alerts by Type
```bash
curl --location 'http://localhost:3000/api/v1/alert?alertType=low_battery&startDate=2024-01-01&endDate=2024-01-31' \
--header 'X-API-Key: your_api_key_here'
```
**Usage:** Filter alerts by type for specific analysis (battery trends, tampering patterns).

#### 20. Get Alert by ID
```bash
curl --location 'http://localhost:3000/api/v1/alert/65a1b2c3d4e5f6789abc1234' \
--header 'X-API-Key: your_api_key_here'
```
**Usage:** Show detailed alert information with full context.

#### 21. Acknowledge Alert
```bash
curl --location --request PUT 'http://localhost:3000/api/v1/alert/65a1b2c3d4e5f6789abc1234/acknowledge' \
--header 'Content-Type: application/json' \
--header 'X-API-Key: your_api_key_here' \
--data '{
  "acknowledgedBy": "operator_john"
}'
```
**Usage:** Mark alert as seen by operator (changes status from "open" to "acknowledged").

#### 22. Resolve Alert
```bash
curl --location --request PUT 'http://localhost:3000/api/v1/alert/65a1b2c3d4e5f6789abc1234/resolve' \
--header 'Content-Type: application/json' \
--header 'X-API-Key: your_api_key_here' \
--data '{
  "resolvedBy": "technician_mike",
  "resolutionNotes": "Battery replaced, device is functioning normally"
}'
```
**Usage:** Mark alert as fixed/resolved with resolution notes.

#### 23. Get Alert Statistics
```bash
curl --location 'http://localhost:3000/api/v1/alert/stats' \
--header 'X-API-Key: your_api_key_here'
```
**Usage:** Dashboard analytics showing alert trends, resolution times, severity distribution.

#### 24. Get Alert Statistics by Device
```bash
curl --location 'http://localhost:3000/api/v1/alert/stats?deviceId=ESP32_001&startDate=2024-01-01&endDate=2024-01-31' \
--header 'X-API-Key: your_api_key_here'
```
**Usage:** Device-specific analytics for maintenance planning.

#### 25. Delete Alert (Admin Only)
```bash
curl --location --request DELETE 'http://localhost:3000/api/v1/alert/65a1b2c3d4e5f6789abc1234' \
--header 'X-API-Key: your_master_api_key_here'
```
**Usage:** Remove false alerts or clean up old data (requires master API key).

---

## 🧪 **Testing & Development Routes**

### ESP32 Testing Scenarios

#### 26. Simulate Device Journey (ESP32 Testing)
```bash
# Location 1 - Start
curl --location 'http://localhost:3000/api/v1/device/update-data' \
--header 'Content-Type: application/json' \
--header 'X-API-Key: your_api_key_here' \
--data '{
  "deviceId": "ESP32_001",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "batteryVoltage": 4.1,
  "speed": 0,
  "course": 0
}'

# Location 2 - Moving
curl --location 'http://localhost:3000/api/v1/device/update-data' \
--header 'Content-Type: application/json' \
--header 'X-API-Key: your_api_key_here' \
--data '{
  "deviceId": "ESP32_001",
  "latitude": 40.7589,
  "longitude": -73.9851,
  "batteryVoltage": 4.0,
  "speed": 45,
  "course": 90
}'

# Location 3 - Destination
curl --location 'http://localhost:3000/api/v1/device/update-data' \
--header 'Content-Type: application/json' \
--header 'X-API-Key: your_api_key_here' \
--data '{
  "deviceId": "ESP32_001",
  "latitude": 40.7829,
  "longitude": -73.9654,
  "batteryVoltage": 3.9,
  "speed": 0,
  "course": 0
}'
```

#### 27. Simulate Low Battery Scenario
```bash
curl --location 'http://localhost:3000/api/v1/device/update-data' \
--header 'Content-Type: application/json' \
--header 'X-API-Key: your_api_key_here' \
--data '{
  "deviceId": "ESP32_001",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "batteryVoltage": 3.1,
  "batteryPercentage": 10
}'
```

### Error Testing

#### 28. Test Invalid API Key
```bash
curl --location 'http://localhost:3000/api/v1/device/update-data' \
--header 'Content-Type: application/json' \
--header 'X-API-Key: invalid_api_key' \
--data '{
  "deviceId": "ESP32_001",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "batteryVoltage": 3.7
}'
```

#### 29. Test Missing API Key
```bash
curl --location 'http://localhost:3000/api/v1/device/update-data' \
--header 'Content-Type: application/json' \
--data '{
  "deviceId": "ESP32_001",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "batteryVoltage": 3.7
}'
```

#### 30. Test Invalid Coordinates
```bash
curl --location 'http://localhost:3000/api/v1/device/update-data' \
--header 'Content-Type: application/json' \
--header 'X-API-Key: your_api_key_here' \
--data '{
  "deviceId": "ESP32_001",
  "latitude": 999,
  "longitude": -999,
  "batteryVoltage": 3.7
}'
```

---

## 📊 **Response Formats**

### Successful Response
```json
{
  "success": true,
  "message": "Location data updated successfully",
  "timestamp": "2024-01-15T12:00:00.000Z",
  "data": {
    "deviceId": "ESP32_001",
    "timestamp": "2024-01-15T12:00:00.000Z",
    "batteryStatus": "good",
    "alertsCreated": 0,
    "location": {
      "latitude": 40.7128,
      "longitude": -74.0060
    }
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Validation failed",
  "timestamp": "2024-01-15T12:00:00.000Z",
  "errors": [
    {
      "field": "latitude",
      "message": "Latitude must be between -90 and 90",
      "value": 999
    }
  ]
}
```

---

## 🚀 **Postman Environment Setup**

Create these variables in your Postman environment:

```json
{
  "base_url": "http://localhost:3000",
  "api_base": "http://localhost:3000/api/v1",
  "api_key": "your_api_key_here",
  "device_id": "ESP32_001",
  "test_device_id": "TEST_DEVICE_001"
}
```

## 📁 **Postman Collection Organization**

Create folders in Postman:

1. **🤖 ESP32 Device Routes** (Routes #1-7)
   - Health & Registration
   - Location Updates
   - Device Alerts

2. **🖥️ React Frontend Routes** (Routes #8-25)  
   - Server Status
   - Device Management
   - Alert Management

3. **🧪 Testing & Development** (Routes #26-30)
   - Simulation Scenarios
   - Error Testing

## 💡 **Development Workflow**

### For ESP32 Development:
1. Start with Health Check (#1)
2. Register Device (#2) 
3. Test Location Updates (#3)
4. Test Alert Creation (#4-7)
5. Use Testing Scenarios (#26-27)

### For React Frontend Development:
1. Check API Status (#8)
2. List Devices (#13)
3. Get Device Details (#10)
4. Get Location History (#11)
5. Manage Alerts (#15-25)

This organization makes it clear which routes your ESP32 firmware should implement versus which routes your React dashboard will consume! 🚀