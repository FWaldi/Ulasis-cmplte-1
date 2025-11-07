import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, Shield, AlertCircle } from 'lucide-react';

interface LoginFormData {
  email: string;
  password: string;
  twoFactorToken: string;
  rememberMe: boolean;
}

interface LoginResponse {
  success: boolean;
  requiresTwoFactor?: boolean;
  message?: string;
  data?: {
    token: string;
    adminUser: {
      id: number;
      user: {
        id: number;
        email: string;
        firstName: string;
        lastName: string;
      };
      role: {
        name: string;
        permissions: string[];
      };
      twoFactorEnabled: boolean;
    };
  };
}

const EnterpriseAdminLogin: React.FC = () => {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    twoFactorToken: '',
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [lockoutInfo, setLockoutInfo] = useState<{ remainingTime: number } | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    // Check if already logged in
    const token = localStorage.getItem('enterpriseAdminToken');
    if (token) {
      navigate('/enterprise-admin/dashboard');
    }
  }, [navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/enterprise-admin/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data: LoginResponse = await response.json();

      if (data.success) {
        if (data.requiresTwoFactor) {
          setRequiresTwoFactor(true);
          setError('Please enter your two-factor authentication code');
        } else if (data.data?.token) {
          // Store token securely
          if (formData.rememberMe) {
            localStorage.setItem('enterpriseAdminToken', data.data.token);
          } else {
            sessionStorage.setItem('enterpriseAdminToken', data.data.token);
          }
          
          // Store user info
          localStorage.setItem('enterpriseAdminUser', JSON.stringify(data.data.adminUser));
          
          navigate('/enterprise-admin/dashboard');
        }
      } else {
        if (response.status === 429 && (data as any).lockoutRemaining) {
          setLockoutInfo({ remainingTime: (data as any).lockoutRemaining });
        }
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatLockoutTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black opacity-50"></div>
      
      <div className="relative z-10 w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Enterprise Admin</h1>
          <p className="text-blue-200">Ulasis Administrative Portal</p>
        </div>

        {/* Login Form */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-blue-200 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="admin@ulasis.com"
                required
                disabled={isLoading}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-blue-200 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                  placeholder="Enter your password"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-300 hover:text-white"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Two-Factor Authentication */}
            {requiresTwoFactor && (
              <div>
                <label htmlFor="twoFactorToken" className="block text-sm font-medium text-blue-200 mb-2">
                  Two-Factor Authentication Code
                </label>
                <input
                  type="text"
                  id="twoFactorToken"
                  name="twoFactorToken"
                  value={formData.twoFactorToken}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  required
                  disabled={isLoading}
                />
              </div>
            )}

            {/* Remember Me */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="rememberMe"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleInputChange}
                className="w-4 h-4 bg-white/10 border-white/20 rounded focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                disabled={isLoading}
              />
              <label htmlFor="rememberMe" className="ml-2 text-sm text-blue-200">
                Remember me for 7 days
              </label>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
                <span className="text-red-200 text-sm">{error}</span>
              </div>
            )}

            {/* Lockout Timer */}
            {lockoutInfo && (
              <div className="flex items-center p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
                <Lock className="w-5 h-5 text-yellow-400 mr-2" />
                <span className="text-yellow-200 text-sm">
                  Account locked. Try again in {formatLockoutTime(lockoutInfo.remainingTime)}
                </span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || (lockoutInfo !== null)}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent transition-colors duration-200"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  {requiresTwoFactor ? 'Verifying...' : 'Signing in...'}
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <Lock className="w-5 h-5 mr-2" />
                  {requiresTwoFactor ? 'Verify & Sign In' : 'Sign In'}
                </div>
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex items-start">
              <Shield className="w-5 h-5 text-blue-400 mr-2 mt-0.5" />
              <div className="text-sm text-blue-200">
                <p className="font-medium mb-1">Security Notice</p>
                <p className="text-xs">
                  This is a restricted administrative access point. Unauthorized access attempts are monitored and logged.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-blue-300 text-sm">
            © 2024 Ulasis Enterprise. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EnterpriseAdminLogin;