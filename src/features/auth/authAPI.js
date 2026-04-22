import axios from '../../config/axios';
import baseAxios from 'axios';
import { AUTH_API_BASE_URL, JAVA_AUTH_BASE_URL } from '../../utils/constants';

const authClient = baseAxios.create({
  baseURL: AUTH_API_BASE_URL,
  timeout: 10000,
  withCredentials: true,
});

const passwordResetClient = baseAxios.create({
  baseURL: JAVA_AUTH_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

export const authAPI = {
  login: (credentials) => axios.post(`${AUTH_API_BASE_URL}/auth-session/login`, credentials),
  logout: () => {
    const token = localStorage.getItem('token');
    return axios.post(`${AUTH_API_BASE_URL}/auth-session/logout`, null, {
      headers: token ? { Authorization: `Bearer ${token.replace(/"/g, '')}` } : undefined,
    });
  },
  getCurrentUser: () => axios.get(`${AUTH_API_BASE_URL}/auth-session/me`),
  getUserById: (id) => axios.get(`/auth/users/${id}`), // Proxied via AdminBackend if needed, or direct
  getRolePermissions: (roleId) => axios.get(`/admins/roles/${roleId}/permissions`),

  // Organization-specific RBAC (managed in AdminBackend)
  getRolesByOrganizationId: (orgId, params = {}) => axios.get(`/admins/organizations/${orgId}/roles`, { params }),
  createOrganizationRole: (orgId, data) => axios.post(`/admins/organizations/${orgId}/roles`, data),
  getUsersByOrganizationId: (orgId, params = {}) => axios.get(`/admins/organizations/${orgId}/users`, { params }),
  createOrganizationUser: (orgId, data) => axios.post(`/admins/organizations/${orgId}/users`, data),
  updateOrganizationUser: (orgId, userId, data) => axios.put(`/admins/organizations/${orgId}/users/${userId}`, data),
  updateRolePermissions: (roleId, permissions, metadata = {}) => axios.put(`/admins/roles/${roleId}/permissions`, { permissions, ...metadata }),
  getFeatures: () => axios.get('/admins/features'),

  // Credits now use AdminBackend baseURL set in axios.js
  getCredits: (organizationId) => axios.get(`/admins/credits/${organizationId}`),

  // Organization Details (Smart routing ensures we use the correct endpoint even if UI is stale)
  getCollegeDetails: (organizationId) => {
    if (localStorage.getItem('isCollege') === 'false') return authAPI.getCompanyDetails(organizationId);
    return axios.get(`/admins/college-details/${organizationId}`);
  },
  updateCollegeDetails: (organizationId, data) => {
    if (localStorage.getItem('isCollege') === 'false') return authAPI.updateCompanyDetails(organizationId, data);
    return axios.put(`/admins/college-details/${organizationId}`, data);
  },
  getCompanyDetails: (organizationId) => {
    if (localStorage.getItem('isCollege') === 'true') return authAPI.getCollegeDetails(organizationId);
    return axios.get(`/admins/company-details/${organizationId}`);
  },
  updateCompanyDetails: (organizationId, data) => {
    if (localStorage.getItem('isCollege') === 'true') return authAPI.updateCollegeDetails(organizationId, data);
    return axios.put(`/admins/company-details/${organizationId}`, data);
  },
  getAiScoringSettings: (organizationId) => {
    const key = `ai_scoring_${organizationId}`;
    if (!authAPI._aiScoringPending) authAPI._aiScoringPending = {};
    if (authAPI._aiScoringPending[key]) return authAPI._aiScoringPending[key];
    const p = axios.get(`/admins/ai-scoring-settings/${organizationId}`)
      .finally(() => { delete authAPI._aiScoringPending[key]; });
    authAPI._aiScoringPending[key] = p;
    return p;
  },
  updateAiScoringSettings: (organizationId, data) => {
    return axios.put(`/admins/ai-scoring-settings/${organizationId}`, data);
  },
  getCrossQuestionSettings: (organizationId) =>
    axios.get(`/admins/cross-question-settings/${organizationId}`),
  updateCrossQuestionSettings: (organizationId, data) =>
    axios.put(`/admins/cross-question-settings/${organizationId}`, data),
  getOrganizationInfo: (organizationId) => axios.get(`/admins/organizations/${organizationId}/info`),

  // Updated to use AdminBackend via Gateway for UI testing (OTP in response)
  requestPasswordReset: (email) => axios.post('/admins/forgot-password', { email }),
  resetPassword: (payload) => axios.post('/admins/reset-password', payload),
  changePassword: (payload) => axios.post(`${AUTH_API_BASE_URL}/auth-session/change-password`, payload),
};
