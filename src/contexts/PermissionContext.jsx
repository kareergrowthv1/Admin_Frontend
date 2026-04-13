import React, { createContext, useContext, useCallback } from 'react';

/**
 * PermissionContext — Provides reactive, centralized permission checks across the app.
 *
 * Usage:
 *   const { hasPermission, isAdmin, hasScope } = usePermissions();
 *   if (hasPermission('candidates', 'write')) { ... }
 */
const PermissionContext = createContext(null);

// Permission verb → stored uppercase scope alias map
const PERM_ALIAS = {
    view: 'READ', show: 'SHOW', read: 'READ',
    write: 'WRITE', create: 'WRITE',
    edit: 'UPDATE', update: 'UPDATE',
    delete: 'DELETE', remove: 'DELETE',
    export: 'EXPORT', import: 'IMPORT',
};

export const PermissionProvider = ({ children }) => {
    /**
     * Returns true if the current user is a Main Admin / Superadmin.
     * Admins bypass all permission checks.
     */
    const isAdmin = useCallback(() => {
        if (localStorage.getItem('is_admin') === 'true') return true;
        if (localStorage.getItem('isMainAdmin') === 'true') return true;
        let user = {};
        try { user = JSON.parse(localStorage.getItem('admin_user') || '{}'); } catch {}
        if (user.isAdmin === true || user.is_admin === true) return true;
        if (user.roleCode === 'ADMIN' || user.roleCode === 'SUPERADMIN') return true;
        const roleName = (localStorage.getItem('Role') || user.role_name || '').toLowerCase();
        return roleName === 'administrator' || roleName === 'super administrator' || roleName === 'superadmin';
    }, []);

    /**
     * Returns true if the user has the specified permission for the given feature.
     * @param {string} feature    - e.g. 'candidates', 'students', 'myTeam'
     * @param {string} permission - e.g. 'read', 'write', 'delete'
     */
    const hasPermission = useCallback((feature, permission) => {
        if (isAdmin()) return true;

        const requiredPerm = PERM_ALIAS[permission?.toLowerCase()] || permission?.toUpperCase();
        const featureKey = feature?.toLowerCase();

        // Primary: feature-specific scope array
        const scopesRaw = localStorage.getItem(`${feature}Permissions`) ||
                          localStorage.getItem(`${featureKey}Permissions`);
        if (scopesRaw) {
            try {
                const scopes = JSON.parse(scopesRaw);
                if (Array.isArray(scopes) && scopes.includes(requiredPerm)) return true;
                if (typeof scopes === 'object' && !Array.isArray(scopes)) {
                    if (scopes[permission?.toLowerCase()] || scopes[requiredPerm]) return true;
                }
            } catch {}
        }

        // Secondary: object form
        const objRaw = localStorage.getItem(`${feature}PermissionsObj`);
        if (objRaw) {
            try {
                const obj = JSON.parse(objRaw);
                if (obj[permission?.toLowerCase()] || obj[requiredPerm]) return true;
            } catch {}
        }

        // Tertiary: full admin_permissions array
        try {
            const fullPerms = JSON.parse(localStorage.getItem('admin_permissions') || '[]');
            const fp = fullPerms.find(p =>
                (p.feature_key || p.feature_name || '').toLowerCase() === featureKey
            );
            if (fp?.permissions) {
                return !!(fp.permissions[permission?.toLowerCase()] || fp.permissions[requiredPerm]);
            }
        } catch {}

        return false;
    }, [isAdmin]);

    /**
     * Returns the data scope for a feature: 'ALL' | 'OWN' | string.
     * Admins always return 'ALL'.
     */
    const hasScope = useCallback((feature) => {
        if (isAdmin()) return 'ALL';
        try {
            const fullPerms = JSON.parse(localStorage.getItem('admin_permissions') || '[]');
            const fp = fullPerms.find(p =>
                (p.feature_key || p.feature_name || '').toLowerCase() === feature?.toLowerCase()
            );
            return fp?.data_scope || 'OWN';
        } catch {
            return 'OWN';
        }
    }, [isAdmin]);

    /**
     * Returns true if the user can view (show/read) a feature — used for nav/route guards.
     */
    const canView = useCallback((feature) => {
        return hasPermission(feature, 'show') || hasPermission(feature, 'read');
    }, [hasPermission]);

    return (
        <PermissionContext.Provider value={{ hasPermission, isAdmin, hasScope, canView }}>
            {children}
        </PermissionContext.Provider>
    );
};

/**
 * Hook to access permission helpers anywhere in the app.
 * Must be used inside PermissionProvider.
 */
export const usePermissions = () => {
    const ctx = useContext(PermissionContext);
    if (!ctx) throw new Error('usePermissions must be used inside PermissionProvider');
    return ctx;
};

export default PermissionContext;
