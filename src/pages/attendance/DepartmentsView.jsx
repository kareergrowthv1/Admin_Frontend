import React, { useState, useEffect, useRef } from 'react';
import { 
    Search, Filter, Plus, Download, RefreshCw, 
    MoreVertical, Edit2, Trash2, Users, ChevronDown 
} from 'lucide-react';
import axios from '../../config/axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import Pagination from '../../components/common/Pagination';
import PermissionWrapper from '../../components/common/PermissionWrapper';

const DepartmentsView = () => {
    const navigate = useNavigate();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const pageSize = 10;
    
    // UI States
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [loadingFilters, setLoadingFilters] = useState(false);
    const [activeDropdownId, setActiveDropdownId] = useState(null);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, buttonRight: 0 });
    const dropdownRef = useRef(null);
    const filterRef = useRef(null);

    // Modal States
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [newDepartment, setNewDepartment] = useState({
        name: '',
        description: '',
        mentor_id: ''
    });
    const [availableIncharges, setAvailableIncharges] = useState([]);
    const [fetchingIncharges, setFetchingIncharges] = useState(false);

    // Advanced Filters State
    const [inchargeSearch, setInchargeSearch] = useState('');
    const [advancedFilters, setAdvancedFilters] = useState({
        mentorIds: [],
        programNames: [],
        sortBy: 'sno'
    });

    const [metadata, setMetadata] = useState({
        incharges: [],
        programs: []
    });

    const [organizationId, setOrganizationId] = useState(null);

    useEffect(() => {
        try {
            const storedUser = JSON.parse(localStorage.getItem('admin_user') || '{}');
            const storedOrgId = storedUser?.organizationId || storedUser?.organization?.organizationId || localStorage.getItem('organizationId');
            if (storedOrgId) setOrganizationId(storedOrgId);
        } catch (err) {
            console.error('Failed to read organization ID:', err);
        }
    }, []);

    useEffect(() => {
        if (!organizationId) return;
        fetchData();
    }, [organizationId, advancedFilters]);

    useEffect(() => {
        if (isAddModalOpen) fetchAvailableIncharges();
    }, [isAddModalOpen]);

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

    const fetchAvailableIncharges = async () => {
        try {
            setFetchingIncharges(true);
            const response = await axios.get('/attendance/available-incharges');
            if (response.data.success) {
                setAvailableIncharges(response.data.data);
            }
        } catch (err) {
            toast.error('Failed to load available incharges');
        } finally {
            setFetchingIncharges(false);
        }
    };

    /**
     * Fetch filter options on demand (when the filter panel opens).
     * Calls /attendance/departments without any active filters to get the full
     * list of department names AND only the incharges who are actually assigned.
     */
    const fetchFilterOptions = async () => {
        try {
            setLoadingFilters(true);
            const res = await axios.get('/attendance/departments');
            const departments = res?.data?.data || [];
            setMetadata({
                programs: departments.map(d => ({ id: d.id, name: d.name })),
                // Only include users who are actually set as an incharge for a department
                incharges: departments
                    .filter(d => d.mentor_id && d.mentor_first_name)
                    .map(d => ({ id: d.mentor_id, first_name: d.mentor_first_name, last_name: d.mentor_last_name || '' }))
                    .filter((v, i, a) => a.findIndex(x => x.id === v.id) === i) // dedupe by id
            });
        } catch (err) {
            console.error('Failed to load filter options:', err);
        } finally {
            setLoadingFilters(false);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            // Single API call — org ID comes from the access token on the backend (no need to pass it)
            const params = {
                mentor_ids: advancedFilters.mentorIds.join(','),
                sort_by: advancedFilters.sortBy
            };
            const res = await axios.get('/attendance/departments', { params });
            const departments = res?.data?.data || [];
            setData(departments);
            // Derive filter metadata from the fetched data (no extra API call needed)
            setMetadata({
                incharges: departments
                    .filter(d => d.mentor_id)
                    .map(d => ({ id: d.mentor_id, first_name: d.mentor_first_name, last_name: d.mentor_last_name }))
                    .filter((v, i, a) => a.findIndex(x => x.id === v.id) === i), // dedupe
                programs: departments.map(d => ({ id: d.id, name: d.name }))
            });
        } catch (err) {
            toast.error('Failed to load departments');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateProgram = async (e) => {
        e.preventDefault();
        if (!newDepartment.name.trim()) {
            toast.error('Name is required');
            return;
        }

        setSubmitting(true);
        try {
            const response = await axios.post('/attendance/departments', newDepartment);
            if (response.data.success) {
                toast.success('Program created successfully!');
                setIsAddModalOpen(false);
                setNewDepartment({ name: '', description: '', mentor_id: '' });
                fetchData();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create program');
        } finally {
            setSubmitting(false);
        }
    };

    const getDisplayCode = (item) => {
        if (item.code) return item.code;
        const prefix = (item.name || 'DEP').substring(0, 3).toUpperCase();
        const suffix = item.id ? item.id.split('-')[0].substring(0, 3).toUpperCase() : '001';
        return `${prefix}-${suffix}`;
    };

    const filteredData = data.filter(item => {
        const searchMatch = (item.name || '').toLowerCase().includes(search.toLowerCase());
        if (!searchMatch) return false;
        if (advancedFilters.mentorIds.length > 0 && !advancedFilters.mentorIds.includes(item.mentor_id)) return false;
        if (advancedFilters.programNames.length > 0 && !advancedFilters.programNames.includes(item.name)) return false;
        return true;
    });

    const sortedMainData = [...filteredData].sort((a, b) => {
        const criteria = advancedFilters.sortBy;
        if (criteria === 'name') return (a.name || '').localeCompare(b.name || '');
        if (criteria === 'students') return (b.studentCount || 0) - (a.studentCount || 0);
        return 0;
    });

    const paginatedData = sortedMainData.slice(page * pageSize, (page + 1) * pageSize);

    return (
        <div className="flex flex-col space-y-4 pt-1 pb-4 px-1">
            {/* Toolbar */}
            <div className="flex items-center gap-4 px-1">
                <div className="relative flex-1 group/search">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-slate-400 group-focus-within/search:text-blue-500 transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search programs..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 placeholder:text-slate-400 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-50 shadow-sm"
                    />
                </div>
                
                <button 
                    onClick={() => fetchData()}
                    className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm active:scale-95"
                    title="Refresh"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>

                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm group">
                    <Download size={16} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                    <span>Export</span>
                </button>

                <div className="relative" ref={filterRef}>
                    <button 
                        onClick={() => {
                            const opening = !showAdvancedFilters;
                            setShowAdvancedFilters(opening);
                            // Fetch live filter options when opening the panel
                            if (opening) fetchFilterOptions();
                        }}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-xs font-bold transition-all shadow-sm
                            ${showAdvancedFilters ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-50 text-blue-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}
                        `}
                    >
                        <Filter className="w-4 h-4" />
                        <span>More Filters</span>
                    </button>

                    {showAdvancedFilters && (
                        <div className="absolute right-0 top-full mt-2 w-[280px] bg-white rounded-xl border border-slate-200 shadow-xl z-[60] p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-50">
                                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Advanced Filters</h4>
                                {loadingFilters && (
                                    <span className="text-[10px] text-blue-500 font-medium animate-pulse">Loading...</span>
                                )}
                            </div>

                            <div className="space-y-4 max-h-[400px] overflow-y-auto no-scrollbar pr-1">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 mb-1.5 block uppercase tracking-wider">Program Name</label>
                                    <div className="space-y-1.5 bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                                        {metadata.programs.map(p => (
                                            <label key={p.id} className="flex items-center gap-2.5 group cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={advancedFilters.programNames.includes(p.name)}
                                                    onChange={() => {
                                                        const names = advancedFilters.programNames.includes(p.name)
                                                            ? advancedFilters.programNames.filter(n => n !== p.name)
                                                            : [...advancedFilters.programNames, p.name];
                                                        setAdvancedFilters({ ...advancedFilters, programNames: names });
                                                    }}
                                                    className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer"
                                                />
                                                <span className="text-xs text-slate-600 group-hover:text-slate-900 transition-colors font-medium truncate">{p.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Incharge</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Search size={12} className="text-slate-400" />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Search incharges..."
                                            value={inchargeSearch}
                                            onChange={(e) => setInchargeSearch(e.target.value)}
                                            className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all font-medium"
                                        />
                                    </div>
                                    <div className="space-y-1.5 max-h-[160px] overflow-y-auto custom-scrollbar bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                                        {metadata.incharges
                                            .filter(inc => `${inc.first_name} ${inc.last_name}`.toLowerCase().includes(inchargeSearch.toLowerCase()))
                                            .map(inc => (
                                                <label key={inc.id} className="flex items-center gap-2.5 group cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={advancedFilters.mentorIds.includes(inc.id)}
                                                        onChange={() => {
                                                            const ids = advancedFilters.mentorIds.includes(inc.id)
                                                                ? advancedFilters.mentorIds.filter(id => id !== inc.id)
                                                                : [...advancedFilters.mentorIds, inc.id];
                                                            setAdvancedFilters({ ...advancedFilters, mentorIds: ids });
                                                        }}
                                                        className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer"
                                                    />
                                                    <span className="text-xs text-slate-600 group-hover:text-slate-900 transition-colors font-medium">{inc.first_name} {inc.last_name}</span>
                                                </label>
                                            ))
                                        }
                                    </div>
                                </div>

                                    <label className="text-[10px] font-bold text-slate-500 mb-1.5 block uppercase tracking-wider">Sort By</label>
                                    <div className="space-y-1.5 bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                                        {[
                                            { id: 'sno', label: 'Original Order' },
                                            { id: 'name', label: 'Program Name' },
                                            { id: 'students', label: 'Student Count' }
                                        ].map(option => (
                                            <label 
                                                key={option.id}
                                                className="flex items-center gap-2.5 group cursor-pointer"
                                            >
                                                <input
                                                    type="radio"
                                                    name="sortByOptions"
                                                    checked={advancedFilters.sortBy === option.id}
                                                    onChange={() => setAdvancedFilters({ ...advancedFilters, sortBy: option.id })}
                                                    className="w-3.5 h-3.5 border-slate-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer"
                                                />
                                                <span className={`text-xs transition-colors font-medium ${advancedFilters.sortBy === option.id ? 'text-blue-600' : 'text-slate-600 group-hover:text-slate-900'}`}>
                                                    {option.label}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                                <button 
                                    onClick={() => {
                                        setAdvancedFilters({ mentorIds: [], programNames: [], sortBy: 'sno' });
                                        setInchargeSearch('');
                                    }}
                                    className="text-[10px] font-bold text-rose-500 hover:text-rose-600 transition-colors uppercase tracking-tight"
                                >
                                    Reset Filters
                                </button>
                                <button 
                                    onClick={() => setShowAdvancedFilters(false)}
                                    className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-[10px] font-bold hover:bg-slate-800 transition-all uppercase tracking-wider"
                                >
                                    Apply
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="h-8 w-[1px] bg-slate-200 mx-1"></div>

                <PermissionWrapper feature="attendance" permission="create">
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-all shadow-md shrink-0 active:scale-95"
                    >
                        <Plus size={16} strokeWidth={2.5} />
                        <span>Add Program</span>
                    </button>
                </PermissionWrapper>
            </div>

            {/* Table Area */}
            <div className="relative bg-white rounded-2xl border border-slate-200 shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-visible">
                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200">
                                <th className="pl-8 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Code</th>
                                <th className="px-4 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Program Name</th>
                                <th className="px-4 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Incharge</th>
                                <th className="px-4 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Official Email</th>
                                <th className="px-4 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Contact No</th>
                                <th className="px-4 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Created By</th>
                                <th className="px-4 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">Students</th>
                                <th className="px-4 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="px-8 py-12 text-center text-slate-400 italic">Loading departments...</td>
                                </tr>
                            ) : paginatedData.length > 0 ? (
                                paginatedData.map((item) => (
                                    <tr 
                                        key={item.id} 
                                        className="hover:bg-slate-100/40 transition-colors group cursor-pointer"
                                        onClick={() => navigate(`/attendance/branches/${item.id}`)}
                                    >
                                        <td className="pl-8 py-4 whitespace-nowrap">
                                            <span className="text-xs text-black font-normal tracking-wider">{getDisplayCode(item)}</span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="text-sm text-black font-normal">{item.name}</span>
                                        </td>
                                        <td className="px-4 py-4">
                                            {item.mentor_first_name ? (
                                                <div>
                                                    <span className="text-sm text-black font-normal">{item.mentor_first_name} {item.mentor_last_name || ''}</span>
                                                    {item.mentor_role && <p className="text-[10px] text-slate-400 mt-0.5">{item.mentor_role}</p>}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-400 italic">No Incharge Assigned</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-black font-normal">{item.mentor_email || '-'}</td>
                                        <td className="px-4 py-4 text-sm text-black font-normal">{item.mentor_phone || '-'}</td>
                                        <td className="px-4 py-4">
                                            {item.created_by_first_name ? (
                                                <div>
                                                    <span className="text-sm text-black font-normal">{item.created_by_first_name} {item.created_by_last_name || ''}</span>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">{item.created_by_email || ''}</p>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-normal ring-1 ring-blue-100/50">
                                                <Users size={12} />
                                                {item.student_count || item.studentCount || 0}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="relative inline-block" onClick={e => e.stopPropagation()}>
                                                <button 
                                                    onClick={(e) => {
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        setDropdownPos({ top: rect.bottom, buttonRight: window.innerWidth - rect.right });
                                                        setActiveDropdownId(activeDropdownId === item.id ? null : item.id);
                                                    }}
                                                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                                                >
                                                    <MoreVertical size={16} />
                                                </button>

                                                {activeDropdownId === item.id && (
                                                    <div 
                                                        ref={dropdownRef}
                                                        style={{ 
                                                            position: 'fixed',
                                                            top: dropdownPos.top + 8,
                                                            right: dropdownPos.buttonRight,
                                                            zIndex: 1000
                                                        }}
                                                        className="w-36 bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.15)] border border-slate-100 p-1.5 animate-in fade-in zoom-in-95 duration-150"
                                                    >
                                                        <button 
                                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-blue-600 rounded-lg transition-colors"
                                                        >
                                                            <Edit2 size={14} />
                                                            Edit
                                                        </button>
                                                        <button 
                                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 size={14} />
                                                            Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" className="px-6 py-12 text-center text-slate-400 italic font-medium">No programs found matching your filters.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <Pagination 
                    currentPage={page + 1}
                    totalPages={Math.ceil(sortedMainData.length / pageSize)}
                    onPageChange={(p) => setPage(p - 1)}
                    pageSize={pageSize}
                    totalElements={sortedMainData.length}
                    className="border-t border-slate-100 px-6 py-4 bg-slate-50/20"
                />
            </div>

            {/* Create Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Add New Program</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Define department or program details</p>
                            </div>
                            <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                                <Plus size={20} className="rotate-45" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateProgram} className="p-6 space-y-5">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 mb-1.5 block uppercase tracking-wider">Program Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Computer Science & Engineering"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 font-medium"
                                        value={newDepartment.name}
                                        onChange={e => setNewDepartment({ ...newDepartment, name: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-500 mb-1.5 block uppercase tracking-wider">Incharge</label>
                                        <div className="relative">
                                            <select
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer font-medium pr-10"
                                                value={newDepartment.mentor_id}
                                                onChange={e => setNewDepartment({ ...newDepartment, mentor_id: e.target.value })}
                                            >
                                                <option value="">Select Incharge</option>
                                                {availableIncharges.map(inc => (
                                                    <option key={inc.id} value={inc.id}>{inc.first_name} {inc.last_name}</option>
                                                ))}
                                            </select>
                                            <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-400 border-l border-slate-200 ml-2">
                                                <ChevronDown size={14} />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 mb-1.5 block uppercase tracking-wider italic">
                                            Short Code: <span className="text-blue-600 font-bold">Auto-generated (e.g. DEPT001)</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Cancel</button>
                                <button type="submit" disabled={submitting} className="flex-1 py-2.5 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all shadow-md active:scale-95 disabled:opacity-50">
                                    {submitting ? 'Creating...' : 'Create Program'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DepartmentsView;
