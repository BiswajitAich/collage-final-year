import { sleep } from '@/lib/utils';
import { MOCK_LATENCY } from '@/lib/constants';
import {
  mockDashboardStats, mockRecentActivity, mockAISuggestions,
  mockWorkflowUsageTimeSeries, mockSuccessRateTimeSeries,
  mockEndpointCallsTimeSeries, mockVoiceSessionsTimeSeries
} from './mock-data/dashboard.data';
import type { DashboardStats, RecentActivity, AISuggestion, TimeSeriesDataPoint } from '@/lib/types';

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    await sleep(MOCK_LATENCY.fast);
    return mockDashboardStats;
  },

  async getRecentActivity(limit = 8): Promise<RecentActivity[]> {
    await sleep(MOCK_LATENCY.fast);
    return mockRecentActivity.slice(0, limit);
  },

  async getAISuggestions(): Promise<AISuggestion[]> {
    await sleep(MOCK_LATENCY.medium);
    return mockAISuggestions;
  },

  async getWorkflowUsageSeries(days = 30): Promise<TimeSeriesDataPoint[]> {
    await sleep(MOCK_LATENCY.fast);
    return mockWorkflowUsageTimeSeries.slice(-days);
  },

  async getSuccessRateSeries(days = 30): Promise<TimeSeriesDataPoint[]> {
    await sleep(MOCK_LATENCY.fast);
    return mockSuccessRateTimeSeries.slice(-days);
  },

  async getEndpointCallsSeries(days = 30): Promise<TimeSeriesDataPoint[]> {
    await sleep(MOCK_LATENCY.fast);
    return mockEndpointCallsTimeSeries.slice(-days);
  },

  async getVoiceSessionsSeries(days = 30): Promise<TimeSeriesDataPoint[]> {
    await sleep(MOCK_LATENCY.fast);
    return mockVoiceSessionsTimeSeries.slice(-days);
  },
};
