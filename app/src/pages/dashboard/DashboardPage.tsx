import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { 
  Car, 
  MapPin, 
  AlertTriangle, 
  Battery, 
  Activity,
  Plus,
  ArrowRight
} from 'lucide-react';

const DashboardPage: React.FC = () => {
  const { user, token } = useAuth();
  const [deviceStats, setDeviceStats] = useState({
    total: 0,
    online: 0,
    offline: 0,
    inactive: 0
  });
  const [loading, setLoading] = useState(true);

  // Base API URL - adjust based on your backend
  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1';

  // Fetch device stats
  useEffect(() => {
    const fetchDeviceStats = async () => {
      try {
        const response = await fetch(`${API_BASE}/device/web-list?limit=1000`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();

        if (response.ok && data.data?.devices) {
          const devices = data.data.devices;
          const stats = devices.reduce((acc: any, device: any) => {
            acc.total++;
            if (device.status === 'online') acc.online++;
            else if (device.status === 'offline') acc.offline++;
            else acc.inactive++;
            return acc;
          }, { total: 0, online: 0, offline: 0, inactive: 0 });
          
          setDeviceStats(stats);
        }
      } catch (error) {
        console.error('Error fetching device stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchDeviceStats();
    }
  }, [token, API_BASE]);

  // Stats for display
  const stats = [
    {
      title: "Total Devices",
      value: loading ? '...' : deviceStats.total,
      icon: Car,
      description: "Registered devices",
      color: "text-blue-600"
    },
    {
      title: "Active Now",
      value: loading ? '...' : deviceStats.online,
      icon: Activity,
      description: "Currently online",
      color: "text-green-600"
    },
    {
      title: "Offline",
      value: loading ? '...' : deviceStats.offline,
      icon: AlertTriangle,
      description: "Recently seen",
      color: "text-yellow-600"
    },
    {
      title: "Inactive",
      value: loading ? '...' : deviceStats.inactive,
      icon: Battery,
      description: "Need attention",
      color: "text-red-600"
    }
  ];

  const quickActions = [
    {
      title: "View All Devices",
      description: "Manage and monitor your devices",
      href: "/devices",
      icon: Car,
      color: "bg-blue-50 text-blue-600"
    },
    {
      title: "Add New Device",
      description: "Register a new tracking device",
      href: "/devices/add",
      icon: Plus,
      color: "bg-green-50 text-green-600"
    }
  ];

  const recentActivity = [
    {
      id: 1,
      device: "No devices yet",
      activity: "Start by adding your first device",
      time: "Get started",
      icon: MapPin
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {user?.name || 'User'}! 👋
        </h1>
        <p className="text-gray-600">
          Monitor your vehicles and stay informed about their status and location.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Quick Actions */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks and shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {quickActions.map((action, index) => (
              <Link 
                key={index}
                to={action.href}
                className="block"
              >
                <div className="flex items-center p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                  <div className={`rounded-lg p-2 mr-3 ${action.color}`}>
                    <action.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-sm">{action.title}</h3>
                    <p className="text-xs text-gray-500">{action.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest updates from your devices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div className="bg-gray-200 rounded-full p-2">
                    <activity.icon className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.device}
                    </p>
                    <p className="text-sm text-gray-500">
                      {activity.activity}
                    </p>
                  </div>
                  <div className="text-xs text-gray-400">
                    {activity.time}
                  </div>
                </div>
              ))}
            </div>

            {!loading && deviceStats.total === 0 && (
              <div className="text-center py-8">
                <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No devices yet
                </h3>
                <p className="text-gray-500 mb-4">
                  Start monitoring your vehicles by adding your first device.
                </p>
                <Button asChild>
                  <Link to="/devices">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Device
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
          <CardDescription>
            Current status of the monitoring system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm">API Server: Online</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm">Database: Connected</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="text-sm">Notifications: Limited</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;
