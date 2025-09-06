import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Navigation, Clock, Battery, Thermometer } from 'lucide-react';

// Fix for default markers in React Leaflet

// Create a custom car icon
const CarIcon = L.divIcon({
  html: `<div style="background-color: #10B981; width: 24px; height: 24px; border-radius: 4px; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
      <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5H16V4C16 2.9 15.1 2 14 2H10C8.9 2 8 2.9 8 4V5H6.5C5.84 5 5.28 5.42 5.08 6.01L3 12V20C3 20.55 3.45 21 4 21H5C5.55 21 6 20.55 6 20V19H18V20C18 20.55 18.45 21 19 21H20C20.55 21 21 20.55 21 20V12L18.92 6.01ZM10 4H14V5H10V4ZM6.5 7H17.5L19 11H5L6.5 7ZM7 17C6.45 17 6 16.55 6 16S6.45 15 7 15 8 15.45 8 16 7.55 17 7 17ZM17 17C16.45 17 16 16.55 16 16S16.45 15 17 15 18 15.45 18 16 17.55 17 17 17Z"/>
    </svg>
  </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
  className: 'custom-car-icon'
});

// Component to recenter map when position changes
const RecenterAutomatically: React.FC<{lat: number, lng: number}> = ({ lat, lng }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView([lat, lng]);
  }, [lat, lng, map]);
  
  return null;
};

interface LocationData {
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

interface DeviceMapProps {
  deviceName: string;
  deviceId: string;
  currentLocation: LocationData | null;
  className?: string;
}

const DeviceMap: React.FC<DeviceMapProps> = ({ 
  deviceName, 
  deviceId, 
  currentLocation, 
  className = '' 
}) => {
  // Default to a central location if no current location
  const defaultLat = 23.2599; // India center
  const defaultLng = 77.4126;
  
  const lat = currentLocation?.coordinates.latitude || defaultLat;
  const lng = currentLocation?.coordinates.longitude || defaultLng;
  
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getBatteryPercentage = (voltage: number, percentage?: number) => {
    if (percentage) return `${percentage}%`;
    return `${((voltage / 12.6) * 100).toFixed(0)}%`;
  };

  return (
    <div className={`relative ${className}`}>
      <MapContainer
        center={[lat, lng]}
        zoom={15}
        scrollWheelZoom={true}
        className="w-full h-full rounded-lg z-10"
        style={{ minHeight: '300px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {currentLocation && (
          <>
            <RecenterAutomatically lat={lat} lng={lng} />
            <Marker position={[lat, lng]} icon={CarIcon}>
              <Popup maxWidth={300} className="custom-popup">
                <div className="p-2">
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{deviceName}</h3>
                      <p className="text-xs text-gray-500">ID: {deviceId}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-3 w-3 text-blue-500" />
                        <span className="text-xs">
                          {lat.toFixed(5)}, {lng.toFixed(5)}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <Battery className="h-3 w-3 text-green-500" />
                        <span className="text-xs">
                          {getBatteryPercentage(currentLocation.batteryVoltage, currentLocation.batteryPercentage)}
                        </span>
                      </div>
                    </div>
                    
                    {currentLocation.vehicleSpeed !== undefined && (
                      <div className="flex items-center space-x-1">
                        <Navigation className="h-3 w-3 text-purple-500" />
                        <span className="text-xs">
                          Speed: {currentLocation.vehicleSpeed || currentLocation.speed || 0} km/h
                        </span>
                      </div>
                    )}
                    
                    {currentLocation.coolantTemperature && (
                      <div className="flex items-center space-x-1">
                        <Thermometer className="h-3 w-3 text-red-500" />
                        <span className="text-xs">
                          Engine: {currentLocation.coolantTemperature}°C
                        </span>
                      </div>
                    )}
                    
                    <div className="pt-2 border-t border-gray-200">
                      <div className="flex items-center space-x-1 text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span className="text-xs">
                          Updated: {formatTimestamp(currentLocation.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          </>
        )}
      </MapContainer>
      
      {!currentLocation && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg z-20">
          <div className="text-center text-white p-4">
            <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-lg font-medium mb-1">No Location Data</p>
            <p className="text-sm opacity-75">
              Waiting for GPS signal from {deviceName}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceMap;
