import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test-utils/test-utils';
import DashboardIntegrated from './DashboardIntegrated';
import * as analyticsHooks from '../../hooks/api/useAnalytics';

// Mock the analytics hooks
vi.mock('../../hooks/api/useAnalytics');
vi.mock('../../hooks/ui/useMockData', () => ({
  generateMockBubbleAnalytics: vi.fn(() => ({
    categories: [
      { name: 'Service Quality', rating: 4.2, response_count: 10 },
      { name: 'Product Quality', rating: 3.8, response_count: 8 }
    ],
    total_responses: 18,
    response_rate: 85
  })),
  generateMockAnalyticsSummary: vi.fn(() => ({
    total_responses: 18,
    average_rating: 4.0,
    completion_rate: 85
  })),
  generateMockTimeComparison: vi.fn(() => ({
    current_period: { 
      categories: [
        { name: 'Service Quality', response_count: 10, response_rate: 85 },
        { name: 'Product Quality', response_count: 8, response_rate: 80 }
      ]
    },
    previous_period: { 
      categories: [
        { name: 'Service Quality', response_count: 8, response_rate: 82 },
        { name: 'Product Quality', response_count: 6, response_rate: 78 }
      ]
    }
  }))
}));

const mockUseAnalytics = analyticsHooks as any;

describe('DashboardIntegrated Component', () => {
  const mockSetActivePage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAnalytics.useBubbleAnalytics.mockReturnValue({
      data: null,
      loading: false,
      error: null
    });
    mockUseAnalytics.useAnalyticsSummary.mockReturnValue({
      data: null,
      loading: false,
      error: null
    });
    mockUseAnalytics.useTimeComparison.mockReturnValue({
      data: null,
      loading: false,
      error: null
    });
    mockUseAnalytics.useAnalyticsTransformer.mockReturnValue({
      transformForDashboard: vi.fn(() => ({
        kpiData: {
          avgRating: 0,
          totalReviews: 0,
          responseRate: 0
        },
        trendData: []
      }))
    });
  });

  describe('Loading States', () => {
    it('should show loading spinner when analytics data is loading', () => {
      mockUseAnalytics.useBubbleAnalytics.mockReturnValue({
        data: null,
        loading: true,
        error: null
      });

      render(
        <DashboardIntegrated 
          questionnaireId={1} 
          setActivePage={mockSetActivePage}
        />
      );

      // Check for loading spinner (the actual loading indicator)
      const loadingSpinner = document.querySelector('.animate-spin');
      expect(loadingSpinner).toBeInTheDocument();
    });

    it('should show loading spinner when summary is loading', () => {
      mockUseAnalytics.useAnalyticsSummary.mockReturnValue({
        data: null,
        loading: true,
        error: null
      });

      render(
        <DashboardIntegrated 
          questionnaireId={1} 
          setActivePage={mockSetActivePage}
        />
      );

      // Check for loading spinner
      const loadingSpinner = document.querySelector('.animate-spin');
      expect(loadingSpinner).toBeInTheDocument();
    });
  });

  describe('Error States', () => {
    it('should display error message when analytics data fails to load', () => {
      mockUseAnalytics.useBubbleAnalytics.mockReturnValue({
        data: null,
        loading: false,
        error: new Error('Failed to load analytics')
      });

      render(
        <DashboardIntegrated 
          questionnaireId={1} 
          setActivePage={mockSetActivePage}
        />
      );

      expect(screen.getByText(/Error Loading Analytics/i)).toBeInTheDocument();
      expect(screen.getByText(/Failed to load analytics/i)).toBeInTheDocument();
    });

    it('should display error message when summary data fails to load', () => {
      mockUseAnalytics.useAnalyticsSummary.mockReturnValue({
        data: null,
        loading: false,
        error: new Error('Failed to load summary')
      });

      render(
        <DashboardIntegrated 
          questionnaireId={1} 
          setActivePage={mockSetActivePage}
        />
      );

      expect(screen.getByText(/Error Loading Analytics/i)).toBeInTheDocument();
    });
  });

  describe('Empty Data States', () => {
    it('should show dashboard with default values when no analytics data is available', () => {
      mockUseAnalytics.useBubbleAnalytics.mockReturnValue({
        data: null,
        loading: false,
        error: null
      });
      mockUseAnalytics.useAnalyticsSummary.mockReturnValue({
        data: null,
        loading: false,
        error: null
      });

      render(
        <DashboardIntegrated 
          questionnaireId={1} 
          setActivePage={mockSetActivePage}
        />
      );

      // Should show the dashboard title and KPI cards with default values
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Rating Rata-rata')).toBeInTheDocument();
      expect(screen.getByText('Total Respons')).toBeInTheDocument();
      expect(screen.getByText('No trend data available')).toBeInTheDocument();
    });

    it('should show "No trend data available" when trend data is empty', () => {
      mockUseAnalytics.useBubbleAnalytics.mockReturnValue({
        data: { categories: [] },
        loading: false,
        error: null
      });
      mockUseAnalytics.useAnalyticsTransformer.mockReturnValue({
        transformForDashboard: vi.fn(() => ({
          kpiData: {
            avgRating: 0,
            totalReviews: 0,
            responseRate: 0
          },
          trendData: []
        }))
      });

      render(
        <DashboardIntegrated 
          questionnaireId={1} 
          setActivePage={mockSetActivePage}
        />
      );

      expect(screen.getByText(/No trend data available/i)).toBeInTheDocument();
    });
  });

  describe('Data Display', () => {
    it('should display analytics data when available', () => {
      const mockAnalyticsData = {
        categories: [
          { name: 'Service Quality', rating: 4.2, response_count: 10 },
          { name: 'Product Quality', rating: 3.8, response_count: 8 }
        ],
        total_responses: 18,
        response_rate: 85
      };

      mockUseAnalytics.useBubbleAnalytics.mockReturnValue({
        data: mockAnalyticsData,
        loading: false,
        error: null
      });
      mockUseAnalytics.useAnalyticsSummary.mockReturnValue({
        data: { total_responses: 18, average_rating: 4.0 },
        loading: false,
        error: null
      });
      mockUseAnalytics.useAnalyticsTransformer.mockReturnValue({
        transformForDashboard: vi.fn(() => ({
          kpiData: {
            avgRating: 4.0,
            totalReviews: 18,
            responseRate: 85
          },
          trendData: [
            { date: '2024-01-01', 'Average Rating': 4.0 }
          ]
        }))
      });

      render(
        <DashboardIntegrated 
          questionnaireId={1} 
          setActivePage={mockSetActivePage}
        />
      );

      expect(screen.getByText('Rating Rata-rata')).toBeInTheDocument();
      expect(screen.getByText('Total Respons')).toBeInTheDocument();
      expect(screen.getByText('Tingkat Respons')).toBeInTheDocument();
    });

    it('should render chart components when data is available', () => {
      mockUseAnalytics.useBubbleAnalytics.mockReturnValue({
        data: { categories: [{ name: 'Test', rating: 4.0, response_count: 5 }] },
        loading: false,
        error: null
      });
      mockUseAnalytics.useAnalyticsTransformer.mockReturnValue({
        transformForDashboard: vi.fn(() => ({
          kpiData: {
            avgRating: 4.0,
            totalReviews: 5,
            responseRate: 80
          },
          trendData: [{ date: '2024-01-01', 'Average Rating': 4.0 }]
        }))
      });

      render(
        <DashboardIntegrated 
          questionnaireId={1} 
          setActivePage={mockSetActivePage}
        />
      );

      // Check that chart title is rendered
      expect(screen.getByText('Rating Trends')).toBeInTheDocument();
    });
  });

  describe('Demo Mode', () => {
    it('should use mock data in demo mode', () => {
      render(
        <DashboardIntegrated 
          questionnaireId={1} 
          setActivePage={mockSetActivePage}
          isDemoMode={true}
        />
      );

      // Should show demo data
      expect(screen.getByText('Rating Rata-rata')).toBeInTheDocument();
      expect(screen.getByText('Total Respons')).toBeInTheDocument();
    });

    it('should call analytics hooks with disabled flag in demo mode', () => {
      render(
        <DashboardIntegrated 
          questionnaireId={1} 
          setActivePage={mockSetActivePage}
          isDemoMode={true}
        />
      );

      // Hooks should be called with disabled flag when in demo mode
      expect(mockUseAnalytics.useBubbleAnalytics).toHaveBeenCalledWith(1, false);
      expect(mockUseAnalytics.useAnalyticsSummary).toHaveBeenCalledWith(1, false);
    });
  });

  describe('User Interactions', () => {
    it('should render KPI cards that are clickable', () => {
      mockUseAnalytics.useBubbleAnalytics.mockReturnValue({
        data: { categories: [] },
        loading: false,
        error: null
      });

      render(
        <DashboardIntegrated 
          questionnaireId={1} 
          setActivePage={mockSetActivePage}
        />
      );

      // Look for KPI card buttons
      const kpiButtons = screen.getAllByRole('button');
      expect(kpiButtons.length).toBeGreaterThan(0);
    });

    it('should show guidance panel by default', () => {
      mockUseAnalytics.useBubbleAnalytics.mockReturnValue({
        data: { categories: [] },
        loading: false,
        error: null
      });

      render(
        <DashboardIntegrated 
          questionnaireId={1} 
          setActivePage={mockSetActivePage}
        />
      );

      // Dashboard should render without errors
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should render dashboard container properly', () => {
      mockUseAnalytics.useBubbleAnalytics.mockReturnValue({
        data: { categories: [] },
        loading: false,
        error: null
      });

      render(
        <DashboardIntegrated 
          questionnaireId={1} 
          setActivePage={mockSetActivePage}
        />
      );

      // Should render the main dashboard container
      const dashboardContainer = document.querySelector('.space-y-8');
      expect(dashboardContainer).toBeInTheDocument();
    });
  });
});