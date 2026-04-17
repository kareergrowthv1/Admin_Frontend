import axios from 'axios';
import { clearAuthStorage } from '../utils/authStorage';
import { installGetCache, clearApiCache } from '../utils/apiCache';
import { API_BASE_URL, CANDIDATE_API_BASE_URL, AI_SERVICE_BASE_URL } from '../utils/constants';

const instance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  withCredentials: true,
});

// GET deduplication + cache: same request once; cache 1 min so revisiting page doesn't call API again
installGetCache(instance);

// Clear cache on any POST/PUT/DELETE to ensure the next GET fetch sees fresh data
instance.interceptors.request.use((config) => {
  const method = (config.method || 'get').toLowerCase();
  if (['post', 'put', 'delete', 'patch'].includes(method)) {
    clearApiCache();
  }
  return config;
});

// Request interceptor to add Authorization header
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token.replace(/"/g, '')}`;
    }

    const client = localStorage.getItem('client');
    if (client) {
      config.headers['X-Tenant-Id'] = client;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/** Clear auth and send user to login (invalid/expired token or unauthorized). */
function clearAuthAndRedirectToLogin() {
  clearAuthStorage();
  window.location.href = '/login';
}

/** True if this request is login/auth — do not clear storage on 401 for login. */
function isAuthLoginRequest(config) {
  const url = (config?.url || config?.baseURL || '').toString();
  return url.includes('auth-session/login') || url.includes('/auth/login') || url.includes('/login');
}

// Response interceptor: handle 401/403 and token refresh
instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const errorMessage = (error.response?.data?.error || error.response?.data?.message || '').toString();

    // 401/403: unauthorized or forbidden — clear auth and redirect (skip for login request)
    if (status === 401 || status === 403) {
      if (isAuthLoginRequest(originalRequest)) return Promise.reject(error);

      const isTokenExpired = (status === 503 || status === 401) && (errorMessage.includes('expired') || errorMessage.includes('token'));

      // One retry: try refresh only for 401 that looks like expired token
      if (status === 401 && isTokenExpired && !originalRequest._retry) {
        originalRequest._retry = true;
        try {
          const refreshResponse = await axios.post(import.meta.env.VITE_API_REFRESH_URL, {}, {
            withCredentials: true
          });
          const { accessToken } = refreshResponse.data?.data || refreshResponse.data || {};
          if (accessToken) {
            localStorage.setItem('token', accessToken);
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return instance(originalRequest);
          }
        } catch (refreshError) {
          console.error('Refresh token failed:', refreshError);
        }
      }

      clearAuthAndRedirectToLogin();
      return Promise.reject(error);
    }

    // 404 on auth user/role (e.g. user or role no longer exists) — clear and force login
    if (status === 404 && !isAuthLoginRequest(originalRequest)) {
      const url = (originalRequest?.url || originalRequest?.baseURL || '').toString();
      if (url.includes('/users') || url.includes('/roles/')) {
        clearAuthAndRedirectToLogin();
        return Promise.reject(error);
      }
    }

    // 500 with tenant/session-invalid messages (e.g. Unknown database) — clear and force login
    if (status === 500 && !isAuthLoginRequest(originalRequest)) {
      const msg = errorMessage.toLowerCase();
      if (msg.includes('unknown database') || (msg.includes('database') && msg.includes("doesn't exist"))) {
        clearAuthAndRedirectToLogin();
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

const candidateApi = axios.create({
  baseURL: CANDIDATE_API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
});

candidateApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token.replace(/"/g, '')}`;
    }
    const client = localStorage.getItem('client');
    if (client) {
      config.headers['X-Tenant-Id'] = client;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

candidateApi.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    if (status === 401 || status === 403) {
      clearAuthAndRedirectToLogin();
    } else if (status === 500) {
      const msg = (error.response?.data?.message || error.response?.data?.error || '').toString().toLowerCase();
      if (msg.includes('unknown database') || (msg.includes('database') && msg.includes("doesn't exist"))) {
        clearAuthAndRedirectToLogin();
      }
    }
    return Promise.reject(error);
  }
);

// AI service – direct (e.g. schedule-interview)
const gatewayApi = axios.create({
  baseURL: AI_SERVICE_BASE_URL,
  timeout: 30000,
  withCredentials: true,
});

gatewayApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token.replace(/"/g, '')}`;
    }
    const client = localStorage.getItem('client');
    if (client) {
      config.headers['X-Tenant-Id'] = client;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

gatewayApi.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    if (status === 401 || status === 403) {
      clearAuthAndRedirectToLogin();
    } else if (status === 500) {
      const msg = (error.response?.data?.message || error.response?.data?.error || '').toString().toLowerCase();
      if (msg.includes('unknown database') || (msg.includes('database') && msg.includes("doesn't exist"))) {
        clearAuthAndRedirectToLogin();
      }
    }
    return Promise.reject(error);
  }
);

export default instance;
export { candidateApi, gatewayApi };