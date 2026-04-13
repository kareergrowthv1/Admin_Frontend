import React, { useState, useEffect, useRef } from 'react';
import { 
    Search, Filter, Download, Plus, RefreshCw, 
    ChevronDown, UserCheck, Calendar, Clock 
} from 'lucide-react';
import axios from '../../config/axios';
import toast from 'react-hot-toast';
import { useParams, useNavigate } from 'react-router-dom';
import Pagination from '../../components/common/Pagination';
import PermissionWrapper from '../../components/common/PermissionWrapper';

const AttendanceSheet = () => {
    const { deptId, branchId, subjectId } = useParams();
    const navigate = useNavigate();
    const today = new Date().getDate();

    // Generate last 10 months
    const getRecentMonths = () => {
        const months = [];
        const date = new Date('2026-03-29'); // Relative system date
        date.setDate(1); 
        for (let i = 0; i < 10; i++) {
            const m = date.getMonth();
            const y = date.getFullYear();
            months.push({
                label: date.toLocaleString('default', { month: 'long', year: 'numeric' }),
                value: `${y}-${m + 1}`
            });
            date.setMonth(date.getMonth() - 1);
        }
        return months;
    };
    const recentMonths = getRecentMonths();

    // States
    const [selectedMonth, setSelectedMonth] = useState(recentMonths[0].value);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const pageSize = 15;
    const [editingCell, setEditingCell] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [pendingEdits, setPendingEdits] = useState({});

    // Import Flow States
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importing, setImporting] = useState(false);
    const [unmappedStudents, setUnmappedStudents] = useState([]);
    const [unmappedPage, setUnmappedPage] = useState(0);
    const [hasMoreUnmapped, setHasMoreUnmapped] = useState(true);
    const [selectedStudentIds, setSelectedStudentIds] = useState([]);
    const [loadingUnmapped, setLoadingUnmapped] = useState(false);

    // UI States
    const [showFilters, setShowFilters] = useState(false);
    const [filterOptions, setFilterOptions] = useState({
        sortBy: 'sno', 
        sortOrder: 'asc',
        startDate: '',
        endDate: ''
    });
    const [advancedFilters, setAdvancedFilters] = useState({
        statuses: [],
        sortBy: 'sno'
    });
    const filterRef = useRef(null);

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
    }, [organizationId, deptId, branchId, subjectId, selectedMonth, advancedFilters]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setShowFilters(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [year, month] = selectedMonth.split('-');
            const params = {
                month,
                year
            };
            const res = await axios.get(`/attendance/${deptId}/${branchId}/${subjectId}/sheet`, { params });
            setData(res?.data?.data || []);
        } catch (err) {
            toast.error('Failed to load attendance sheet');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveFullSheet = async () => {
        if (Object.keys(pendingEdits).length === 0) {
            setIsEditMode(false);
            setEditingCell(null);
            return;
        }

        try {
            setSaving(true);
            const [year, month] = selectedMonth.split('-');
            
            const updatesArray = Object.keys(pendingEdits).map(key => {
                const [studentId, dayStr] = key.split('_');
                const status = pendingEdits[key];
                const day = parseInt(dayStr, 10);
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                
                return {
                    candidateId: studentId,
                    date: dateStr,
                    status
                };
            });

            await axios.post('/attendance/batch-update', {
                subjectId,
                updates: updatesArray
            });

            toast.success('Matrix successfully batch updated!');
            
            setData(prev => prev.map(s => {
                const studentUpdates = {};
                Object.keys(pendingEdits).forEach(k => {
                    if (k.startsWith(`${s.candidate_id}_`)) {
                        studentUpdates[parseInt(k.split('_')[1], 10)] = pendingEdits[k];
                    }
                });
                
                if (Object.keys(studentUpdates).length > 0) {
                    return { ...s, attendance: { ...s.attendance, ...studentUpdates } };
                }
                return s;
            }));
            
            setPendingEdits({});
            setIsEditMode(false);
            setEditingCell(null);
        } catch (err) {
            toast.error('Failed to batch save matrix to database');
        } finally {
            setSaving(false);
        }
    };

    const fetchUnmappedStudents = async (pageNum = 0) => {
        try {
            setLoadingUnmapped(true);
            const res = await axios.get(`/attendance/unmapped-students/${branchId}?subjectId=${subjectId}&page=${pageNum}`);
            const fetched = res.data.data;
            if (fetched.length < 20) setHasMoreUnmapped(false);
            if (pageNum === 0) setUnmappedStudents(fetched);
            else setUnmappedStudents(prev => [...prev, ...fetched]);
        } catch (err) {
            toast.error('Failed to lookup candidates locally');
        } finally {
            setLoadingUnmapped(false);
        }
    };

    const handleImportOpen = () => {
        setIsImportModalOpen(true);
        setUnmappedPage(0);
        setHasMoreUnmapped(true);
        setSelectedStudentIds([]);
        fetchUnmappedStudents(0);
    };

    const handleImportSubmit = async () => {
        if (selectedStudentIds.length === 0) return toast.error('Check at least one student strictly');
        setImporting(true);
        try {
            const res = await axios.post('/attendance/import-students', {
                subjectId,
                studentIds: selectedStudentIds
            });
            if (res.data.success) {
                toast.success('Successfully imported!');
                setIsImportModalOpen(false);
                fetchData();
            }
        } catch (err) {
            toast.error('Failure tracking subject mappings natively');
        } finally {
            setImporting(false);
        }
    };

    const getProcessedData = () => {
        let resultData = [...data];

        if (search) {
            resultData = resultData.filter(s =>
                s.candidate_name?.toLowerCase().includes(search.toLowerCase()) ||
                s.register_no?.toLowerCase().includes(search.toLowerCase())
            );
        }

        if (advancedFilters.statuses.length > 0) {
            resultData = resultData.filter(s => advancedFilters.statuses.includes(s.status || 'Active'));
        }

        resultData.sort((a, b) => {
            if (filterOptions.sortBy === 'name') return (a.candidate_name || '').localeCompare(b.candidate_name || '');
            if (filterOptions.sortBy === 'reg') return (a.register_no || '').localeCompare(b.register_no || '');
            return 0;
        });

        return resultData;
    };

    const processedData = getProcessedData();
    const paginatedData = processedData.slice(page * pageSize, (page + 1) * pageSize);

    const displayDays = [...Array(31)].map((_, i) => i + 1).filter(day => {
        const start = parseInt(filterOptions.startDate) || 1;
        const end = parseInt(filterOptions.endDate) || 31;
        return day >= start && day <= end;
    });

    return (
        <div className="h-full flex flex-col overflow-hidden space-y-4 pt-1 pb-4 px-1">
            {/* Sheet Toolbar */}
            <div className="flex items-center gap-4 px-1">
                <div className="relative flex-1 group/search">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-slate-400 group-focus-within/search:text-blue-500 transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search students by name or registration..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 placeholder:text-slate-400 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-50 shadow-sm"
                    />
                </div>

                <div className="relative">
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="appearance-none bg-white border border-slate-200 rounded-lg px-4 py-2 pr-10 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400 cursor-pointer shadow-sm"
                    >
                        {recentMonths.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-400 border-l border-slate-100 ml-2">
                        <ChevronDown size={14} />
                    </div>
                </div>

                <div className="relative" ref={filterRef}>
                    <button 
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-bold transition-all shadow-sm
                            ${showFilters ? 'bg-blue-50 border-blue-400 text-blue-600' : 'bg-white border-slate-200 text-slate-600'}
                        `}
                    >
                        <Filter className="w-4 h-4" />
                        <span>Matrix Config</span>
                    </button>

                    {showFilters && (
                        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl border border-slate-200 shadow-xl z-50 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Display Settings</h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 mb-1.5 block">Day Range</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input 
                                            type="number" min="1" max="31" placeholder="Start"
                                            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:border-blue-400"
                                            value={filterOptions.startDate}
                                            onChange={e => setFilterOptions({...filterOptions, startDate: e.target.value})}
                                        />
                                        <input 
                                            type="number" min="1" max="31" placeholder="End"
                                            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:border-blue-400"
                                            value={filterOptions.endDate}
                                            onChange={e => setFilterOptions({...filterOptions, endDate: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 mb-1.5 block">Sort By</label>
                                    <select 
                                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:border-blue-400"
                                        value={filterOptions.sortBy}
                                        onChange={e => setFilterOptions({...filterOptions, sortBy: e.target.value})}
                                    >
                                        <option value="sno">Registration S.No</option>
                                        <option value="name">Student Name</option>
                                        <option value="reg">Registration No</option>
                                    </select>
                                </div>
                                <button 
                                    onClick={() => setShowFilters(false)}
                                    className="w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-all font-inter"
                                >
                                    Apply Changes
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="h-8 w-[1px] bg-slate-200 mx-1"></div>

                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm group">
                    <Download size={16} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                    <span>Export CSV</span>
                </button>

                <PermissionWrapper feature="attendance" permission="update">
                    <button 
                        onClick={() => {
                            if (isEditMode) {
                                handleSaveFullSheet();
                            } else {
                                setIsEditMode(true);
                            }
                        }}
                        disabled={saving}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm border
                            ${isEditMode ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 disabled:opacity-50' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}
                        `}
                    >
                        <span>{saving ? 'Saving...' : (isEditMode ? 'Save Sheet' : 'Edit Sheet')}</span>
                    </button>
               </PermissionWrapper>

                <PermissionWrapper feature="attendance" permission="create">
                    <button 
                        onClick={handleImportOpen}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-900 rounded-lg text-xs font-bold text-white hover:bg-slate-800 transition-all shadow-sm group whitespace-nowrap shrink-0"
                    >
                        <Plus size={16} className="text-white" />
                        <span>Add Student</span>
                    </button>
               </PermissionWrapper>
            </div>

            <div className={`bg-white rounded-2xl border ${isEditMode ? 'border-blue-400 ring-2 ring-blue-50' : 'border-slate-200 shadow-sm'} overflow-hidden flex flex-col flex-1 transition-all`}>
                <div className="overflow-x-auto no-scrollbar flex-1 pb-2">
                    <table className="w-full text-[11px] border-separate border-spacing-0 min-w-max">
                        <thead className="sticky top-0 z-40 bg-slate-50/50 backdrop-blur-sm">
                            <tr>
                                <th className="px-4 py-4 text-[11px] font-semibold text-slate-600 text-left sticky left-0 bg-slate-50/50 z-50 border-b border-r border-slate-200 min-w-[60px]">S.No</th>
                                <th className="px-6 py-4 text-[11px] font-semibold text-slate-600 text-left sticky left-[60px] bg-slate-50/50 z-50 border-b border-r border-slate-200 min-w-[220px]">Student Name</th>
                                <th className="px-4 py-4 text-[11px] font-semibold text-slate-600 text-left sticky left-[280px] bg-slate-50/50 z-50 border-b border-r-2 border-r-slate-300 border-b-slate-200 min-w-[140px] shadow-[4px_0_12px_rgba(0,0,0,0.03)]">Reg No</th>
                                {displayDays.map(day => (
                                    <th key={day} className={`px-2 py-4 text-[11px] font-semibold text-center border-b border-r border-slate-200 min-w-[45px] ${day === today ? 'bg-blue-50/70 text-blue-700' : 'text-slate-500'}`}>
                                        {day}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={displayDays.length + 3} className="px-6 py-12 text-center text-slate-400 italic font-medium border-b border-slate-200">Loading matrix data...</td></tr>
                            ) : paginatedData.length > 0 ? (
                                paginatedData.map((student, idx) => (
                                    <tr key={student.candidate_id} className="hover:bg-slate-100/40 transition-colors group text-black">
                                        <td className="px-4 py-2 text-slate-500 sticky left-0 bg-white z-20 border-b border-r border-slate-200 text-center font-mono group-hover:bg-slate-50/50 font-normal">
                                            {(page * pageSize) + idx + 1}
                                        </td>
                                        <td className="px-6 py-2 sticky left-[60px] bg-white z-20 border-b border-r border-slate-200 group-hover:bg-slate-50/50">
                                            <div className="flex items-center gap-3">
                                                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 overflow-hidden shadow-sm">
                                                    <img
                                                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${student.candidate_name || 'Student'}`}
                                                        alt={student.candidate_name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <span className="text-sm font-normal text-black truncate max-w-[160px]">{student.candidate_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2 sticky left-[280px] bg-white z-30 border-b border-r-2 border-r-slate-300 border-b-slate-200 font-mono text-black shadow-[4px_0_12px_rgba(0,0,0,0.03)] group-hover:bg-slate-50/50 font-normal">
                                            {student.register_no}
                                        </td>
                                        {displayDays.map(day => {
                                            const cacheKey = `${student.candidate_id}_${day}`;
                                            const status = pendingEdits[cacheKey] !== undefined ? pendingEdits[cacheKey] : (student.attendance?.[day] || '');
                                            const isEditing = editingCell?.studentId === student.candidate_id && editingCell?.day === day;
                                            const isToday = day === today;

                                            return (
                                                <td 
                                                    key={day} 
                                                    className={`p-0 border-b border-r border-slate-200 relative align-middle ${isEditMode ? 'group/cell cursor-pointer' : ''} ${isToday ? 'bg-blue-50/30' : ''}`}
                                                    onClick={() => isEditMode && setEditingCell({ studentId: student.candidate_id, day })}
                                                >
                                                    {isEditing ? (
                                                        <div className="absolute inset-0 flex items-center justify-center bg-blue-50/50 p-[2px]">
                                                            <input
                                                                autoFocus
                                                                type="text"
                                                                maxLength={1}
                                                                className="w-full h-full bg-white text-blue-700 font-extrabold text-center rounded-[2px] outline-none ring-2 ring-blue-500 shadow-sm"
                                                                value={status}
                                                                onChange={(e) => {
                                                                    const val = e.target.value.toUpperCase();
                                                                    if (['P', 'A', 'L', 'H', ''].includes(val)) {
                                                                        setPendingEdits(prev => ({ ...prev, [cacheKey]: val }));
                                                                    }
                                                                }}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter' || e.key === 'ArrowDown') {
                                                                        e.preventDefault();
                                                                        const currentIndex = paginatedData.findIndex(s => s.candidate_id === student.candidate_id);
                                                                        if (currentIndex < paginatedData.length - 1) {
                                                                            setEditingCell({ studentId: paginatedData[currentIndex + 1].candidate_id, day });
                                                                        } else {
                                                                            setEditingCell(null);
                                                                        }
                                                                    } else if (e.key === 'ArrowUp') {
                                                                        e.preventDefault();
                                                                        const currentIndex = paginatedData.findIndex(s => s.candidate_id === student.candidate_id);
                                                                        if (currentIndex > 0) {
                                                                            setEditingCell({ studentId: paginatedData[currentIndex - 1].candidate_id, day });
                                                                        }
                                                                    } else if (e.key === 'Escape') {
                                                                        e.preventDefault();
                                                                        setEditingCell(null);
                                                                    }
                                                                }}
                                                                onFocus={(e) => e.target.select()}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className={`w-full h-9 flex items-center justify-center cursor-pointer transition-all
                                                            ${status === 'P' ? 'text-blue-600' : 
                                                              status === 'A' ? 'text-rose-500' : 
                                                              status === 'L' ? 'text-amber-500' : 
                                                              status === 'H' ? 'text-slate-400' : 'text-slate-200'}
                                                            group-hover/cell:bg-slate-100
                                                        `}>
                                                            {status || '·'}
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={displayDays.length + 3} className="px-6 py-12 text-center text-slate-400 italic border-b border-slate-200">No attendance records found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Present</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Absent</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Leave</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Holiday</span>
                        </div>
                    </div>
                    
                    <Pagination 
                        currentPage={page}
                        totalPages={Math.ceil(processedData.length / pageSize)}
                        onPageChange={(p) => setPage(p)}
                        pageSize={pageSize}
                        totalElements={processedData.length}
                    />
                </div>
            </div>
            {/* Import Students Modal */}
            {isImportModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between bg-white shrink-0">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Map Existing Candidate</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Push students from candidates list directly to this subject natively</p>
                            </div>
                            <button onClick={() => setIsImportModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                                <Plus size={20} className="rotate-45" />
                            </button>
                        </div>
                        
                        <div className="p-6 flex flex-col overflow-hidden min-h-[300px] bg-slate-50/50">
                            {/* Pre-select Context Preview purely visual */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm opacity-70">
                                    <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Target Branch ID</label>
                                    <div className="text-xs font-bold text-slate-700 font-mono mt-1 truncate">{branchId}</div>
                                </div>
                                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm opacity-70">
                                    <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Target Subject ID</label>
                                    <div className="text-xs font-bold text-slate-700 font-mono mt-1 truncate">{subjectId}</div>
                                </div>
                            </div>

                            <label className="text-[11px] font-bold text-slate-500 mb-2 block uppercase tracking-wider flex items-center justify-between">
                                <span>Unassigned Candidates Queue</span>
                                {selectedStudentIds.length > 0 && <span className="text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full text-[10px] font-bold">{selectedStudentIds.length} Selected</span>}
                            </label>
                            
                            <div className="bg-white border border-slate-200 rounded-xl flex-1 overflow-y-auto no-scrollbar relative shadow-inner p-2 space-y-1.5 min-h-[250px]">
                                {unmappedStudents.length === 0 && !loadingUnmapped ? (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                                        <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3 border border-slate-100">
                                            <UserCheck className="text-slate-300 w-5 h-5" />
                                        </div>
                                        <h5 className="text-sm font-bold text-slate-600">No Pending Candidates Found</h5>
                                        <p className="text-xs text-slate-400 mt-1 max-w-[250px] mx-auto">Everyone active strictly within this branch is literally mapped completely!</p>
                                    </div>
                                ) : (
                                    <>
                                        {unmappedStudents.length > 0 && (
                                            <>
                                                <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-100">
                                                    <input 
                                                        type="checkbox"
                                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
                                                        checked={unmappedStudents.length > 0 && selectedStudentIds.length === unmappedStudents.length}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setSelectedStudentIds(unmappedStudents.map(s => s.id));
                                                            else setSelectedStudentIds([]);
                                                        }}
                                                    />
                                                    <span className="text-xs font-bold text-slate-900">Select All Loaded Profiles</span>
                                                </label>
                                                <div className="h-px bg-slate-100 mx-2 mb-2 w-auto"></div>
                                            </>
                                        )}
                                        
                                        {unmappedStudents.map(student => (
                                            <label key={student.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer border border-slate-50">
                                                <input 
                                                    type="checkbox"
                                                    checked={selectedStudentIds.includes(student.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setSelectedStudentIds([...selectedStudentIds, student.id]);
                                                        else setSelectedStudentIds(selectedStudentIds.filter(id => id !== student.id));
                                                    }}
                                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
                                                />
                                                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                                                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${student.first_name}`} alt="avatar" className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-700">{student.first_name} {student.last_name}</span>
                                                    <span className="text-[10px] text-slate-400 font-mono tracking-widest font-semibold">{student.usn}</span>
                                                </div>
                                            </label>
                                        ))}

                                        {hasMoreUnmapped && (
                                            <div className="pt-4 pb-2 px-2">
                                                <button 
                                                    onClick={() => {
                                                        const next = unmappedPage + 1;
                                                        setUnmappedPage(next);
                                                        fetchUnmappedStudents(next);
                                                    }}
                                                    disabled={loadingUnmapped}
                                                    className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 disabled:opacity-50 transition-colors flex justify-center"
                                                >
                                                    {loadingUnmapped ? 'Loading subset...' : 'View More Directory Pages ↓'}
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between shrink-0 bg-white">
                            <button 
                                onClick={() => navigate('/students/add')}
                                className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1.5"
                            >
                                <Plus size={14} /> Add Completely New Student
                            </button>
                            
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setIsImportModalOpen(false)} className="px-5 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Cancel</button>
                                <button type="button" onClick={handleImportSubmit} disabled={importing || selectedStudentIds.length === 0} className="px-5 py-2 text-xs font-bold flex items-center gap-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all shadow-md active:scale-95 disabled:opacity-50">
                                    <UserCheck size={14} /> {importing ? 'Importing...' : 'Confirm Assignment'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttendanceSheet;
