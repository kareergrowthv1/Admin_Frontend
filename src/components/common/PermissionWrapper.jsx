import React from 'react';

/**
 * PermissionWrapper — Conditionally renders children based on role permissions.
 *
 * @param {React.ReactNode} children  - Elements to render if permission is granted.
 * @param {string}          feature   - Feature key (e.g. 'candidates', 'students', 'myTeam').
 * @param {string}          permission - Required permission: 'show'|'read'|'write'|'update'|'delete'|'export'|'import'.
 */
const PermissionWrapper = ({ children, feature, permission }) => {
    // ── 1. Superadmin/Main-Admin bypass ─────────────────────────────────────
    const isAdminFlag = localStorage.getItem('is_admin') === 'true';
    const isMainAdminFlag = localStorage.getItem('isMainAdmin') === 'true';

    let storedUser = {};
    try { storedUser = JSON.parse(localStorage.getItem('admin_user') || '{}'); } catch {}

    const userIsAdmin =
        storedUser.is_admin === true ||
        storedUser.isAdmin === true ||
        storedUser.roleCode === 'ADMIN' ||
        storedUser.roleCode === 'SUPERADMIN';

    const roleName = (localStorage.getItem('Role') || storedUser.role_name || '').toLowerCase();
    const isAdmin =
        isAdminFlag ||
        isMainAdminFlag ||
        userIsAdmin ||
        roleName === 'administrator' ||
        roleName === 'super administrator' ||
        roleName === 'superadmin';

    if (isAdmin) return <>{children}</>;

    // ── 2. Normalize the required permission to UPPERCASE ────────────────────
    const PERM_ALIAS = {
        view: ['READ', 'SHOW'],
        show: ['SHOW', 'READ'],
        read: ['READ', 'SHOW'],
        write: ['WRITE', 'CREATE'],
        create: ['CREATE', 'WRITE'],
        edit: ['UPDATE'],
        update: ['UPDATE'],
        delete: ['DELETE'],
        remove: ['DELETE'],
        export: ['EXPORT'],
        import: ['IMPORT'],
    };
    const requestedKey = (permission || '').toLowerCase();
    const requiredPerms = PERM_ALIAS[requestedKey] || [String(permission || '').toUpperCase()];
    const requiredPermsLower = requiredPerms.map((p) => p.toLowerCase());

    // ── 3. Check per-feature scopes array (primary store) ───────────────────
    // Login stores: localStorage.setItem(`${featureKey}Permissions`, JSON.stringify(['READ','WRITE',...]));
    let hasPermission = false;
    const featureKey = feature?.toLowerCase();

    // Try exact key and common casing variants
    const keysToTry = [
        `${feature}Permissions`,
        `${featureKey}Permissions`,
    ];

    for (const key of keysToTry) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                // Array of uppercase scope strings: ['READ', 'WRITE', ...]
                hasPermission = requiredPerms.some((perm) => parsed.includes(perm));
            } else if (typeof parsed === 'object') {
                // Object form: { read: true, write: false, ... }
                hasPermission = requiredPerms.some((perm) => parsed[perm] === true) || requiredPermsLower.some((perm) => parsed[perm] === true);
            }
            if (hasPermission) break;
        } catch {}
    }

    // ── 4. Fallback: full admin_permissions array ────────────────────────────
    if (!hasPermission) {
        try {
            const fullPerms = JSON.parse(localStorage.getItem('admin_permissions') || '[]');
            const featurePerm = fullPerms.find(
                p => (p.feature_key || p.feature_name || '').toLowerCase() === featureKey
            );
            if (featurePerm?.permissions) {
                hasPermission = requiredPerms.some((perm) => featurePerm.permissions[perm] === true) ||
                    requiredPermsLower.some((perm) => featurePerm.permissions[perm] === true);
            }
            // Also check PermissionsObj alternate store
            if (!hasPermission) {
                const objRaw = localStorage.getItem(`${feature}PermissionsObj`);
                if (objRaw) {
                    const obj = JSON.parse(objRaw);
                    hasPermission = requiredPerms.some((perm) => obj[perm] === true) ||
                        requiredPermsLower.some((perm) => obj[perm] === true);
                }
            }
        } catch (e) {
            console.error('[PermissionWrapper] Error reading admin_permissions:', e);
        }
    }

    if (!hasPermission) return null;
    return <>{children}</>;
};

export default PermissionWrapper;
