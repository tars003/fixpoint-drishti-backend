# Authentication API Endpoints

Base URL: `{{base_url}}/api/v1/auth`

## Send OTP

Send OTP to phone number for login or registration.

**Endpoint:** `POST /send-otp`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "phoneNumber": "+919876543210",
  "purpose": "login"
}
```

**Parameters:**
- `phoneNumber` (required): Valid phone number in international format
- `purpose` (optional): Either "login" or "registration" (default: "login")

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "otp": "123456",
    "expiresIn": 600,
    "remaining": 4
  }
}
```

**cURL Example:**
```bash
curl -X POST "{{base_url}}/api/v1/auth/send-otp" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+919876543210",
    "purpose": "registration"
  }'
```

---

## Verify OTP

Verify OTP and complete login/registration.

**Endpoint:** `POST /verify-otp`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "phoneNumber": "+919876543210",
  "otp": "123456",
  "purpose": "login",
  "name": "John Doe",
  "email": "john@example.com"
}
```

**Parameters:**
- `phoneNumber` (required): Phone number that received the OTP
- `otp` (required): 6-digit OTP code
- `purpose` (optional): Either "login" or "registration" (default: "login")
- `name` (optional): User's name (required for registration)
- `email` (optional): User's email address

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "64f1a2b3c4d5e6f7g8h9i0j1",
      "phoneNumber": "+919876543210",
      "name": "John Doe",
      "email": "john@example.com",
      "isVerified": true,
      "deviceCount": 2,
      "preferences": {
        "notifications": {
          "alerts": true,
          "reports": true
        },
        "units": {
          "distance": "km",
          "temperature": "celsius"
        }
      }
    }
  }
}
```

**cURL Example:**
```bash
curl -X POST "{{base_url}}/api/v1/auth/verify-otp" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+919876543210",
    "otp": "123456",
    "purpose": "registration",
    "name": "Jane Smith",
    "email": "jane@example.com"
  }'
```

---

## Get Profile

Get current user profile information.

**Endpoint:** `GET /profile`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "64f1a2b3c4d5e6f7g8h9i0j1",
      "phoneNumber": "+919876543210",
      "name": "John Doe",
      "email": "john@example.com",
      "isVerified": true,
      "devices": [
        {
          "deviceId": "ESP32_001",
          "alias": "My Car",
          "addedAt": "2024-01-01T12:00:00.000Z",
          "_id": "64f1a2b3c4d5e6f7g8h9i0j2"
        }
      ],
      "preferences": {
        "notifications": {
          "alerts": true,
          "reports": true
        },
        "units": {
          "distance": "km",
          "temperature": "celsius"
        }
      }
    }
  }
}
```

**cURL Example:**
```bash
curl -X GET "{{base_url}}/api/v1/auth/profile" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Update Profile

Update user profile information.

**Endpoint:** `PUT /profile`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

**Request Body:**
```json
{
  "name": "John Updated",
  "email": "john.updated@example.com",
  "preferences": {
    "notifications": {
      "alerts": false,
      "reports": true
    },
    "units": {
      "distance": "miles",
      "temperature": "fahrenheit"
    }
  }
}
```

**Parameters:**
- `name` (optional): User's display name
- `email` (optional): User's email address
- `preferences` (optional): User preference object

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "id": "64f1a2b3c4d5e6f7g8h9i0j1",
      "phoneNumber": "+919876543210",
      "name": "John Updated",
      "email": "john.updated@example.com",
      "isVerified": true,
      "preferences": {
        "notifications": {
          "alerts": false,
          "reports": true
        },
        "units": {
          "distance": "miles",
          "temperature": "fahrenheit"
        }
      }
    }
  }
}
```

**cURL Example:**
```bash
curl -X PUT "{{base_url}}/api/v1/auth/profile" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "name": "John Updated Name",
    "email": "newemail@example.com"
  }'
```

---

## Refresh Token

Refresh JWT authentication token.

**Endpoint:** `POST /refresh`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**cURL Example:**
```bash
curl -X POST "{{base_url}}/api/v1/auth/refresh" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Error Responses

**Rate Limited (429):**
```json
{
  "success": false,
  "error": "Too many authentication attempts. Please try again later.",
  "retryAfter": 900,
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**Validation Error (400):**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "phoneNumber",
      "message": "Please enter a valid phone number",
      "value": "invalid-phone"
    }
  ]
}
```

**OTP Error (400):**
```json
{
  "success": false,
  "error": "Invalid OTP"
}
```

**Unauthorized (401):**
```json
{
  "success": false,
  "error": "Access token required"
}
```
