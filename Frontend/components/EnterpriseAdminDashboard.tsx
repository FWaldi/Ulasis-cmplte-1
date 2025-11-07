import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  TrendingUp,
  DollarSign,
  Activity,
  Shield,
  Settings,
  LogOut,
  Bell,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  PieChart,
  FileText,
  Lock,
  UserPlus,
  UserMinus,
  RefreshCw
} from 'lucide-react';

interface DashboardStats {
  overview: {
    total_admins: number;
    active_admins: number;
    total_activities_30d: number;
    recent_logins_7d: number;
  };
  role_distribution: Record<string, number>;
}

interface SystemStats {
  total_users: number;
  active_users: number;
  total_subscriptions: number;
  pending_requests: number;
}

interface RecentActivity {
  id: number;
  action: string;
  resource_type: string;
  created_at: string;
  adminUser: {
    user: {
      email: string;
      first_name: string;
      last_name: string;
    };
  };
}

interface AdminUser {
  id: number;
  user: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  };
  role: {
    name: string;
    display_name: string;
  };
  is_active: boolean;
  last_login_at: string;
  two_factor_enabled: boolean;
}

const EnterpriseAdminDashboard: React.FC = () => {
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('overview');
  const [showNotifications, setShowNotifications] = useState(false);

  const navigate = useNavigate();

  // Get current admin user from localStorage
  const currentAdminUser = JSON.parse(localStorage.getItem('enterpriseAdminUser') || '{}');

  useEffect(() => {
    fetchDashboardData();
    fetchSystemStats();
    fetchRecentActivities();
    fetchAdminUsers();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('enterpriseAdminToken') || sessionStorage.getItem('enterpriseAdminToken');
      const response = await fetch('/api/v1/enterprise-admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardStats(data.data.admin_stats);
      }
    } catch (err) {
      setError('Failed to fetch dashboard data');
    }
  };

  const fetchSystemStats = async () => {
    try {
      const token = localStorage.getItem('enterpriseAdminToken') || sessionStorage.getItem('enterpriseAdminToken');
      const response = await fetch('/api/v1/enterprise-admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSystemStats(data.data.system_stats);
      }
    } catch (err) {
      setError('Failed to fetch system stats');
    }
  };

  const fetchRecentActivities = async () => {
    try {
      const token = localStorage.getItem('enterpriseAdminToken') || sessionStorage.getItem('enterpriseAdminToken');
      const response = await fetch('/api/v1/enterprise-admin/activities?limit=10', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRecentActivities(data.data.activities);
      }
    } catch (err) {
      setError('Failed to fetch recent activities');
    }
  };

  const fetchAdminUsers = async () => {
    try {
      const token = localStorage.getItem('enterpriseAdminToken') || sessionStorage.getItem('enterpriseAdminToken');
      const response = await fetch('/api/v1/enterprise-admin/admin-users?limit=5', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAdminUsers(data.data.admin_users);
      }
    } catch (err) {
      setError('Failed to fetch admin users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('enterpriseAdminToken') || sessionStorage.getItem('enterpriseAdminToken');
      await fetch('/api/v1/enterprise-admin/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      localStorage.removeItem('enterpriseAdminToken');
      sessionStorage.removeItem('enterpriseAdminToken');
      localStorage.removeItem('enterpriseAdminUser');
      navigate('/enterprise-admin/login');
    } catch (err) {
      // Still logout on error
      localStorage.removeItem('enterpriseAdminToken');
      sessionStorage.removeItem('enterpriseAdminToken');
      localStorage.removeItem('enterpriseAdminUser');
      navigate('/enterprise-admin/login');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'ADMIN_LOGIN':
        return <LogOut className="w-4 h-4 text-green-500" />;
      case 'CREATE_ADMIN_USER':
        return <UserPlus className="w-4 h-4 text-blue-500" />;
      case 'UPDATE_ADMIN_USER':
        return <Edit className="w-4 h-4 text-yellow-500" />;
      case 'VIEW_ENTERPRISE_DASHBOARD':
        return <Eye className="w-4 h-4 text-purple-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Shield className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">Enterprise Admin Dashboard</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Notifications */}
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* User Menu */}
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {currentAdminUser.user?.firstName} {currentAdminUser.user?.lastName}
                  </p>
                  <p className="text-xs text-gray-500">{currentAdminUser.role?.name}</p>
                </div>
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {currentAdminUser.user?.firstName?.[0]}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'users', label: 'User Management', icon: Users },
              { id: 'admins', label: 'Admin Users', icon: Shield },
              { id: 'analytics', label: 'Analytics', icon: TrendingUp },
              { id: 'security', label: 'Security', icon: Lock },
              { id: 'reports', label: 'Reports', icon: FileText },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`flex items-center px-1 py-4 border-b-2 font-medium text-sm ${
                  selectedTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-400 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {/* Overview Tab */}
        {selectedTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* System Stats */}
              {systemStats && (
                <>
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Users</p>
                        <p className="text-2xl font-semibold text-gray-900">{systemStats.total_users}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Active Users</p>
                        <p className="text-2xl font-semibold text-gray-900">{systemStats.active_users}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <DollarSign className="w-6 h-6 text-purple-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Subscriptions</p>
                        <p className="text-2xl font-semibold text-gray-900">{systemStats.total_subscriptions}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <Clock className="w-6 h-6 text-yellow-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Pending Requests</p>
                        <p className="text-2xl font-semibold text-gray-900">{systemStats.pending_requests}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Admin Stats */}
            {dashboardStats && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Admin Overview</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Admins</span>
                      <span className="text-sm font-medium text-gray-900">{dashboardStats.overview.total_admins}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Active Admins</span>
                      <span className="text-sm font-medium text-gray-900">{dashboardStats.overview.active_admins}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Recent Logins (7d)</span>
                      <span className="text-sm font-medium text-gray-900">{dashboardStats.overview.recent_logins_7d}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Activities (30d)</span>
                      <span className="text-sm font-medium text-gray-900">{dashboardStats.overview.total_activities_30d}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Role Distribution</h3>
                  <div className="space-y-2">
                    {Object.entries(dashboardStats.role_distribution).map(([role, count]) => (
                      <div key={role} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 capitalize">{role.replace('_', ' ')}</span>
                        <div className="flex items-center">
                          <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${(count / dashboardStats.overview.total_admins) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Recent Activities */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recent Activities</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center">
                      {getActionIcon(activity.action)}
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {activity.action.replace('_', ' ')}
                        </p>
                        <p className="text-sm text-gray-500">
                          {activity.adminUser.user.first_name} {activity.adminUser.user.last_name} • {activity.resource_type}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">{formatDate(activity.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Admin Users Tab */}
        {selectedTab === 'admins' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Admin Users</h3>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center">
                <UserPlus className="w-4 h-4 mr-2" />
                Add Admin
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      2FA
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Login
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {adminUsers.map((admin) => (
                    <tr key={admin.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 text-sm font-medium">
                              {admin.user.first_name[0]}
                            </span>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {admin.user.first_name} {admin.user.last_name}
                            </div>
                            <div className="text-sm text-gray-500">{admin.user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {admin.role.display_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          admin.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {admin.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {admin.two_factor_enabled ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-yellow-500" />
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {admin.last_login_at ? formatDate(admin.last_login_at) : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button className="text-blue-600 hover:text-blue-900">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="text-red-600 hover:text-red-900">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default EnterpriseAdminDashboard;