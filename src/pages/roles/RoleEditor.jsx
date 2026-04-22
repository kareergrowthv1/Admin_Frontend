import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
    const [rolePermissions, setRolePermissions] = useState([]);

    const permissionTypes = [
        { id: 'read', label: 'READ' },
        { id: 'create', label: 'CREATE' },
        { id: 'update', label: 'UPDATE' },
        { id: 'delete', label: 'DELETE' },
        { id: 'export', label: 'EXPORT' },
        { id: 'import', label: 'IMPORT' }
    ];

    const featureModules = [
        { label: 'Dashboard', aliases: ['dashboard'] },
        { label: 'Inbox', aliases: ['inbox'] },
    ];

    const functionalModules = [
        { label: 'Position', aliases: ['positions', 'position', 'jobs', 'job'] },
        { label: 'Candidates', aliases: ['candidates', 'candidate'] },
        { label: 'Students', aliases: ['students', 'student'] },
        { label: 'Department', aliases: ['departments', 'department'] },
        { label: 'Branch', aliases: ['branches', 'branch'] },
        { label: 'Subjects', aliases: ['subjects', 'subject'] },
        { label: 'Task', aliases: ['tasks', 'task'] },
        { label: 'Bulk Email', aliases: ['massemail', 'bulkemail', 'bulk_email'] },
        { label: 'Roles', aliases: ['roles', 'role'] },
        { label: 'Users/My Team', aliases: ['users', 'user', 'team', 'myteam', 'my_team'] },
        { label: 'Setting', aliases: ['settings', 'setting'] }
    ];

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch all features first
                const featureRes = await authAPI.getFeatures();
                if (featureRes.data.success) {
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
            
            return prev.map(p => {
                if (p.feature_id === featureId) {
                    const updatedPerms = { ...p.permissions, [type]: newVal };

                    // Logic: If enabling WRITE/UPDATE etc, also enable READ
                    if (newVal && (type === 'create' || type === 'update' || type === 'delete' || type === 'export' || type === 'import')) {
                        updatedPerms.read = true;
                    }

                    // If READ is turned off, disable all dependent actions in that row.
                    if (type === 'read' && !newVal) {
                        updatedPerms.create = false;
                        updatedPerms.update = false;
                        updatedPerms.delete = false;
                        updatedPerms.export = false;
                        updatedPerms.import = false;
                    }

                    return { ...p, permissions: updatedPerms };
                }

                return p;
            });
        });
    };

    const handleToggleAllPermissions = (featureId, val) => {
        setRolePermissions(prev => {
            return prev.map(p => {
                if (p.feature_id === featureId) {
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
            return prev.map(p => {
                if (p.feature_id === featureId) {
                    return { ...p, data_scope: scope };
                }
                return p;
            });
        });
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

                return {
                    featureId: p.feature_id,
                    permissionsBitmask: bitmask,
                    dataScope: p.data_scope,
                    dashboardOptions: null,
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

    const getPermissionByModule = (moduleDef) => {
        return rolePermissions.find((perm) => moduleDef.aliases.includes((perm.feature_key || '').toLowerCase()));
    };

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

            {/* Features Card */}
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                <div className="space-y-6">
                    <div className="border-b border-slate-100 pb-4">
                        <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Features</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr>
                                    <th className="text-left py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider sticky left-0 bg-white z-10 w-[220px]">Feature</th>
                                    <th className="text-center px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">READ</th>
                                    <th className="text-center px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Scope</th>
                                </tr>
                            </thead>
                            <tbody className="">
                                {featureModules.map((moduleDef) => {
                                    const p = getPermissionByModule(moduleDef);
                                    const isMissing = !p;

                                    return (
                                    <tr key={moduleDef.label} className="group transition-all">
                                        <td className="py-2 sticky left-0 bg-white z-10 font-semibold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                                            {moduleDef.label}
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            <input
                                                type="checkbox"
                                                checked={p?.permissions?.read || false}
                                                onChange={() => p && handleTogglePermission(p.feature_id, 'read')}
                                                disabled={isMissing}
                                                className="w-4.5 h-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 shadow-sm transition-all cursor-pointer"
                                            />
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            <div className="flex items-center justify-center">
                                                <label className={`relative inline-flex items-center cursor-pointer ${!p?.permissions?.read || isMissing ? 'opacity-20 cursor-not-allowed' : ''}`}>
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only peer"
                                                        checked={p?.data_scope === 'ALL'}
                                                        disabled={!p?.permissions?.read || isMissing}
                                                        onChange={() => p && handleToggleDataScope(p.feature_id, p.data_scope === 'ALL' ? 'OWN' : 'ALL')}
                                                    />
                                                    <div className="w-[88px] h-[34px] bg-slate-50/80 rounded-full relative shadow-inner p-1">
                                                        <div className={`absolute top-1 left-1 w-[40px] h-[26px] bg-white rounded-full shadow-sm border border-slate-100 transition-transform duration-300 ease-in-out ${p?.data_scope === 'ALL' ? 'translate-x-[40px]' : 'translate-x-0'}`}></div>
                                                        <div className="absolute inset-0 flex items-center justify-between px-3 z-10 pointer-events-none">
                                                            <span className={`text-[10px] font-extrabold transition-colors duration-300 w-[40px] text-center ${p?.data_scope === 'OWN' ? 'text-blue-600' : 'text-slate-300'}`}>OWN</span>
                                                            <span className={`text-[10px] font-extrabold transition-colors duration-300 w-[40px] text-center ${p?.data_scope === 'ALL' ? 'text-blue-600' : 'text-slate-300'}`}>ALL</span>
                                                        </div>
                                                    </div>
                                                </label>
                                            </div>
                                        </td>
                                    </tr>
                                )})}
                            </tbody>
                        </table>
                    </div>
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
                                    <th className="text-left py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider sticky left-0 bg-white z-10 w-[220px]">System Module</th>
                                    {permissionTypes.map(t => (
                                        <th key={t.id} className="text-center px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{t.label}</th>
                                    ))}
                                    <th className="text-center px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Scope</th>
                                </tr>
                            </thead>
                            <tbody className="">
                                {functionalModules.map((moduleDef) => {
                                    const p = getPermissionByModule(moduleDef);
                                    const isMissing = !p;

                                    return (
                                    <tr key={moduleDef.label} className="group transition-all">
                                        <td className="py-2 sticky left-0 bg-white z-10 font-semibold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                                            {moduleDef.label}
                                        </td>
                                        {permissionTypes.map(t => (
                                            <td key={t.id} className="px-4 py-2 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={p?.permissions?.[t.id] || false}
                                                    onChange={() => p && handleTogglePermission(p.feature_id, t.id)}
                                                    disabled={isMissing}
                                                    className="w-4.5 h-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 shadow-sm transition-all cursor-pointer"
                                                />
                                            </td>
                                        ))}
                                        <td className="px-4 py-2 text-center">
                                            <div className="flex items-center justify-center">
                                                <label className={`relative inline-flex items-center cursor-pointer ${!p?.permissions?.read || isMissing ? 'opacity-20 cursor-not-allowed' : ''}`}>
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only peer"
                                                        checked={p?.data_scope === 'ALL'}
                                                        disabled={!p?.permissions?.read || isMissing}
                                                        onChange={() => p && handleToggleDataScope(p.feature_id, p.data_scope === 'ALL' ? 'OWN' : 'ALL')}
                                                    />
                                                    <div className="w-[88px] h-[34px] bg-slate-50/80 rounded-full relative shadow-inner p-1">
                                                        {/* Moving White Pill */}
                                                        <div className={`absolute top-1 left-1 w-[40px] h-[26px] bg-white rounded-full shadow-sm border border-slate-100 transition-transform duration-300 ease-in-out ${p?.data_scope === 'ALL' ? 'translate-x-[40px]' : 'translate-x-0'}`}></div>
                                                        
                                                        {/* Fixed Label Container */}
                                                        <div className="absolute inset-0 flex items-center justify-between px-3 z-10 pointer-events-none">
                                                            <span className={`text-[10px] font-extrabold transition-colors duration-300 w-[40px] text-center ${p?.data_scope === 'OWN' ? 'text-blue-600' : 'text-slate-300'}`}>OWN</span>
                                                            <span className={`text-[10px] font-extrabold transition-colors duration-300 w-[40px] text-center ${p?.data_scope === 'ALL' ? 'text-blue-600' : 'text-slate-300'}`}>ALL</span>
                                                        </div>
                                                    </div>
                                                </label>
                                            </div>
                                        </td>
                                    </tr>
                                )})}
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
