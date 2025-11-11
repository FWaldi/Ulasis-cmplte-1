import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { honestAnalyticsApi, safeApiCall, SubscriptionStatusResponse } from '../services/honestAnalyticsApi';

// Types
export type DemoPlan = 'gratis' | 'starter' | 'bisnis';
export type SubscriptionPlan = 'free' | 'starter' | 'business';

export interface SubscriptionFeatures {
    sentimentAnalysis: boolean;
    actionableInsights: boolean;
    realTimeAnalytics: boolean;
    customerJourney: boolean;
}

export interface UsageStats {
    daily: {
        current: number;
        limit: number;
        remaining: number;
    };
    monthly: {
        current: number;
        limit: number;
        remaining: number;
    };
}

export interface SubscriptionContextType {
    // Subscription state
    isDemoMode: boolean;
    demoPlan: DemoPlan;
    subscriptionPlan: SubscriptionPlan;
    features: SubscriptionFeatures;
    usage: UsageStats;
    loading: boolean;
    error: string | null;
    
    // Actions
    setDemoMode: (enabled: boolean, plan?: DemoPlan) => void;
    setDemoPlan: (plan: DemoPlan) => void;
    refreshSubscriptionStatus: () => Promise<void>;
    checkFeatureAccess: (feature: keyof SubscriptionFeatures) => boolean;
    getUpgradeMessage: (feature: keyof SubscriptionFeatures) => string;
}

// Demo plan configurations
const demoPlanConfigs = {
    gratis: {
        features: {
            sentimentAnalysis: true,
            actionableInsights: false,
            realTimeAnalytics: false,
            customerJourney: false,
        },
        usage: {
            daily: { current: 0, limit: 10, remaining: 10 },
            monthly: { current: 0, limit: 100, remaining: 100 },
        }
    },
    starter: {
        features: {
            sentimentAnalysis: true,
            actionableInsights: true,
            realTimeAnalytics: false,
            customerJourney: false,
        },
        usage: {
            daily: { current: 0, limit: 100, remaining: 100 },
            monthly: { current: 0, limit: 1000, remaining: 1000 },
        }
    },
    bisnis: {
        features: {
            sentimentAnalysis: true,
            actionableInsights: true,
            realTimeAnalytics: true,
            customerJourney: true,
        },
        usage: {
            daily: { current: 0, limit: -1, remaining: -1 }, // Unlimited
            monthly: { current: 0, limit: -1, remaining: -1 }, // Unlimited
        }
    }
};

// Create context
const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

// Provider component
export const SubscriptionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isDemoMode, setIsDemoModeState] = useState(false);
    const [demoPlan, setDemoPlanState] = useState<DemoPlan>('bisnis');
    const [subscriptionPlan, setSubscriptionPlan] = useState<SubscriptionPlan>('free');
    const [features, setFeatures] = useState<SubscriptionFeatures>({
        sentimentAnalysis: true,
        actionableInsights: false,
        realTimeAnalytics: false,
        customerJourney: false,
    });
    const [usage, setUsage] = useState<UsageStats>({
        daily: { current: 0, limit: 10, remaining: 10 },
        monthly: { current: 0, limit: 100, remaining: 100 },
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Refresh subscription status from backend
    const refreshSubscriptionStatus = async () => {
        if (isDemoMode) {
            // Use demo configuration
            const config = demoPlanConfigs[demoPlan];
            setFeatures(config.features);
            setUsage(config.usage);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await safeApiCall(
                () => honestAnalyticsApi.getSubscriptionStatus(),
                {
                    success: true,
                    data: {
                        plan: 'free' as SubscriptionPlan,
                        features: {
                            sentimentAnalysis: true,
                            actionableInsights: false,
                            realTimeAnalytics: false,
                            customerJourney: false,
                        },
                        usage: {
                            daily: { current: 0, limit: 10, remaining: 10 },
                            monthly: { current: 0, limit: 100, remaining: 100 },
                        }
                    }
                }
            );

            if (response.success) {
                setSubscriptionPlan(response.data.plan);
                setFeatures(response.data.features);
                setUsage(response.data.usage);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Gagal memuat status berlangganan');
            console.error('Subscription status error:', err);
        } finally {
            setLoading(false);
        }
    };

    // Set demo mode
    const setDemoMode = (enabled: boolean, plan: DemoPlan = 'gratis') => {
        setIsDemoModeState(enabled);
        if (enabled) {
            setDemoPlanState(plan);
            const config = demoPlanConfigs[plan];
            setFeatures(config.features);
            setUsage(config.usage);
        }
    };

    // Set demo plan
    const setDemoPlan = (plan: DemoPlan) => {
        setDemoPlanState(plan);
        if (isDemoMode) {
            const config = demoPlanConfigs[plan];
            setFeatures(config.features);
            setUsage(config.usage);
        }
    };

    // Check feature access
    const checkFeatureAccess = (feature: keyof SubscriptionFeatures): boolean => {
        return features[feature];
    };

    // Get upgrade message for features
    const getUpgradeMessage = (feature: keyof SubscriptionFeatures): string => {
        if (isDemoMode) {
            switch (demoPlan) {
                case 'gratis':
                    switch (feature) {
                        case 'actionableInsights':
                            return 'Tingkatkan ke STARTER untuk mengakses Wawasan Tindakan.';
                        case 'realTimeAnalytics':
                            return 'Tingkatkan ke BISNIS untuk mengakses Analitik Real-Time.';
                        case 'customerJourney':
                            return 'Tingkatkan ke BISNIS untuk mengakses Analisis Perjalanan Pelanggan.';
                        default:
                            return 'Fitur tidak tersedia di paket Gratis.';
                    }
                case 'starter':
                    switch (feature) {
                        case 'realTimeAnalytics':
                            return 'Tingkatkan ke BISNIS untuk mengakses Analitik Real-Time.';
                        case 'customerJourney':
                            return 'Tingkatkan ke BISNIS untuk mengakses Analisis Perjalanan Pelanggan.';
                        default:
                            return 'Fitur tidak tersedia di paket Starter.';
                    }
                default:
                    return 'Fitur sudah tersedia di paket Bisnis.';
            }
        } else {
            switch (subscriptionPlan) {
                case 'free':
                    switch (feature) {
                        case 'actionableInsights':
                            return 'Tingkatkan ke Starter untuk mengakses Wawasan Tindakan.';
                        case 'realTimeAnalytics':
                            return 'Tingkatkan ke Business untuk mengakses Analitik Real-Time.';
                        case 'customerJourney':
                            return 'Tingkatkan ke Business untuk mengakses Analisis Perjalanan Pelanggan.';
                        default:
                            return 'Fitur tidak tersedia di paket Free.';
                    }
                case 'starter':
                    switch (feature) {
                        case 'realTimeAnalytics':
                            return 'Tingkatkan ke Business untuk mengakses Analitik Real-Time.';
                        case 'customerJourney':
                            return 'Tingkatkan ke Business untuk mengakses Analisis Perjalanan Pelanggan.';
                        default:
                            return 'Fitur tidak tersedia di paket Starter.';
                    }
                default:
                    return 'Fitur sudah tersedia di paket Business.';
            }
        }
    };

    // Load subscription status on mount
    useEffect(() => {
        refreshSubscriptionStatus();
    }, [isDemoMode, demoPlan]);

    const value: SubscriptionContextType = {
        // State
        isDemoMode,
        demoPlan,
        subscriptionPlan,
        features,
        usage,
        loading,
        error,
        
        // Actions
        setDemoMode,
        setDemoPlan,
        refreshSubscriptionStatus,
        checkFeatureAccess,
        getUpgradeMessage,
    };

    return (
        <SubscriptionContext.Provider value={value}>
            {children}
        </SubscriptionContext.Provider>
    );
};

// Hook to use subscription context
export const useSubscription = (): SubscriptionContextType => {
    const context = useContext(SubscriptionContext);
    if (context === undefined) {
        throw new Error('useSubscription must be used within a SubscriptionProvider');
    }
    return context;
};

// HOC to wrap components with subscription checks
export const withSubscriptionCheck = <P extends object>(
    Component: React.ComponentType<P>,
    requiredFeature: keyof SubscriptionFeatures
) => {
    return React.forwardRef<any, P>((props, ref) => {
        const { checkFeatureAccess, getUpgradeMessage } = useSubscription();
        const hasAccess = checkFeatureAccess(requiredFeature);

        if (!hasAccess) {
            return (
                <div className="flex items-center justify-center h-64 bg-white dark:bg-slate-800 rounded-xl shadow-md">
                    <div className="text-center p-6">
                        <div className="text-4xl mb-4">🔒</div>
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
                            Fitur Terkunci
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 mb-4">
                            {getUpgradeMessage(requiredFeature)}
                        </p>
                        <button className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90">
                            Tingkatkan Sekarang
                        </button>
                    </div>
                </div>
            );
        }

        return <Component {...props} ref={ref} />;
    });
};

export default SubscriptionContext;