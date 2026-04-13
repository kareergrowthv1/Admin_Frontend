import React, { useState, useEffect, useRef } from 'react';
import { 
    Search, UserPlus, Shield, Edit2, Trash2, Eye, Plus, 
    Users, Filter, RefreshCw, MoreVertical, X, Check,
    ChevronLeft, ChevronRight, Mail, Phone, Calendar,
    Briefcase, GraduationCap, CheckSquare
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../features/auth/authAPI';
import PermissionWrapper from '../../components/common/PermissionWrapper';
import Pagination from '../../components/common/Pagination';
import { getFeatureDataScope, getLoggedInUserId } from '../../utils/permissionUtils';

const MyTeam = ({ defaultTab = 'members', hideTabs = false }) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState(defaultTab); // 'members' or 'roles'
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(null); // 'member', 'role', or null
    const [openMenuId, setOpenMenuId] = useState(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    
    const [newUser, setNewUser] = useState({
        email: '', password: '', firstName: '', lastName: '', phoneNumber: '', roleId: ''
    });
    const [selectedItem, setSelectedItem] = useState(null);
    const [newRole, setNewRole] = useState({
        name: '', code: '', description: ''
    });

    const [showFilters, setShowFilters] = useState(false);
    const [advancedFilters, setAdvancedFilters] = useState({
        roleIds: [],
        statuses: [],
        permissions: [] // For roles tab
    });
    const filterRef = useRef(null);

    const orgId = localStorage.getItem('organizationId');
    const menuRef = useRef(null);

    useEffect(() => {
        fetchData();
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setOpenMenuId(null);
            }
            if (filterRef.current && !filterRef.current.contains(e.target)) {
                setShowFilters(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const userParams = {};
            if (getFeatureDataScope('myTeam') === 'OWN') {
                userParams.createdBy = getLoggedInUserId();
            }

            const roleParams = {};
            if (getFeatureDataScope('roles') === 'OWN') {
                roleParams.createdBy = getLoggedInUserId();
            }

            const [usersRes, rolesRes] = await Promise.all([
                authAPI.getUsersByOrganizationId(orgId, userParams),
                authAPI.getRolesByOrganizationId(orgId, roleParams)
            ]);
            setUsers(usersRes.data.data || []);
            setRoles(rolesRes.data.data || []);
        } catch (error) {
            console.error('Error fetching team data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateMember = async (e) => {
        e.preventDefault();
        try {
            if (selectedItem) {
                await authAPI.updateOrganizationUser(orgId, selectedItem.id, newUser);
            } else {
                await authAPI.createOrganizationUser(orgId, newUser);
            }
            setShowAddModal(null);
            setSelectedItem(null);
            setNewUser({ email: '', password: '', firstName: '', lastName: '', phoneNumber: '', roleId: '' });
            fetchData();
        } catch (error) {
            console.error('Error saving member:', error);
        }
    };

    const handleCreateRole = async (e) => {
        e.preventDefault();
        try {
            await authAPI.createOrganizationRole(orgId, newRole);
            setShowAddModal(null);
            setNewRole({ name: '', code: '', description: '' });
            fetchData();
        } catch (error) {
            console.error('Error creating role:', error);
        }
    };

    const handleToggleStatus = async (user) => {
        try {
            await authAPI.updateOrganizationUser(orgId, user.id, { isActive: !user.is_active });
            fetchData();
        } catch (error) {
            console.error('Error toggling user status:', error);
        }
    };

    const handleEditMember = (item) => {
        setSelectedItem(item);
        setNewUser({
            firstName: item.first_name,
            lastName: item.last_name,
            email: item.email,
            phoneNumber: item.phone_number,
            roleId: item.role_id,
            password: '' // Keep empty for edits
        });
        setShowAddModal('member');
    };

    const filteredData = (activeTab === 'members' ? users : roles).filter(item => {
        const searchStr = activeTab === 'members' 
            ? `${item.first_name} ${item.last_name} ${item.email}`.toLowerCase()
            : `${item.name} ${item.code}`.toLowerCase();
        
        if (searchTerm && !searchStr.includes(searchTerm.toLowerCase())) return false;

        if (activeTab === 'members') {
            if (advancedFilters.roleIds.length > 0 && !advancedFilters.roleIds.includes(item.role_id)) return false;
            if (advancedFilters.statuses.length > 0) {
                const status = item.is_active ? 'Active' : 'Inactive';
                if (!advancedFilters.statuses.includes(status)) return false;
            }
        }

        if (activeTab === 'roles') {
            if (advancedFilters.permissions.length > 0) {
                const rolePerms = item.permissions_scopes?.map(p => p.feature_name) || [];
                if (!advancedFilters.permissions.some(p => rolePerms.includes(p))) return false;
            }
        }

        return true;
    });

    const paginatedData = filteredData.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);

    return (
        <div className="space-y-6 pt-2 pb-12">
            {!hideTabs && (
                <div className="flex items-center gap-8 border-b border-slate-100 overflow-x-auto no-scrollbar">
                    {['members', 'roles'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => {
                                setActiveTab(tab);
                                setCurrentPage(0);
                                setSearchTerm('');
                            }}
                            className={`relative pb-2 flex items-center gap-2 transition-all group shrink-0 ${activeTab === tab ? 'text-blue-600 font-normal' : 'text-slate-900 font-normal hover:text-slate-900'}`}
                        >
                            <span className="text-xs uppercase tracking-wider">{tab}</span>
                            {activeTab === tab && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                            )}
                        </button>
                    ))}
                </div>
            )}

            {/* Filters Bar */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[200px]">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                        type="text"
                        placeholder={`Search ${activeTab === 'members' ? 'members by name or email...' : 'roles by name or code...'}`}
                        className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-600 placeholder-slate-400 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(0);
                        }}
                    />
                </div>

                <div className="flex items-center gap-3">
                <div className="flex items-center gap-3 relative" ref={filterRef}>
                    <button 
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 bg-white border ${showFilters ? 'border-blue-400 ring-2 ring-blue-50 text-blue-600' : 'border-slate-200 text-slate-600'} rounded-lg px-4 py-2.5 text-xs font-bold hover:bg-slate-50 transition-all shadow-sm`}
                    >
                        <Filter size={16} />
                        More Filters
                        {(advancedFilters.roleIds.length > 0 || advancedFilters.statuses.length > 0) && (
                            <span className="ml-1 w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                        )}
                    </button>

                    {showFilters && (
                        <div className="absolute top-full right-0 mt-2 w-[280px] bg-white rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.1)] border border-slate-100 z-[100] animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                            <div className="p-4 space-y-5 max-h-[420px] overflow-y-auto no-scrollbar">
                                {activeTab === 'members' ? (
                                    <>
                                        <div className="space-y-2.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Roles</label>
                                            <div className="grid grid-cols-1 gap-2">
                                                {roles.map((role) => (
                                                    <label key={role.id} className="flex items-center gap-2 cursor-pointer group">
                                                        <input
                                                            type="checkbox"
                                                            checked={advancedFilters.roleIds.includes(role.id)}
                                                            onChange={(e) => {
                                                                const newVal = e.target.checked 
                                                                    ? [...advancedFilters.roleIds, role.id] 
                                                                    : advancedFilters.roleIds.filter(i => i !== role.id);
                                                                setAdvancedFilters({ ...advancedFilters, roleIds: newVal });
                                                            }}
                                                            className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                                                        />
                                                        <span className="text-xs text-slate-600 group-hover:text-slate-900 transition-colors truncate">{role.name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-2.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</label>
                                            <div className="grid grid-cols-1 gap-2">
                                                {['Active', 'Inactive'].map((s) => (
                                                    <label key={s} className="flex items-center gap-2 cursor-pointer group">
                                                        <input
                                                            type="checkbox"
                                                            checked={advancedFilters.statuses.includes(s)}
                                                            onChange={(e) => {
                                                                const newVal = e.target.checked 
                                                                    ? [...advancedFilters.statuses, s] 
                                                                    : advancedFilters.statuses.filter(i => i !== s);
                                                                setAdvancedFilters({ ...advancedFilters, statuses: newVal });
                                                            }}
                                                            className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                                                        />
                                                        <span className="text-xs text-slate-600 group-hover:text-slate-900 transition-colors uppercase">{s}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                        <div className="space-y-2.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Feature Access</label>
                                            <div className="grid grid-cols-1 gap-2">
                                                {['myTeam', 'roles', 'attendance', 'students', 'candidates', 'positions', 'tasks', 'inbox'].map((feature) => (
                                                    <label key={feature} className="flex items-center gap-2 cursor-pointer group">
                                                        <input
                                                            type="checkbox"
                                                            checked={advancedFilters.permissions.includes(feature)}
                                                            onChange={(e) => {
                                                                const newVal = e.target.checked 
                                                                    ? [...advancedFilters.permissions, feature] 
                                                                    : advancedFilters.permissions.filter(i => i !== feature);
                                                                setAdvancedFilters({ ...advancedFilters, permissions: newVal });
                                                            }}
                                                            className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                                                        />
                                                        <span className="text-xs text-slate-600 group-hover:text-slate-900 transition-colors uppercase">{feature}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                )}
                            </div>

                            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                                <button 
                                    onClick={() => {
                                        setAdvancedFilters({ roleIds: [], statuses: [], permissions: [] });
                                    }}
                                    className="text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    Reset
                                </button>
                                <button 
                                    onClick={() => setShowFilters(false)}
                                    className="px-3 py-1.5 bg-blue-600 text-white text-[10px] font-bold rounded-md hover:bg-blue-700 transition-all shadow-sm active:scale-95"
                                >
                                    Apply Filters
                                </button>
                            </div>
                        </div>
                    )}

                    <button 
                        onClick={fetchData}
                        className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors shadow-sm"
                        title="Refresh"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>

                    {activeTab === 'members' && (
                        <PermissionWrapper feature="myTeam" permission="write">
                            <button 
                                onClick={() => setShowAddModal('member')}
                                className="flex items-center gap-2 px-5 py-2.5 text-[11px] font-bold tracking-wide rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-md shadow-blue-200 active:scale-95"
                            >
                                <UserPlus size={18} />
                                New Member
                            </button>
                        </PermissionWrapper>
                    )}

                    {activeTab === 'roles' && (
                        <PermissionWrapper feature="roles" permission="write">
                            <button 
                                onClick={() => navigate('/roles/new')}
                                className="flex items-center gap-2 px-5 py-2.5 text-[11px] font-bold tracking-wide rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-md shadow-blue-200 active:scale-95"
                            >
                                <Plus size={18} />
                                New Role
                            </button>
                        </PermissionWrapper>
                    )}
                </div>
            </div>
        </div>

            {/* Table Container */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-200">
                            {activeTab === 'members' ? (
                                <>
                                    <th className="pl-8 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Member</th>
                                    <th className="px-4 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">Role</th>
                                    <th className="px-4 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">Contact</th>
                                    <th className="px-2 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center whitespace-nowrap">Positions</th>
                                    <th className="px-2 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center whitespace-nowrap">Candidates</th>
                                    <th className="px-2 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center whitespace-nowrap">Students</th>
                                    <th className="px-2 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center whitespace-nowrap">Tasks</th>
                                    <th className="px-4 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">Status</th>
                                    <th className="px-4 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">Actions</th>
                                </>
                            ) : (
                                <>
                                    <th className="pl-8 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Role Name</th>
                                    <th className="px-4 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">Code</th>
                                    <th className="px-6 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-left">Permissions</th>
                                    <th className="px-4 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">Created Date</th>
                                    <th className="px-4 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">Actions</th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {loading ? (
                            [...Array(6)].map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={6} className="px-8 py-6">
                                        <div className="h-10 bg-slate-100 rounded-lg w-full" />
                                    </td>
                                </tr>
                            ))
                        ) : paginatedData.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-8 py-12 text-center text-slate-400">
                                    No {activeTab} found
                                </td>
                            </tr>
                        ) : (
                            paginatedData.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-100/40 transition-colors group">
                                    {activeTab === 'members' ? (
                                        <>
                                            <td className="pl-8 py-4">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 overflow-hidden">
                                                        <img
                                                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${item.first_name || 'Member'}`}
                                                            alt={item.first_name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-sm text-black group-hover:text-blue-600 transition-colors truncate">
                                                            {item.first_name} {item.last_name}
                                                        </div>
                                                        <div className="text-[11px] text-black/60 truncate">{item.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-normal text-blue-700">
                                                    {item.role_name || 'No Role'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <div className="text-xs font-normal text-black">{item.phone_number || 'N/A'}</div>
                                            </td>
                                            <td className="px-2 py-4 text-center">
                                                <div 
                                                    onClick={() => navigate(`/positions?userId=${item.id}&userName=${item.first_name} ${item.last_name}`)}
                                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 shadow-sm whitespace-nowrap cursor-pointer hover:bg-indigo-100 transition-colors"
                                                >
                                                    <Briefcase size={13} className="opacity-70" />
                                                    <span className="text-xs font-bold">{item.positions_count || 0}</span>
                                                </div>
                                            </td>
                                            <td className="px-2 py-4 text-center">
                                                <div 
                                                    onClick={() => navigate(`/candidates?userId=${item.id}&userName=${item.first_name} ${item.last_name}`)}
                                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-purple-50 border border-purple-100 text-purple-700 shadow-sm whitespace-nowrap cursor-pointer hover:bg-purple-100 transition-colors"
                                                >
                                                    <Users size={13} className="opacity-70" />
                                                    <span className="text-xs font-bold">{item.candidates_count || 0}</span>
                                                </div>
                                            </td>
                                            <td className="px-2 py-4 text-center">
                                                <div 
                                                    onClick={() => navigate(`/students?userId=${item.id}&userName=${item.first_name} ${item.last_name}`)}
                                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-blue-50 border border-blue-100 text-blue-700 shadow-sm whitespace-nowrap cursor-pointer hover:bg-blue-100 transition-colors"
                                                >
                                                    <GraduationCap size={13} className="opacity-70" />
                                                    <span className="text-xs font-bold">{item.students_count || 0}</span>
                                                </div>
                                            </td>
                                            <td className="px-2 py-4 text-center">
                                                <div 
                                                    onClick={() => navigate(`/tasks?userId=${item.id}&userName=${item.first_name} ${item.last_name}`)}
                                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 shadow-sm whitespace-nowrap cursor-pointer hover:bg-emerald-100 transition-colors"
                                                >
                                                    <CheckSquare size={13} className="opacity-70" />
                                                    <span className="text-xs font-bold">{item.tasks_count || 0}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${item.is_active ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${item.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                                                    {item.is_active ? 'ACTIVE' : 'INACTIVE'}
                                                </div>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="pl-8 py-4">
                                                <div className="text-sm text-black group-hover:text-blue-600 transition-colors">{item.name}</div>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <span className="text-xs font-normal text-black uppercase tracking-tight">{item.code}</span>
                                            </td>
                                            <td className="px-6 py-4 text-left max-w-[300px]">
                                                {(() => {
                                                    const permsArray = item.permissions_scopes?.map(s => {
                                                        const activePerms = [];
                                                        if (s.permissions.read) activePerms.push('R');
                                                        if (s.permissions.write) activePerms.push('W');
                                                        if (s.permissions.update) activePerms.push('U');
                                                        if (s.permissions.delete) activePerms.push('D');
                                                        if (s.permissions.export) activePerms.push('E');
                                                        if (s.permissions.import) activePerms.push('I');
                                                        
                                                        if (activePerms.length > 0) {
                                                            if (s.data_scope) activePerms.push(s.data_scope.toLowerCase());
                                                            return `${s.feature_name} (${activePerms.join(',')})`;
                                                        } else if (s.dashboard_options) {
                                                            const activeDash = Object.entries(s.dashboard_options).filter(([k,v]) => v).map(([k]) => k.replace('_', ' '));
                                                            if (activeDash.length > 0) {
                                                                return `${s.feature_name} (${activeDash.join(', ')})`;
                                                            }
                                                        }
                                                        return null;
                                                    }).filter(Boolean) || [];
                                                    const permString = permsArray.length > 0 ? permsArray.join(', ') : 'No Permissions';
                                                    return (
                                                        <div 
                                                            className="text-[13px] text-slate-600 truncate group-hover:text-slate-900 transition-colors cursor-default" 
                                                            title={permString}
                                                        >
                                                            {permString}
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <span className="text-xs font-normal text-black">
                                                    {new Date(item.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </span>
                                            </td>
                                        </>
                                    )}
                                        <td className="px-4 py-4 text-center">
                                            <div className="flex justify-center relative">
                                                <button 
                                                    onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                                                    className={`p-1.5 rounded-lg transition-all ${openMenuId === item.id ? 'bg-slate-100 text-blue-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                                                >
                                                    <MoreVertical size={18} />
                                                </button>
                                                
                                                {openMenuId === item.id && (
                                                    <div 
                                                        ref={menuRef}
                                                        className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-200"
                                                    >
                                                        <PermissionWrapper feature={activeTab === 'members' ? 'myTeam' : 'roles'} permission="show">
                                                            <button 
                                                                onClick={() => {/* handle view */}}
                                                                className="w-full text-left px-4 py-2.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
                                                            >
                                                                <Eye size={14} className="text-slate-400" /> View Details
                                                            </button>
                                                        </PermissionWrapper>

                                                        <PermissionWrapper feature={activeTab === 'members' ? 'myTeam' : 'roles'} permission="update">
                                                            <button 
                                                                onClick={() => {
                                                                    if (activeTab === 'roles') {
                                                                        navigate(`/roles/edit/${item.id}`);
                                                                    } else {
                                                                        handleEditMember(item);
                                                                    }
                                                                    setOpenMenuId(null);
                                                                }}
                                                                className="w-full text-left px-4 py-2.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
                                                            >
                                                                <Edit2 size={14} className="text-slate-400" /> Edit Member
                                                            </button>
                                                        </PermissionWrapper>

                                                        <div className="my-1 border-t border-slate-50" />
                                                        
                                                        <PermissionWrapper feature={activeTab === 'members' ? 'myTeam' : 'roles'} permission="update">
                                                            <button 
                                                                onClick={() => {
                                                                    handleToggleStatus(item);
                                                                    setOpenMenuId(null);
                                                                }}
                                                                className={`w-full text-left px-4 py-2.5 text-[11px] font-bold flex items-center gap-2.5 transition-colors ${item.is_active ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                                                            >
                                                                {item.is_active ? (
                                                                    <>
                                                                        <X size={14} /> Deactivate
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Check size={14} /> Activate
                                                                    </>
                                                                )}
                                                            </button>
                                                        </PermissionWrapper>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

            {/* Pagination / Footer Info */}
            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                pageSize={itemsPerPage}
                totalElements={filteredData.length}
            />

            {/* Add Modal (Member/Role) */}
            {showAddModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="w-full max-w-lg rounded-[2rem] bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="mb-8 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                                    {selectedItem ? 'Edit Member' : (showAddModal === 'member' ? 'Add New Member' : 'Add New Role')}
                                </h2>
                                <p className="text-sm text-slate-500">
                                    {selectedItem ? 'Update the details for this team member.' : 'Provide the required details to expand your team.'}
                                </p>
                            </div>
                            <button 
                                onClick={() => {
                                    setShowAddModal(null);
                                    setSelectedItem(null);
                                    setNewUser({ email: '', password: '', firstName: '', lastName: '', phoneNumber: '', roleId: '' });
                                }} 
                                className="rounded-full bg-slate-50 p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        
                        {showAddModal === 'member' && (
                            <form onSubmit={handleCreateMember} className="grid grid-cols-2 gap-5">
                                <div className="col-span-1 space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 pl-1">First Name</label>
                                    <input type="text" required value={newUser.firstName} onChange={(e) => setNewUser({...newUser, firstName: e.target.value})} className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all" />
                                </div>
                                <div className="col-span-1 space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 pl-1">Last Name</label>
                                    <input type="text" required value={newUser.lastName} onChange={(e) => setNewUser({...newUser, lastName: e.target.value})} className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all" />
                                </div>
                                <div className="col-span-2 space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 pl-1">Email Address</label>
                                    <input type="email" required value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all" />
                                </div>
                                <div className="col-span-1 space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 pl-1">Password</label>
                                    <input type="password" required value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all" />
                                </div>
                                <div className="col-span-1 space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 pl-1">Phone</label>
                                    <input type="text" value={newUser.phoneNumber} onChange={(e) => setNewUser({...newUser, phoneNumber: e.target.value})} className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all" />
                                </div>
                                <div className="col-span-2 space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 pl-1">Assigned Role</label>
                                    <select required value={newUser.roleId} onChange={(e) => setNewUser({...newUser, roleId: e.target.value})} className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm focus:border-blue-600 focus:bg-white focus:outline-none transition-all appearance-none cursor-pointer">
                                        <option value="">Select a role...</option>
                                        {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-2 flex justify-end gap-3 pt-6 border-t border-slate-100 mt-2">
                                    <button 
                                        type="button" 
                                        onClick={() => {
                                            setShowAddModal(null);
                                            setSelectedItem(null);
                                            setNewUser({ email: '', password: '', firstName: '', lastName: '', phoneNumber: '', roleId: '' });
                                        }} 
                                        className="rounded-xl px-6 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button type="submit" className="rounded-xl bg-blue-600 px-8 py-2.5 text-sm font-bold text-white hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all">
                                        {selectedItem ? 'Update Member' : 'Add Member'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyTeam;
