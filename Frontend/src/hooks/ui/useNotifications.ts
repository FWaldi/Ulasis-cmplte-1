import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery } from './useApi';

export interface NotificationPreferences {
  email_notifications: boolean;
  new_review_alerts: boolean;
  subscription_updates: boolean;
  account_security: boolean;
}

export interface NotificationHistoryItem {
  id: number;
  type: 'verification' | 'review' | 'subscription' | 'security' | 'test';
  subject: string;
  status: 'queued' | 'sent' | 'delivered' | 'bounced' | 'failed';
  sent_at: string | null;
  delivered_at: string | null;
  created_at: string;
}

export interface NotificationHistoryResponse {
  notifications: NotificationHistoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface NotificationState {
  preferences: NotificationPreferences | null;
  history: NotificationHistoryResponse | null;
  isLoading: boolean;
  error: string | null;
}

export function useNotifications() {
  const [state, setState] = useState<NotificationState>({
    preferences: null,
    history: null,
    isLoading: false,
    error: null,
  });

  // Fetch notification preferences
  const fetchPreferences = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch('/api/v1/notifications/preferences', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notification preferences');
      }

      const data = await response.json();

      if (data.success) {
        setState(prev => ({
          ...prev,
          preferences: data.data,
          isLoading: false,
        }));
      } else {
        throw new Error(data.message || 'Failed to fetch preferences');
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'An error occurred',
        isLoading: false,
      }));
    }
  }, []);

  // Update notification preferences
  const updatePreferencesMutation = useMutation<
    NotificationPreferences,
    NotificationPreferences
  >(
    async (preferences: NotificationPreferences) => {
      const response = await fetch('/api/v1/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        throw new Error('Failed to update notification preferences');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to update preferences');
      }

      return data.data;
    },
    {
      onSuccess: (data) => {
        setState(prev => ({
          ...prev,
          preferences: data,
          error: null,
        }));
      },
      onError: (error) => {
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'An error occurred',
        }));
      },
    }
  );

  // Fetch notification history
  const fetchHistory = useCallback(async (page = 1, limit = 20) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(
        `/api/v1/notifications/history?page=${page}&limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch notification history');
      }

      const data = await response.json();

      if (data.success) {
        setState(prev => ({
          ...prev,
          history: data.data,
          isLoading: false,
        }));
      } else {
        throw new Error(data.message || 'Failed to fetch history');
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'An error occurred',
        isLoading: false,
      }));
    }
  }, []);

  // Send test email
  const sendTestEmailMutation = useMutation<void, { email: string }>(
    async ({ email }) => {
      const response = await fetch('/api/v1/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error('Failed to send test email');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to send test email');
      }
    },
    {
      onSuccess: () => {
        setState(prev => ({
          ...prev,
          error: null,
        }));
      },
      onError: (error) => {
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'An error occurred',
        }));
      },
    }
  );

  // Load preferences on mount
  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return {
    // State
    preferences: state.preferences,
    history: state.history,
    isLoading: state.isLoading,
    error: state.error,

    // Actions
    fetchPreferences,
    updatePreferences: updatePreferencesMutation.mutate,
    isUpdatingPreferences: updatePreferencesMutation.isLoading,

    fetchHistory,
    sendTestEmail: sendTestEmailMutation.mutate,
    isSendingTestEmail: sendTestEmailMutation.isLoading,

    // Clear error
    clearError: () => setState(prev => ({ ...prev, error: null })),
  };
}