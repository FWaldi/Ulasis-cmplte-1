import { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import apiService from '../../services/api/apiService';
import { User, AuthState, RegisterData } from '../../types';

// Auth context
const AuthContext = createContext<{
    authState: AuthState;
    login: (credentials: { email: string; password: string }) => Promise<void>;
    register: (userData: RegisterData) => Promise<void>;
    logout: () => void;
    refreshAuth: () => Promise<void>;
} | null>(null);

// Auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
    const [authState, setAuthState] = useState<AuthState>({
        user: null,
        isAuthenticated: false,
        isLoading: true,
        error: null,
    });

    // Check for existing token on mount
    useEffect(() => {
        let token;
        try {
            token = localStorage.getItem('accessToken');
        } catch (error) {
            console.warn('localStorage getItem failed:', error);
            token = null;
        }
        if (token) {
            // Validate token by making a request with timeout
            const refreshPromise = refreshAuth();
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Auth refresh timeout')), 5000)
            );
            Promise.race([refreshPromise, timeoutPromise])
                .catch(() => {
                    // If refresh fails or times out, logout and set loading to false
                    logout();
                });
        } else {
            setAuthState(prev => ({ ...prev, isLoading: false }));
        }
    }, []);

    const login = async (credentials: { email: string; password: string }) => {
        setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
        try {
            const response = await apiService.login(credentials);
            setAuthState({
                user: response.user,
                isAuthenticated: true,
                isLoading: false,
                error: null,
            });
        } catch (error: any) {
            setAuthState(prev => ({
                ...prev,
                isLoading: false,
                error: error.message || 'Login failed',
            }));
            throw error;
        }
    };

    const register = async (userData: RegisterData) => {
        setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
        try {
            const response = await apiService.register(userData);
            setAuthState({
                user: response.user,
                isAuthenticated: true,
                isLoading: false,
                error: null,
            });
        } catch (error: any) {
            setAuthState(prev => ({
                ...prev,
                isLoading: false,
                error: error.message || 'Registration failed',
            }));
            throw error;
        }
    };

    const logout = () => {
        apiService.logout();
        setAuthState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
        });
    };

    const refreshAuth = async () => {
        try {
            // First try to refresh the token
            await apiService.refreshToken();

            // Try to get user from localStorage first (faster)
            let user = null;
            try {
                const storedUser = localStorage.getItem('user');
                if (storedUser) {
                    const userData = JSON.parse(storedUser);
                    user = {
                        id: userData.id,
                        email: userData.email,
                        firstName: userData.first_name || userData.firstName,
                        lastName: userData.last_name || userData.lastName,
                        businessName: userData.business_name || userData.businessName,
                        subscriptionPlan: userData.subscription_plan || userData.subscriptionPlan,
                    };
                }
            } catch (error) {
                console.warn('Failed to parse stored user:', error);
            }

            // If no user in localStorage, fetch from API
            if (!user) {
                const profileResponse = await apiService.getProfile();
                const userData = profileResponse.data?.data || profileResponse.data || profileResponse;
                user = {
                    id: userData.id,
                    email: userData.email,
                    firstName: userData.first_name,
                    lastName: userData.last_name,
                    businessName: userData.business_name,
                    subscriptionPlan: userData.subscription_plan,
                };
                // Update localStorage with fresh user data
                try {
                    localStorage.setItem('user', JSON.stringify(userData));
                } catch (error) {
                    console.warn('Failed to store user in localStorage:', error);
                }
            }

            setAuthState({
                user,
                isAuthenticated: true,
                isLoading: false,
                error: null,
            });
        } catch (error) {
            console.error('Auth refresh failed:', error);
            logout();
        }
    };

    return (
        <AuthContext.Provider value={{ authState, login, register, logout, refreshAuth }}>
            {children}
        </AuthContext.Provider>
    );
}

// Main auth hook
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

// Subscription hook for feature gating
export function useSubscription() {
    const { authState } = useAuth();
    let isDemoMode = false;
    try {
        isDemoMode = localStorage.getItem('isDemoMode') === 'true';
    } catch (error) {
        console.warn('localStorage getItem failed:', error);
    }

    const hasFeature = (feature: string) => {
        if (isDemoMode) {
            // Demo mode has all features
            return true;
        }
        if (!authState.user) return false;

        const plan = authState.user.subscriptionPlan;
        const features = {
            free: ['basic-analytics'],
            starter: ['basic-analytics', 'export-csv', 'qr-codes'],
            business: ['basic-analytics', 'export-csv', 'export-excel', 'qr-codes', 'advanced-analytics', 'custom-branding'],
        };

        return features[plan]?.includes(feature) || false;
    };

    const canExport = (format: 'csv' | 'excel') => {
        if (format === 'csv') return hasFeature('export-csv');
        return hasFeature('export-excel');
    };

    return {
        plan: isDemoMode ? 'business' : (authState.user?.subscriptionPlan || 'free'),
        hasFeature,
        canExport,
        isBusiness: authState.user?.subscriptionPlan === 'business',
        isStarter: authState.user?.subscriptionPlan === 'starter',
    };
}

// Protected route hook
export function useRequireAuth() {
    const { authState } = useAuth();

    useEffect(() => {
        if (!authState.isLoading && !authState.isAuthenticated) {
            // Redirect to login or show error
            window.location.href = '/login';
        }
    }, [authState.isLoading, authState.isAuthenticated]);

    return {
        isLoading: authState.isLoading,
        isAuthenticated: authState.isAuthenticated,
        user: authState.user,
    };
}

// Permissions hook for role-based access
export function usePermissions() {
    const { authState } = useAuth();

    const hasPermission = (permission: string) => {
        if (!authState.user) return false;

        // Define permissions based on subscription plan
        const permissions = {
            free: ['read:own-data'],
            starter: ['read:own-data', 'create:questionnaire', 'export:basic'],
            business: ['read:own-data', 'create:questionnaire', 'export:advanced', 'manage:qr-codes', 'analytics:advanced'],
        };

        return permissions[authState.user.subscriptionPlan]?.includes(permission) || false;
    };

    const canManageQuestionnaires = () => hasPermission('create:questionnaire');
    const canExportAdvanced = () => hasPermission('export:advanced');
    const canManageQRCodes = () => hasPermission('manage:qr-codes');
    const canViewAdvancedAnalytics = () => hasPermission('analytics:advanced');

    return {
        hasPermission,
        canManageQuestionnaires,
        canExportAdvanced,
        canManageQRCodes,
        canViewAdvancedAnalytics,
        isAdmin: false, // No admin role in current system
    };
}