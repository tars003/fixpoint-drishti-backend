import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { 
  ArrowLeft,
  Car,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

const deviceSchema = z.object({
  deviceId: z.string().min(3, 'Device ID must be at least 3 characters').max(50, 'Device ID cannot exceed 50 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters'),
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
  batteryThreshold: z.number().min(0, 'Battery threshold must be at least 0%').max(100, 'Battery threshold cannot exceed 100%').optional(),
  alertSettings: z.object({
    lowBatteryEnabled: z.boolean().optional(),
    offlineTimeoutMinutes: z.number().min(1, 'Timeout must be at least 1 minute').max(1440, 'Timeout cannot exceed 24 hours').optional()
  }).optional()
});

type DeviceFormData = z.infer<typeof deviceSchema>;

const AddDevicePage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<DeviceFormData>({
    resolver: zodResolver(deviceSchema),
    defaultValues: {
      deviceId: '',
      name: '',
      description: '',
      batteryThreshold: 20,
      alertSettings: {
        lowBatteryEnabled: true,
        offlineTimeoutMinutes: 10
      }
    }
  });

  const onSubmit = async (data: DeviceFormData) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1';

      const response = await fetch(`${API_BASE}/device/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-api-key': 'shjdbjbdfbsdsdvhjvsdjfvsdkvfk234234324dvbdfkjd' // Using the API key from your system
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Device registered successfully!');
        navigate('/devices');
      } else {
        throw new Error(result.message || 'Failed to register device');
      }
    } catch (error: any) {
      console.error('Error registering device:', error);
      toast.error(error.message || 'Failed to register device. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" asChild>
            <Link to="/devices">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Devices
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Add New Device</h1>
            <p className="text-gray-600 mt-1">
              Register a new tracking device to your account
            </p>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Device Registration Instructions:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>Choose a unique Device ID that matches your ESP32 configuration</li>
                <li>The device will appear as "inactive" until it sends its first location update</li>
                <li>Make sure your ESP32 is programmed with the correct API key and JWT secret</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Registration Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Car className="h-6 w-6 text-blue-600" />
            <span>Device Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="deviceId">Device ID *</Label>
                <Input
                  id="deviceId"
                  placeholder="e.g., ESP32001, CAR_TRACKER_01"
                  {...register('deviceId')}
                  disabled={loading}
                />
                {errors.deviceId && (
                  <p className="text-red-500 text-sm">{errors.deviceId.message}</p>
                )}
                <p className="text-xs text-gray-500">
                  This must match the Device ID programmed in your ESP32
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Device Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., My Car Tracker, Office Vehicle"
                  {...register('name')}
                  disabled={loading}
                />
                {errors.name && (
                  <p className="text-red-500 text-sm">{errors.name.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                placeholder="e.g., Primary family car tracker, Company delivery truck"
                {...register('description')}
                disabled={loading}
              />
              {errors.description && (
                <p className="text-red-500 text-sm">{errors.description.message}</p>
              )}
            </div>

            {/* Alert Settings */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Alert Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="batteryThreshold">Low Battery Threshold (%)</Label>
                  <Input
                    id="batteryThreshold"
                    type="number"
                    min="0"
                    max="100"
                    {...register('batteryThreshold', { valueAsNumber: true })}
                    disabled={loading}
                  />
                  {errors.batteryThreshold && (
                    <p className="text-red-500 text-sm">{errors.batteryThreshold.message}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    Alert when battery drops below this percentage
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="offlineTimeout">Offline Timeout (minutes)</Label>
                  <Input
                    id="offlineTimeout"
                    type="number"
                    min="1"
                    max="1440"
                    {...register('alertSettings.offlineTimeoutMinutes', { valueAsNumber: true })}
                    disabled={loading}
                  />
                  {errors.alertSettings?.offlineTimeoutMinutes && (
                    <p className="text-red-500 text-sm">{errors.alertSettings.offlineTimeoutMinutes.message}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    Alert when device hasn't reported for this many minutes
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex items-center justify-end space-x-4 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/devices')}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Register Device
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddDevicePage;
