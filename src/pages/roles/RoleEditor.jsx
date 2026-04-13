import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
    ChevronLeft,
    Shield,
    Layout as LayoutIcon,
    Lock,
    Database,
    Info,
    Check,
    X,
    HelpCircle
} from 'lucide-react';
import { authAPI } from '../../features/auth/authAPI';
import toast from 'react-hot-toast';
import PermissionWrapper from '../../components/common/PermissionWrapper';

const RoleEditor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = !!id;

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [roleName, setRoleName] = useState('');
    const [description, setDescription] = useState('');
    const [roleCode, setRoleCode] = useState('');
    const [status, setStatus] = useState('Active');
    const [features, setFeatures] = useState([]);
    const [rolePermissions, setRolePermissions] = useState([]);
    const [dashboardOptions, setDashboardOptions] = useState({
        dashboard_page: true,
        positions_stats: true,
        candidates_stats: true,
        students_stats: true,
        users_stats: true,
        attendance_stats: true,
        tasks_stats: true,
        new_position_btn: true,
        add_candidate_btn: true,
        analytics_chart: true,
        activity_feed: true,
        volume_chart: true,
        performance_radar: true,
        recent_positions: true,
        recent_students: true,
        recent_interviews: true,
        recent_tasks: true,
    });

    const permissionTypes = [
        { id: 'read', label: 'READ' },
        { id: 'create', label: 'CREATE' },
        { id: 'update', label: 'UPDATE' },
        { id: 'delete', label: 'DELETE' },
        { id: 'export', label: 'EXPORT' },
        { id: 'import', label: 'IMPORT' }
    ];

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch all features first
                const featureRes = await authAPI.getFeatures();
                if (featureRes.data.success) {
                    setFeatures(featureRes.data.data);
                }

                if (isEdit) {
                    const res = await authAPI.getRolePermissions(id);
                    if (res.data.success) {
                        const { role } = res.data.data;
                        setRoleName(role.name);
                        setDescription(role.description || '');
                        setRoleCode(role.code || '');
                        setStatus(role.is_active === 0 ? 'Inactive' : 'Active');

                        // Merge all system features with existing role permissions
                        const mergedPerms = featureRes.data.data.map(f => {
                            const existing = (role.permissions || []).find(p => 
                                (p.feature_key && p.feature_key.toLowerCase() === f.feature_key.toLowerCase()) || 
                                p.feature_id === f.id
                            );
                            return {
                                feature_id: f.id,
                                feature_key: f.feature_key,
                                feature_name: f.name,
                                permissions: existing ? {
                                    read: (existing.permissions.read || existing.permissions.show) ?? false,
                                    create: existing.permissions.create ?? false,
                                    update: existing.permissions.update ?? false,
                                    delete: existing.permissions.delete ?? false,
                                    export: existing.permissions.export ?? false,
                                    import: existing.permissions.import ?? false,
                                } : {
                                    read: false, create: false, update: false, delete: false, export: false, import: false
                                },
                                data_scope: existing?.data_scope || 'ALL',
                                dashboard_options: existing?.dashboard_options || {}
                            };
                        });
                        setRolePermissions(mergedPerms);

                        // Use dashboard options from the 'dashboard' feature if available
                        const dashPerm = (role.permissions || []).find(p => p.feature_key && p.feature_key.toLowerCase() === 'dashboard');
                        if (dashPerm && dashPerm.dashboard_options) {
                            setDashboardOptions(prev => ({ ...prev, ...dashPerm.dashboard_options }));
                        }
                    }
                } else {
                    // Default permissions for new role
                    const defaultPerms = featureRes.data.data.map(f => ({
                        feature_id: f.id,
                        feature_key: f.feature_key,
                        feature_name: f.name,
                        permissions: {
                            read: false,
                            create: false,
                            update: false,
                            delete: false,
                            export: false,
                            import: false
                        },
                        data_scope: 'ALL',
                        dashboard_options: {}
                    }));
                    setRolePermissions(defaultPerms);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                toast.error('Failed to load role data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id, isEdit]);

    const handleTogglePermission = (featureId, type) => {
        setRolePermissions(prev => {
            const feature = prev.find(p => p.feature_id === featureId);
            if (!feature) return prev;
            
            const newVal = !feature.permissions[type];
            const academicFeatures = ['departments', 'branches', 'subjects', 'students'];
            const isAttendance = feature.feature_key.toLowerCase() === 'attendance';
            
            return prev.map(p => {
                // If it's the target feature OR (it's an academic sub-feature and we're toggling attendance)
                if (p.feature_id === featureId || (isAttendance && academicFeatures.includes(p.feature_key.toLowerCase()))) {
                    const updatedPerms = { ...p.permissions, [type]: newVal };

                    // Logic: If enabling WRITE/UPDATE etc, also enable READ
                    if (newVal && (type === 'create' || type === 'update' || type === 'delete' || type === 'export' || type === 'import')) {
                        updatedPerms.read = true;
                    }

                    return { ...p, permissions: updatedPerms };
                }
                return p;
            });
        });
    };

    const handleToggleAllPermissions = (featureId, val) => {
        setRolePermissions(prev => {
            const feature = prev.find(p => p.feature_id === featureId);
            if (!feature) return prev;

            const academicFeatures = ['departments', 'branches', 'subjects', 'students'];
            const isAttendance = feature.feature_key.toLowerCase() === 'attendance';

            return prev.map(p => {
                if (p.feature_id === featureId || (isAttendance && academicFeatures.includes(p.feature_key.toLowerCase()))) {
                    const updatedPerms = {};
                    permissionTypes.forEach(t => updatedPerms[t.id] = val);
                    return { ...p, permissions: updatedPerms };
                }
                return p;
            });
        });
    };

    const handleToggleDataScope = (featureId, scope) => {
        setRolePermissions(prev => {
            const feature = prev.find(p => p.feature_id === featureId);
            if (!feature) return prev;
            
            const academicFeatures = ['departments', 'branches', 'subjects', 'students'];
            const isAttendance = feature.feature_key.toLowerCase() === 'attendance';
            
            return prev.map(p => {
                if (p.feature_id === featureId || (isAttendance && academicFeatures.includes(p.feature_key.toLowerCase()))) {
                    return { ...p, data_scope: scope };
                }
                return p;
            });
        });
    };

    const handleToggleDashboardOption = (optionId) => {
        setDashboardOptions(prev => ({
            ...prev,
            [optionId]: !prev[optionId]
        }));
    };

    const handleSave = async () => {
        if (!roleName.trim()) {
            toast.error('Please enter a role name');
            return;
        }

        setSaving(true);
        try {
            // 1. Prepare permissions payload
            const permissionsPayload = rolePermissions.map(p => {
                // Construct bitmask carefully
                let bitmask = 0;
                if (p.permissions.read) {
                    bitmask |= 1; // READ bit
                    bitmask |= 64; // SHOW bit (Internal logic)
                }
                if (p.permissions.create) bitmask |= 2;
                if (p.permissions.update) bitmask |= 4;
                if (p.permissions.delete) bitmask |= 8;
                if (p.permissions.export) bitmask |= 16;
                if (p.permissions.import) bitmask |= 32;

                const isDashboard = p.feature_key.toLowerCase() === 'dashboard';

                return {
                    featureId: p.feature_id,
                    permissionsBitmask: bitmask,
                    dataScope: p.data_scope,
                    dashboardOptions: isDashboard ? dashboardOptions : null,
                    // Pass full permissions object for extra clarity in future transformations
                    permissions: p.permissions
                };
            });

            // 2. Save Role & Permissions
            let roleId = id;
            if (!isEdit) {
                // For a new role, do atomic creation (POST includes role details + permissions)
                const orgId = localStorage.getItem('organizationId');
                const roleCode = roleName.trim().toUpperCase().replace(/\s+/g, '_');
                const roleRes = await authAPI.createOrganizationRole(orgId, { 
                    name: roleName, 
                    code: roleCode,
                    description: description,
                    status: status,
                    permissions: permissionsPayload
                });
                if (roleRes.data.success) {
                    roleId = roleRes.data.data.id;
                }
            } else {
                // For an existing role, update permissions AND metadata
                await authAPI.updateRolePermissions(roleId, permissionsPayload, {
                    name: roleName,
                    description: description,
                    status: status
                });
            }

            toast.success(`Role ${isEdit ? 'updated' : 'created'} successfully`);
            navigate('/roles');
        } catch (error) {
            console.error('Error saving role:', error);
            toast.error('Failed to save role');
        } finally {
            setSaving(true); // Keep as true for a split second to avoid double clicks
            setTimeout(() => setSaving(false), 500);
        }
    };

    // Standard sections aligned with the 8 core features
    const isCollege = JSON.parse(localStorage.getItem('admin_user') || '{}').isCollege === true;

    const dashboardSections = [
        { id: 'dashboard_page', name: 'Dashboard Home', required: 'None (Everyone)', alwaysVisible: true },
        
        // Stat Cards
        { id: 'positions_stats', name: isCollege ? 'Positions Overview' : 'Jobs Overview', required: isCollege ? 'Positions:READ' : 'Jobs:READ' },
        { id: 'candidates_stats', name: 'Candidates Overview', required: 'Candidates:READ' },
        { id: 'students_stats', name: 'Students Overview', required: 'Students:READ' },
        { id: 'users_stats', name: 'Users/Team Stats', required: 'Users:READ' },
        { id: 'attendance_stats', name: 'Attendance Stats', required: 'Attendance:READ' },
        { id: 'tasks_stats', name: 'Tasks Overview', required: 'Tasks:READ' },
        
        // Action Shortcuts
        { id: 'new_position_btn', name: isCollege ? 'Shortcut: New Position' : 'Shortcut: New Job', required: isCollege ? 'Positions:WRITE' : 'Jobs:WRITE' },
        { id: 'add_candidate_btn', name: 'Shortcut: Add Candidate', required: 'Candidates:WRITE' },

        // Charts & Analysis
        { id: 'analytics_chart', name: 'Performance Analysis (Chart)', required: 'None (Requires Data)' },
        { id: 'activity_feed', name: 'Recent Activity Feed', required: 'None' },
        { id: 'volume_chart', name: 'Daily Volume Trend (Chart)', required: 'None' },
        { id: 'performance_radar', name: 'Interview Performance (Radar)', required: 'None' },

        // Recent Grids
        { id: 'recent_positions', name: 'Recent Positions List', required: isCollege ? 'Positions:READ' : 'Jobs:READ' },
        { id: 'recent_students', name: 'Recent Students List', required: 'Students:READ' },
        { id: 'recent_interviews', name: 'Recent Interviews List', required: 'Candidates:READ' },
        { id: 'recent_tasks', name: 'Recent Tasks List', required: 'Tasks:READ' },
    ];

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pt-4 pb-12">
            
            {/* Basic Information: Card */}
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2.5">
                        <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em] pl-1">Role Name</label>
                        <input
                            type="text"
                            value={roleName}
                            onChange={(e) => setRoleName(e.target.value)}
                            placeholder="e.g. Admin, Recruiter"
                            className="w-full px-5 py-3 rounded-xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all text-sm font-semibold text-slate-900"
                        />
                    </div>
                    {isEdit ? (
                        <div className="space-y-2.5">
                            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em] pl-1">Role Code</label>
                            <input
                                type="text"
                                value={roleCode}
                                readOnly
                                className="w-full px-5 py-3 rounded-xl border border-slate-100 bg-slate-50 transition-all text-sm font-bold text-blue-600 outline-none"
                            />
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em] pl-1">Lifecycle Status</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full px-5 py-3 rounded-xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all text-sm font-semibold text-slate-900 appearance-none cursor-pointer"
                            >
                                <option value="Active">Operational (Active)</option>
                                <option value="Inactive">Restricted (Inactive)</option>
                            </select>
                        </div>
                    )}
                    <div className="col-span-2 space-y-2.5">
                        <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em] pl-1">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What are the responsibilities and access levels of this role?"
                            rows={3}
                            className="w-full px-5 py-3 rounded-xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all text-sm font-normal text-slate-600 resize-none"
                        />
                    </div>
                </div>
            </div>

            {/* Dashboard Navigation Card */}
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                <div className="space-y-6">
                    <div className="border-b border-slate-100 pb-4">
                        <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Dashboard Components</h3>
                    </div>
                    <table className="w-full border-collapse">
                        <thead>
                            <tr>
                                <th className="text-left py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-1/3">Interface Element</th>
                                <th className="text-left py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-1/3">RBAC Dependency</th>
                                <th className="text-right py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Toggle</th>
                            </tr>
                        </thead>
                        <tbody className="">
                            {dashboardSections.map(section => (
                                <tr key={section.id} className="group transition-all">
                                    <td className="py-2 pr-8">
                                        <div className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{section.name}</div>
                                    </td>
                                    <td className="py-2 pr-8">
                                        <span className="text-[11px] text-slate-500 font-normal bg-slate-50 px-2 py-1 rounded-md border border-slate-100 shadow-sm">
                                            {section.required}
                                        </span>
                                    </td>
                                    <td className="py-2 text-right">
                                        {section.alwaysVisible ? (
                                            <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-[9px] font-bold uppercase tracking-widest border border-emerald-100">
                                                Always Visible
                                            </span>
                                        ) : (
                                            <div className="flex items-center justify-end gap-3">
                                                <span className={`text-[10px] font-bold uppercase tracking-widest transition-all ${!dashboardOptions[section.id] ? 'text-slate-900' : 'text-slate-300'}`}>No</span>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only peer"
                                                        checked={dashboardOptions[section.id] || false}
                                                        onChange={() => handleToggleDashboardOption(section.id)}
                                                    />
                                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 shadow-inner"></div>
                                                </label>
                                                <span className={`text-[10px] font-bold uppercase tracking-widest transition-all ${dashboardOptions[section.id] ? 'text-slate-900' : 'text-slate-300'}`}>Yes</span>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Module Permissions Card */}
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                <div className="space-y-6">
                    <div className="border-b border-slate-100 pb-4">
                        <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Functional Operations</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr>
                                    <th className="text-left py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider sticky left-0 bg-white z-10 w-[200px]">System Module</th>
                                    {permissionTypes.map(t => (
                                        <th key={t.id} className="text-center px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{t.label}</th>
                                    ))}
                                    <th className="text-center px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Scope</th>
                                    <th className="text-center py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-[120px]">Bulk</th>
                                </tr>
                            </thead>
                            <tbody className="">
                                {rolePermissions
                                    .filter(p => {
                                        const allowed = [
                                            'dashboard', 'positions', 'jobs', 'candidates', 
                                            'tasks', 'roles', 'users', 'inbox', 'settings', 'massemail'
                                        ];
                                        if (isCollege) {
                                            allowed.push('students', 'attendance', 'departments', 'branches', 'subjects');
                                        }
                                        return allowed.includes(p.feature_key.toLowerCase());
                                    })
                                    .map(p => (
                                    <tr key={p.feature_id} className="group transition-all">
                                        <td className="py-2 sticky left-0 bg-white z-10 font-semibold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                                            {
                                                p.feature_key.toLowerCase() === 'users' ? 'Users' : 
                                                p.feature_key.toLowerCase() === 'roles' ? 'Role Management' : 
                                                p.feature_key.toLowerCase() === 'massemail' ? 'Bulk Email' :
                                                p.feature_key.toLowerCase() === 'jobs' || p.feature_key.toLowerCase() === 'positions' ? (isCollege ? 'Positions' : 'Jobs') : 
                                                p.feature_name
                                            }
                                        </td>
                                        {permissionTypes.map(t => (
                                            <td key={t.id} className="px-4 py-2 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={p.permissions[t.id] || false}
                                                    onChange={() => handleTogglePermission(p.feature_id, t.id)}
                                                    className="w-4.5 h-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 shadow-sm transition-all cursor-pointer"
                                                />
                                            </td>
                                        ))}
                                        <td className="px-4 py-2 text-center">
                                            <div className="flex items-center justify-center">
                                                <label className={`relative inline-flex items-center cursor-pointer ${!p.permissions.read ? 'opacity-20 cursor-not-allowed' : ''}`}>
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only peer"
                                                        checked={p.data_scope === 'ALL'}
                                                        disabled={!p.permissions.read}
                                                        onChange={() => handleToggleDataScope(p.feature_id, p.data_scope === 'ALL' ? 'OWN' : 'ALL')}
                                                    />
                                                    <div className="w-[88px] h-[34px] bg-slate-50/80 rounded-full relative shadow-inner p-1">
                                                        {/* Moving White Pill */}
                                                        <div className={`absolute top-1 left-1 w-[40px] h-[26px] bg-white rounded-full shadow-sm border border-slate-100 transition-transform duration-300 ease-in-out ${p.data_scope === 'ALL' ? 'translate-x-[40px]' : 'translate-x-0'}`}></div>
                                                        
                                                        {/* Fixed Label Container */}
                                                        <div className="absolute inset-0 flex items-center justify-between px-3 z-10 pointer-events-none">
                                                            <span className={`text-[10px] font-extrabold transition-colors duration-300 w-[40px] text-center ${p.data_scope === 'OWN' ? 'text-blue-600' : 'text-slate-300'}`}>OWN</span>
                                                            <span className={`text-[10px] font-extrabold transition-colors duration-300 w-[40px] text-center ${p.data_scope === 'ALL' ? 'text-blue-600' : 'text-slate-300'}`}>ALL</span>
                                                        </div>
                                                    </div>
                                                </label>
                                            </div>
                                        </td>
                                        <td className="py-2 text-center">
                                            <button
                                                onClick={() => {
                                                    const allSet = permissionTypes.every(t => p.permissions[t.id]);
                                                    handleToggleAllPermissions(p.feature_id, !allSet);
                                                }}
                                                className={`px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all ${
                                                    permissionTypes.every(t => p.permissions[t.id])
                                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                                                        : 'bg-slate-50 text-slate-900 border border-slate-200 shadow-sm font-semibold hover:text-blue-600 transition-colors'
                                                }`}
                                            >
                                                {permissionTypes.every(t => p.permissions[t.id]) ? 'Disabled All' : 'Grant All'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>



            {/* Footer Component Actions */}
            <div className="flex items-center justify-end gap-5 pt-8 pb-12 border-t border-slate-100">
                <button
                    onClick={() => navigate('/roles')}
                    className="px-8 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-700 transition-all"
                >
                    Discard Changes
                </button>
                <PermissionWrapper feature="roles" permission={isEdit ? "update" : "write"}>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-14 py-3.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white bg-blue-600 hover:bg-blue-700 rounded-2xl shadow-xl shadow-blue-200 disabled:opacity-50 transition-all active:scale-95"
                    >
                        {saving ? 'Synchronizing...' : isEdit ? 'Update Role Hierarchy' : 'Initialize Role'}
                    </button>
                </PermissionWrapper>
            </div>
        </div>
    );
};

export default RoleEditor;
