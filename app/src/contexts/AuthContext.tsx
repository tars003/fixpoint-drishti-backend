import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';

// Types
interface User {
  id: string;
  phoneNumber: string;
  name: string;
  email: string;
  isVerified: boolean;
  deviceCount: number;
  preferences: {
    notifications: {
      alerts: boolean;
      reports: boolean;
    };
    units: {
      distance: 'km' | 'miles';
      temperature: 'celsius' | 'fahrenheit';
    };
  };
}

interface OTPResponse {
  otp: string;
  expiresIn: number;
  remaining: number;
  userExists: boolean;
  requiresRegistration: boolean;
  purpose: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (phoneNumber: string, otp: string, purpose?: string, name?: string, email?: string) => Promise<boolean>;
  sendOTP: (phoneNumber: string, purpose?: string) => Promise<OTPResponse | null>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => Promise<boolean>;
}

// Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Base API URL - adjust based on your backend
  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1';

  // Check for stored auth on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');
    
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to parse stored user data:', error);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      }
    }
    
    setLoading(false);
  }, []);

  // Send OTP
  const sendOTP = async (phoneNumber: string, purpose = 'login'): Promise<OTPResponse | null> => {
    try {
      const response = await fetch(`${API_BASE}/auth/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber, purpose }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to send OTP');
        return null;
      }

      toast.success(data.message || 'OTP sent successfully!');
      
      // For development - show OTP in alert (as per requirements)
      if (data.data?.otp) {
        alert(`🔐 Your OTP Code: ${data.data.otp}\n\nThis is for development purposes. In production, you would receive this via SMS.`);
      }
      
      // Return the full response data
      return data.data;
    } catch (error) {
      console.error('Send OTP error:', error);
      toast.error('Network error. Please check your connection.');
      return null;
    }
  };

  // Login/Register with OTP
  const login = async (
    phoneNumber: string, 
    otp: string, 
    purpose = 'login',
    name?: string,
    email?: string
  ): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          phoneNumber, 
          otp, 
          purpose,
          ...(name && { name }),
          ...(email && { email })
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'OTP verification failed');
        return false;
      }

      // Store auth data
      const { token: authToken, user: userData } = data.data;
      setToken(authToken);
      setUser(userData);
      
      localStorage.setItem('auth_token', authToken);
      localStorage.setItem('auth_user', JSON.stringify(userData));

      toast.success(data.message || 'Login successful!');
      return true;
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Network error. Please check your connection.');
      return false;
    }
  };

  // Logout
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    toast.info('Logged out successfully');
  };

  // Update Profile
  const updateProfile = async (updates: Partial<User>): Promise<boolean> => {
    if (!token) return false;

    try {
      const response = await fetch(`${API_BASE}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Profile update failed');
        return false;
      }

      // Update local user data
      const updatedUser = data.data.user;
      setUser(updatedUser);
      localStorage.setItem('auth_user', JSON.stringify(updatedUser));

      toast.success('Profile updated successfully!');
      return true;
    } catch (error) {
      console.error('Update profile error:', error);
      toast.error('Network error. Please check your connection.');
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    loading,
    login,
    sendOTP,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
