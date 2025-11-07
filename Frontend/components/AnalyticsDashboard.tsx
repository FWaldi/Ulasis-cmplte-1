import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  PieChart,
  LineChart,
  Eye,
  FileText
} from 'lucide-react';
import enterpriseAdminApi from '../services/enterpriseAdminApi';

interface AnalyticsData {
  user_growth: Array<{
    period: string;
    new_users: number;
    active_users: number;
  }>;
  subscription_revenue: Array<{
    period: string;
    subscription_plan: string;
    count: number;
    revenue: number;
  }>;
  subscription_distribution: Array<{
    subscription_plan: string;
    count: number;
    percentage: number;
  }>;
}

interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string[];
    borderColor?: string[];
    borderWidth?: number;
  }>;
}

const AnalyticsDashboard: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [userGrowthData, setUserGrowthData] = useState<ChartData | null>(null);
  const [revenueData, setRevenueData] = useState<ChartData | null>(null);
  const [subscriptionData, setSubscriptionData] = useState<ChartData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    groupBy: 'day'
  });
  const [selectedChart, setSelectedChart] = useState('overview');

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange]);

  const fetchAnalyticsData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch general analytics
      const analyticsResponse = await enterpriseAdminApi.getEnterpriseAnalytics(dateRange);
      
      // Fetch user growth analytics
      const userGrowthResponse = await enterpriseAdminApi.getUserGrowthAnalytics(dateRange);
      
      // Fetch subscription revenue analytics
      const revenueResponse = await enterpriseAdminApi.getSubscriptionRevenueAnalytics(dateRange);

      if (analyticsResponse.success) {
        setAnalyticsData(analyticsResponse.data);
      }

      if (userGrowthResponse.success) {
        setUserGrowthData(transformUserGrowthData(userGrowthResponse.data.user_growth));
      }

      if (revenueResponse.success) {
        setRevenueData(transformRevenueData(revenueResponse.data.subscription_revenue));
        setSubscriptionData(transformSubscriptionData(revenueResponse.data.subscription_distribution));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  const transformUserGrowthData = (data: any[]): ChartData => {
    const labels = data.map(item => new Date(item.period).toLocaleDateString());
    const newUsers = data.map(item => item.new_users);
    const activeUsers = data.map(item => item.active_users);

    return {
      labels,
      datasets: [
        {
          label: 'New Users',
          data: newUsers,
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 2,
        },
        {
          label: 'Active Users',
          data: activeUsers,
          backgroundColor: 'rgba(16, 185, 129, 0.5)',
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 2,
        },
      ],
    };
  };

  const transformRevenueData = (data: any[]): ChartData => {
    const periods = [...new Set(data.map(item => new Date(item.period).toLocaleDateString()))];
    const plans = ['basic', 'premium', 'enterprise'];
    
    const datasets = plans.map(plan => {
      const planData = data.filter(item => item.subscription_plan === plan);
      const planColors = {
        basic: 'rgba(59, 130, 246, 0.8)',
        premium: 'rgba(147, 51, 234, 0.8)',
        enterprise: 'rgba(251, 191, 36, 0.8)',
      };

      return {
        label: plan.charAt(0).toUpperCase() + plan.slice(1),
        data: periods.map(period => {
          const periodData = planData.find(item => 
            new Date(item.period).toLocaleDateString() === period
          );
          return periodData ? periodData.revenue : 0;
        }),
        backgroundColor: planColors[plan as keyof typeof planColors],
        borderColor: planColors[plan as keyof typeof planColors],
        borderWidth: 2,
      };
    });

    return {
      labels: periods,
      datasets,
    };
  };

  const transformSubscriptionData = (data: any[]): ChartData => {
    const labels = data.map(item => item.subscription_plan.charAt(0).toUpperCase() + item.subscription_plan.slice(1));
    const counts = data.map(item => item.count);
    const colors = [
      'rgba(59, 130, 246, 0.8)',
      'rgba(147, 51, 234, 0.8)',
      'rgba(251, 191, 36, 0.8)',
      'rgba(107, 114, 128, 0.8)',
    ];

    return {
      labels,
      datasets: [
        {
          label: 'Users',
          data: counts,
          backgroundColor: colors,
          borderWidth: 0,
        },
      ],
    };
  };

  const exportAnalytics = async () => {
    try {
      const response = await enterpriseAdminApi.generateReport({
        type: 'user_analytics',
        parameters: dateRange,
        format: 'csv',
      });

      if (response.success) {
        // In a real implementation, you'd wait for the report to be generated
        // then download it. For now, we'll show a success message
        alert('Analytics export started. You will receive an email when it\'s ready.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to export analytics');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">Comprehensive system analytics and insights</p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={exportAnalytics}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          <button
            onClick={fetchAnalyticsData}
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
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <span className="text-red-800">{error}</span>
        </div>
      )}

      {/* Date Range Filter */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Group By</label>
            <select
              value={dateRange.groupBy}
              onChange={(e) => setDateRange(prev => ({ ...prev, groupBy: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
              <option value="year">Year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Chart Navigation */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'user-growth', label: 'User Growth', icon: TrendingUp },
              { id: 'revenue', label: 'Revenue', icon: DollarSign },
              { id: 'subscriptions', label: 'Subscriptions', icon: PieChart },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedChart(tab.id)}
                className={`flex items-center py-4 border-b-2 font-medium text-sm ${
                  selectedChart === tab.id
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

        <div className="p-6">
          {/* Overview Tab */}
          {selectedChart === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* User Growth Chart */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">User Growth</h3>
                {userGrowthData && (
                  <div className="h-64">
                    <SimpleBarChart data={userGrowthData} />
                  </div>
                )}
              </div>

              {/* Subscription Distribution */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Subscription Distribution</h3>
                {subscriptionData && (
                  <div className="h-64">
                    <SimplePieChart data={subscriptionData} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* User Growth Tab */}
          {selectedChart === 'user-growth' && userGrowthData && (
            <div className="h-96">
              <SimpleLineChart data={userGrowthData} />
            </div>
          )}

          {/* Revenue Tab */}
          {selectedChart === 'revenue' && revenueData && (
            <div className="h-96">
              <SimpleBarChart data={revenueData} />
            </div>
          )}

          {/* Subscriptions Tab */}
          {selectedChart === 'subscriptions' && subscriptionData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-80">
                <SimplePieChart data={subscriptionData} />
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Subscription Details</h3>
                {analyticsData?.subscription_distribution && (
                  <div className="space-y-3">
                    {analyticsData.subscription_distribution.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium text-gray-900 capitalize">
                          {item.subscription_plan}
                        </span>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-gray-900">{item.count}</div>
                          <div className="text-sm text-gray-500">{item.percentage.toFixed(1)}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {analyticsData && (
          <>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {userGrowthData?.datasets[0]?.data.reduce((a, b) => a + b, 0) || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Users</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {userGrowthData?.datasets[1]?.data[userGrowthData.datasets[1].data.length - 1] || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatCurrency(
                      revenueData?.datasets.reduce((total, dataset) => 
                        total + dataset.data.reduce((sum, value) => sum + value, 0), 0
                      ) || 0
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Activity className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {subscriptionData ? (
                      ((subscriptionData.datasets[0].data[1] || 0) / 
                       (subscriptionData.datasets[0].data.reduce((a, b) => a + b, 0) || 1) * 100
                    ).toFixed(1)
                    ) : 0}%
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Simple chart components (in a real app, you'd use a library like Chart.js or Recharts)
const SimpleBarChart: React.FC<{ data: ChartData }> = ({ data }) => {
  const maxValue = Math.max(...data.datasets.flatMap(d => d.data));
  
  return (
    <div className="h-full w-full">
      <div className="flex items-end justify-around h-full">
        {data.labels.map((label, index) => (
          <div key={index} className="flex flex-col items-center flex-1">
            <div className="w-full flex justify-around items-end">
              {data.datasets.map((dataset, datasetIndex) => (
                <div
                  key={datasetIndex}
                  className="mx-1 rounded-t"
                  style={{
                    height: `${(dataset.data[index] / maxValue) * 100}%`,
                    backgroundColor: dataset.backgroundColor,
                    minHeight: '2px',
                  }}
                  title={`${dataset.label}: ${dataset.data[index]}`}
                />
              ))}
            </div>
            <span className="text-xs text-gray-600 mt-2">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const SimpleLineChart: React.FC<{ data: ChartData }> = ({ data }) => {
  const maxValue = Math.max(...data.datasets.flatMap(d => d.data));
  
  return (
    <div className="h-full w-full">
      <div className="relative h-full">
        {data.datasets.map((dataset, datasetIndex) => (
          <div
            key={datasetIndex}
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to right, ${dataset.borderColor}22, ${dataset.borderColor}22)`,
            }}
          />
        ))}
        <div className="flex items-end justify-around h-full relative">
          {data.labels.map((label, index) => (
            <div key={index} className="flex flex-col items-center flex-1">
              <div className="w-full flex justify-around items-end relative">
                {data.datasets.map((dataset, datasetIndex) => (
                  <div
                    key={datasetIndex}
                    className="w-2 rounded-full"
                    style={{
                      height: `${(dataset.data[index] / maxValue) * 100}%`,
                      backgroundColor: dataset.borderColor,
                      minHeight: '2px',
                    }}
                    title={`${dataset.label}: ${dataset.data[index]}`}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-600 mt-2">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const SimplePieChart: React.FC<{ data: ChartData }> = ({ data }) => {
  const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
  let currentAngle = 0;
  
  return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="relative w-48 h-48">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {data.datasets[0].data.map((value, index) => {
            const percentage = (value / total) * 100;
            const angle = (percentage / 100) * 360;
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;
            
            const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
            const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
            const x2 = 50 + 40 * Math.cos((endAngle * Math.PI) / 180);
            const y2 = 50 + 40 * Math.sin((endAngle * Math.PI) / 180);
            
            const largeArcFlag = angle > 180 ? 1 : 0;
            
            currentAngle += angle;
            
            return (
              <path
                key={index}
                d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                fill={data.datasets[0].backgroundColor[index]}
                stroke="white"
                strokeWidth="2"
              />
            );
          })}
        </svg>
        
        {/* Legend */}
        <div className="absolute -right-32 top-0 space-y-2">
          {data.labels.map((label, index) => (
            <div key={index} className="flex items-center">
              <div
                className="w-3 h-3 rounded mr-2"
                style={{ backgroundColor: data.datasets[0].backgroundColor[index] }}
              />
              <span className="text-sm text-gray-700">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;