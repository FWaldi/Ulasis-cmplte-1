import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from '../contexts/ConfigContext';
import { AuthProvider } from '../contexts/AuthContext';
import { vi } from 'vitest';

// Create a custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ConfigProvider>
            {children}
          </ConfigProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything from RTL
export * from '@testing-library/react';
export { customRender as render };

// Mock IntersectionObserver
const intersectionObserverMock = () => ({
  observe: () => null,
  disconnect: () => null,
  unobserve: () => null,
});
window.IntersectionObserver = intersectionObserverMock;

// Mock ResizeObserver with better dimension handling
global.ResizeObserver = class ResizeObserver {
  observe() {
    // Mock dimensions for charts
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 0);
  }
  disconnect() {}
  unobserve() {}
};

// Mock getComputedStyle to return proper dimensions for chart containers
const originalGetComputedStyle = window.getComputedStyle;
window.getComputedStyle = (element: any, ...args: any[]) => {
  const style = originalGetComputedStyle(element, ...args);
  
  // If it's a chart container, provide default dimensions
  if (element && element.className && typeof element.className === 'string' && element.className.includes('recharts-responsive-container')) {
    return {
      ...style,
      width: '400px',
      height: '300px',
      getPropertyValue: (prop: string) => {
        if (prop === 'width') return '400px';
        if (prop === 'height') return '300px';
        return style.getPropertyValue(prop);
      }
    };
  }
  
  return style;
};

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => null,
    removeListener: () => null,
    addEventListener: () => null,
    removeEventListener: () => null,
    dispatchEvent: () => null,
  })),
});

// Mock Recharts ResponsiveContainer to provide dimensions
vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children, width, height, ...props }: any) => (
      <div 
        data-testid="recharts-responsive-container"
        style={{ width: width || 400, height: height || 300 }}
        {...props}
      >
        {children}
      </div>
    ),
  };
});