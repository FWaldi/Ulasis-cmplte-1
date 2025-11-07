import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ConfigContextType {
  apiBaseUrl: string;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  appVersion: string;
  environment: 'development' | 'staging' | 'production';
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

interface ConfigProviderProps {
  children: ReactNode;
}

export const ConfigProvider: React.FC<ConfigProviderProps> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const newMode = !prev;
      if (typeof window !== 'undefined') {
        if (newMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
      return newMode;
    });
  };

  const value: ConfigContextType = {
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3010/api/v1',
    isDarkMode,
    toggleDarkMode,
    appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
    environment: (import.meta.env.VITE_ENVIRONMENT as 'development' | 'staging' | 'production') || 'development',
  };

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = (): ConfigContextType => {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};