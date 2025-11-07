import React, { useState } from 'react';
import { apiService } from '../services/api/apiService';

interface DanaPaymentButtonProps {
  targetPlan: string;
  amount: number;
  currency?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const DanaPaymentButton: React.FC<DanaPaymentButtonProps> = ({
  targetPlan,
  amount,
  currency = 'IDR',
  onSuccess,
  onError,
  disabled = false,
  className = '',
  children
}) => {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    if (disabled || loading) return;

    try {
      setLoading(true);

      const response = await apiService.post('/subscription/upgrade-request', {
        target_plan: targetPlan,
        reason: `Payment for ${targetPlan} plan upgrade`
      });

      if (response.success) {
        // Redirect to DANA payment URL
        if (response.data.payment_url) {
          window.location.href = response.data.payment_url;
        } else {
          onSuccess?.();
        }
      } else {
        const errorMessage = response.error?.message || 'Payment request failed';
        onError?.(errorMessage);
      }
    } catch (error) {
      const errorMessage = 'Failed to initiate payment';
      console.error('DANA payment error:', error);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return `${currency} ${amount.toLocaleString()}`;
  };

  return (
    <button
      onClick={handlePayment}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
    >
      {loading ? (
        <>
          <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Processing...
        </>
      ) : (
        <>
          {/* DANA Logo/Icon */}
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          {children || `Pay ${formatAmount(amount, currency)} with DANA`}
        </>
      )}
    </button>
  );
};

// Pre-configured components for different plans
export const DanaStarterPaymentButton: React.FC<Omit<DanaPaymentButtonProps, 'targetPlan' | 'amount'>> = (props) => (
  <DanaPaymentButton
    {...props}
    targetPlan="starter"
    amount={99000}
    currency="IDR"
  >
    Upgrade to Starter - IDR 99,000/month
  </DanaPaymentButton>
);

export const DanaBusinessPaymentButton: React.FC<Omit<DanaPaymentButtonProps, 'targetPlan' | 'amount'>> = (props) => (
  <DanaPaymentButton
    {...props}
    targetPlan="business"
    amount={299000}
    currency="IDR"
  >
    Upgrade to Business - IDR 299,000/month
  </DanaPaymentButton>
);

export default DanaPaymentButton;