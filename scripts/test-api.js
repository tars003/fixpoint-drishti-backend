#!/usr/bin/env node

/**
 * Simple API test script to verify the server is working
 * Usage: node scripts/test-api.js [server-url] [api-key]
 */

const http = require('http');
const https = require('https');

const SERVER_URL = process.argv[2] || 'http://localhost:3000';
const API_KEY = process.argv[3] || 'your_api_key_here';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = (color, message) => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

const makeRequest = (url, options = {}) => {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
};

const runTests = async () => {
  console.log(`${colors.blue}🚀 Testing IoT Tracking Server API${colors.reset}`);
  console.log(`Server: ${SERVER_URL}`);
  console.log(`API Key: ${API_KEY.substring(0, 8)}...`);
  console.log('');

  const tests = [
    {
      name: 'Health Check',
      url: `${SERVER_URL}/health`,
      options: { method: 'GET' }
    },
    {
      name: 'API Status',
      url: `${SERVER_URL}/api/v1/status`,
      options: { method: 'GET' }
    },
    {
      name: 'Device Registration',
      url: `${SERVER_URL}/api/v1/device/register`,
      options: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify({
          deviceId: 'TEST_DEVICE_001',
          name: 'Test Device',
          description: 'API test device',
          batteryThreshold: 20
        })
      }
    },
    {
      name: 'Location Update',
      url: `${SERVER_URL}/api/v1/device/update-data`,
      options: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify({
          deviceId: 'TEST_DEVICE_001',
          latitude: 40.7128,
          longitude: -74.0060,
          batteryVoltage: 3.7,
          altitude: 10.5,
          speed: 25.2,
          temperature: 22.5
        })
      }
    },
    {
      name: 'Get Device History',
      url: `${SERVER_URL}/api/v1/device/TEST_DEVICE_001/history?limit=10`,
      options: {
        method: 'GET',
        headers: {
          'X-API-Key': API_KEY
        }
      }
    },
    {
      name: 'Create Alert',
      url: `${SERVER_URL}/api/v1/alert`,
      options: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify({
          deviceId: 'TEST_DEVICE_001',
          alertType: 'vibration',
          severity: 'medium',
          message: 'Test alert from API test script',
          latitude: 40.7128,
          longitude: -74.0060
        })
      }
    },
    {
      name: 'Get Alerts',
      url: `${SERVER_URL}/api/v1/alert?deviceId=TEST_DEVICE_001&limit=10`,
      options: {
        method: 'GET',
        headers: {
          'X-API-Key': API_KEY
        }
      }
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`Testing: ${test.name}...`);
      const result = await makeRequest(test.url, test.options);
      
      if (result.status >= 200 && result.status < 300) {
        log('green', `✅ ${test.name} - PASSED (${result.status})`);
        passed++;
        
        if (result.data && result.data.message) {
          console.log(`   Message: ${result.data.message}`);
        }
      } else if (result.status === 401) {
        log('yellow', `⚠️  ${test.name} - AUTHENTICATION FAILED (${result.status})`);
        console.log('   Check your API key configuration');
        failed++;
      } else {
        log('red', `❌ ${test.name} - FAILED (${result.status})`);
        if (result.data && result.data.message) {
          console.log(`   Error: ${result.data.message}`);
        }
        failed++;
      }
    } catch (error) {
      log('red', `❌ ${test.name} - ERROR`);
      console.log(`   ${error.message}`);
      failed++;
    }
    
    console.log('');
  }

  console.log(`${colors.blue}📊 Test Results:${colors.reset}`);
  log('green', `✅ Passed: ${passed}`);
  log('red', `❌ Failed: ${failed}`);
  console.log(`Total: ${passed + failed}`);
  
  if (failed === 0) {
    log('green', '\n🎉 All tests passed! Your IoT Tracking Server is working correctly.');
  } else {
    log('yellow', '\n⚠️ Some tests failed. Check the server logs and configuration.');
  }
  
  process.exit(failed > 0 ? 1 : 0);
};

// Handle script arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Usage: node scripts/test-api.js [server-url] [api-key]

Examples:
  node scripts/test-api.js
  node scripts/test-api.js http://localhost:3000 your_api_key
  node scripts/test-api.js https://your-server.com your_api_key

Options:
  --help, -h    Show this help message
  `);
  process.exit(0);
}

runTests().catch(console.error);