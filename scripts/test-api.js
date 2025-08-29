const https = require('https');
const { generateLocationToken } = require('./generate-test-jwt');

// Generate fresh token
const sensorData = {
    deviceId: "ESP32001",
    latitude: 28.6139,
    longitude: 77.2090,
    batteryVoltage: 4.1,
    batteryPercentage: 92,
    altitude: 218,
    speed: 67.5,
    course: 45,
    accuracy: 3.2,
    satellites: 12,
    signalStrength: -68,
    temperature: 31.2,
    humidity: 72
};

const token = generateLocationToken(sensorData);

console.log('=== API TEST SCRIPT ===');
console.log('Fresh Token Generated:', token.substring(0, 50) + '...');
console.log('');

// API request configuration
const postData = JSON.stringify({
    token: token
});

const options = {
    hostname: 'coolify.asheecontroltech.in',
    path: '/api/v1/device/update-data',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'shjdbjbdfbsdsdvhjvsdjfvsdkvfk234234324dvbdfkjd',
        'Content-Length': Buffer.byteLength(postData)
    }
};

console.log('Making API Request to:', `https://${options.hostname}${options.path}`);
console.log('Headers:', JSON.stringify(options.headers, null, 2));
console.log('Payload:', postData);
console.log('');

const req = https.request(options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Response Headers:`, JSON.stringify(res.headers, null, 2));
    
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log('');
        console.log('=== API RESPONSE ===');
        try {
            const jsonResponse = JSON.parse(data);
            console.log(JSON.stringify(jsonResponse, null, 2));
            
            if (jsonResponse.success) {
                console.log('✅ SUCCESS: Location data updated successfully!');
            } else {
                console.log('❌ ERROR:', jsonResponse.message);
            }
        } catch (e) {
            console.log('Raw Response:', data);
        }
    });
});

req.on('error', (err) => {
    console.error('❌ Request Error:', err.message);
});

// Send the request
req.write(postData);
req.end();