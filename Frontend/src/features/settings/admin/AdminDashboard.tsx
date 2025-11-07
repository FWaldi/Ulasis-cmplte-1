import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/api/useApi';
import { Spinner } from '../../../components/common/Spinner';
import Modal from '../../../components/common/Modal';

interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  uptime: number;
  database: {
    status: string;
    response_time: number;
  };
  services: Record<string, string>;
  last_backup: string;
}

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalQuestionnaires: number;
  systemHealth: SystemHealth;
  recentAuditLogs: Array<{
    id: number;
    action: string;
    user_id: number;
    timestamp: string;
  }>;
}

const AdminDashboard: React.FC = () => {
  const { apiCall, loading } = useApi();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setError(null);

      // Load system health
      const healthResponse = await apiCall('/api/v1/admin/system/health');
      const healthData = healthResponse.data;

      // Load user stats (placeholder - implement actual endpoint)
      const usersResponse = await apiCall('/api/v1/admin/users?page=1&limit=1');
      const totalUsers = usersResponse.data.pagination.total;

      // Load recent audit logs
      const auditResponse = await apiCall('/api/v1/admin/audit-logs?page=1&limit=5');
      const recentAuditLogs = auditResponse.data.logs;

      // Load questionnaire stats (placeholder)
      const questionnairesResponse = await apiCall('/api/v1/questionnaires?limit=1');
      const totalQuestionnaires = questionnairesResponse.data.pagination?.total || 0;

      setStats({
        totalUsers,
        activeUsers: Math.floor(totalUsers * 0.8), // Placeholder calculation
        totalQuestionnaires,
        systemHealth: healthData,
        recentAuditLogs,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error Loading Dashboard</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
            <div className="mt-4">
              <button
                onClick={loadDashboardData}
                className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-2 rounded-md text-sm font-medium"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <button
          onClick={loadDashboardData}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          Refresh
        </button>
      </div>

      {/* System Health Status */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">System Health</h2>
        {stats?.systemHealth && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-lg ${
              stats.systemHealth.status === 'healthy' ? 'bg-green-50 border-green-200' :
              stats.systemHealth.status === 'warning' ? 'bg-yellow-50 border-yellow-200' :
              'bg-red-50 border-red-200'
            } border`}>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  stats.systemHealth.status === 'healthy' ? 'bg-green-400' :
                  stats.systemHealth.status === 'warning' ? 'bg-yellow-400' :
                  'bg-red-400'
                }`}></div>
                <span className="text-sm font-medium capitalize">{stats.systemHealth.status}</span>
              </div>
              <div className="mt-2 text-2xl font-bold">
                {Math.floor(stats.systemHealth.uptime / 86400)}d {Math.floor((stats.systemHealth.uptime % 86400) / 3600)}h
              </div>
              <div className="text-sm text-gray-600">Uptime</div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm font-medium text-blue-800">Database</div>
              <div className="mt-2 text-2xl font-bold text-blue-900">
                {stats.systemHealth.database.response_time}ms
              </div>
              <div className="text-sm text-blue-600">Response Time</div>
            </div>

            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="text-sm font-medium text-purple-800">Last Backup</div>
              <div className="mt-2 text-sm font-bold text-purple-900">
                {new Date(stats.systemHealth.last_backup).toLocaleDateString()}
              </div>
              <div className="text-xs text-purple-600">
                {new Date(stats.systemHealth.last_backup).toLocaleTimeString()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-500 rounded-md">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Total Users</div>
              <div className="text-2xl font-bold text-gray-900">{stats?.totalUsers || 0}</div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-500 rounded-md">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Active Users</div>
              <div className="text-2xl font-bold text-gray-900">{stats?.activeUsers || 0}</div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-500 rounded-md">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Questionnaires</div>
              <div className="text-2xl font-bold text-gray-900">{stats?.totalQuestionnaires || 0}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-4">
          {stats?.recentAuditLogs?.map((log) => (
            <div key={log.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div className="ml-3">
                  <div className="text-sm font-medium text-gray-900">{log.action}</div>
                  <div className="text-sm text-gray-500">User ID: {log.user_id}</div>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                {new Date(log.timestamp).toLocaleString()}
              </div>
            </div>
          )) || (
            <div className="text-center py-4 text-gray-500">No recent activity</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;