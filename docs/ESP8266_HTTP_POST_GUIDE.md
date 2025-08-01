# ESP8266 NodeMCU HTTP POST Guide

Complete guide for sending HTTP POST requests from ESP8266 NodeMCU to your IoT Tracking Server with real sensor data.

## 📋 Overview

This guide shows you how to send HTTP POST requests from ESP8266 NodeMCU to your IoT tracking server using the exact same data structure as your working curl example. Perfect for testing and implementing real IoT sensor data transmission.

## 🔧 Hardware Requirements

- ESP8266 NodeMCU development board
- USB cable for programming
- Optional: Real sensors (GPS, DHT22, etc.) or use simulated data for testing

## 📚 Required Libraries

Install these libraries in Arduino IDE:

1. **ESP8266WiFi** - Built-in with ESP8266 board package
2. **ESP8266HTTPClient** - Built-in with ESP8266 board package  
3. **ArduinoJson** - Install via Library Manager
4. **WiFiClient** - Built-in with ESP8266 board package

### Installing Libraries

Go to **Sketch** → **Include Library** → **Manage Libraries**
Search for "ArduinoJson" by Benoit Blanchon and install it.

## 🚀 Complete ESP8266 Code Examples

### Basic HTTP POST with JSON Data

This example sends the exact same data structure as your curl request:

```cpp
/*
 * ESP8266 NodeMCU HTTP POST to IoT Tracking Server
 * Sends location and sensor data in JSON format
 * Based on latest ESP8266 HTTP client methods (2024)
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";           // Replace with your WiFi SSID
const char* password = "YOUR_WIFI_PASSWORD";   // Replace with your WiFi password

// Server configuration
const char* serverURL = "https://coolify.asheecontroltech.in/api/v1/device/update-data";
const char* apiKey = "change_this_secure_api_key_too";  // Your actual API key

// Device configuration
const char* deviceId = "ESP8266_001";

// Timing configuration
unsigned long lastTime = 0;
unsigned long timerDelay = 30000; // Send data every 30 seconds

void setup() {
  Serial.begin(115200);
  Serial.println();
  Serial.println("ESP8266 IoT Tracker Starting...");
  
  // Connect to WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println();
  Serial.print("✅ Connected to WiFi! IP address: ");
  Serial.println(WiFi.localIP());
  Serial.println("🚀 Ready to send data to server");
  Serial.println();
}

void loop() {
  // Send data every 30 seconds
  if ((millis() - lastTime) > timerDelay) {
    
    // Check WiFi connection
    if (WiFi.status() == WL_CONNECTED) {
      sendSensorData();
    } else {
      Serial.println("❌ WiFi Disconnected - attempting reconnect...");
      WiFi.reconnect();
    }
    
    lastTime = millis();
  }
}

void sendSensorData() {
  WiFiClient client;
  HTTPClient http;
  
  // Begin HTTP connection
  http.begin(client, serverURL);
  
  // Set headers
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", apiKey);
  
  // Create JSON payload with your exact data structure
  DynamicJsonDocument doc(1024);
  
  // Device identification
  doc["deviceId"] = deviceId;
  
  // GPS coordinates (example: New York City area)
  doc["latitude"] = generateRandomLatitude(-40.7128, 0.1);   // NYC latitude with variation
  doc["longitude"] = generateRandomLongitude(-74.0060, 0.1); // NYC longitude with variation
  
  // Power management
  doc["batteryVoltage"] = generateRandomFloat(3.3, 4.2);      // Realistic battery range
  doc["batteryPercentage"] = calculateBatteryPercentage(doc["batteryVoltage"]);
  
  // Location data
  doc["altitude"] = generateRandomFloat(5.0, 50.0);
  doc["speed"] = generateRandomFloat(0.0, 60.0);              // km/h
  doc["course"] = random(0, 360);                             // 0-360 degrees
  doc["accuracy"] = generateRandomFloat(3.0, 15.0);           // GPS accuracy in meters
  doc["satellites"] = random(4, 12);                          // Realistic satellite count
  
  // Signal strength
  doc["signalStrength"] = WiFi.RSSI();                        // Actual WiFi signal strength
  
  // Environmental sensors
  doc["temperature"] = generateRandomFloat(18.0, 30.0);       // Celsius
  doc["humidity"] = generateRandomFloat(40.0, 80.0);          // Percentage
  
  // Digital inputs (simulated sensor states)
  JsonObject digitalInputs = doc.createNestedObject("digitalInputs");
  digitalInputs["pin2"] = random(0, 2) == 1;                  // Random true/false
  digitalInputs["pin4"] = random(0, 2) == 1;
  digitalInputs["ignition"] = random(0, 2) == 1;
  
  // Analog inputs (simulated sensor readings)
  JsonObject analogInputs = doc.createNestedObject("analogInputs");
  analogInputs["A0"] = random(0, 1024);                       // 10-bit ADC reading
  analogInputs["A1"] = random(0, 1024);
  analogInputs["fuel_level"] = random(100, 900);              // Fuel sensor reading
  
  // Timestamp (current time)
  doc["timestamp"] = getCurrentTimestamp();
  
  // Convert JSON to string
  String jsonString;
  serializeJson(doc, jsonString);
  
  // Print what we're sending (for debugging)
  Serial.println("📡 Sending data to server:");
  Serial.println("URL: " + String(serverURL));
  Serial.println("Payload: " + jsonString);
  Serial.println();
  
  // Send HTTP POST request
  int httpResponseCode = http.POST(jsonString);
  
  // Handle response
  if (httpResponseCode > 0) {
    Serial.print("✅ HTTP Response code: ");
    Serial.println(httpResponseCode);
    
    String response = http.getString();
    Serial.println("📥 Server response: " + response);
    
    // Parse and display response
    if (httpResponseCode == 200) {
      Serial.println("🎉 Data sent successfully!");
    } else {
      Serial.println("⚠️  Unexpected response code");
    }
  } else {
    Serial.print("❌ Error sending request. Code: ");
    Serial.println(httpResponseCode);
    Serial.println("Error description: " + http.errorToString(httpResponseCode));
  }
  
  // Clean up
  http.end();
  Serial.println("-----------------------------------");
  Serial.println();
}

// Helper functions for generating realistic test data
float generateRandomFloat(float min, float max) {
  return min + (float)random(0, 1000) / 1000.0 * (max - min);
}

float generateRandomLatitude(float center, float range) {
  return center + generateRandomFloat(-range, range);
}

float generateRandomLongitude(float center, float range) {
  return center + generateRandomFloat(-range, range);
}

int calculateBatteryPercentage(float voltage) {
  // Convert voltage to percentage (3.3V = 0%, 4.2V = 100%)
  if (voltage <= 3.3) return 0;
  if (voltage >= 4.2) return 100;
  return (int)((voltage - 3.3) / (4.2 - 3.3) * 100);
}

String getCurrentTimestamp() {
  // For testing, create a timestamp string
  // In real application, use NTP time sync
  unsigned long currentTime = millis();
  return "2025-01-15T" + String(currentTime % 86400000 / 3600000) + ":" + 
         String((currentTime % 3600000) / 60000) + ":" + 
         String((currentTime % 60000) / 1000) + ".000Z";
}
```

### Simplified Version for Quick Testing

If you just want to quickly test the connection:

```cpp
/*
 * ESP8266 Simple HTTP POST Test
 * Minimal code for testing server connection
 */
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* serverURL = "https://coolify.asheecontroltech.in/api/v1/device/update-data";
const char* apiKey = "change_this_secure_api_key_too";

void setup() {
  Serial.begin(115200);
  
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("WiFi Connected!");
  
  // Send test data immediately
  sendTestData();
}

void loop() {
  // Send data every 60 seconds
  delay(60000);
  sendTestData();
}

void sendTestData() {
  if (WiFi.status() == WL_CONNECTED) {
    WiFiClient client;
    HTTPClient http;
    
    http.begin(client, serverURL);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-API-Key", apiKey);
    
    // Your exact test payload
    String payload = R"({
      "deviceId": "ESP8266_001",
      "latitude": -62.4409,
      "longitude": -1.4608,
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
    })";
    
    int httpCode = http.POST(payload);
    
    Serial.print("HTTP Code: ");
    Serial.println(httpCode);
    
    if (httpCode > 0) {
      String response = http.getString();
      Serial.println("Response: " + response);
    }
    
    http.end();
  }
}
```

## 🔧 Configuration Steps

### 1. WiFi Setup
Replace these lines with your actual WiFi credentials:
```cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
```

### 2. Server Configuration
Update the server URL and API key:
```cpp
const char* serverURL = "https://coolify.asheecontroltech.in/api/v1/device/update-data";
const char* apiKey = "your_actual_api_key_here";
```

### 3. Device ID
Set a unique device identifier:
```cpp
const char* deviceId = "ESP8266_001";  // Make this unique per device
```

## 📊 Data Types Supported

Your server accepts these data fields:

### Required Fields
- `deviceId` (String) - Unique device identifier
- `latitude` (Float) - GPS coordinate (-90 to 90)
- `longitude` (Float) - GPS coordinate (-180 to 180)
- `batteryVoltage` (Float) - Battery voltage in volts

### Optional Fields
- `batteryPercentage` (Integer) - Battery level 0-100%
- `altitude` (Float) - Height above sea level in meters
- `speed` (Float) - Current speed in km/h
- `course` (Integer) - Direction 0-360 degrees
- `accuracy` (Float) - GPS accuracy in meters
- `satellites` (Integer) - Number of GPS satellites
- `signalStrength` (Integer) - Signal strength in dBm
- `temperature` (Float) - Temperature in Celsius
- `humidity` (Float) - Humidity percentage
- `digitalInputs` (Object) - Digital pin states
- `analogInputs` (Object) - Analog sensor readings
- `timestamp` (String) - ISO 8601 timestamp

## 🐛 Troubleshooting

### Common HTTP Response Codes
- `200` - ✅ Success! Data received
- `400` - ❌ Bad Request (check JSON format)
- `401` - ❌ Unauthorized (check API key)
- `404` - ❌ Not Found (check URL)
- `-1` - ❌ Connection failed
- `-11` - ❌ Read timeout

### WiFi Connection Issues
```cpp
// Add WiFi reconnection logic
if (WiFi.status() != WL_CONNECTED) {
  Serial.println("WiFi disconnected, reconnecting...");
  WiFi.disconnect();
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
}
```

### HTTPS vs HTTP
If you get SSL errors, your server might require HTTPS. Use:
```cpp
// For HTTPS connections
WiFiClientSecure client;
client.setInsecure(); // Skip certificate validation for testing
http.begin(client, serverURL);
```

## 🔄 Real Sensor Integration

### GPS Module (NEO-6M/8M)
```cpp
#include <SoftwareSerial.h>
#include <TinyGPS++.h>

TinyGPSPlus gps;
SoftwareSerial ss(4, 3);

void setup() {
  ss.begin(9600);
}

void getRealGPSData() {
  while (ss.available() > 0) {
    if (gps.encode(ss.read())) {
      if (gps.location.isValid()) {
        float latitude = gps.location.lat();
        float longitude = gps.location.lng();
        // Use these values in your JSON
      }
    }
  }
}
```

### DHT22 Temperature/Humidity Sensor
```cpp
#include <DHT.h>

#define DHT_PIN 2
#define DHT_TYPE DHT22
DHT dht(DHT_PIN, DHT_TYPE);

void setup() {
  dht.begin();
}

void getRealSensorData() {
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();
  
  if (!isnan(temperature) && !isnan(humidity)) {
    // Use these values in your JSON
  }
}
```

## ⚡ Power Optimization

For battery-powered devices:

```cpp
#include <ESP8266WiFi.h>

void enterDeepSleep(int minutes) {
  Serial.println("Entering deep sleep for " + String(minutes) + " minutes");
  ESP.deepSleep(minutes * 60 * 1000000); // Microseconds
}

void loop() {
  sendSensorData();
  
  // Sleep for 10 minutes to save battery
  enterDeepSleep(10);
}
```

## 📈 Advanced Features

### Retry Logic with Exponential Backoff
```cpp
bool sendDataWithRetry(String payload, int maxRetries = 3) {
  int retryDelay = 1000; // Start with 1 second
  
  for (int attempt = 1; attempt <= maxRetries; attempt++) {
    Serial.println("Attempt " + String(attempt) + " of " + String(maxRetries));
    
    if (sendSensorData()) {
      return true; // Success
    }
    
    if (attempt < maxRetries) {
      Serial.println("Retry in " + String(retryDelay / 1000) + " seconds...");
      delay(retryDelay);
      retryDelay *= 2; // Double the delay for next attempt
    }
  }
  
  Serial.println("❌ All retry attempts failed");
  return false;
}
```

### Data Queue for Offline Mode
```cpp
#include <queue>

std::queue<String> dataQueue;

void queueData(String jsonData) {
  dataQueue.push(jsonData);
  Serial.println("Data queued. Queue size: " + String(dataQueue.size()));
}

void processQueue() {
  while (!dataQueue.empty() && WiFi.status() == WL_CONNECTED) {
    String data = dataQueue.front();
    if (sendDataToServer(data)) {
      dataQueue.pop();
      Serial.println("✅ Queued data sent successfully");
    } else {
      Serial.println("❌ Failed to send queued data, will retry later");
      break;
    }
  }
}
```

## 🚀 Testing Your Setup

1. **Upload the simple test code first**
2. **Open Serial Monitor (115200 baud)**
3. **Watch for successful connection messages**
4. **Check your server logs for incoming data**
5. **Gradually add real sensors**

Your ESP8266 NodeMCU is now ready to send data to your IoT tracking server! 📡

## 📚 References

Based on the latest ESP8266 HTTP client examples from:
- [Random Nerd Tutorials ESP8266 HTTP POST Guide](https://randomnerdtutorials.com/esp8266-nodemcu-http-post-ifttt-thingspeak-arduino/)
- [ESP8266 HTTP Client Documentation](https://arduino-esp8266.readthedocs.io/en/latest/esp8266wifi/client-examples.html)
- [ArduinoJson Library Documentation](https://arduinojson.org/)

---
*Last updated: January 2025 - Compatible with ESP8266 Arduino Core 3.x.x*