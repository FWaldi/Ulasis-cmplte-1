import { useState, useEffect, useCallback } from 'react';
import apiService from '../../services/api/apiService';

// Generic API hook for GET requests
export const useQuery = useApi;
export function useApi<T>(
    url: string | null,
    options?: {
        enabled?: boolean;
        params?: Record<string, any>;
        refetchInterval?: number;
    }
) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!url || !options?.enabled) return;

        setLoading(true);
        setError(null);
        try {
            const response = await apiService.axiosInstance.get(url, { params: options.params });
            setData(response.data);
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    }, [url, options?.enabled]);

    useEffect(() => {
        fetchData();
        if (options?.refetchInterval) {
            const interval = setInterval(fetchData, options.refetchInterval);
            return () => clearInterval(interval);
        }
    }, [url, options?.enabled, options?.refetchInterval]);

    const refetch = useCallback(() => {
        fetchData();
    }, [fetchData]);

    return { data, loading, error, refetch };
}

// Generic mutation hook for POST/PUT/DELETE
export function useMutation<TData, TVariables>(
    mutationFn: (variables: TVariables) => Promise<TData>
) {
    const [data, setData] = useState<TData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mutate = useCallback(async (variables: TVariables) => {
        setLoading(true);
        setError(null);
        try {
            const result = await mutationFn(variables);
            setData(result);
            return result;
        } catch (err: any) {
            setError(err.message || 'An error occurred');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [mutationFn]);

    return { mutate, data, loading, error };
}

// Real-time hook with polling
export function useRealTime<T>(
    url: string,
    interval: number = 30000,
    enabled: boolean = true
) {
    return useApi<T>(url, {
        enabled,
        refetchInterval: interval,
    });
}

// Download hook for file downloads
export function useDownload() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const download = useCallback(async (url: string, filename: string) => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiService.axiosInstance.get(url, {
                responseType: 'blob',
            });
            const blob = new Blob([response.data]);
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
        } catch (err: any) {
            setError(err.message || 'Download failed');
        } finally {
            setLoading(false);
        }
    }, []);

    return { download, loading, error };
}

// Form hook for validation and state management
export function useForm<T extends Record<string, any>>(
    initialValues: T,
    validate?: (values: T) => Record<string, string>
) {
    const [values, setValues] = useState<T>(initialValues);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    const setValue = useCallback((field: keyof T, value: any) => {
        setValues(prev => ({ ...prev, [field]: value }));
        if (touched[field] && validate) {
            const validationErrors = validate({ ...values, [field]: value });
            setErrors(prev => ({ ...prev, [field]: validationErrors[field] || '' }));
        }
    }, [values, touched, validate]);

    const touchField = useCallback((field: keyof T) => {
        setTouched(prev => ({ ...prev, [field]: true }));
        if (validate) {
            const validationErrors = validate(values);
            setErrors(prev => ({ ...prev, [field]: validationErrors[field] || '' }));
        }
    }, [values, validate]);

    const validateForm = useCallback(() => {
        if (!validate) return true;
        const validationErrors = validate(values);
        setErrors(validationErrors);
        setTouched(Object.keys(values).reduce((acc, key) => ({ ...acc, [key]: true }), {}));
        return Object.keys(validationErrors).length === 0;
    }, [values, validate]);

    const reset = useCallback(() => {
        setValues(initialValues);
        setErrors({});
        setTouched({});
    }, [initialValues]);

    return {
        values,
        errors,
        touched,
        setValue,
        setTouched,
        validateForm,
        reset,
        isValid: Object.keys(errors).length === 0,
    };
}