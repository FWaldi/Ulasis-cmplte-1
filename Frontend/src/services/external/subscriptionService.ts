import { apiService } from './apiService';

export interface SubscriptionData {
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

export interface UsageData {
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

export interface Plan {
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

export interface UpgradeRequest {
  target_plan: 'starter' | 'business';
  reason?: string;
}

export interface UpgradeResponse {
  success: boolean;
  message: string;
  data: {
    request_id: number;
    payment_url: string;
    amount: number;
    currency: string;
  };
}

export interface PaymentTransaction {
  id: number;
  payment_method: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  subscription_plan: string;
  created_at: string;
  processed_at: string | null;
}

class SubscriptionService {
  /**
   * Get current subscription status
   */
  async getCurrentSubscription(): Promise<SubscriptionData> {
    const response = await apiService.get('/api/v1/subscription/current');
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to get subscription status');
    }
    return response.data;
  }

  /**
   * Get current usage statistics
   */
  async getUsage(): Promise<UsageData> {
    const response = await apiService.get('/api/v1/subscription/usage');
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to get usage statistics');
    }
    return response.data;
  }

  /**
   * Request subscription upgrade
   */
  async requestUpgrade(data: UpgradeRequest): Promise<UpgradeResponse> {
    const response = await apiService.post('/api/v1/subscription/upgrade-request', data);
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to request upgrade');
    }
    return response;
  }

  /**
   * Get available subscription plans
   */
  async getPlans(): Promise<{ plans: Plan[] }> {
    const response = await apiService.get('/api/v1/subscription/plans');
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to get subscription plans');
    }
    return response.data;
  }

  /**
   * Get payment history
   */
  async getPaymentHistory(): Promise<{ transactions: PaymentTransaction[] }> {
    const response = await apiService.get('/api/v1/subscription/payments');
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to get payment history');
    }
    return response.data;
  }

  /**
   * Get upgrade suggestions
   */
  async getUpgradeSuggestions(): Promise<{
    current_plan: string;
    upgrade_suggestions: Array<{
      plan: string;
      reason: string;
      benefit: string;
    }>;
  }> {
    const response = await apiService.get('/api/v1/subscription/upgrade-suggestions');
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to get upgrade suggestions');
    }
    return response.data;
  }

  /**
   * Check if user can export data
   */
  async canExport(): Promise<boolean> {
    try {
      const subscription = await this.getCurrentSubscription();
      return subscription.features.includes('csv_export') || subscription.features.includes('excel_export');
    } catch (error) {
      console.error('Failed to check export permission:', error);
      return false;
    }
  }

  /**
   * Check if user has unlimited exports
   */
  async hasUnlimitedExports(): Promise<boolean> {
    try {
      const subscription = await this.getCurrentSubscription();
      return subscription.limits.exports.limit === null;
    } catch (error) {
      console.error('Failed to check unlimited exports:', error);
      return false;
    }
  }

  /**
   * Check if user has advanced analytics features
   */
  async hasAdvancedAnalytics(): Promise<boolean> {
    try {
      const subscription = await this.getCurrentSubscription();
      return subscription.features.includes('advanced_analytics');
    } catch (error) {
      console.error('Failed to check advanced analytics:', error);
      return false;
    }
  }

  /**
   * Check if user has API access
   */
  async hasApiAccess(): Promise<boolean> {
    try {
      const subscription = await this.getCurrentSubscription();
      return subscription.features.includes('api_access');
    } catch (error) {
      console.error('Failed to check API access:', error);
      return false;
    }
  }
}

export const subscriptionService = new SubscriptionService();
export default subscriptionService;