import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Car, 
  BarChart3, 
  FileText, 
  Settings, 
  User, 
  LogOut,
  Bell,
  Search,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Gauge
} from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
}

interface Notification {
  _id: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  deviceId: string;
  timestamp: string;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Set sidebar collapsed state based on current page
  useEffect(() => {
    const isDeviceDetailPage = location.pathname.startsWith('/device/') && location.pathname !== '/devices';
    setSidebarCollapsed(isDeviceDetailPage);
  }, [location.pathname]);

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1';
        const response = await fetch(`${API_BASE}/alert/web?limit=10&isResolved=false`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setNotifications(data.data?.alerts || []);
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      }
    };

    fetchNotifications();
    // Refresh notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close notifications dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showNotifications && !(event.target as Element).closest('.notifications-dropdown')) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showNotifications]);

  const navigation = [
    {
      name: 'Overview',
      href: '/dashboard',
      icon: LayoutDashboard,
      current: location.pathname === '/dashboard',
    },
    {
      name: 'Devices',
      href: '/devices',
      icon: Car,
      current: location.pathname.startsWith('/device'),
    },
    {
      name: 'Tyre Health',
      href: '/tyre-health',
      icon: Gauge,
      current: location.pathname === '/tyre-health',
    },
    {
      name: 'Analytics',
      href: '/analytics',
      icon: BarChart3,
      current: location.pathname === '/analytics',
      disabled: true, // Future feature
    },
    {
      name: 'Reports',
      href: '/reports',
      icon: FileText,
      current: location.pathname === '/reports',
      disabled: true, // Future feature
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
      current: location.pathname === '/settings',
      disabled: true, // Future feature
    },
  ];

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-black opacity-25"></div>
        </div>
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 bg-white shadow-lg transform transition-all duration-300 ease-in-out lg:relative lg:translate-x-0 lg:z-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${sidebarCollapsed ? 'w-16' : 'w-64'}
      `}>
        <div className={`flex items-center h-16 px-4 border-b border-gray-200 ${sidebarCollapsed ? 'flex-col justify-center' : 'justify-between'}`}>
          {!sidebarCollapsed && (
            <h1 className="text-xl font-bold text-gray-900">
              Drishti Tracker
            </h1>
          )}
          {sidebarCollapsed && (
            <div className="flex flex-col items-center space-y-2">
              <h1 className="text-xl font-bold text-blue-600">
                DT
              </h1>
              {/* Collapse button - centered below logo when collapsed */}
              <button
                type="button"
                className="flex items-center justify-center w-6 h-6 rounded hover:bg-blue-50 border border-gray-200 hover:border-blue-200 transition-all duration-200 group"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                title="Expand sidebar"
              >
                <PanelLeftOpen className="w-3 h-3 text-gray-600 group-hover:text-blue-600" />
              </button>
            </div>
          )}
          {!sidebarCollapsed && (
            <div className="flex items-center space-x-2">
              {/* Collapse button - only on desktop when expanded */}
              <button
                type="button"
                className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg hover:bg-blue-50 border border-gray-200 hover:border-blue-200 transition-all duration-200 group"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                title="Collapse sidebar"
              >
                <PanelLeftClose className="w-4 h-4 text-gray-600 group-hover:text-blue-600" />
              </button>
              {/* Close button - only on mobile */}
              <button
                type="button"
                className="lg:hidden p-1 rounded-md hover:bg-gray-100"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          )}
        </div>

        <nav className="mt-8 px-2 flex-1 overflow-y-auto">
          <ul className="space-y-1">
            {navigation.map((item) => (
              <li key={item.name}>
                <Link
                  to={item.disabled ? '#' : item.href}
                  className={`
                    flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 group relative
                    ${item.current
                      ? 'bg-blue-100 text-blue-700'
                      : item.disabled
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }
                    ${sidebarCollapsed ? 'justify-center' : ''}
                  `}
                  onClick={item.disabled ? (e) => e.preventDefault() : undefined}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  <item.icon className={`w-5 h-5 ${sidebarCollapsed ? '' : 'mr-3'}`} />
                  {!sidebarCollapsed && (
                    <>
                      <span>{item.name}</span>
                      {item.disabled && (
                        <span className="ml-auto text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                          Soon
                        </span>
                      )}
                    </>
                  )}
                  
                  {/* Tooltip for collapsed state */}
                  {sidebarCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                      {item.name}
                      {item.disabled && " (Coming Soon)"}
                    </div>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between h-16 px-4 lg:px-6">
            {/* Mobile menu button */}
            <button
              type="button"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6 text-gray-400" />
            </button>

            {/* Search bar */}
            <div className="flex-1 max-w-md mx-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Find devices, alerts..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Right side buttons */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <div className="relative">
                <button 
                  className="relative p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                  onClick={() => setShowNotifications(!showNotifications)}
                  title="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                      {notifications.length > 9 ? '9+' : notifications.length}
                    </span>
                  )}
                </button>
                
                {/* Notifications dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 notifications-dropdown">
                    <div className="p-4 border-b border-gray-100">
                      <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                          <p>No new notifications</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {notifications.map((notification: Notification, index: number) => (
                            <div key={index} className="p-4 hover:bg-gray-50 cursor-pointer">
                              <div className="flex items-start space-x-3">
                                <div className={`w-2 h-2 rounded-full mt-2 ${
                                  notification.severity === 'high' ? 'bg-red-500' :
                                  notification.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                                }`}></div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {notification.title}
                                  </p>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    {notification.deviceId} • {new Date(notification.timestamp).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <div className="p-4 border-t border-gray-100">
                        <button 
                          className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium"
                          onClick={() => setNotifications([])}
                        >
                          Clear all notifications
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* User menu */}
              <div className="relative">
                <button className="flex items-center space-x-3 text-sm">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.name || 'User'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {user?.deviceCount || 0} devices
                    </p>
                  </div>
                </button>
              </div>

              {/* Logout button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="hidden md:flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
