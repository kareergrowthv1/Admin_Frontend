import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isSessionValid } from '../utils/authStorage';

function saveCurrentRoute(pathname) {
  if (pathname && pathname !== '/login' && pathname !== '/') {
    sessionStorage.setItem('lastValidRoute', pathname);
  }
}

/**
 * ProtectedRoute — Guards all authenticated routes.
 * Redirects to /login if session is invalid. Saves route for post-login redirect.
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
 * PublicOnlyRoute — For login/register. If session is already valid, redirect to app.
 * Same as reference: only show login when user is NOT authenticated.
 */
export const PublicOnlyRoute = ({ children }) => {
    if (isSessionValid()) {
        const lastRoute = sessionStorage.getItem('lastValidRoute');
        return <Navigate to={lastRoute || '/dashboard'} replace />;
    }
    return children;
};

/**
 * RoleRoute — Guards system-specific routes.
 * requiredSystem: 'college' | 'ats'
 * Redirects to /dashboard if the user is on the wrong system.
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
        const user = JSON.parse(localStorage.getItem('admin_user'));
        const isCollege = user?.isCollege === true;

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
