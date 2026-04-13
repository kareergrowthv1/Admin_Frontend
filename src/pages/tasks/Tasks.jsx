import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  X,
  CheckSquare,
  RefreshCw,
  MoreVertical,
  Filter,
  ChevronDown,
  Eye,
  Edit2
} from 'lucide-react';
import axios from '../../config/axios';
import toast from 'react-hot-toast';
import Pagination from '../../components/common/Pagination';
import PermissionWrapper from '../../components/common/PermissionWrapper';
import { getFeatureDataScope, getLoggedInUserId } from '../../utils/permissionUtils';

const Tasks = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const filterUserId = searchParams.get('userId');
    const filterUserName = searchParams.get('userName');
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('All');
    const [statusCounts, setStatusCounts] = useState({ ALL: 0, PENDING: 0, IN_PROGRESS: 0, COMPLETED: 0 });
    
    // Hierarchy Data for Selection
    const [departments, setDepartments] = useState([]);
    
    const [currentPage, setCurrentPage] = useState(0);
    const pageSize = 12;
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const filterRef = useRef(null);
    const dropdownRef = useRef(null);
    const [organizationId, setOrganizationId] = useState(null);
    const [activeDropdownId, setActiveDropdownId] = useState(null);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, buttonRight: 0 });

    // Advanced Filters State
    const [advancedFilters, setAdvancedFilters] = useState({
        statuses: [],
        priorities: [],
        deptIds: [],
        branchIds: [],
        semesters: []
    });

    // Metadata for filters
    const [metadata, setMetadata] = useState({
        departments: [],
        branches: [],
        semesters: [1, 2, 3, 4, 5, 6, 7, 8]
    });

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setActiveDropdownId(null);
            }
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setShowAdvancedFilters(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('admin_user') || '{}');
        const storedOrgId = storedUser?.organizationId || storedUser?.organization?.organizationId || localStorage.getItem('organizationId');
        if (storedOrgId) {
            setOrganizationId(storedOrgId);
            fetchTasks(storedOrgId);
            fetchStatusCounts(storedOrgId);
            fetchMetadata(storedOrgId);
        }
    }, [activeTab, searchTerm, advancedFilters, currentPage]);

    const fetchTasks = async (orgId = organizationId, isManualRefresh = false) => {
        if (!orgId) return;
        try {
            setLoading(true);
            const params = {
                status: advancedFilters.statuses.length > 0 ? advancedFilters.statuses.join(',') : (activeTab !== 'All' ? activeTab : undefined),
                priority: advancedFilters.priorities.length > 0 ? advancedFilters.priorities.join(',') : undefined,
                dept_id: advancedFilters.deptIds.length > 0 ? advancedFilters.deptIds.join(',') : undefined,
                branch_id: advancedFilters.branchIds.length > 0 ? advancedFilters.branchIds.join(',') : undefined,
                semester: advancedFilters.semesters.length > 0 ? advancedFilters.semesters.join(',') : undefined,
                search: searchTerm
            };

            if (isManualRefresh) {
                params._t = Date.now();
            }

            const dataScope = getFeatureDataScope('tasks');
            if (filterUserId) {
                params.createdBy = filterUserId;
            } else if (dataScope === 'OWN') {
                params.createdBy = getLoggedInUserId();
            }

            const res = await axios.get('/tasks', { params });
            setTasks(res.data.data || []);
            setLoading(false);
        } catch (err) {
            console.error('Fetch tasks failed:', err);
            setLoading(false);
        }
    };

    const fetchStatusCounts = async (orgId = organizationId) => {
        try {
            const res = await axios.get('/tasks/counts', { params: {} });
            setStatusCounts(res.data.data || { ALL: 0, PENDING: 0, IN_PROGRESS: 0, COMPLETED: 0 });
        } catch (err) { console.error('Counts failed:', err); }
    };

    const fetchMetadata = async (orgId = organizationId) => {
        try {
            const [deptRes, branchRes] = await Promise.all([
                axios.get('/attendance/departments', { params: {} }),
                axios.get(`/attendance/branches`, { params: {} })
            ]);
            setMetadata(prev => ({
                ...prev,
                departments: deptRes.data.data || [],
                branches: branchRes.data.data || []
            }));
        } catch (err) { console.error('Metadata failed:', err); }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await Promise.all([
                fetchTasks(organizationId, true),
                fetchStatusCounts()
            ]);
        } finally {
            setIsRefreshing(false);
        }
    };

    const tabs = [
        { name: 'All', value: 'All', count: statusCounts.ALL },
        { name: 'Pending', value: 'Pending', count: statusCounts.PENDING },
        { name: 'In Progress', value: 'In Progress', count: statusCounts.IN_PROGRESS },
        { name: 'Completed', value: 'Completed', count: statusCounts.COMPLETED }
    ];


    return (
        <div className="space-y-6 pt-2 pb-12 animate-in fade-in duration-500">
            {/* Filtered By Indicator */}
            {filterUserId && filterUserName && (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
                            <CheckSquare size={16} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider leading-none mb-1">Filtered by Member</p>
                            <h3 className="text-sm font-bold text-emerald-900 capitalize leading-none">{filterUserName}</h3>
                        </div>
                    </div>
                    <button 
                        onClick={() => {
                            searchParams.delete('userId');
                            searchParams.delete('userName');
                            setSearchParams(searchParams);
                        }}
                        className="text-[11px] font-bold text-emerald-600 hover:text-emerald-800 transition-colors flex items-center gap-1.5 group"
                    >
                        <span>Clear Filter</span>
                        <X size={14} className="group-hover:rotate-90 transition-transform" />
                    </button>
                </div>
            )}


            {/* Tabs matching Positions UI */}
            <div className="flex items-center gap-8 border-b border-slate-100 overflow-x-auto no-scrollbar">
                {tabs.map((tab) => (
                    <button
                        key={tab.value}
                        onClick={() => setActiveTab(tab.value)}
                        className={`relative pb-2 flex items-center gap-2 transition-all group ${activeTab === tab.value ? 'text-blue-600 font-normal' : 'text-black font-normal'}`}
                    >
                        <span className="text-xs">{tab.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === tab.value ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'} transition-colors`}>
                            {tab.count || 0}
                        </span>
                        {activeTab === tab.value && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                        )}
                    </button>
                ))}
            </div>

            {/* Filters Bar matching Positions UI */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[300px]">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search tasks by title or code..."
                        className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-600 placeholder-slate-400 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-3 relative" ref={filterRef}>
                    <button 
                        onClick={handleRefresh} 
                        className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors shadow-sm shrink-0"
                        title="Refresh"
                    >
                        <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
                    </button>

                    <button 
                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        className={`flex items-center gap-2 px-4 py-2.5 bg-white border ${showAdvancedFilters ? 'border-blue-400 ring-2 ring-blue-50' : 'border-slate-200'} rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm group`}
                    >
                        <Filter size={16} className={`${showAdvancedFilters ? 'text-blue-600' : 'text-slate-400'} group-hover:text-blue-600 transition-colors`} />
                        <span>More Filters</span>
                        {(advancedFilters.statuses.length > 0 || advancedFilters.priorities.length > 0 || advancedFilters.deptIds.length > 0 || advancedFilters.branchIds.length > 0 || advancedFilters.semesters.length > 0) && (
                            <span className="ml-1 w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                        )}
                        <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${showAdvancedFilters ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Advanced Filters Dropdown */}
                    {showAdvancedFilters && (
                        <div className="absolute top-full right-0 mt-2 w-[280px] bg-white rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.1)] border border-slate-100 z-[50] animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                            <div className="p-4 space-y-5 max-h-[420px] overflow-y-auto no-scrollbar">
                                {/* Vertical Stacking of Sections */}
                                <div className="space-y-4">
                                    {/* Status Section */}
                                    <div className="space-y-2.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</label>
                                        <div className="grid grid-cols-1 gap-2">
                                            {['Pending', 'In Progress', 'Completed'].map((s) => (
                                                <label key={s} className="flex items-center gap-2 cursor-pointer group">
                                                    <input
                                                        type="checkbox"
                                                        checked={advancedFilters.statuses.includes(s)}
                                                        onChange={(e) => {
                                                            const newS = e.target.checked ? [...advancedFilters.statuses, s] : advancedFilters.statuses.filter(i => i !== s);
                                                            setAdvancedFilters({ ...advancedFilters, statuses: newS });
                                                        }}
                                                        className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                                                    />
                                                    <span className="text-xs text-slate-600 group-hover:text-slate-900 transition-colors uppercase">{s}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Priority Section */}
                                    <div className="space-y-2.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Priority</label>
                                        <div className="grid grid-cols-1 gap-2">
                                            {['High', 'Medium', 'Low'].map((p) => (
                                                <label key={p} className="flex items-center gap-2 cursor-pointer group">
                                                    <input
                                                        type="checkbox"
                                                        checked={advancedFilters.priorities.includes(p)}
                                                        onChange={(e) => {
                                                            const newP = e.target.checked ? [...advancedFilters.priorities, p] : advancedFilters.priorities.filter(i => i !== p);
                                                            setAdvancedFilters({ ...advancedFilters, priorities: newP });
                                                        }}
                                                        className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                                                    />
                                                    <span className="text-xs text-slate-600 group-hover:text-slate-900 transition-colors uppercase">{p}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Department Section */}
                                    <div className="space-y-2.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Departments</label>
                                        <div className="grid grid-cols-1 gap-2">
                                            {metadata.departments.map((d) => (
                                                <label key={d.id} className="flex items-center gap-2 cursor-pointer group">
                                                    <input
                                                        type="checkbox"
                                                        checked={advancedFilters.deptIds.includes(d.id)}
                                                        onChange={(e) => {
                                                            const newD = e.target.checked ? [...advancedFilters.deptIds, d.id] : advancedFilters.deptIds.filter(i => i !== d.id);
                                                            setAdvancedFilters({ ...advancedFilters, deptIds: newD });
                                                        }}
                                                        className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                                                    />
                                                    <span className="text-xs text-slate-600 group-hover:text-slate-900 transition-colors truncate">{d.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Semester Section */}
                                    <div className="space-y-2.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Semesters</label>
                                        <div className="grid grid-cols-1 gap-2">
                                            {metadata.semesters.map((s) => (
                                                <label key={s} className="flex items-center gap-2 cursor-pointer group">
                                                    <input
                                                        type="checkbox"
                                                        checked={advancedFilters.semesters.includes(s)}
                                                        onChange={(e) => {
                                                            const newS = e.target.checked ? [...advancedFilters.semesters, s] : advancedFilters.semesters.filter(i => i !== s);
                                                            setAdvancedFilters({ ...advancedFilters, semesters: newS });
                                                        }}
                                                        className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                                                    />
                                                    <span className="text-xs text-slate-600 group-hover:text-slate-900 transition-colors uppercase">S {s}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Action Footer aligned with Candidates page style */}
                            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                                <button 
                                    onClick={() => {
                                        setAdvancedFilters({ statuses: [], priorities: [], deptIds: [], branchIds: [], semesters: [] });
                                    }}
                                    className="text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    Reset
                                </button>
                                <button 
                                    onClick={() => setShowAdvancedFilters(false)}
                                    className="px-3 py-1.5 bg-blue-600 text-white text-[10px] font-bold rounded-md hover:bg-blue-700 transition-all shadow-sm active:scale-95"
                                >
                                    Apply Filters
                                </button>
                            </div>
                        </div>
                    )}

                    <PermissionWrapper feature="tasks" permission="write">
                        <button 
                            onClick={() => navigate('/tasks/create')}
                            className="ml-auto flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-all shrink-0 shadow-lg shadow-blue-500/20"
                        >
                            <Plus size={18} />
                            <span>New Task</span>
                        </button>
                    </PermissionWrapper>
                </div>
            </div>

            {/* Tasks Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col min-h-0">
                <div className="overflow-auto custom-scrollbar relative">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-20">
                            <tr className="bg-slate-50/50 backdrop-blur-sm border-b border-slate-200">
                                <th className="pl-6 pr-2 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-left w-[12%]">Task Code</th>
                                <th className="px-5 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-left w-[18%]">Task Name</th>
                                <th className="px-5 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-left w-[22%]">Short Description</th>
                                <th className="px-5 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-left w-[12%]">Documents</th>
                                <th className="px-5 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-left w-[18%]">Assigned To</th>
                                <th className="px-5 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-left w-[10%]">Deadline</th>
                                <th className="px-5 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center w-[8%]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                            <span className="text-xs font-normal text-slate-400 tracking-wider uppercase">Loading tasks...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : tasks.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-200 mb-2">
                                                <Search size={24} />
                                            </div>
                                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">No tasks found</h3>
                                            <p className="text-xs text-slate-400 max-w-[200px] mx-auto">We couldn't find any tasks matching your criteria.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : tasks.slice(currentPage * pageSize, (currentPage + 1) * pageSize).map((task) => (
                                <tr key={task.id} className="hover:bg-slate-100/40 transition-colors group cursor-pointer" onClick={() => navigate(`/tasks/edit/${task.id}`)}>
                                    <td className="pl-6 pr-2 py-4">
                                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black tracking-wider uppercase">{task.task_code}</span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className="text-sm text-black group-hover:text-blue-600 transition-colors leading-tight line-clamp-1">{task.title}</span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className="text-xs font-normal text-black line-clamp-1 leading-relaxed">{task.short_description || '-'}</span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full ${task.attachment_count > 0 ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                                            <span className="text-[11px] font-medium text-black">
                                                {task.attachment_count > 0 ? `${task.attachment_count} Documents` : 'No Documents'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex flex-col gap-0.5 max-w-[150px]">
                                            <span className="text-xs text-black line-clamp-1">{task.dept_name || 'All Departments'}</span>
                                            {(task.branch_name || task.subject_name) && (
                                                <span className="text-[10px] text-black/60 font-medium truncate">
                                                    {task.branch_name}{task.subject_name ? ` • ${task.subject_name}` : ''}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className="text-xs font-medium text-black">{task.end_date ? new Date(task.end_date).toLocaleDateString() : '-'}</span>
                                    </td>
                                    <td className="px-5 py-4 text-center relative" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center justify-center">
                                            <button 
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                                title="Actions"
                                                onClick={(e) => {
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    setDropdownPos({ top: rect.bottom, buttonRight: rect.right });
                                                    setActiveDropdownId(activeDropdownId === task.id ? null : task.id);
                                                }}
                                            >
                                                <MoreVertical size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Fixed Action Menu Portal-like */}
            {activeDropdownId && (
                <div 
                    ref={dropdownRef}
                    className="fixed z-[100] w-36 bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.15)] border border-slate-100 py-1.5 animate-in fade-in zoom-in duration-200"
                    style={{ top: dropdownPos.top + 2, left: dropdownPos.buttonRight - 144 }}
                >
                    <button onClick={() => { navigate(`/tasks/view/${activeDropdownId}`); setActiveDropdownId(null); }} className="w-full px-4 py-2 text-left text-[11px] font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2">
                        <Eye size={14} className="text-slate-400" />
                        <span>View Details</span>
                    </button>
                    <PermissionWrapper feature="tasks" permission="update">
                        <button onClick={() => { navigate(`/tasks/edit/${activeDropdownId}`); setActiveDropdownId(null); }} className="w-full px-4 py-2 text-left text-[11px] font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2">
                            <Edit2 size={14} className="text-slate-400" />
                            <span>Edit Task</span>
                        </button>
                    </PermissionWrapper>
                </div>
            )}

            <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(tasks.length / pageSize) || 1}
                onPageChange={setCurrentPage}
                pageSize={pageSize}
                totalElements={tasks.length}
            />
        </div>
    );
};

export default Tasks;
