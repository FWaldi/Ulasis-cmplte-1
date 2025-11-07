import { vi } from 'vitest';

// Performance monitoring utilities
export class PerformanceMonitor {
  private renders: Map<string, number> = new Map();
  private startTimes: Map<string, number> = new Map();

  startRender(componentName: string) {
    this.startTimes.set(componentName, performance.now());
  }

  endRender(componentName: string) {
    const startTime = this.startTimes.get(componentName);
    if (startTime) {
      const duration = performance.now() - startTime;
      const currentCount = this.renders.get(componentName) || 0;
      this.renders.set(componentName, currentCount + 1);
      this.startTimes.delete(componentName);
      return duration;
    }
    return 0;
  }

  getRenderCount(componentName: string): number {
    return this.renders.get(componentName) || 0;
  }

  getAllRenderCounts(): Record<string, number> {
    return Object.fromEntries(this.renders);
  }

  reset() {
    this.renders.clear();
    this.startTimes.clear();
  }

  // Assert render count doesn't exceed threshold
  expectMaxRenders(componentName: string, maxRenders: number) {
    const count = this.getRenderCount(componentName);
    if (count > maxRenders) {
      throw new Error(
        `Component "${componentName}" rendered ${count} times, expected at most ${maxRenders}`
      );
    }
  }

  // Assert render time doesn't exceed threshold (ms)
  expectMaxRenderTime(componentName: string, maxTime: number) {
    // This would need to be implemented with actual timing data
    // For now, just a placeholder
  }
}

// Mock performance API for testing
export const mockPerformance = {
  now: vi.fn(() => Date.now()),
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByName: vi.fn(() => []),
  getEntriesByType: vi.fn(() => []),
};

// Replace global performance with mock
Object.defineProperty(window, 'performance', {
  value: mockPerformance,
  writable: true,
});

// React render tracking HOC
export const trackRenders = (componentName: string) => {
  return (WrappedComponent: React.ComponentType<any>) => {
    let renderCount = 0;
    
    return (props: any) => {
      renderCount++;
      console.log(`${componentName} render #${renderCount}`);
      return <WrappedComponent {...props} />;
    };
  };
};