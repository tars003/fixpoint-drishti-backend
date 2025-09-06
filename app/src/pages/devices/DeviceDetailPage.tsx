import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../contexts/AuthContext';
import DeviceMap from '../../components/map/DeviceMap';
import { toast } from 'sonner';
import { 
  ArrowLeft,
  MapPin,
  Car,
  Battery,
  Thermometer,
  Gauge,
  Activity,
  Clock,
  AlertTriangle,
  Wifi,
  WifiOff,
  RefreshCw,
  Calendar,
  TrendingUp,
  Fuel,
  Wind,
  Navigation,
  Signal,
  Droplets,
  BarChart3,
  Eye,
  AlertCircle,
  CheckCircle,
  Info
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
  // OBD2 Data
  engineRpm?: number;
  vehicleSpeed?: number;
  engineLoad?: number;
  coolantTemperature?: number;
  fuelLevel?: number;
  throttlePosition?: number;
  intakeAirTemperature?: number;
  mafAirFlowRate?: number;
  fuelPressure?: number;
  engineRuntime?: number;
  distanceTraveled?: number;
  barometricPressure?: number;
  signalStrength?: number;
  temperature?: number;
  humidity?: number;
}

interface AlertData {
  _id: string;
  alertType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  isResolved: boolean;
  acknowledgedAt?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  data?: any;
  ageInMinutes: number;
  status: 'open' | 'acknowledged' | 'resolved';
}

interface DeviceInfo {
  deviceId: string;
  name: string;
  status: string;
  lastSeen: string;
  isActive: boolean;
}

const DeviceDetailPage: React.FC = () => {
  const { deviceId } = useParams<{ deviceId: string }>();
  const { token } = useAuth();
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [locationHistory, setLocationHistory] = useState<LocationData[]>([]);
  const [alerts, setAlerts] = useState<AlertData[]>([]);
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

      // Fetch recent history (last 100 records)
      const historyResponse = await fetch(`${API_BASE}/device/${deviceId}/web-history?limit=100&page=1`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        setLocationHistory(historyData.data?.history || []);
      }

      // Fetch recent alerts
      const alertsResponse = await fetch(`${API_BASE}/alert/web?deviceId=${deviceId}&limit=50&page=1`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json();
        setAlerts(alertsData.data?.alerts || []);
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
  }, [token, deviceId, fetchDeviceData]);


  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'online': return 'text-green-600';
      case 'offline': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertCircle className="h-4 w-4" />;
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'medium': return <Info className="h-4 w-4" />;
      default: return <CheckCircle className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!deviceInfo) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button asChild variant="outline" size="sm">
            <Link to="/devices">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Devices
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <Car className="h-16 w-16 text-gray-400 mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Device not found
              </h3>
              <p className="text-gray-500">
                The device "{deviceId}" could not be found or you don't have access to it.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get the actual last update time from device data
  const getLastUpdateTime = () => {
    if (currentLocation?.timestamp) {
      return new Date(currentLocation.timestamp);
    } else if (deviceInfo?.lastSeen) {
      return new Date(deviceInfo.lastSeen);
    }
    return new Date();
  };

  const lastUpdateTime = getLastUpdateTime();

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button asChild variant="outline" size="sm">
            <Link to="/devices">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Devices
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {deviceInfo.name}
            </h1>
            <p className="text-gray-600 mt-1">
              ID: {deviceId}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-sm text-gray-500 mb-2">
            <Clock className="h-4 w-4 inline mr-1" />
            Last updated: {lastUpdateTime.toLocaleString()}
          </div>
          <Button onClick={fetchDeviceData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Device Status Bar */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                {deviceInfo.status === 'online' ? (
                  <Wifi className="h-8 w-8 text-green-500" />
                ) : (
                  <WifiOff className="h-8 w-8 text-yellow-500" />
                )}
              </div>
              <div className={`text-xl font-bold ${getStatusColor(deviceInfo.status)}`}>
                {deviceInfo.status}
              </div>
              <div className="text-sm text-gray-500">Status</div>
            </div>
            
            {currentLocation && (
              <>
                <div className="text-center">
                  <Battery className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <div className="text-xl font-bold text-blue-600">
                    {currentLocation.batteryPercentage 
                      ? `${currentLocation.batteryPercentage}%`
                      : `${((currentLocation.batteryVoltage / 12.6) * 100).toFixed(0)}%`
                    }
                  </div>
                  <div className="text-sm text-gray-500">
                    Battery ({currentLocation.batteryVoltage}V)
                  </div>
                </div>

                <div className="text-center">
                  <Gauge className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                  <div className="text-xl font-bold text-purple-600">
                    {currentLocation.engineRpm || 0}
                  </div>
                  <div className="text-sm text-gray-500">RPM</div>
                </div>

                <div className="text-center">
                  <Thermometer className="h-8 w-8 mx-auto mb-2 text-red-500" />
                  <div className="text-xl font-bold text-red-600">
                    {currentLocation.coolantTemperature || 'N/A'}°C
                  </div>
                  <div className="text-sm text-gray-500">Engine Temp</div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side - Map View */}
        <div className="space-y-6">
          {/* Interactive Map */}
          <Card className="bg-gradient-to-br from-green-50 to-blue-50 border-green-200 overflow-hidden">
            <CardHeader>
              <CardTitle className="text-green-800 flex items-center space-x-2">
                <MapPin className="h-5 w-5" />
                <span>Live Location</span>
                {currentLocation && (
                  <span className="ml-auto text-sm bg-green-100 text-green-700 px-2 py-1 rounded-full">
                    GPS Active
                  </span>
                )}
              </CardTitle>
              <CardDescription className="text-green-700">
                Real-time tracking with interactive map
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-80">
                <DeviceMap
                  deviceName={deviceInfo.name}
                  deviceId={deviceId || ''}
                  currentLocation={currentLocation}
                  className="h-full w-full"
                />
              </div>
              
              {/* Map Info Bar */}
              {currentLocation && (
                <div className="p-4 bg-white border-t border-green-200">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-green-700 font-semibold">
                        {currentLocation.coordinates.latitude.toFixed(5)}
                      </div>
                      <div className="text-xs text-green-600">Latitude</div>
                    </div>
                    <div className="text-center">
                      <div className="text-green-700 font-semibold">
                        {currentLocation.coordinates.longitude.toFixed(5)}
                      </div>
                      <div className="text-xs text-green-600">Longitude</div>
                    </div>
                    {currentLocation.altitude && (
                      <div className="text-center">
                        <div className="text-green-700 font-semibold">
                          {currentLocation.altitude}m
                        </div>
                        <div className="text-xs text-green-600">Altitude</div>
                      </div>
                    )}
                    <div className="text-center">
                      <div className="text-green-700 font-semibold">
                        {currentLocation.accuracy ? `${currentLocation.accuracy}m` : 'N/A'}
                      </div>
                      <div className="text-xs text-green-600">GPS Accuracy</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Alerts Section */}
          <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-red-200">
            <CardHeader>
              <CardTitle className="text-red-800 flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5" />
                <span>Recent Alerts ({alerts.filter(a => !a.isResolved).length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {alerts.slice(0, 5).map((alert) => (
                  <div key={alert._id} className="flex items-start space-x-3 p-3 bg-white rounded-lg border">
                    <div className={`p-1 rounded-full ${getSeverityColor(alert.severity)}`}>
                      {getSeverityIcon(alert.severity)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`px-2 py-1 text-xs font-medium rounded-md ${getSeverityColor(alert.severity)}`}>
                          {alert.severity.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500">
                          {alert.ageInMinutes}m ago
                        </span>
                      </div>
                      <h4 className="font-medium text-gray-900 text-sm">
                        {alert.title}
                      </h4>
                      <p className="text-xs text-gray-600 mt-1">
                        {alert.message}
                      </p>
                    </div>
                  </div>
                ))}
                
                {alerts.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-2" />
                    <p>No recent alerts</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side - Latest Information */}
        <div className="space-y-6">
          {/* Live Diagnostics */}
          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <CardHeader>
              <CardTitle className="text-purple-800 flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Live Diagnostics</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentLocation ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded-lg border">
                    <div className="flex items-center space-x-2 mb-1">
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">Speed</span>
                    </div>
                    <p className="text-lg font-bold text-blue-600">
                      {currentLocation.vehicleSpeed || currentLocation.speed || 0} km/h
                    </p>
                  </div>

                  <div className="bg-white p-3 rounded-lg border">
                    <div className="flex items-center space-x-2 mb-1">
                      <Fuel className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">Fuel</span>
                    </div>
                    <p className="text-lg font-bold text-green-600">
                      {currentLocation.fuelLevel && currentLocation.fuelLevel !== 999999 
                        ? `${currentLocation.fuelLevel}%` 
                        : 'N/A'
                      }
                    </p>
                  </div>

                  <div className="bg-white p-3 rounded-lg border">
                    <div className="flex items-center space-x-2 mb-1">
                      <Wind className="h-4 w-4 text-orange-500" />
                      <span className="text-sm font-medium">Engine Load</span>
                    </div>
                    <p className="text-lg font-bold text-orange-600">
                      {currentLocation.engineLoad || 'N/A'}%
                    </p>
                  </div>

                  <div className="bg-white p-3 rounded-lg border">
                    <div className="flex items-center space-x-2 mb-1">
                      <Navigation className="h-4 w-4 text-purple-500" />
                      <span className="text-sm font-medium">Course</span>
                    </div>
                    <p className="text-lg font-bold text-purple-600">
                      {currentLocation.course || 'N/A'}°
                    </p>
                  </div>

                  <div className="bg-white p-3 rounded-lg border">
                    <div className="flex items-center space-x-2 mb-1">
                      <Signal className="h-4 w-4 text-cyan-500" />
                      <span className="text-sm font-medium">Signal</span>
                    </div>
                    <p className="text-lg font-bold text-cyan-600">
                      {currentLocation.signalStrength || 'N/A'} dBm
                    </p>
                  </div>

                  <div className="bg-white p-3 rounded-lg border">
                    <div className="flex items-center space-x-2 mb-1">
                      <Droplets className="h-4 w-4 text-blue-400" />
                      <span className="text-sm font-medium">Humidity</span>
                    </div>
                    <p className="text-lg font-bold text-blue-600">
                      {currentLocation.humidity || 'N/A'}%
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Eye className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p>No current diagnostic data</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
            <CardHeader>
              <CardTitle className="text-yellow-800 flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Quick Stats</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className="text-2xl font-bold text-blue-600">{locationHistory.length}</div>
                  <div className="text-xs text-gray-500">Data Points</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className="text-2xl font-bold text-green-600">{alerts.filter(a => a.isResolved).length}</div>
                  <div className="text-xs text-gray-500">Resolved Alerts</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className="text-2xl font-bold text-orange-600">
                    {currentLocation?.satellites || 0}
                  </div>
                  <div className="text-xs text-gray-500">GPS Satellites</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className="text-2xl font-bold text-purple-600">
                    {currentLocation?.accuracy ? `${currentLocation.accuracy}m` : 'N/A'}
                  </div>
                  <div className="text-xs text-gray-500">GPS Accuracy</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Data History Table - Full Width */}
      <Card className="bg-gradient-to-r from-gray-50 to-blue-50 border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-800 flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Complete Data History</span>
          </CardTitle>
          <CardDescription>
            Latest {locationHistory.length} data points with all available parameters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-2 font-medium">Time</th>
                  <th className="text-left p-2 font-medium">Location</th>
                  <th className="text-left p-2 font-medium">Battery</th>
                  <th className="text-left p-2 font-medium">Speed</th>
                  <th className="text-left p-2 font-medium">RPM</th>
                  <th className="text-left p-2 font-medium">Engine Load</th>
                  <th className="text-left p-2 font-medium">Coolant Temp</th>
                  <th className="text-left p-2 font-medium">Fuel Level</th>
                  <th className="text-left p-2 font-medium">Throttle</th>
                  <th className="text-left p-2 font-medium">Intake Temp</th>
                  <th className="text-left p-2 font-medium">Signal</th>
                  <th className="text-left p-2 font-medium">Environment</th>
                  <th className="text-left p-2 font-medium">GPS</th>
                </tr>
              </thead>
              <tbody>
                {locationHistory.slice(0, 20).map((location, index) => (
                  <tr key={location._id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="p-2 font-mono">
                      <div className="text-xs">
                        {new Date(location.timestamp).toLocaleString()}
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="text-xs">
                        <div>{location.coordinates.latitude.toFixed(5)}</div>
                        <div>{location.coordinates.longitude.toFixed(5)}</div>
                        {location.altitude && <div className="text-gray-500">Alt: {location.altitude}m</div>}
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="text-xs">
                        <div className="font-medium">{location.batteryVoltage}V</div>
                        {location.batteryPercentage && (
                          <div className="text-gray-500">{location.batteryPercentage}%</div>
                        )}
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="text-xs">
                        {location.vehicleSpeed ? `${location.vehicleSpeed} km/h` : 
                         location.speed ? `${location.speed} km/h` : 'N/A'}
                        {location.course && <div className="text-gray-500">Course: {location.course}°</div>}
                      </div>
                    </td>
                    <td className="p-2 text-xs">{location.engineRpm || 'N/A'}</td>
                    <td className="p-2 text-xs">{location.engineLoad ? `${location.engineLoad}%` : 'N/A'}</td>
                    <td className="p-2 text-xs">{location.coolantTemperature ? `${location.coolantTemperature}°C` : 'N/A'}</td>
                    <td className="p-2 text-xs">
                      {location.fuelLevel && location.fuelLevel !== 999999 ? `${location.fuelLevel}%` : 'N/A'}
                    </td>
                    <td className="p-2 text-xs">{location.throttlePosition ? `${location.throttlePosition.toFixed(1)}%` : 'N/A'}</td>
                    <td className="p-2 text-xs">{location.intakeAirTemperature ? `${location.intakeAirTemperature}°C` : 'N/A'}</td>
                    <td className="p-2 text-xs">{location.signalStrength ? `${location.signalStrength} dBm` : 'N/A'}</td>
                    <td className="p-2">
                      <div className="text-xs">
                        {location.temperature && <div>Temp: {location.temperature}°C</div>}
                        {location.humidity && <div>Humidity: {location.humidity}%</div>}
                        {location.barometricPressure && <div>Press: {location.barometricPressure} hPa</div>}
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="text-xs">
                        {location.satellites && <div>Sats: {location.satellites}</div>}
                        {location.accuracy && <div>Acc: {location.accuracy}m</div>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {locationHistory.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No location data available for this device
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeviceDetailPage;