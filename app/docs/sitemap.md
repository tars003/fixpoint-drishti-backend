# Frontend App Structure & Sitemap

## Overview
React.js web application for monitoring and managing IoT car tracking devices with real-time location data and OBD2 diagnostics.

## Application Flow

### 1. Authentication Flow
```
Landing Page → Login/Register → OTP Verification → Dashboard
```

### 2. Main Application Structure
```
Authenticated App
├── Header Navigation
├── Main Content Area
└── Mobile-Responsive Layout
```

---

## Screen Hierarchy

### **Authentication Screens**

#### 1. **Login/Register Screen** (`/auth`)
- **Purpose**: Entry point for user authentication
- **Features**:
  - Toggle between Login and Register modes
  - Phone number input with country code selector
  - "Send OTP" button triggers OTP generation
  - OTP displayed in alert popup (development mode)
  - OTP input field with 6-digit validation
  - Auto-redirect to dashboard on successful verification

#### 2. **OTP Verification Modal**
- **Purpose**: Verify phone number ownership
- **Features**:
  - 6-digit OTP input with auto-focus
  - Resend OTP functionality (with cooldown)
  - Timer countdown showing OTP expiry
  - Error handling for invalid/expired OTPs

---

### **Main Application Screens**

#### 3. **Dashboard/Overview** (`/dashboard`)
- **Purpose**: Main landing page after authentication
- **Layout**: Grid-based dashboard inspired by Vercel design
- **Features**:
  - Welcome message with user name
  - Quick stats cards (total devices, active devices, alerts)
  - Recent alerts summary
  - Quick access buttons to key features
  - Device status overview grid

#### 4. **Devices List Screen** (`/devices`)
- **Purpose**: View and manage all user's devices
- **Features**:
  - Searchable and filterable device list
  - Device cards showing:
    - Device name and ID
    - Status (online/offline/last seen)
    - Battery level indicator
    - Quick action buttons (view details, settings)
  - "Add New Device" button (opens multi-step wizard)
  - Bulk actions (future: delete, export data)

#### 5. **Device Detail Screen** (`/device/:deviceId`)
- **Purpose**: Comprehensive view of single device
- **Layout**: Tabbed interface with multiple views
- **Tabs**:
  - **Overview**: Key metrics and current status
  - **Dashboard**: Data table with time-series information
  - **Location**: Map view with real-time tracking
  - **Alerts**: Device-specific alert history
  - **Settings**: Device configuration

#### 6. **Device Data Dashboard** (`/device/:deviceId/dashboard`)
- **Purpose**: Detailed analytics and data visualization
- **Features**:
  - Time-range selector (1 hour, 1 day, 1 week, custom)
  - Data table with sortable columns:
    - Timestamp
    - Location (lat/lng)
    - Speed, RPM, Engine Load
    - Battery Voltage/Percentage
    - Fuel Level, Coolant Temperature
    - All OBD2 diagnostic parameters
  - Export data functionality (CSV/JSON)
  - Modern grid layout with configurable widgets
  - Real-time updates when device is active

#### 7. **Map View** (`/device/:deviceId/map`)
- **Purpose**: Visual location tracking
- **Features**: 
  - **PLACEHOLDER**: Will be integrated later
  - Real-time location display
  - Historical route playback
  - Geofence visualization
  - Marker clustering for performance

#### 8. **Add Device Wizard** (`/devices/add`)
- **Purpose**: Multi-step device registration process
- **Steps**:
  1. **Device ID Entry**: Input device ID from packaging
  2. **OTP Verification**: Enter device-specific OTP
  3. **Purchase Verification**: Verify purchase details
  4. **Device Registration**: Final registration step
- **Status**: Dummy UI only (no API calls)
- **Features**:
  - Progress indicator showing current step
  - Form validation for each step
  - Back/Next navigation
  - Cancel and start over option

---

## Navigation Structure

### **Header Navigation**
- **Logo/Brand**: "Drishti Tracker"
- **Main Navigation Tabs**:
  - Overview (Dashboard)
  - Devices
  - Analytics (future)
  - Reports (future)
  - Settings (future)
- **User Menu**:
  - Profile settings
  - Preferences
  - Logout

### **Breadcrumb Navigation**
- Dynamic breadcrumb based on current route
- Clickable navigation hierarchy
- Examples:
  - `Dashboard`
  - `Devices > Device List`
  - `Devices > ESP32_001 > Dashboard`
  - `Devices > ESP32_001 > Map View`

---

## Component Architecture

### **Layout Components**
- `AppLayout`: Main application wrapper with header/navigation
- `AuthLayout`: Layout for authentication screens
- `DashboardLayout`: Grid-based layout for dashboard content

### **Feature Components**
- `DeviceCard`: Reusable device display component
- `DataTable`: Sortable, filterable data table
- `MetricCard`: Dashboard metric display cards
- `AlertCard`: Alert notification display
- `LocationMap`: Map component (placeholder)

### **Form Components**
- `PhoneInput`: Phone number with country code
- `OTPInput`: 6-digit OTP verification
- `DeviceWizard`: Multi-step device addition form

---

## User Experience Features

### **Responsive Design**
- Mobile-first approach
- Tablet and desktop optimizations
- Collapsible navigation on mobile
- Touch-friendly interface elements

### **Real-time Updates**
- WebSocket connection for live device data
- Auto-refresh of device status
- Push notifications for critical alerts
- Optimistic UI updates

### **Performance Optimization**
- Lazy loading of heavy components
- Virtual scrolling for large data sets
- Image optimization
- Code splitting by route

---

## Future Enhancements

### **Phase 4 Features** (Future)
- Advanced analytics and reporting
- Team management and user roles
- Custom dashboard configuration
- Data export and API access
- Mobile app development
- Advanced geofencing features

### **Integration Roadmap**
- Real map integration (Google Maps/Mapbox)
- SMS OTP provider integration
- Email notifications
- Push notification service
- Advanced alerting system
