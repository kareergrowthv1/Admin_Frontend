import React from 'react';
import { Navigate } from 'react-router-dom';

const SettingsRedirect = () => {
    try {
        const user = JSON.parse(localStorage.getItem('admin_user') || '{}');
        const target = user.isCollege === true ? '/settings/college-details' : '/settings/company-details';
        return <Navigate to={target} replace />;
    } catch {
        return <Navigate to="/settings/company-details" replace />;
    }
};

export default SettingsRedirect;
