import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../../services/api/apiService';

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

interface UsageData {
  current_period: string;
  usage: {
    questionnaires: { used: number; limit: number | null; percentage: number | null };
    responses: { used: number; limit: number | null; percentage: number | null };
    exports: { used: number; limit: number | null; percentage: number | null };
  };
  upgrade_suggestions: Array<{
    plan: string;
    reason: string;
    benefit: string;
  }>;
}

interface Plan {
  name: 'free' | 'starter' | 'business';
  limits: {
    questionnaires: number | null;
    responses: number | null;
    exports: number | null;
  };
  features: string[];
  price: number;
  currency: string;
}

export const useSubscription = () => {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch current subscription
  const fetchSubscription = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.get('/subscription/current');
      if (response.success) {
        setSubscription(response.data);
      } else {
        setError(response.error?.message || 'Failed to fetch subscription');
      }
    } catch (err) {
      setError('Failed to fetch subscription');
      console.error('Subscription fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch usage statistics
  const fetchUsage = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.get('/subscription/usage');
      if (response.success) {
        setUsage(response.data);
      } else {
        setError(response.error?.message || 'Failed to fetch usage');
      }
    } catch (err) {
      setError('Failed to fetch usage');
      console.error('Usage fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch available plans
  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.get('/subscription/plans');
      if (response.success) {
        setPlans(response.data.plans);
      } else {
        setError(response.error?.message || 'Failed to fetch plans');
      }
    } catch (err) {
      setError('Failed to fetch plans');
      console.error('Plans fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Request subscription upgrade
  const requestUpgrade = useCallback(async (targetPlan: string, reason?: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.post('/subscription/upgrade-request', {
        target_plan: targetPlan,
        reason: reason || `Upgrade to ${targetPlan} plan`
      });
      if (response.success) {
        // Redirect to payment URL if provided
        if (response.data.payment_url) {
          window.location.href = response.data.payment_url;
        }
        return response.data;
      } else {
        throw new Error(response.error?.message || 'Upgrade request failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upgrade request failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Check if user can perform an action
  const canPerformAction = useCallback((actionType: 'questionnaires' | 'responses' | 'exports', count: number = 1) => {
    if (!subscription) return { allowed: false, reason: 'Subscription not loaded' };

    const limits = subscription.limits[actionType];
    if (!limits) return { allowed: false, reason: 'Invalid action type' };

    const limit = limits.limit;
    if (limit === null) return { allowed: true }; // Unlimited

    const newTotal = limits.used + count;
    if (newTotal > limit) {
      return {
        allowed: false,
        reason: `${actionType.charAt(0).toUpperCase() + actionType.slice(1)} limit exceeded`,
        current: limits.used,
        limit,
        requested: count
      };
    }

    return { allowed: true };
  }, [subscription]);

  // Check if user has a specific feature
  const hasFeature = useCallback((feature: string) => {
    return subscription?.features.includes(feature) || false;
  }, [subscription]);

  // Get current plan
  const getCurrentPlan = useCallback(() => {
    return subscription?.subscription_plan || 'free';
  }, [subscription]);

  // Get plan limits
  const getPlanLimits = useCallback((planName?: string) => {
    const plan = planName || getCurrentPlan();
    const planData = plans.find(p => p.name === plan);
    return planData?.limits || null;
  }, [plans, getCurrentPlan]);

  // Get upgrade suggestions
  const getUpgradeSuggestions = useCallback(async () => {
    try {
      const response = await apiService.get('/subscription/upgrade-suggestions');
      if (response.success) {
        return response.data.upgrade_suggestions;
      }
      return [];
    } catch (err) {
      console.error('Failed to fetch upgrade suggestions:', err);
      return [];
    }
  }, []);

  // Refresh all subscription data
  const refresh = useCallback(async () => {
    await Promise.all([fetchSubscription(), fetchUsage(), fetchPlans()]);
  }, [fetchSubscription, fetchUsage, fetchPlans]);

  // Initialize data on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    // Data
    subscription,
    usage,
    plans,

    // State
    loading,
    error,

    // Actions
    fetchSubscription,
    fetchUsage,
    fetchPlans,
    requestUpgrade,
    refresh,

    // Utilities
    canPerformAction,
    hasFeature,
    getCurrentPlan,
    getPlanLimits,
    getUpgradeSuggestions,

    // Clear error
    clearError: () => setError(null)
  };
};

export default useSubscription;