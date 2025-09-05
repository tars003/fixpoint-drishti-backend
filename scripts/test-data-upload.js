const jwt = require('jsonwebtoken');

// Configuration
const API_ENDPOINT = 'https://coolify.asheecontroltech.in/api/v1/device/update-data';
const API_KEY = 'shjdbjbdfbsdsdvhjvsdjfvsdkvfk234234324dvbdfkjd';
const SECRET_KEY = 'skdljfkdsj222343232AAasdasd';

// Device data payload
const deviceData = {
  "deviceId": "DEVICE_001",
  "latitude": 40.7128,
  "longitude": -74.006,
  "batteryVoltage": 3.7,
  "batteryPercentage": 85,
  "altitude": 10.5,
  "speed": 25.2,
  "course": 180,
  "accuracy": 5,
  "satellites": 8,
  "signalStrength": -75,
  "temperature": 22.5,
  "humidity": 65,
  "engineRpm": 2500,
  "vehicleSpeed": 65,
  "engineLoad": 45.2,
  "coolantTemperature": 85,
  "fuelLevel": 75,
  "throttlePosition": 25.5,
  "intakeAirTemperature": 30,
  "mafAirFlowRate": 12.5,
  "fuelPressure": 350,
  "engineRuntime": 3600,
  "distanceTraveled": 25000,
  "barometricPressure": 101,
  "additionalData": {
    "customSensor1": 123,
    "driverBehavior": "normal",
    "maintenanceMode": false
  },
  "timestamp": "2025-09-05T14:06:39.100Z",
  "iss": "esp32"
};

function createJWTToken() {
  // Get current time in seconds (Unix timestamp)
  const currentTime = Math.floor(Date.now() / 1000);
  
  // Create payload with updated timestamps
  const payload = {
    ...deviceData,
    iat: currentTime,           // Issued at: current time
    exp: currentTime + 300,     // Expires: 5 minutes (300 seconds) from now
    timestamp: new Date().toISOString() // Update timestamp to current time
  };
  
  // Sign the JWT token
  const token = jwt.sign(payload, SECRET_KEY, { algorithm: 'HS256' });
  
  return token;
}

async function sendDeviceData() {
  try {
    // Generate JWT token
    const token = createJWTToken();
    
    console.log('Generated JWT Token:', token);
    console.log('Token payload:', jwt.decode(token));
    
    // Prepare request body
    const requestBody = {
      token: token
    };
    
    // Make HTTP request
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify(requestBody)
    });
    
    // Handle response
    if (response.ok) {
      const responseData = await response.json();
      console.log('✅ Request successful!');
      console.log('Response status:', response.status);
      console.log('Response data:', responseData);
    } else {
      console.error('❌ Request failed!');
      console.error('Response status:', response.status);
      console.error('Response text:', await response.text());
    }
    
  } catch (error) {
    console.error('❌ Error occurred:', error.message);
  }
}

// Function to send data with custom device data
async function sendCustomDeviceData(customData = {}) {
  try {
    // Merge custom data with default device data
    const mergedData = {
      ...deviceData,
      ...customData
    };
    
    // Get current time in seconds (Unix timestamp)
    const currentTime = Math.floor(Date.now() / 1000);
    
    // Create payload with updated timestamps
    const payload = {
      ...mergedData,
      iat: currentTime,
      exp: currentTime + 300,
      timestamp: new Date().toISOString()
    };
    
    // Generate JWT token
    const token = jwt.sign(payload, SECRET_KEY, { algorithm: 'HS256' });
    
    console.log('Generated JWT Token with custom data:', token);
    
    // Make HTTP request
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify({ token })
    });
    
    if (response.ok) {
      const responseData = await response.json();
      console.log('✅ Custom data request successful!');
      console.log('Response:', responseData);
    } else {
      console.error('❌ Custom data request failed!');
      console.error('Status:', response.status);
      console.error('Response:', await response.text());
    }
    
  } catch (error) {
    console.error('❌ Error with custom data:', error.message);
  }
}

// Export functions for use in other modules
module.exports = {
  sendDeviceData,
  sendCustomDeviceData,
  createJWTToken
};

// If this script is run directly, execute the main function
if (require.main === module) {
  console.log('🚀 Starting device data transmission...');
  sendDeviceData();
  
  // Example of sending custom data after 2 seconds
  setTimeout(() => {
    console.log('\n🔄 Sending custom device data...');
    sendCustomDeviceData({
      batteryPercentage: 90,
      temperature: 25.0,
      vehicleSpeed: 70
    });
  }, 2000);
}