import React, { useState } from 'react';
import { Modal, Card, CardContent, CardHeader, CardTitle } from './common/Modal';
import { apiService } from '../services/api/apiService';

interface UpgradePromptProps {
  isOpen: boolean;
  onClose: () => void;
  limitType: 'questionnaires' | 'responses' | 'exports';
  currentUsage: number;
  limit: number;
  plan: string;
}

const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  isOpen,
  onClose,
  limitType,
  currentUsage,
  limit,
  plan
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const getLimitMessage = () => {
    switch (limitType) {
      case 'questionnaires':
        return `You've reached the limit of ${limit} questionnaires for your ${plan} plan.`;
      case 'responses':
        return `You've reached the limit of ${limit} responses for your ${plan} plan.`;
      case 'exports':
        return `You've reached the limit of ${limit} exports for your ${plan} plan.`;
      default:
        return 'You have reached a plan limit.';
    }
  };

  const getUpgradeOptions = () => {
    const options = [];

    if (plan === 'free') {
      options.push({
        plan: 'starter',
        price: 'IDR 99,000/month',
        benefits: [
          'Up to 5 questionnaires',
          'Up to 500 responses',
          'CSV export',
          'Email support'
        ]
      });
    }

    if (plan === 'free' || plan === 'starter') {
      options.push({
        plan: 'business',
        price: 'IDR 299,000/month',
        benefits: [
          'Unlimited questionnaires',
          'Unlimited responses',
          'CSV & Excel export',
          'Advanced analytics',
          'Priority support'
        ]
      });
    }

    return options;
  };

  const handleUpgradeRequest = async (targetPlan: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiService.post('/subscription/upgrade-request', {
        target_plan: targetPlan,
        reason: `Reached ${limitType} limit (${currentUsage}/${limit})`
      });

      if (response.success) {
        setSuccess(true);
        // Redirect to payment URL if provided
        if (response.data.payment_url) {
          window.location.href = response.data.payment_url;
        }
      } else {
        setError(response.error?.message || 'Failed to request upgrade');
      }
    } catch (err) {
      setError('Failed to process upgrade request');
      console.error('Upgrade request error:', err);
    } finally {
      setLoading(false);
    }
  };

  const upgradeOptions = getUpgradeOptions();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Upgrade Required">
      <div className="space-y-6">
        {/* Limit Reached Message */}
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
            <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Plan Limit Reached
          </h3>
          <p className="text-sm text-gray-600">
            {getLimitMessage()}
          </p>
          <p className="text-sm text-gray-600 mt-2">
            Current usage: <span className="font-medium">{currentUsage}</span> / {limit}
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">
                  Upgrade request submitted successfully!
                </p>
                <p className="text-sm text-green-700 mt-1">
                  You'll be redirected to complete payment through DANA.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Upgrade Options */}
        {!success && (
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900">Choose an upgrade option:</h4>
            {upgradeOptions.map((option, index) => (
              <Card key={index} className="border-2 hover:border-blue-300">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h5 className="text-lg font-medium text-gray-900 capitalize">
                        {option.plan} Plan
                      </h5>
                      <p className="text-sm text-gray-600">{option.price}</p>
                      <ul className="mt-2 text-sm text-gray-600">
                        {option.benefits.map((benefit, idx) => (
                          <li key={idx} className="flex items-center">
                            <svg className="h-4 w-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <button
                      onClick={() => handleUpgradeRequest(option.plan)}
                      disabled={loading}
                      className="ml-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Processing...' : 'Upgrade'}
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            {success ? 'Close' : 'Cancel'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default UpgradePrompt;