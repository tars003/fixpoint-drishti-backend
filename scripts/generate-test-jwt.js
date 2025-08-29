const jwt = require('jsonwebtoken');

/**
 * JWT Token Generator for ESP32 Location Data
 * This script demonstrates how to generate JWT tokens for the update-data endpoint
 * Use this to test your API or understand the token generation process
 */

// JWT Secret (must match backend JWT_PAYLOAD_SECRET)
const JWT_PAYLOAD_SECRET =  'skdljfkdsj222343232AAasdasd';

// Sample location data variables (replace with actual sensor readings)
const deviceId = "ESP32001";
const latitude = 28.6139;           // GPS latitude
const longitude = 77.2090;          // GPS longitude
const batteryVoltage = 4.1;         // Battery voltage in V (required)
const batteryPercentage = 92;       // Battery percentage (optional)
const altitude = 218;               // Altitude in meters
const speed = 67.5;                 // Speed in km/h
const course = 45;                  // Course/heading in degrees
const accuracy = 3.2;               // GPS accuracy in meters
const satellites = 12;              // Number of GPS satellites
const signalStrength = -68;         // Signal strength in dBm
const temperature = 31.2;           // Temperature in Celsius
const humidity = 72;                // Humidity percentage

// Create payload with current timestamps
const currentTime = Math.floor(Date.now() / 1000);
const payload = {
    deviceId: deviceId,
    latitude: latitude,
    longitude: longitude,
    batteryVoltage: batteryVoltage,
    batteryPercentage: batteryPercentage,
    altitude: altitude,
    speed: speed,
    course: course,
    accuracy: accuracy,
    satellites: satellites,
    signalStrength: signalStrength,
    temperature: temperature,
    humidity: humidity,
    iss: "esp32",                   // Issuer (identifies ESP32 as source)
    iat: currentTime,               // Issued at (current timestamp)
    exp: currentTime + 300          // Expires in 5 minutes (300 seconds)
};

console.log('=== JWT TOKEN GENERATOR FOR ESP32 ===\n');

console.log('1. Payload Data:');
console.log(JSON.stringify(payload, null, 2));
console.log('\n');

try {
    // Generate JWT token using HS256 algorithm
    const token = jwt.sign(payload, JWT_PAYLOAD_SECRET, {
        algorithm: 'HS256'
    });
    
    console.log('2. Generated JWT Token:');
    console.log(token);
    console.log('\n');
    
    // Verify the token (this is what the backend does)
    const verified = jwt.verify(token, JWT_PAYLOAD_SECRET);
    console.log('3. Token Verification - SUCCESS ✓');
    console.log('Decoded payload matches original:', JSON.stringify(verified, null, 2));
    console.log('\n');
    
    // Show how to make the API request
    console.log('4. How to send to API:');
    console.log('======================');
    console.log('Method: POST');
    console.log('URL: http://your-server.com/api/v1/device/update-data');
    console.log('Headers:');
    console.log('  Content-Type: text/plain');
    console.log('  X-API-Key: your_api_key_here');
    console.log('Body (raw JWT token):');
    console.log(token);
    console.log('\n');
    
    console.log('Alternative JSON format:');
    console.log('Headers:');
    console.log('  Content-Type: application/json');
    console.log('  X-API-Key: your_api_key_here');
    console.log('Body (JSON):');
    console.log(JSON.stringify({ token: token }, null, 2));
    console.log('\n');
    
    // Show token expiry info
    const tokenInfo = jwt.decode(token);
    const expiryDate = new Date(tokenInfo.exp * 1000);
    console.log('5. Token Info:');
    console.log(`Token expires at: ${expiryDate.toISOString()}`);
    console.log(`Token valid for: ${(tokenInfo.exp - tokenInfo.iat) / 60} minutes`);
    console.log(`Time remaining: ${Math.max(0, (tokenInfo.exp - currentTime) / 60).toFixed(2)} minutes`);
    
} catch (error) {
    console.error('❌ Error generating token:', error.message);
}

console.log('\n=== ESP32 IMPLEMENTATION NOTES ===');
console.log('1. Use ArduinoJWT library or similar for ESP32');
console.log('2. Secret key must be: "' + JWT_PAYLOAD_SECRET + '"');
console.log('3. Algorithm must be: HS256');
console.log('4. Token expires in 5 minutes - generate fresh tokens');
console.log('5. Include current Unix timestamp for iat and exp');
console.log('6. Required fields: deviceId, latitude, longitude, batteryVoltage');
console.log('7. Don\'t forget the X-API-Key header!');

// Function to generate token (for programmatic use)
function generateLocationToken(sensorData) {
    const currentTime = Math.floor(Date.now() / 1000);
    
    const payload = {
        ...sensorData,
        iss: "esp32",
        iat: currentTime,
        exp: currentTime + 300 // 5 minutes
    };
    
    return jwt.sign(payload, JWT_PAYLOAD_SECRET, {
        algorithm: 'HS256'
    });
}

// Export for use in other scripts
module.exports = {
    generateLocationToken,
    JWT_PAYLOAD_SECRET
};
