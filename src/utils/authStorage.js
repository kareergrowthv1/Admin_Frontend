/**
 * Central place for auth-related localStorage keys.
 * Use clearAuthStorage() on 401/403 or logout so no stale session allows access.
 */

import { clearApiCache } from './apiCache';

export const AUTH_KEYS = [
  'token',
  'isAuthenticated',
  'id',
  'organizationId',
  'roleId',
  'client',
  'admin_user',
  'username',
  'isSubscription',
  'Role',
  'admin_permissions',
  'collegeName',
];

/** Remove all auth data from localStorage so user is forced to login again. */
export function clearAuthStorage() {
  clearApiCache();
  
  // Define keys to PRESERVE (Remember Me items)
  const preserveKeys = [
    'admin_trust',
    'admin_email',
    'admin_password',
    'rememberEmail',
    'rememberPassword'
  ];

  // Backup preserved values
  const backup = {};
  preserveKeys.forEach(key => {
    const val = localStorage.getItem(key);
    if (val) backup[key] = val;
  });

  // NUKE EVERYTHING
  localStorage.clear();

  // Restore preserved values
  Object.keys(backup).forEach(key => {
    localStorage.setItem(key, backup[key]);
  });
}

/** Return true only if token and organizationId exist (minimal check). */
export function hasAuthTokens() {
  const token = localStorage.getItem('token');
  const orgId = localStorage.getItem('organizationId');
  return !!(token && orgId && token !== 'null' && orgId !== 'null');
}

const REQUIRED_KEYS = ['token', 'isAuthenticated', 'id', 'organizationId', 'roleId', 'client', 'admin_user'];

function getCookie(name) {
  if (typeof document === 'undefined' || !document.cookie) return null;
  const match = document.cookie.split('; ').find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=')[1]) : null;
}

/**
 * Session is valid only when all required keys exist and admin_user has isCollege.
 * Use this for route guards — no access to any protected page without valid session.
 */
export function isSessionValid() {
  const tokenInLocalStorage = localStorage.getItem('token');
  const tokenInCookie = getCookie('token') || getCookie('accessToken') || getCookie('auth_token');
  if (!tokenInLocalStorage && !tokenInCookie) return false;

  for (const key of REQUIRED_KEYS) {
    const val = localStorage.getItem(key);
    if (!val || val === 'null' || val === 'undefined') return false;
  }

  try {
    const user = JSON.parse(localStorage.getItem('admin_user'));
    if (!user || typeof user.isCollege === 'undefined') return false;
  } catch {
    return false;
  }
  return true;
}
