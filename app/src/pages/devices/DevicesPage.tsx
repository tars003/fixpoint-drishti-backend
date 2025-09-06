import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { 
  Car, 
  Plus, 
  Search,
  Filter,
  MapPin,
  Battery,
  Wifi,
  WifiOff,
  Clock,
  Eye,
  Navigation,
  TrendingUp
} from 'lucide-react';
import { Input } from '../../components/ui/input';

interface Device {
  deviceId: string;
  name: string;
  description?: string;
  isActive: boolean;
  lastSeen: string;
  status: 'online' | 'offline' | 'inactive';
  latestLocation?: {
    coordinates: {
      latitude: number;
      longitude: number;
    };
    batteryVoltage: number;
    timestamp: string;
  };
  hardware?: {
    model?: string;
    version?: string;
  };
}

const DevicesPage: React.FC = () => {
  const { token } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Base API URL - adjust based on your backend
  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1';

  // Fetch devices from API
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${API_BASE}/device/web-list?limit=100`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch devices');
        }

        setDevices(data.data?.devices || []);
      } catch (error: any) {
        console.error('Error fetching devices:', error);
        setError(error.message);
        toast.error('Failed to load devices: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchDevices();
    }
  }, [token, API_BASE]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Devices</h1>
          <p className="text-gray-600 mt-1">
            Manage and monitor your tracking devices
          </p>
        </div>
        <Button asChild className="mt-4 sm:mt-0">
          <Link to="/devices/add">
            <Plus className="h-4 w-4 mr-2" />
            Add Device
          </Link>
        </Button>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search devices..."
                  className="pl-10"
                />
              </div>
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Device List */}
      {loading ? (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-500">Loading your devices...</p>
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <div className="text-red-500 mb-4">⚠️</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Failed to load devices
              </h3>
              <p className="text-red-500 mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : devices.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <Car className="h-16 w-16 text-gray-400 mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No devices found
              </h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                You haven't added any devices yet. Start monitoring your vehicles by adding your first tracking device.
              </p>
              <div className="space-y-3">
                <Button asChild size="lg">
                  <Link to="/devices/add">
                    <Plus className="h-5 w-5 mr-2" />
                    Add Your First Device
                  </Link>
                </Button>
                <div className="text-sm text-gray-400">
                  <p>Need help? Check out our setup guide for step-by-step instructions.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {devices.map((device) => (
            <Card 
              key={device.deviceId} 
              className={`hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border-l-4 ${
                device.status === 'online' 
                  ? 'border-l-green-500 bg-gradient-to-br from-green-50 to-blue-50' 
                  : device.status === 'offline'
                  ? 'border-l-yellow-500 bg-gradient-to-br from-yellow-50 to-orange-50'
                  : 'border-l-gray-500 bg-gradient-to-br from-gray-50 to-gray-100'
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${
                      device.status === 'online' ? 'bg-green-100 text-green-600' : 
                      device.status === 'offline' ? 'bg-yellow-100 text-yellow-600' : 
                      'bg-gray-100 text-gray-600'
                    }`}>
                      <Car className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-gray-900">{device.name}</CardTitle>
                      <CardDescription className="text-xs">
                        ID: {device.deviceId}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {device.status === 'online' ? (
                      <Wifi className="h-5 w-5 text-green-500" />
                    ) : device.status === 'offline' ? (
                      <WifiOff className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <WifiOff className="h-5 w-5 text-gray-400" />
                    )}
                    <span className={`text-xs px-3 py-1 rounded-full font-bold ${
                      device.status === 'online' ? 'bg-green-500 text-white' :
                      device.status === 'offline' ? 'bg-yellow-500 text-white' :
                      'bg-gray-500 text-white'
                    }`}>
                      {device.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Device Stats - Colorful Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-blue-100 rounded-lg border border-blue-200">
                    <Battery className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                    <div className="font-bold text-blue-700">
                      {device.latestLocation?.batteryVoltage ? `${(device.latestLocation.batteryVoltage / 12.6 * 100).toFixed(0)}%` : 'N/A'}
                    </div>
                    <div className="text-xs text-blue-600">Battery</div>
                  </div>
                  
                  <div className="text-center p-3 bg-green-100 rounded-lg border border-green-200">
                    <MapPin className="h-5 w-5 mx-auto mb-1 text-green-600" />
                    <div className="font-bold text-green-700 text-xs">
                      {device.latestLocation ? 'LOCATED' : 'NO GPS'}
                    </div>
                    <div className="text-xs text-green-600">GPS Status</div>
                  </div>
                </div>

                {/* Last Seen */}
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center space-x-2 mb-1">
                    <Clock className="h-4 w-4 text-purple-600" />
                    <span className="text-xs font-medium text-purple-700">Last Activity</span>
                  </div>
                  <div className="text-xs text-purple-600">
                    {device.lastSeen ? new Date(device.lastSeen).toLocaleString() : 'Never seen'}
                  </div>
                </div>

                {/* Hardware info if available */}
                {device.hardware?.model && (
                  <div className="p-2 bg-gray-100 rounded text-xs text-gray-700">
                    <TrendingUp className="h-3 w-3 inline mr-1" />
                    Model: {device.hardware.model} {device.hardware.version && `v${device.hardware.version}`}
                  </div>
                )}

                {/* Actions - Gradient Buttons */}
                <div className="flex space-x-2 pt-2">
                  <Button 
                    asChild 
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                    size="sm"
                  >
                    <Link to={`/device/${device.deviceId}`}>
                      <Eye className="h-4 w-4 mr-1" />
                      Details
                    </Link>
                  </Button>
                  <Button 
                    asChild 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 border-purple-300 text-purple-700 hover:bg-purple-50"
                  >
                    <Link to={`/device/${device.deviceId}/map`}>
                      <Navigation className="h-4 w-4 mr-1" />
                      Map
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Device Help Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">Getting Started</CardTitle>
          <CardDescription className="text-blue-700">
            Follow these steps to add your first device
          </CardDescription>
        </CardHeader>
        <CardContent className="text-blue-800">
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Locate the device ID printed on your tracking device packaging</li>
            <li>Click "Add Device" and follow the multi-step wizard</li>
            <li>Enter the device-specific OTP when prompted</li>
            <li>Verify your purchase details to complete registration</li>
          </ol>
          <div className="mt-4">
            <Button asChild variant="outline" className="bg-white text-blue-700 border-blue-300 hover:bg-blue-100">
              <Link to="/devices/add">
                Start Adding Device
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DevicesPage;
