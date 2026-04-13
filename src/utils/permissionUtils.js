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
