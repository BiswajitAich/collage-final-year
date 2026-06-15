import {
  getDashboardStats, getRecentActivity, getAISuggestions,
  getWorkflowUsageSeries, getSuccessRateSeries,
} from '@/app/(dashboard)/dashboard/actions';
import type { DashboardStats, RecentActivity, AISuggestion, TimeSeriesDataPoint } from '@/lib/types';

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    return getDashboardStats();
  },

  async getRecentActivity(limit = 8): Promise<RecentActivity[]> {
    return getRecentActivity(limit);
  },

  async getAISuggestions(): Promise<AISuggestion[]> {
    return getAISuggestions();
  },

  async getWorkflowUsageSeries(days = 30): Promise<TimeSeriesDataPoint[]> {
    return getWorkflowUsageSeries(days);
  },

  async getSuccessRateSeries(days = 30): Promise<TimeSeriesDataPoint[]> {
    return getSuccessRateSeries(days);
  },

  async getEndpointCallsSeries(_days = 30): Promise<TimeSeriesDataPoint[]> {
    return [];
  },

  async getVoiceSessionsSeries(_days = 30): Promise<TimeSeriesDataPoint[]> {
    return [];
  },
};
