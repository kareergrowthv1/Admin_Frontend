import axios from '../../config/axios';

/**
 * Dashboard API — all calls go through API Gateway
 * Route: /api/admin/dashboard (gateway → AdminBackend on port 8002)
 */
export const dashboardAPI = {
  /**
   * Get summary stats for the dashboard (role-aware)
   */
  getStats: (organizationId) => axios.get(`/admins/dashboard/stats`, {
    params: { organizationId }
  }),

  /**
   * Get monthly trends for graphs (role-aware)
   */
  getTrends: (organizationId) => axios.get(`/admins/dashboard/trends`, {
    params: { organizationId }
  }),

  /**
   * Get team performance metrics
   */
  getTeamPerformance: (organizationId) => axios.get(`/admins/dashboard/team-performance`, {
    params: { organizationId }
  }),

  /**
   * Get team performance metrics
   */
  getTeamPerformance: (organizationId) => axios.get(`/admins/dashboard/team-performance`, {
    params: { organizationId }
  }),

  /**
   * Get recent items 2x2 grid
   */
  getRecentGrid: (organizationId, isCollege) => axios.get(`/admins/dashboard/recent-grid`, {
    params: { organizationId, isCollege }
  }),

  /**
   * Get recent activity logs
   */
  getRecentActivities: (organizationId, limit = 10) => axios.get(`/admins/activities`, {
    params: { organizationId, limit }
  }),

  /**
   * Get candidate status counts for radar chart
   */
  getCandidateStatus: (organizationId) => axios.get(`/admins/dashboard/candidate-status`, {
    params: { organizationId }
  })
};
