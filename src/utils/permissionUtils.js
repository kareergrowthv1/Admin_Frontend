/**
 * Permission utility to check feature permissions and data scopes.
 */

export const getFeatureDataScope = (featureKey) => {
    try {
        const storedUser = JSON.parse(localStorage.getItem('admin_user') || '{}');
        const roleName = storedUser.role_name || localStorage.getItem('Role') || '';
        
        // Main admins always have ALL access
        if (
            roleName.toLowerCase() === 'super administrator' || 
            roleName.toLowerCase() === 'administrator' || 
            roleName.toLowerCase() === 'superadmin' ||
            storedUser.roleCode === 'ADMIN' ||
            storedUser.roleCode === 'SUPERADMIN'
        ) {
            return 'ALL';
        }

        // Check in admin_permissions array
        const fullPermissionsRaw = localStorage.getItem('admin_permissions');
        if (fullPermissionsRaw) {
            const fullPermissions = JSON.parse(fullPermissionsRaw);
            const featurePerm = fullPermissions.find(p => (p.feature_key || '').toLowerCase() === featureKey.toLowerCase());
            if (featurePerm) {
                return featurePerm.data_scope || 'ALL';
            }
        }
        
    } catch (e) {
        console.error('Error getting data scope for', featureKey, e);
    }
    
    // Default to OWN for safety if not a main admin
    return 'OWN';
};

export const getLoggedInUserId = () => {
    const storedUser = JSON.parse(localStorage.getItem('admin_user') || '{}');
    return storedUser.id || storedUser.userId || localStorage.getItem('userId') || localStorage.getItem('id');
};

export const hasFeaturePermission = (featureKey, permission = 'show') => {
    try {
        const storedUser = JSON.parse(localStorage.getItem('admin_user') || '{}');
        const roleName = (storedUser.role_name || localStorage.getItem('Role') || '').toLowerCase();

        const isAdmin =
            localStorage.getItem('is_admin') === 'true' ||
            localStorage.getItem('isMainAdmin') === 'true' ||
            storedUser.is_admin === true ||
            storedUser.isAdmin === true ||
            storedUser.roleCode === 'ADMIN' ||
            storedUser.roleCode === 'SUPERADMIN' ||
            roleName === 'administrator' ||
            roleName === 'super administrator' ||
            roleName === 'superadmin';

        if (isAdmin) return true;

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
            import: ['IMPORT']
        };

        const requested = (permission || '').toLowerCase();
        const requiredPerms = PERM_ALIAS[requested] || [String(permission || '').toUpperCase()];
        const requiredPermsLower = requiredPerms.map((p) => p.toLowerCase());

        const keysToTry = [
            `${featureKey}Permissions`,
            `${String(featureKey || '').toLowerCase()}Permissions`
        ];

        for (const key of keysToTry) {
            const raw = localStorage.getItem(key);
            if (!raw) continue;

            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    if (requiredPerms.some((perm) => parsed.includes(perm))) return true;
                } else if (typeof parsed === 'object' && parsed) {
                    if (requiredPerms.some((perm) => parsed[perm] === true) || requiredPermsLower.some((perm) => parsed[perm] === true)) {
                        return true;
                    }
                }
            } catch (e) {
                // Ignore malformed local storage and continue fallback checks.
            }
        }

        try {
            const fullPerms = JSON.parse(localStorage.getItem('admin_permissions') || '[]');
            const fk = String(featureKey || '').toLowerCase();
            const featurePerm = fullPerms.find(
                (p) => (p.feature_key || p.feature_name || '').toLowerCase() === fk
            );

            if (featurePerm?.permissions) {
                return (
                    requiredPerms.some((perm) => featurePerm.permissions[perm] === true) ||
                    requiredPermsLower.some((perm) => featurePerm.permissions[perm] === true)
                );
            }
        } catch (e) {
            // Ignore fallback parsing errors.
        }
    } catch (e) {
        console.error('Error checking permission for', featureKey, permission, e);
    }

    return false;
};
