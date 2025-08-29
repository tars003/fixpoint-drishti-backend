### Data update payload to encode
{
  "deviceId": "ESP32001",
  "latitude": 28.6139,
  "longitude": 77.2090,
  "batteryVoltage": 4.1,
  "batteryPercentage": 92,
  "altitude": 218,
  "speed": 67.5,
  "course": 45,
  "accuracy": 3.2,
  "satellites": 12,
  "signalStrength": -68,
  "temperature": 31.2,
  "humidity": 72,
  "iss": "esp32",
  "iat": 1755797082,
  "exp": 1755798082
}

Token : eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkZXZpY2VJZCI6IkVTUDMyMDAxIiwibGF0aXR1ZGUiOjI4LjYxMzksImxvbmdpdHVkZSI6NzcuMjA5LCJiYXR0ZXJ5Vm9sdGFnZSI6NC4xLCJiYXR0ZXJ5UGVyY2VudGFnZSI6OTIsImFsdGl0dWRlIjoyMTgsInNwZWVkIjo2Ny41LCJjb3Vyc2UiOjQ1LCJhY2N1cmFjeSI6My4yLCJzYXRlbGxpdGVzIjoxMiwic2lnbmFsU3RyZW5ndGgiOi02OCwidGVtcGVyYXR1cmUiOjMxLjIsImh1bWlkaXR5Ijo3MiwiaXNzIjoiZXNwMzIiLCJpYXQiOjE3NTU3OTcwODIsImV4cCI6MTc1NTc5ODA4Mn0._d6BB2F53VpEo9GfwddaXwnhNqO0wlvXB5CyP_rHgsQ

### Create alert 
{
  "deviceId": "ESP32001",
  "alertType": "wifi_malfunction",
  "severity": "critical",
  "title": "OBD2 Communication Failure",
  "message": "Cannot communicate with vehicle ECU - OBD2 port unresponsive",
  "latitude": 28.6139,
  "longitude": 77.2090,
  "data": {
    "errorCode": "OBD2_NO_RESPONSE",
    "portStatus": "DISCONNECTED",
    "lastSuccessfulRead": "2025-01-15T14:15:00.000Z",
    "connectionAttempts": 8,
    "protocolsAttempted": ["ISO 9141", "KWP2000", "CAN"],
    "vehicleVIN": "1HGBH41JXMN109186",
    "ecuResponses": {
      "engine": false,
      "transmission": false,
      "abs": false
    }
  },
  "iss": "esp32",
  "iat": 1755798082,
  "exp": 1755899082
}

Token : eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkZXZpY2VJZCI6IkVTUDMyMDAxIiwiYWxlcnRUeXBlIjoid2lmaV9tYWxmdW5jdGlvbiIsInNldmVyaXR5IjoiY3JpdGljYWwiLCJ0aXRsZSI6Ik9CRDIgQ29tbXVuaWNhdGlvbiBGYWlsdXJlIiwibWVzc2FnZSI6IkNhbm5vdCBjb21tdW5pY2F0ZSB3aXRoIHZlaGljbGUgRUNVIC0gT0JEMiBwb3J0IHVucmVzcG9uc2l2ZSIsImxhdGl0dWRlIjoyOC42MTM5LCJsb25naXR1ZGUiOjc3LjIwOSwiZGF0YSI6eyJlcnJvckNvZGUiOiJPQkQyX05PX1JFU1BPTlNFIiwicG9ydFN0YXR1cyI6IkRJU0NPTk5FQ1RFRCIsImxhc3RTdWNjZXNzZnVsUmVhZCI6IjIwMjUtMDEtMTVUMTQ6MTU6MDAuMDAwWiIsImNvbm5lY3Rpb25BdHRlbXB0cyI6OCwicHJvdG9jb2xzQXR0ZW1wdGVkIjpbIklTTyA5MTQxIiwiS1dQMjAwMCIsIkNBTiJdLCJ2ZWhpY2xlVklOIjoiMUhHQkg0MUpYTU4xMDkxODYiLCJlY3VSZXNwb25zZXMiOnsiZW5naW5lIjpmYWxzZSwidHJhbnNtaXNzaW9uIjpmYWxzZSwiYWJzIjpmYWxzZX19LCJpc3MiOiJlc3AzMiIsImlhdCI6MTc1NTc5ODA4MiwiZXhwIjoxNzU1ODk5MDgyfQ.AMECWkAW5NeoIQKOrtuXJt7TWS0LhXSvJCigfXetJTw
