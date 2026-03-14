import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const Settings = () => {
    const user = (() => {
        try { return JSON.parse(localStorage.getItem('admin_user')); } catch { return {}; }
    })();

    const isCollegeAdmin = user.isCollege === true;
    // Use relative paths so NavLink resolves under current /settings parent (fixes Cross Question tab)
    const tabs = isCollegeAdmin
        ? [
            { key: 'college-details', label: 'College Details', path: 'college-details' },
            { key: 'ai-scoring', label: 'AI Scoring', path: 'ai-scoring' },
            { key: 'cross-question', label: 'Cross Question', path: 'cross-question' },
        ]
        : [
            { key: 'company-details', label: 'Company Details', path: 'company-details' },
            { key: 'ai-scoring', label: 'AI Scoring', path: 'ai-scoring' },
            { key: 'cross-question', label: 'Cross Question', path: 'cross-question' },
        ];

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">Settings</h1>

            {/* Tabs as NavLinks - each tab is a separate route */}
            <div className="flex items-center gap-8 border-b border-slate-200 overflow-x-auto no-scrollbar">
                {tabs.map((t) => (
                    <NavLink
                        key={t.key}
                        to={t.path}
                        end={false}
                        className={({ isActive }) =>
                            `relative pb-3 flex items-center gap-2 transition-all shrink-0 text-xs font-medium ${isActive ? 'text-[#FF6B00] font-semibold' : 'text-slate-500 hover:text-slate-900'}`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                {t.label}
                                {isActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF6B00] rounded-full" />}
                            </>
                        )}
                    </NavLink>
                ))}
            </div>

            {/* Child route content - each page loads its own API */}
            <div className="space-y-8 pb-12">
                <Outlet />
            </div>
        </div>
    );
};

export default Settings;
