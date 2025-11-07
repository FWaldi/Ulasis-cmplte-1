import React, { useState, useEffect } from 'react';
import {
  Activity,
  Search,
  Filter,
  Calendar,
  User,
  Shield,
  Eye,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
  MoreVertical
} from 'lucide-react';
import enterpriseAdminApi from '../services/enterpriseAdminApi';

interface AdminActivity {
  id: number;
  action: string;
  resource_type: string;
  resource_id?: number;
  details: any;
  ip_address: string;
  user_agent: string;
  session_id: string;
  duration_ms?: number;
  status: 'success' | 'failure' | 'warning';
  error_message?: string;
  created_at: string;
  adminUser: {
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
  };
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const ActivityMonitoring: React.FC = () => {
  const [activities, setActivities] = useState<AdminActivity[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    adminUserId: '',
    action: '',
    resourceType: '',
    status: '',
    startDate: '',
    endDate: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<AdminActivity | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState<string | null);

  useEffect(() => {
    fetchActivities();
  }, [pagination.page, filters]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== undefined) {
        setPagination(prev => ({ ...prev, page: 1 }));
        fetchActivities();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const fetchActivities = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(searchTerm && { action: searchTerm }),
        ...(filters.adminUserId && { adminUserId: parseInt(filters.adminUserId) }),
        ...(filters.action && { action: filters.action }),
        ...(filters.resourceType && { resourceType: filters.resourceType }),
        ...(filters.status && { status: filters.status }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      };

      const response = await enterpriseAdminApi.getAdminActivities(params);
      
      if (response.success) {
        setActivities(response.data.activities);
        setPagination(response.data.pagination);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch activities');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportActivities = async () => {
    try {
      const params = {
        ...filters,
        ...(searchTerm && { action: searchTerm }),
        export: true,
        limit: 10000, // Export more records
      };

      const response = await enterpriseAdminApi.getAdminActivities(params);
      
      // Create CSV content
      const csvContent = convertToCSV(response.data.activities);
      
      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `admin_activities_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Failed to export activities');
    }
  };

  const convertToCSV = (data: AdminActivity[]): string => {
    const headers = [
      'ID', 'Admin User', 'Email', 'Role', 'Action', 'Resource Type', 
      'Status', 'IP Address', 'Duration (ms)', 'Date'
    ];
    const rows = data.map(activity => [
      activity.id,
      `${activity.adminUser.user.first_name} ${activity.adminUser.user.last_name}`,
      activity.adminUser.user.email,
      activity.adminUser.role.display_name,
      activity.action.replace('_', ' '),
      activity.resource_type || 'N/A',
      activity.status,
      activity.ip_address,
      activity.duration_ms || 'N/A',
      new Date(activity.created_at).toLocaleString(),
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const getActionIcon = (action: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      'ADMIN_LOGIN': <Shield className="w-4 h-4 text-green-500" />,
      'ADMIN_LOGOUT': <Shield className="w-4 h-4 text-gray-500" />,
      'CREATE_ADMIN_USER': <User className="w-4 h-4 text-blue-500" />,
      'UPDATE_ADMIN_USER': <Edit className="w-4 h-4 text-yellow-500" />,
      'DELETE_ADMIN_USER': <Trash2 className="w-4 h-4 text-red-500" />,
      'VIEW_ENTERPRISE_DASHBOARD': <Eye className="w-4 h-4 text-purple-500" />,
      'VIEW_ADMIN_USERS': <Eye className="w-4 h-4 text-purple-500" />,
      'VIEW_ADMIN_ACTIVITIES': <Eye className="w-4 h-4 text-purple-500" />,
      'BULK_USER_OPERATIONS': <Activity className="w-4 h-4 text-orange-500" />,
      'GENERATE_REPORT': <Activity className="w-4 h-4 text-indigo-500" />,
      'SETUP_2FA': <Shield className="w-4 h-4 text-cyan-500" />,
      'ENABLE_2FA': <CheckCircle className="w-4 h-4 text-green-500" />,
      'DISABLE_2FA': <XCircle className="w-4 h-4 text-red-500" />,
    };

    return iconMap[action] || <Activity className="w-4 h-4 text-gray-500" />;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      success: {
        icon: <CheckCircle className="w-4 h-4" />,
        class: 'bg-green-100 text-green-800',
        label: 'Success',
      },
      failure: {
        icon: <XCircle className="w-4 h-4" />,
        class: 'bg-red-100 text-red-800',
        label: 'Failure',
      },
      warning: {
        icon: <AlertTriangle className="w-4 h-4" />,
        class: 'bg-yellow-100 text-yellow-800',
        label: 'Warning',
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.success;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.class}`}>
        {config.icon}
        <span className="ml-1">{config.label}</span>
      </span>
    );
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return 'N/A';
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(2)}s`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const viewActivityDetails = (activity: AdminActivity) => {
    setSelectedActivity(activity);
    setShowDetails(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Monitoring</h1>
          <p className="text-gray-600">Monitor and track all admin activities</p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={handleExportActivities}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          <button
            onClick={fetchActivities}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <AlertTriangle className="w-5 h-5 text-red-400 mr-2" />
          <span className="text-red-800">{error}</span>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search activities by action..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            {showFilters && <span className="ml-2 text-blue-600">▲</span>}
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Admin User</label>
              <select
                value={filters.adminUserId}
                onChange={(e) => setFilters(prev => ({ ...prev, adminUserId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Admins</option>
                {/* This would be populated with actual admin users */}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
              <select
                value={filters.action}
                onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Actions</option>
                <option value="ADMIN_LOGIN">Admin Login</option>
                <option value="CREATE_ADMIN_USER">Create Admin User</option>
                <option value="UPDATE_ADMIN_USER">Update Admin User</option>
                <option value="VIEW_ENTERPRISE_DASHBOARD">View Dashboard</option>
                <option value="BULK_USER_OPERATIONS">Bulk Operations</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Resource Type</label>
              <select
                value={filters.resourceType}
                onChange={(e) => setFilters(prev => ({ ...prev, resourceType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Resources</option>
                <option value="admin_user">Admin User</option>
                <option value="user">User</option>
                <option value="session">Session</option>
                <option value="analytics">Analytics</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="success">Success</option>
                <option value="failure">Failure</option>
                <option value="warning">Warning</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Activities Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Admin User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Resource
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activities.map((activity) => (
                <tr key={activity.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      {getActionIcon(activity.action)}
                      <span className="ml-2 text-sm font-medium text-gray-900">
                        {activity.action.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 text-xs font-medium">
                          {activity.adminUser.user.first_name[0]}
                        </span>
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {activity.adminUser.user.first_name} {activity.adminUser.user.last_name}
                        </div>
                        <div className="text-sm text-gray-500">{activity.adminUser.user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {activity.resource_type || 'N/A'}
                    {activity.resource_id && (
                      <span className="text-gray-500">#{activity.resource_id}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(activity.status)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {activity.ip_address}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDuration(activity.duration_ms)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {formatDate(activity.created_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <button
                      onClick={() => viewActivityDetails(activity)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
          <div className="text-sm text-gray-700">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} results
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page <= 1}
              className="p-2 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <span className="px-3 py-1 text-sm">
              Page {pagination.page} of {pagination.pages}
            </span>
            
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page >= pagination.pages}
              className="p-2 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Activity Details Modal */}
      {showDetails && selectedActivity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Activity Details</h2>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Action</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedActivity.action.replace('_', ' ')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedActivity.status)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Admin User</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedActivity.adminUser.user.first_name} {selectedActivity.adminUser.user.last_name}
                  </p>
                  <p className="text-xs text-gray-500">{selectedActivity.adminUser.user.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedActivity.adminUser.role.display_name}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Resource Type</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedActivity.resource_type || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Resource ID</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedActivity.resource_id || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">IP Address</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedActivity.ip_address}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Duration</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {formatDuration(selectedActivity.duration_ms)}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">User Agent</label>
                <p className="mt-1 text-sm text-gray-900 break-all">
                  {selectedActivity.user_agent || 'N/A'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Session ID</label>
                <p className="mt-1 text-sm text-gray-900 font-mono">
                  {selectedActivity.session_id}
                </p>
              </div>

              {selectedActivity.details && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Details</label>
                  <pre className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded overflow-x-auto">
                    {JSON.stringify(selectedActivity.details, null, 2)}
                  </pre>
                </div>
              )}

              {selectedActivity.error_message && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Error Message</label>
                  <p className="mt-1 text-sm text-red-600 bg-red-50 p-3 rounded">
                    {selectedActivity.error_message}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">Timestamp</label>
                <p className="mt-1 text-sm text-gray-900">
                  {formatDate(selectedActivity.created_at)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityMonitoring;