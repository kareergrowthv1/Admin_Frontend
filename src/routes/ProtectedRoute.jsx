import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isSessionValid } from '../utils/authStorage';
import toast from 'react-hot-toast';

function saveCurrentRoute(pathname) {
  if (pathname && pathname !== '/login' && pathname !== '/') {
    sessionStorage.setItem('lastValidRoute', pathname);
  }
}

// ── Shared admin check (no React context needed at route level) ──────────────
function checkIsAdmin() {
  if (localStorage.getItem('is_admin') === 'true') return true;
  if (localStorage.getItem('isMainAdmin') === 'true') return true;
  try {
    const user = JSON.parse(localStorage.getItem('admin_user') || '{}');
    if (user.isAdmin === true || user.is_admin === true) return true;
    if (user.roleCode === 'ADMIN' || user.roleCode === 'SUPERADMIN') return true;
    const roleName = (localStorage.getItem('Role') || user.role_name || '').toLowerCase();
    return roleName === 'administrator' || roleName === 'super administrator' || roleName === 'superadmin';
  } catch { return false; }
}

export function checkIsCollege() {
  try {
    const user = JSON.parse(localStorage.getItem('admin_user') || '{}');
    const rawPermissions = localStorage.getItem('admin_permissions') || '[]';
    const hasAtsFeatures = rawPermissions.toLowerCase().includes('"jobs"') || rawPermissions.toLowerCase().includes('"clients"');

    const roleCode = (user.roleCode || user.role_code || localStorage.getItem('roleCode') || localStorage.getItem('Role') || '').trim().toUpperCase();
    
    const isAtsRole = roleCode.includes('ATS') || roleCode.includes('RECRUITER');
    const isCollegeRole = roleCode === 'ADMIN' || roleCode === 'ADMINISTRATOR' || roleCode === 'SUPERADMIN' || roleCode === 'SUPER ADMINISTRATOR';
    
    if (isAtsRole || (!isCollegeRole && hasAtsFeatures)) return false;
    
    const isCollegeFlag = (user.isCollege !== undefined) ? !!user.isCollege : (localStorage.getItem('isCollege') === 'true');
    return isCollegeFlag;
  } catch {
    return localStorage.getItem('isCollege') === 'true';
  }
}

// ── Permission alias map ─────────────────────────────────────────────────────
const PERM_ALIAS = {
  view: ['READ', 'SHOW'], show: ['SHOW', 'READ'], read: ['READ', 'SHOW'],
  write: ['WRITE', 'CREATE'], create: ['CREATE', 'WRITE'],
  edit: ['UPDATE'], update: ['UPDATE'],
  delete: ['DELETE'], remove: ['DELETE'],
  export: ['EXPORT'], import: ['IMPORT'],
};

function checkFeaturePermission(featureKey, permission = 'show') {
  if (checkIsAdmin()) return true;
  const key = (permission || '').toLowerCase();
  const requiredPerms = PERM_ALIAS[key] || [String(permission || '').toUpperCase()];
  const requiredPermsLower = requiredPerms.map((p) => p.toLowerCase());
  const fk = featureKey?.toLowerCase();

  // Check scope array
  const scopesRaw = localStorage.getItem(`${featureKey}Permissions`) ||
                    localStorage.getItem(`${fk}Permissions`);
  if (scopesRaw) {
    try {
      const scopes = JSON.parse(scopesRaw);
      if (Array.isArray(scopes)) {
        if (requiredPerms.some((perm) => scopes.includes(perm))) return true;
      } else if (typeof scopes === 'object') {
        if (requiredPerms.some((perm) => scopes[perm] === true) || requiredPermsLower.some((perm) => scopes[perm] === true)) return true;
      }
    } catch {}
  }

  // Fallback: full permissions array
  try {
    const fullPerms = JSON.parse(localStorage.getItem('admin_permissions') || '[]');
    const fp = fullPerms.find(p =>
      (p.feature_key || p.feature_name || '').toLowerCase() === fk
    );
    if (fp?.permissions) {
      return requiredPerms.some((perm) => fp.permissions[perm] === true) || requiredPermsLower.some((perm) => fp.permissions[perm] === true);
    }
  } catch {}

  return false;
}

/**
 * ProtectedRoute — Guards all authenticated routes.
 * Redirects to /login if session is invalid.
 */
export const ProtectedRoute = ({ children }) => {
    const location = useLocation();

    useEffect(() => {
      if (isSessionValid() && location.pathname) saveCurrentRoute(location.pathname);
    }, [location.pathname]);

    if (!isSessionValid()) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    return children;
};

/**
 * PublicOnlyRoute — For login/register. Redirects to app if already authenticated.
 */
export const PublicOnlyRoute = ({ children }) => {
    if (isSessionValid()) {
        const lastRoute = sessionStorage.getItem('lastValidRoute');
        return <Navigate to={lastRoute || '/dashboard'} replace />;
    }
    return children;
};

/**
 * RoleRoute — Guards system-specific routes (College vs ATS).
 * requiredSystem: 'college' | 'ats'
 */
export const RoleRoute = ({ children, requiredSystem }) => {
    const location = useLocation();

    useEffect(() => {
      if (isSessionValid() && location.pathname) saveCurrentRoute(location.pathname);
    }, [location.pathname]);

    if (!isSessionValid()) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    try {
        const isCollege = checkIsCollege();

        if (requiredSystem === 'college' && !isCollege) {
            return <Navigate to="/dashboard" replace />;
        }
        if (requiredSystem === 'ats' && isCollege) {
            return <Navigate to="/dashboard" replace />;
        }
    } catch {
        return <Navigate to="/login" replace />;
    }

    return children;
};

/**
 * FeatureRoute — Guards routes that require a specific feature permission.
 *
 * @param {string}  featureKey     - The feature key (e.g. 'candidates', 'students').
 * @param {string}  requiredSystem - Optional: 'college' | 'ats' (combines system + feature guard).
 *
 * If the user lacks the feature permission, they are redirected to /dashboard.
 * Main Admins always bypass this check.
 */
export const FeatureRoute = ({ children, featureKey, requiredSystem }) => {
    const location = useLocation();

    useEffect(() => {
      if (isSessionValid() && location.pathname) saveCurrentRoute(location.pathname);
    }, [location.pathname]);

    if (!isSessionValid()) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    // System guard (college vs ATS)
    if (requiredSystem) {
        try {
            const isCollege = checkIsCollege();
            if (requiredSystem === 'college' && !isCollege) return <Navigate to="/dashboard" replace />;
            if (requiredSystem === 'ats' && isCollege) return <Navigate to="/dashboard" replace />;
        } catch {
            return <Navigate to="/login" replace />;
        }
    }

    // Feature permission guard
    if (featureKey && !checkFeaturePermission(featureKey)) {
        toast.error(`You don't have permission to access this page.`, { id: `access-denied-${featureKey}` });
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

