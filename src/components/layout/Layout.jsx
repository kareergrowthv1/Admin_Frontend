import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { authAPI } from '../../features/auth/authAPI';
import { clearUser } from '../../features/auth/authSlice';
import { clearAuthStorage } from '../../utils/authStorage';
import { getNavigationForRole, NAV_PERMISSION_MAP } from '../../constants/navigationConstants';

const Layout = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const dropdownRef = useRef(null);
    const [user, setUser] = useState(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [navigationMenu, setNavigationMenu] = useState([]);

    useEffect(() => {
        const storedUser = localStorage.getItem('admin_user');
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);

                // Level 1: isCollege determines which system's nav to load
                const isCollege = parsedUser.isCollege === true;
                const fullMenu = getNavigationForRole(isCollege);

                // Level 2: isAdmin = full menu; sub-user = filter by permissions
                const isAdmin = parsedUser.isAdmin === true;
                if (isAdmin) {
                    setNavigationMenu(fullMenu);
                } else {
                    // Read permissions from localStorage (set during login)
                    let permissions = [];
                    try {
                        permissions = JSON.parse(localStorage.getItem('admin_permissions') || '[]');
                    } catch { permissions = []; }

                    const filtered = fullMenu
                        .map((section) => ({
                            ...section,
                            items: section.items.filter((item) => {
                                const featureKey = NAV_PERMISSION_MAP[item.path];
                                // null = always visible (dashboard, inbox, profile, settings)
                                if (featureKey === null) return true;
                                const perm = permissions.find(
                                    (p) =>
                                        (p.feature_name || p.feature_key || '')
                                            .toLowerCase() === featureKey.toLowerCase()
                                );
                                return perm?.permissions?.read === true;
                            }),
                        }))
                        .filter((section) => section.items.length > 0);

                    setNavigationMenu(filtered);
                }
            } catch (e) {
                console.error('Failed to parse user data', e);
            }
        }

        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const isActive = (path) => {
        if (path === '/settings') return location.pathname === '/settings' || location.pathname.startsWith('/settings/');
        return location.pathname === path;
    };

    const handleLogout = async () => {
        try {
            await authAPI.logout();
        } catch (error) {
            console.error('Logout failed:', error);
        } finally {
            const trust = localStorage.getItem('admin_trust') === 'true';
            const rememberEmail = localStorage.getItem('rememberEmail');
            const rememberPassword = localStorage.getItem('rememberPassword');
            const adminEmail = localStorage.getItem('admin_email');
            const adminPassword = localStorage.getItem('admin_password');

            clearAuthStorage();
            dispatch(clearUser());

            if (trust) {
                localStorage.setItem('admin_trust', 'true');
                if (rememberEmail) localStorage.setItem('rememberEmail', rememberEmail);
                if (rememberPassword) localStorage.setItem('rememberPassword', rememberPassword);
                if (adminEmail) localStorage.setItem('admin_email', adminEmail);
                if (adminPassword) localStorage.setItem('admin_password', adminPassword);
            }

            navigate('/login', { replace: true });
        }
    };

    const getInitials = (firstName, lastName) => {
        if (!firstName) return 'A';
        return `${firstName[0]}${lastName?.[0] || ''}`.toUpperCase();
    };

    return (
        <div className="flex h-screen w-full bg-slate-50 font-['Inter'] overflow-hidden">
            {/* Sidebar */}
            <aside className="h-screen w-[240px] flex-shrink-0 bg-slate-50 flex flex-col overflow-visible z-50">
                <div className="flex flex-col h-full px-4 py-5 font-['Inter']">
                    {/* Logo */}
                    <div className="mb-6 flex items-center gap-2.5 px-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF6B00] to-[#FF4E00] shadow-lg shadow-orange-100">
                            <span className="text-sm font-black text-white">KG</span>
                        </div>
                        <span className="text-xl font-bold tracking-tight text-slate-800">KareerGrowth</span>
                    </div>

                    {/* Nav Links */}
                    <div className="flex-grow space-y-6 px-1 overflow-y-auto custom-scrollbar">
                        {navigationMenu.map((section) => (
                            <div key={section.title} className="space-y-1.5">
                                <h3 className="px-3 text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase">
                                    {section.title}
                                </h3>
                                <div className="space-y-1">
                                    {section.items.map((item) => (
                                        <Link
                                            key={item.name}
                                            to={item.path}
                                            className={`group flex items-center gap-3 rounded-xl px-3 py-2 text-[11px] font-bold tracking-wider transition-all ${isActive(item.path)
                                                ? 'bg-white shadow-[0_4px_12px_rgba(0,0,0,0.05)] text-[#FF6B00]'
                                                : 'text-slate-900 hover:bg-white hover:shadow-sm'
                                                }`}
                                        >
                                            <svg
                                                className={`h-4 w-4 transition-colors ${isActive(item.path) ? 'text-[#FF6B00]' : 'text-slate-700'}`}
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isActive(item.path) ? 2.5 : 2} d={item.icon} />
                                            </svg>
                                            {item.name}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* User Profile */}
                    <div className="mt-auto pt-6 relative" ref={dropdownRef}>
                        {/* Profile Card */}
                        <div
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className={`flex items-center gap-3 rounded-2xl p-2 text-left transition-all cursor-pointer border ${isDropdownOpen ? 'bg-white shadow-md border-slate-100' : 'bg-white/50 border-transparent hover:bg-white hover:shadow-sm hover:border-slate-100'}`}
                        >
                            {user?.avatar ? (
                                <img
                                    src={user.avatar}
                                    alt="User"
                                    className="h-10 w-10 rounded-xl object-cover shadow-sm bg-slate-100"
                                />
                            ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 shadow-inner font-black text-slate-500 text-sm">
                                    {getInitials(user?.firstName, user?.lastName)}
                                </div>
                            )}
                            <div className="flex-grow overflow-hidden">
                                <p className="truncate text-[13px] font-bold text-slate-800">
                                    {user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Guest User'}
                                </p>
                                <p className="truncate text-[11px] font-medium text-slate-400">
                                    {user?.email || 'guest@example.com'}
                                </p>
                            </div>
                            <svg className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>

                        {/* Logout Dropdown - Pop out to the right */}
                        {isDropdownOpen && (
                            <div className="absolute left-[calc(100%+8px)] bottom-2 w-64 origin-left rounded-2xl border border-slate-100 bg-white p-2 shadow-2xl shadow-slate-300/50 ring-1 ring-black ring-opacity-5 animate-in fade-in zoom-in-95 slide-in-from-left-4 duration-200 z-[100]">
                                <div className="space-y-1">
                                    <button
                                        onClick={() => { setIsDropdownOpen(false); navigate('/settings'); }}
                                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] font-bold text-slate-700 transition-colors hover:bg-slate-50"
                                    >
                                        <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                        </svg>
                                        Change Password
                                    </button>
                                    <button
                                        onClick={handleLogout}
                                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] font-bold text-red-500 transition-colors hover:bg-red-50"
                                    >
                                        <svg className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                        Logout
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Content Area with Page Scrolling */}
            <main className="flex-grow h-screen px-4 py-4 overflow-x-hidden overflow-y-auto scroll-smooth custom-scrollbar">
                <div className="min-h-full w-full rounded-[32px] bg-white p-8 shadow-xl shadow-slate-200/50">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
