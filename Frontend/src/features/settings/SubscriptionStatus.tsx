import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './common/Modal'; // Assuming common components exist
import { apiService } from '../services/api/apiService';

interface SubscriptionData {
  user_id: number;
  subscription_plan: 'free' | 'starter' | 'business';
  subscription_status: 'active' | 'inactive' | 'suspended';
  email: string;
  email_verified: boolean;
  limits: {
    questionnaires: { used: number; limit: number | null };
    responses: { used: number; limit: number | null };
    exports: { used: number; limit: number | null };
  };
  features: string[];
  unlimited_data_retention: boolean;
  upgrade_suggestions?: Array<{
    plan: string;
    reason: string;
    benefit: string;
  }>;
}

interface SubscriptionStatusProps {
  onUpgradeClick?: () => void;
}

const SubscriptionStatus: React.FC<SubscriptionStatusProps> = ({ onUpgradeClick }) => {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscriptionStatus();
  }, []);

  const fetchSubscriptionStatus = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/subscription/current');
      if (response.success) {
        setSubscription(response.data);
      } else {
        setError(response.error?.message || 'Failed to load subscription status');
      }
    } catch (err) {
      setError('Failed to load subscription status');
      console.error('Subscription status error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'free': return 'text-gray-600';
      case 'starter': return 'text-blue-600';
      case 'business': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'inactive': return 'text-yellow-600';
      case 'suspended': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const formatLimit = (used: number, limit: number | null) => {
    if (limit === null) return `${used} / Unlimited`;
    return `${used} / ${limit}`;
  };

  const getUsagePercentage = (used: number, limit: number | null) => {
    if (limit === null) return 0;
    return Math.min((used / limit) * 100, 100);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !subscription) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-red-600">
            {error || 'Failed to load subscription information'}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Subscription Status</span>
          <span className={`text-sm font-medium ${getPlanColor(subscription.subscription_plan)}`}>
            {subscription.subscription_plan.charAt(0).toUpperCase() + subscription.subscription_plan.slice(1)} Plan
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Status:</span>
          <span className={`text-sm font-medium ${getStatusColor(subscription.subscription_status)}`}>
            {subscription.subscription_status.charAt(0).toUpperCase() + subscription.subscription_status.slice(1)}
          </span>
        </div>

        {/* Email Verification */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Email Verified:</span>
          <span className={`text-sm font-medium ${subscription.email_verified ? 'text-green-600' : 'text-yellow-600'}`}>
            {subscription.email_verified ? 'Yes' : 'No'}
          </span>
        </div>

        {/* Usage Limits */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900">Usage Limits</h4>

          {/* Questionnaires */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>Questionnaires</span>
              <span>{formatLimit(subscription.limits.questionnaires.used, subscription.limits.questionnaires.limit)}</span>
            </div>
            {subscription.limits.questionnaires.limit && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${getUsagePercentage(subscription.limits.questionnaires.used, subscription.limits.questionnaires.limit)}%` }}
                ></div>
              </div>
            )}
          </div>

          {/* Responses */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>Responses</span>
              <span>{formatLimit(subscription.limits.responses.used, subscription.limits.responses.limit)}</span>
            </div>
            {subscription.limits.responses.limit && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${getUsagePercentage(subscription.limits.responses.used, subscription.limits.responses.limit)}%` }}
                ></div>
              </div>
            )}
          </div>

          {/* Exports */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>Exports</span>
              <span>{formatLimit(subscription.limits.exports.used, subscription.limits.exports.limit)}</span>
            </div>
            {subscription.limits.exports.limit && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full"
                  style={{ width: `${getUsagePercentage(subscription.limits.exports.used, subscription.limits.exports.limit)}%` }}
                ></div>
              </div>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">Available Features</h4>
          <div className="flex flex-wrap gap-2">
            {subscription.features.map((feature, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
              >
                {feature.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>

        {/* Upgrade Suggestions */}
        {subscription.upgrade_suggestions && subscription.upgrade_suggestions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-900">Upgrade Suggestions</h4>
            {subscription.upgrade_suggestions.map((suggestion, index) => (
              <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-yellow-800">
                      Consider upgrading to {suggestion.plan} plan
                    </p>
                    <p className="text-xs text-yellow-700">{suggestion.benefit}</p>
                  </div>
                  {onUpgradeClick && (
                    <button
                      onClick={onUpgradeClick}
                      className="px-3 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700"
                    >
                      Upgrade
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Data Retention */}
        <div className="text-xs text-gray-500">
          ✓ Unlimited data retention for all plans
        </div>
      </CardContent>
    </Card>
  );
};

export default SubscriptionStatus;