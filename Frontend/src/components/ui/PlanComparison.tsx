import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './common/Modal';
import { apiService } from '../services/api/apiService';

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

interface PlanComparisonProps {
  currentPlan?: string;
  onPlanSelect?: (plan: string) => void;
}

const PlanComparison: React.FC<PlanComparisonProps> = ({ currentPlan, onPlanSelect }) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/subscription/plans');
      if (response.success) {
        setPlans(response.data.plans);
      }
    } catch (error) {
      console.error('Failed to fetch plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatLimit = (limit: number | null) => {
    return limit === null ? 'Unlimited' : limit.toString();
  };

  const formatPrice = (price: number, currency: string) => {
    if (price === 0) return 'Free';
    return `${currency} ${price.toLocaleString()}`;
  };

  const getPlanColor = (planName: string) => {
    switch (planName) {
      case 'free': return 'border-gray-200';
      case 'starter': return 'border-blue-200 bg-blue-50';
      case 'business': return 'border-green-200 bg-green-50';
      default: return 'border-gray-200';
    }
  };

  const getButtonStyle = (planName: string) => {
    if (planName === currentPlan) {
      return 'bg-gray-100 text-gray-500 cursor-not-allowed';
    }

    switch (planName) {
      case 'free': return 'bg-gray-600 hover:bg-gray-700 text-white';
      case 'starter': return 'bg-blue-600 hover:bg-blue-700 text-white';
      case 'business': return 'bg-green-600 hover:bg-green-700 text-white';
      default: return 'bg-gray-600 hover:bg-gray-700 text-white';
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-6"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Choose Your Plan</h2>
        <p className="mt-2 text-gray-600">Select the plan that best fits your needs</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card key={plan.name} className={`relative ${getPlanColor(plan.name)} ${plan.name === 'business' ? 'transform scale-105' : ''}`}>
            <CardHeader>
              <CardTitle className="text-center">
                <div className="text-xl font-bold capitalize">{plan.name}</div>
                <div className="text-3xl font-bold text-gray-900 mt-2">
                  {formatPrice(plan.price, plan.currency)}
                  {plan.price > 0 && <span className="text-sm font-normal text-gray-600">/month</span>}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Limits */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Limits</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Questionnaires:</span>
                    <span className="font-medium">{formatLimit(plan.limits.questionnaires)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Responses:</span>
                    <span className="font-medium">{formatLimit(plan.limits.responses)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Exports:</span>
                    <span className="font-medium">{formatLimit(plan.limits.exports)}</span>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Features</h4>
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm">
                      <svg className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l1.414-1.414L8 10.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {feature.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Additional Info */}
              <div className="text-xs text-gray-500 space-y-1">
                <div>✓ Unlimited data retention</div>
                <div>✓ Email support</div>
                {plan.name === 'business' && <div>✓ Priority support</div>}
              </div>

              {/* Action Button */}
              <button
                onClick={() => onPlanSelect?.(plan.name)}
                disabled={plan.name === currentPlan}
                className={`w-full py-2 px-4 rounded-md text-sm font-medium transition-colors ${getButtonStyle(plan.name)}`}
              >
                {plan.name === currentPlan ? 'Current Plan' : `Choose ${plan.name.charAt(0).toUpperCase() + plan.name.slice(1)}`}
              </button>
            </CardContent>

            {/* Popular Badge */}
            {plan.name === 'business' && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-green-600 text-white text-xs px-3 py-1 rounded-full font-medium">
                  Most Popular
                </span>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Footer Note */}
      <div className="text-center text-sm text-gray-600">
        <p>All plans include unlimited data retention and basic analytics.</p>
        <p className="mt-1">Prices are in Indonesian Rupiah (IDR) and billed monthly.</p>
      </div>
    </div>
  );
};

export default PlanComparison;