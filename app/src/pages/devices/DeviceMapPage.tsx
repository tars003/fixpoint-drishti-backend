import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../contexts/AuthContext';
import DeviceMap from '../../components/map/DeviceMap';
import { toast } from 'sonner';
import { 
  ArrowLeft,
  Maximize2,
  RefreshCw,
  Car
} from 'lucide-react';

interface LocationData {
  _id: string;
  timestamp: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  batteryVoltage: number;
  batteryPercentage?: number;
  altitude?: number;
  speed?: number;
  course?: number;
  accuracy?: number;
  satellites?: number;
  engineRpm?: number;
  vehicleSpeed?: number;
  engineLoad?: number;
  coolantTemperature?: number;
  fuelLevel?: number;
  throttlePosition?: number;
  signalStrength?: number;
  temperature?: number;
  humidity?: number;
}

interface DeviceInfo {
  deviceId: string;
  name: string;
  status: string;
  lastSeen: string;
  isActive: boolean;
}

const DeviceMapPage: React.FC = () => {
  const { deviceId } = useParams<{ deviceId: string }>();
  const { token } = useAuth();
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);

  // Base API URL
  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1';

  // Fetch device data
  const fetchDeviceData = useCallback(async () => {
    if (!token || !deviceId) return;

    try {
      setLoading(true);
      
      // Fetch current location and device info
      const currentResponse = await fetch(`${API_BASE}/device/${deviceId}/web-current`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (currentResponse.ok) {
        const currentData = await currentResponse.json();
        setDeviceInfo(currentData.data.device);
        setCurrentLocation(currentData.data.location);
      }
    } catch (error: any) {
      console.error('Error fetching device data:', error);
      toast.error('Failed to load device data');
    } finally {
      setLoading(false);
    }
  }, [token, deviceId, API_BASE]);

  useEffect(() => {
    fetchDeviceData();
  }, [fetchDeviceData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  if (!deviceInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <Car className="h-16 w-16 text-gray-400 mx-auto mb-6" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Device not found
          </h3>
          <p className="text-gray-500 mb-6">
            The device "{deviceId}" could not be found.
          </p>
          <Button asChild>
            <Link to="/devices">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Devices
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen bg-gray-100">
      {/* Header Overlay */}
      <div className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button asChild variant="outline" size="sm" className="bg-white shadow-md">
            <Link to={`/device/${deviceId}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Device
            </Link>
          </Button>
          
          <div className="bg-white rounded-lg shadow-md px-4 py-2">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <div>
                <h2 className="font-semibold text-gray-900">{deviceInfo.name}</h2>
                <p className="text-xs text-gray-500">Live Tracking</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button onClick={fetchDeviceData} variant="outline" size="sm" className="bg-white shadow-md">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          
          <Button variant="outline" size="sm" className="bg-white shadow-md" onClick={() => document.documentElement.requestFullscreen()}>
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Status Bar Overlay */}
      {currentLocation && (
        <div className="absolute bottom-4 left-4 right-4 z-50">
          <div className="bg-white rounded-lg shadow-lg p-4 mx-auto max-w-4xl">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  {currentLocation.coordinates.latitude.toFixed(5)}
                </div>
                <div className="text-xs text-gray-500">Latitude</div>
              </div>
              
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  {currentLocation.coordinates.longitude.toFixed(5)}
                </div>
                <div className="text-xs text-gray-500">Longitude</div>
              </div>
              
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  {currentLocation.vehicleSpeed || currentLocation.speed || 0} km/h
                </div>
                <div className="text-xs text-gray-500">Speed</div>
              </div>
              
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  {((currentLocation.batteryVoltage / 12.6) * 100).toFixed(0)}%
                </div>
                <div className="text-xs text-gray-500">Battery</div>
              </div>
              
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  {currentLocation.accuracy ? `${currentLocation.accuracy}m` : 'N/A'}
                </div>
                <div className="text-xs text-gray-500">GPS Accuracy</div>
              </div>
              
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  {new Date(currentLocation.timestamp).toLocaleTimeString()}
                </div>
                <div className="text-xs text-gray-500">Last Update</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Screen Map */}
      <DeviceMap
        deviceName={deviceInfo.name}
        deviceId={deviceId || ''}
        currentLocation={currentLocation}
        className="h-full w-full"
      />
    </div>
  );
};

export default DeviceMapPage;
