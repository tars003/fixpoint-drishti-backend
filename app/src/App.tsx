import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import AuthLayout from './layouts/AuthLayout';
import AppLayout from './layouts/AppLayout';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import DevicesPage from './pages/devices/DevicesPage';
import AddDevicePage from './pages/devices/AddDevicePage';
import DeviceDetailPage from './pages/devices/DeviceDetailPage';
import DeviceMapPage from './pages/devices/DeviceMapPage';
import TyreHealthPage from './pages/tyre-health/TyreHealthPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import './App.css';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/auth" replace />;
};

// Public Route Component (redirect if authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route 
              path="/auth" 
              element={
                <PublicRoute>
                  <AuthLayout>
                    <LoginPage />
                  </AuthLayout>
                </PublicRoute>
              } 
            />
            
            {/* Protected Routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <DashboardPage />
                  </AppLayout>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/devices" 
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <DevicesPage />
                  </AppLayout>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/devices/add" 
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <AddDevicePage />
                  </AppLayout>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/device/:deviceId" 
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <DeviceDetailPage />
                  </AppLayout>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/device/:deviceId/map" 
              element={
                <ProtectedRoute>
                  <DeviceMapPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/tyre-health" 
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <TyreHealthPage />
                  </AppLayout>
                </ProtectedRoute>
              } 
            />
            
            {/* Default Redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Catch all - redirect to dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          
          {/* Global Toast Notifications */}
          <Toaster 
            position="top-right"
            richColors
            closeButton
            expand={false}
            visibleToasts={5}
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;