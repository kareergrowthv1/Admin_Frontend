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

                // Level 1: roleCode is the absolute Source of Truth
                const rawPermissions = localStorage.getItem('admin_permissions') || '[]';
                const hasAtsFeatures = rawPermissions.toLowerCase().includes('"jobs"') || rawPermissions.toLowerCase().includes('"clients"');
                
                const roleCode = (parsedUser.roleCode || parsedUser.role_code || localStorage.getItem('roleCode') || localStorage.getItem('Role') || '').trim().toUpperCase();
                
                const isAtsRole = roleCode.includes('ATS') || roleCode.includes('RECRUITER');
                const isCollegeRole = roleCode === 'ADMIN' || roleCode === 'ADMINISTRATOR' || roleCode === 'SUPERADMIN' || roleCode === 'SUPER ADMINISTRATOR';
                
                const isAts = isAtsRole || (!isCollegeRole && hasAtsFeatures);
                
                // If it's ATS, isCollege MUST be false. Otherwise, trust the flag or storage.
                const isCollege = isAts ? false : (parsedUser.isCollege === true || localStorage.getItem('isCollege') === 'true');
                
                console.log(`[Layout] Role Check: roleCode="${roleCode}", isAts=${isAts}, hasAtsFeatures=${hasAtsFeatures}, isCollege=${isCollege}`);

                // Auto-repair/Sync session: Verify organization type from backend once per browser session
                if (parsedUser.organizationId && !sessionStorage.getItem('org_type_verified')) {
                    authAPI.getOrganizationInfo(parsedUser.organizationId).then(res => {
                        if (res.data?.success && res.data?.data) {
                            const inferred = res.data.data.isCollege;
                            const currentStored = localStorage.getItem('isCollege');
                            const currentInUser = parsedUser.isCollege;
                            
                            // If backend says one thing and we have another (or nothing), sync and reload
                            if (inferred !== undefined && inferred !== null) {
                                // Safeguard: Never let backend inference force a college view on an ATS role
                                const finalizedInferred = isAts ? false : !!inferred;
                                const inferredStr = finalizedInferred ? 'true' : 'false';

                                if (inferredStr !== currentStored || finalizedInferred !== currentInUser) {
                                    console.log(`[Layout] Syncing organization type: ${currentStored} -> ${inferredStr} (isAts=${isAts})`);
                                    localStorage.setItem('isCollege', inferredStr);
                                    
                                    try {
                                        const fullUser = JSON.parse(localStorage.getItem('admin_user') || '{}');
                                        fullUser.isCollege = finalizedInferred;
                                        fullUser.isAdmin = res.data.data.isAdmin ?? fullUser.isAdmin;
                                        fullUser.isSubscribed = res.data.data.isSubscribed ?? fullUser.isSubscribed;
                                        fullUser.isPlatformAdmin = res.data.data.isPlatformAdmin ?? fullUser.isPlatformAdmin;

                                        localStorage.setItem('admin_user', JSON.stringify(fullUser));
                                        
                                        // Sync separate flags too
                                        localStorage.setItem('isMainAdmin', fullUser.isAdmin ? 'true' : 'false');
                                        localStorage.setItem('isSubscribed', fullUser.isSubscribed ? 'true' : 'false');
                                        localStorage.setItem('isPlatformAdmin', fullUser.isPlatformAdmin ? 'true' : 'false');
                                    } catch (e) {}

                                    sessionStorage.setItem('org_type_verified', 'true');
                                    window.location.reload();
                                    return;
                                }
                            }
                        }
                        sessionStorage.setItem('org_type_verified', 'true');
                    }).catch(err => {
                        console.warn('Failed to verify session metadata:', err);
                        sessionStorage.setItem('org_type_verified', 'true');
                    });
                }

                const fullMenu = getNavigationForRole(isCollege);

                // Level 2: isAdmin = full menu; sub-user = filter by permissions
                const roleName = localStorage.getItem('Role') || '';
                const isAdminFlag = localStorage.getItem('is_admin') === 'true';
                const userIsAdmin = parsedUser.is_admin === true || parsedUser.isAdmin === true || parsedUser.roleCode === 'ADMIN' || parsedUser.role_name === 'Administrator';
                
                const isAdmin = parsedUser.isAdmin === true || isAdminFlag || userIsAdmin || roleName.toLowerCase() === 'administrator' || roleName.toLowerCase() === 'super administrator';
                
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
                                if (!featureKey) return false;
                                
                                const perm = permissions.find(
                                    (p) =>
                                        (p.feature_name || p.feature_key || '')
                                            .toLowerCase() === featureKey.toLowerCase()
                                );
                                return perm?.permissions?.show === true || perm?.permissions?.read === true;
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
            // clearAuthStorage already handles preserving Remember Me keys internally
            clearAuthStorage();
            dispatch(clearUser());
            navigate('/login', { replace: true });
        }
    };

    const getInitials = (firstName, lastName) => {
        if (!firstName) return 'A';
        return `${firstName[0]}${lastName?.[0] || ''}`.toUpperCase();
    };

    return (
        <div className="flex h-screen w-full bg-white font-sans overflow-hidden">
            {/* Sidebar */}
            <aside className="h-screen w-[240px] flex-shrink-0 bg-gray-100 flex flex-col overflow-visible z-50 transition-colors duration-300">
                <div className="flex flex-col h-full px-4 py-5">
                    {/* Logo Section */}
                    <div className="flex items-center gap-3 px-1 pt-2 pb-8 shrink-0">
                        <div className="flex h-[38px] w-[38px] items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm shrink-0">
                            <span className="text-[12px] font-black text-slate-800">KG</span>
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-[13px] font-black text-slate-800 leading-tight uppercase tracking-tight">KareerGrowth</span>
                            <span className="text-[10px] font-semibold text-slate-400 truncate mt-0.5 tracking-widest uppercase">Admin Portal</span>
                        </div>
                    </div>

                    {/* Nav Links */}
                    <div className="flex-grow space-y-6 px-1 overflow-y-auto custom-scrollbar no-scrollbar">
                        {navigationMenu.map((section) => (
                            <div key={section.title} className="space-y-1">
                                <h3 className="px-3 pb-1 text-[11px] font-normal tracking-wide text-slate-500 capitalize">
                                    {section.title.toLowerCase()}
                                </h3>
                                <div className="space-y-0.5">
                                    {section.items.map((item) => (
                                        <Link
                                            key={item.name}
                                            to={item.path}
                                            className={`group flex items-center gap-3.5 rounded-lg px-3 py-2 text-[13px] font-medium tracking-tight transition-all duration-200 ${isActive(item.path)
                                                ? 'bg-slate-200/50 text-slate-900 font-bold'
                                                : 'text-slate-700 hover:bg-slate-200/30 hover:text-slate-900'
                                                }`}
                                        >
                                            <svg
                                                className={`h-[18px] w-[18px] transition-colors ${isActive(item.path) ? 'text-slate-900' : 'text-slate-600 group-hover:text-slate-900'}`}
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

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col relative w-full min-w-0 border-l border-slate-200 bg-white transition-colors duration-300">
                {/* Header */}
                <header className="h-14 flex items-center justify-between px-4 border-b border-gray-100 bg-white shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex text-slate-500 p-1.5 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="9" y1="3" x2="9" y2="21"></line>
                            </svg>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[13px] font-normal text-slate-500">
                            {(() => {
                                const findItem = (sections, path) => {
                                    for (const section of sections) {
                                        const found = section.items.find(i => i.path === path || (path !== '/' && path.startsWith(i.path)));
                                        if (found) return found;
                                    }
                                    return null;
                                };
                                const item = findItem(navigationMenu, location.pathname);
                                const params = new URLSearchParams(location.search);
                                let dynamicTitle = null;

                                if (location.pathname === '/attendance' || location.pathname === '/attendance/') {
                                    dynamicTitle = 'Departments';
                                } else if (location.pathname.startsWith('/attendance/branches')) {
                                    dynamicTitle = 'Department Branch';
                                } else if (location.pathname.startsWith('/attendance/subjects')) {
                                    dynamicTitle = 'Subjects';
                                } else if (location.pathname.startsWith('/attendance/sheet')) {
                                    dynamicTitle = 'Attendance Sheet';
                                }

                                const label = dynamicTitle || (item ? item.name : decodeURIComponent(location.pathname.split('/').filter(Boolean).pop() || 'Dashboard').replace(/-/g, ' '));
                                return (
                                    <span className="capitalize text-slate-900 font-bold tracking-tight">
                                        {label}
                                    </span>
                                );
                            })()}
                        </div>
                    </div>
                    <div className="flex items-center gap-4" id="header-actions">
                        {/* Actions will be portaled here */}
                    </div>
                </header>

                {/* Main Content Area - Scrollable INSIDE the gray box */}
                <div className="flex-1 flex flex-col overflow-hidden relative">
                    <div className="flex-1 p-3 md:p-4 overflow-hidden">
                        <div className="w-full h-full rounded-[18px] bg-gray-100 flex flex-col overflow-hidden relative transition-colors duration-300">
                            {/* Inner Shadow Overlay (stays on top of scrolling content and fixed gaps) */}
                            <div className="absolute inset-0 rounded-[18px] shadow-inner pointer-events-none z-20"></div>

                            {/* Fixed Top Gap */}
                            <div className="h-3 md:h-4 w-full shrink-0 bg-gray-100 z-10"></div>
                            
                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto overflow-x-auto scroll-smooth custom-scrollbar px-3 md:px-4 transition-colors duration-300">
                                {children}
                            </div>

                            {/* Fixed Bottom Gap */}
                            <div className="h-3 md:h-4 w-full shrink-0 bg-gray-100 z-10"></div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Layout;
