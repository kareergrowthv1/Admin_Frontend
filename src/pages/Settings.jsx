import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import PermissionWrapper from '../components/common/PermissionWrapper';

const Settings = () => {
    const user = (() => {
        try { return JSON.parse(localStorage.getItem('admin_user')); } catch { return {}; }
    })();

    const isCollegeStr = localStorage.getItem('isCollege');
    const isCollegeAdmin = isCollegeStr === 'true' || user.isCollege === true;
    // Use relative paths so NavLink resolves under current /settings parent (fixes Cross Question tab)
    const tabs = isCollegeAdmin
        ? [
            { key: 'college-details', label: 'College Details', path: 'college-details' },
            { key: 'email-templates', label: 'Email Templates', path: 'email-templates' },
            { key: 'ai-scoring', label: 'AI Scoring', path: 'ai-scoring' },
            { key: 'cross-question', label: 'Cross Question', path: 'cross-question' },
        ]
        : [
            { key: 'company-details', label: 'Company Details', path: 'company-details' },
            { key: 'email-templates', label: 'Email Templates', path: 'email-templates' },
            { key: 'ai-scoring', label: 'AI Scoring', path: 'ai-scoring' },
            { key: 'cross-question', label: 'Cross Question', path: 'cross-question' },
        ];

    return (
        <PermissionWrapper feature="settings" permission="read">
            <div className="pt-2 pb-12 space-y-6">
                {/* Tabs as NavLinks - each tab is a separate route */}
                <div className="flex items-center gap-8 border-b border-slate-100 overflow-x-auto no-scrollbar">
                    {tabs.map((t) => (
                        <NavLink
                            key={t.key}
                            to={t.path}
                            end={false}
                            className={({ isActive }) =>
                                `relative pb-2 flex items-center gap-2 transition-all shrink-0 text-xs font-normal ${isActive ? 'text-blue-600' : 'text-black'}`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    {t.label}
                                    {isActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />}
                                </>
                            )}
                        </NavLink>
                    ))}
                </div>

                {/* Child route content - each page loads its own API */}
                <div className="space-y-8">
                    <Outlet />
                </div>
            </div>
        </PermissionWrapper>
    );
};

export default Settings;
