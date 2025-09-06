import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Drishti Tracker
          </h1>
          <p className="text-gray-600">
            Monitor your vehicles with precision
          </p>
        </div>
        
        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          {children}
        </div>
        
        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>Secure IoT vehicle tracking solution</p>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
