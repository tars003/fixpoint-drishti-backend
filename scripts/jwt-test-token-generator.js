#!/usr/bin/env node
/**
 * JWT Test Token Generator
 * Generates JWT tokens for testing ESP32 integration
 * 
 * Usage: node scripts/jwt-test-token-generator.js [data|alert]
 */

const jwt = require('jsonwebtoken');

// JWT Secret - should match server and ESP32
const JWT_SECRET = process.env.JWT_PAYLOAD_SECRET || 'iot_device_payload_secret_2025';

// Sample location data payload
const sampleLocationData = {
  deviceId: "ESP32_001",
  latitude: 40.7128,
  longitude: -74.0060,
  batteryVoltage: 3.7,
  batteryPercentage: 85,
  altitude: 10.5,
  speed: 25.2,
  course: 180,
  accuracy: 5.0,
  satellites: 8,
  signalStrength: -75,
  temperature: 22.5,
  humidity: 65,
  digitalInputs: {
    pin2: true,
    pin4: false,
    ignition: true
  },
  analogInputs: {
    A0: 512,
    A1: 256,
    fuel_level: 800
  },
  timestamp: new Date().toISOString()
};

// Sample alert data payload
const sampleAlertData = {
  deviceId: "ESP32_001",
  alertType: "custom",
  severity: "high",
  title: "Test Emergency Alert",
  message: "This is a test emergency alert from ESP32",
  latitude: 40.7128,
  longitude: -74.0060,
  data: {
    buttonPin: "D2",
    pressCount: 1,
    batteryLevel: 85,
    testMode: true
  }
};

// JWT options
const jwtOptions = {
  expiresIn: '5m',     // 5 minutes (matches server requirement)
  issuer: 'esp32',     // Issuer claim
  algorithm: 'HS256'   // HMAC SHA-256
};

function generateJwtToken(payload, description) {
  try {
    console.log(`\n📝 ${description}:`);
    console.log('=' .repeat(60));
    
    // Generate JWT token
    const token = jwt.sign(payload, JWT_SECRET, jwtOptions);
    
    // Decode token to show claims (for verification)
    const decoded = jwt.decode(token, { complete: true });
    
    console.log('\n🔑 Generated JWT Token:');
    console.log(token);
    
    console.log('\n📊 Token Claims:');
    console.log(JSON.stringify(decoded.payload, null, 2));
    
    console.log('\n📋 Request Payload for API:');
    console.log(JSON.stringify({ token }, null, 2));
    
    console.log('\n🧪 Test with curl:');
    const apiEndpoint = description.includes('Alert') ? 
      'https://your-server.com/api/v1/alert' : 
      'https://your-server.com/api/v1/device/update-data';
      
    console.log(`curl -X POST "${apiEndpoint}" \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -H "X-API-Key: your_api_key_here" \\`);
    console.log(`  -d '${JSON.stringify({ token }, null, 2).replace(/\n/g, '')}'`);
    
    console.log('\n⏰ Token Expiry:');
    console.log(`Issued At: ${new Date(decoded.payload.iat * 1000).toISOString()}`);
    console.log(`Expires At: ${new Date(decoded.payload.exp * 1000).toISOString()}`);
    console.log(`Valid For: ${Math.floor((decoded.payload.exp - decoded.payload.iat) / 60)} minutes`);
    
    return token;
    
  } catch (error) {
    console.error('❌ Error generating JWT token:', error.message);
    process.exit(1);
  }
}

function main() {
  const args = process.argv.slice(2);
  const type = args[0] || 'data';
  
  console.log('🚀 JWT Token Generator for ESP32 Testing');
  console.log('=========================================');
  console.log(`JWT Secret: ${JWT_SECRET}`);
  console.log(`Token Type: ${type}`);
  
  if (type === 'alert') {
    generateJwtToken(sampleAlertData, 'Alert Data JWT Token');
  } else if (type === 'data') {
    generateJwtToken(sampleLocationData, 'Location Data JWT Token');
  } else if (type === 'both') {
    generateJwtToken(sampleLocationData, 'Location Data JWT Token');
    generateJwtToken(sampleAlertData, 'Alert Data JWT Token');
  } else {
    console.log('\n❌ Invalid type. Use: data, alert, or both');
    console.log('\nUsage Examples:');
    console.log('  node scripts/jwt-test-token-generator.js data   # Generate location data token');
    console.log('  node scripts/jwt-test-token-generator.js alert  # Generate alert token');
    console.log('  node scripts/jwt-test-token-generator.js both   # Generate both tokens');
    process.exit(1);
  }
  
  console.log('\n✅ JWT tokens generated successfully!');
  console.log('\n💡 Tips:');
  console.log('- Copy the JWT token to test with curl or Postman');
  console.log('- Tokens expire in 5 minutes for security');
  console.log('- Use the same JWT_PAYLOAD_SECRET on both server and ESP32');
  console.log('- Check server logs if token validation fails');
}

// Handle CLI execution
if (require.main === module) {
  main();
}

module.exports = {
  generateJwtToken,
  sampleLocationData,
  sampleAlertData,
  JWT_SECRET
};
