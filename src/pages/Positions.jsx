import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from '../config/axios';
import { toast } from 'react-hot-toast';
import PositionDetailsDrawer from '../components/PositionDetailsDrawer';

const Positions = () => {
    const navigate = useNavigate();
    const { user } = useSelector(state => state.auth);
    const [activeTab, setActiveTab] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [positions, setPositions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [totalCount, setTotalCount] = useState(0);
    const [statusCounts, setStatusCounts] = useState({
        ALL: 0,
        ACTIVE: 0,
        CLOSED: 0,
        ON_HOLD: 0,
        DRAFT: 0,
        EXPIRED: 0,
        INACTIVE: 0
    });
    const [showFilters, setShowFilters] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ show: false, positionId: null, newStatus: '' });
    const filterRef = useRef(null);
    const [advancedFilters, setAdvancedFilters] = useState({
        status: [],
        domain: '',
        experience: '',
        createdBy: 'All Users',
        dateFrom: '',
        dateTo: '',
        orderBy: 'Newest to Oldest'
    });
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [isLastPage, setIsLastPage] = useState(true);
    const [activeDropdownId, setActiveDropdownId] = useState(null);
    const dropdownRef = useRef(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedPositionId, setSelectedPositionId] = useState(null);
    const filtersChangedRef = useRef(false);

    const statusOptions = ['ACTIVE', 'CLOSED', 'ON_HOLD', 'DRAFT', 'EXPIRED', 'INACTIVE'];

    const formatStatusName = (status) => {
        if (!status) return '';
        return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase().replace('_', ' ');
    };

    const tabs = [
        { name: 'All', value: 'All', count: statusCounts.ALL },
        ...statusOptions.map(status => ({
            name: formatStatusName(status),
            value: status,
            count: statusCounts[status] || 0
        }))
    ];

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setActiveDropdownId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // When filters/tab/search change, mark so we reset page once and then fetch (avoids double API call)
    useEffect(() => {
        filtersChangedRef.current = true;
    }, [activeTab, searchTerm, advancedFilters]);

    // Single effect: one fetch per navigation/filter change (no duplicate calls)
    useEffect(() => {
        if (filtersChangedRef.current && currentPage !== 0) {
            filtersChangedRef.current = false;
            setCurrentPage(0);
            return;
        }
        if (filtersChangedRef.current) filtersChangedRef.current = false;
        fetchPositions();
        fetchStatusCounts();
    }, [activeTab, searchTerm, advancedFilters, currentPage]);

    const fetchStatusCounts = async () => {
        try {
            const response = await axios.get('/admins/positions/counts');
            if (response.data && response.data.data) {
                setStatusCounts(response.data.data);
                setTotalCount(response.data.data.ALL || 0);
            }
        } catch (err) {
            console.error('Error fetching status counts:', err);
        }
    };

    const fetchPositions = async () => {
        try {
            setLoading(true);
            setError(null);

            const params = {
                page: currentPage,
                size: pageSize
            };

            // Add search filter
            if (searchTerm) {
                params.search = searchTerm;
            }

            // Add status filter if not "All"
            if (activeTab !== 'All') {
                params.status = activeTab;
            } else if (advancedFilters.status.length > 0) {
                // Join array for backend if it supports comma separated or multiple status params
                params.status = advancedFilters.status.join(',');
            }

            // Add advanced filters
            if (advancedFilters.dateFrom) params.dateFrom = advancedFilters.dateFrom;
            if (advancedFilters.dateTo) params.dateTo = advancedFilters.dateTo;
            if (advancedFilters.orderBy) params.sortBy = advancedFilters.orderBy;
            if (advancedFilters.domain) params.domain = advancedFilters.domain;
            if (advancedFilters.experience) params.experience = advancedFilters.experience;
            // createdBy logic would go here if backend supports it

            const response = await axios.get('/admins/positions', {
                params
            });

            if (response.data) {
                // Handle standardized paginated response
                const responseData = response.data;
                setPositions(responseData.content || []);
                setTotalCount(responseData.totalElements || 0);
                setTotalPages(responseData.totalPages || 0);
                setIsLastPage(responseData.last !== false);
            }
        } catch (err) {
            console.error('Error fetching positions:', err);
            setError(err.response?.data?.message || 'Failed to fetch positions');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (positionId, newStatus, currentStatus) => {
        if (currentStatus === 'CLOSED') {
            toast.error('This position is closed and its status cannot be changed.');
            return;
        }
        setConfirmModal({ show: true, positionId, newStatus });
    };

    const confirmStatusChange = async () => {
        const { positionId, newStatus } = confirmModal;
        setConfirmModal({ show: false, positionId: null, newStatus: '' });

        try {
            await axios.put(`/admins/positions/${positionId}/status`, { status: newStatus });
            setPositions(prev => prev.map(pos =>
                pos.id === positionId ? { ...pos, status: newStatus } : pos
            ));
            fetchStatusCounts();
            toast.success(`Status updated to ${newStatus}`);
            setActiveDropdownId(null);
        } catch (err) {
            console.error('Error updating status:', err);
            toast.error(err.response?.data?.message || 'Failed to update status');
        }
    };

    const getStatusColor = (status) => {
        const statusMap = {
            'ACTIVE': 'bg-green-50 text-green-600 border-green-100',
            'ON_HOLD': 'bg-orange-50 text-orange-600 border-orange-100',
            'CLOSED': 'bg-red-50 text-red-600 border-red-100',
            'DRAFT': 'bg-purple-50 text-purple-600 border-purple-100',
            'EXPIRED': 'bg-red-50 text-red-600 border-red-100',
            'INACTIVE': 'bg-yellow-50 text-yellow-600 border-yellow-100'
        };
        return statusMap[status] || 'bg-slate-50 text-slate-400 border-slate-100';
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        // Treat encoded UTC as local IST by stripping 'Z' to fix timezone offset issues
        const date = new Date(dateString.replace('Z', ''));
        const now = new Date();
        const diff = now - date;

        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        const weeks = Math.floor(days / 7);
        const years = Math.floor(days / 365);

        if (minutes < 1) return '0 min';
        if (minutes < 60) return `${minutes} min`;
        if (hours < 24) return `${hours}hr`;
        if (days < 7) return `${days}dy`;
        if (weeks < 52) return `${weeks}week`;
        return `${years}year`;
    };

    // Close dropdown on click outside or ESC key
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setShowFilters(false);
            }
        };

        const handleEscKey = (event) => {
            if (event.key === 'Escape') {
                setShowFilters(false);
            }
        };

        if (showFilters) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscKey);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscKey);
        };
    }, [showFilters]);

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-800">Positions</h1>
                <button
                    onClick={() => navigate('/position/create')}
                    className="px-6 py-2.5 text-xs font-bold rounded-lg bg-gradient-to-b from-[#FF6B00] to-[#FF4E00] text-white hover:brightness-110 shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Position
                </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-8 border-b border-slate-100 overflow-x-auto no-scrollbar">
                {tabs.map((tab) => (
                    <button
                        key={tab.value}
                        onClick={() => setActiveTab(tab.value)}
                        className={`relative pb-2 flex items-center gap-2 transition-all group ${activeTab === tab.value ? 'text-[#FF6B00] font-normal' : 'text-black font-normal'}`}
                    >
                        <span className="text-xs">{tab.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === tab.value ? 'bg-orange-100 text-[#FF6B00]' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'} transition-colors`}>
                            {tab.count}
                        </span>
                        {activeTab === tab.value && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF6B00] rounded-full" />
                        )}
                    </button>
                ))}
            </div>

            {/* Filters Bar */}
            <div className="flex flex-wrap items-center gap-4">
                {/* Search */}
                <div className="relative flex-1 min-w-[300px]">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Search positions by title or college..."
                        className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-600 placeholder-slate-400 outline-none transition-all focus:border-orange-400 focus:ring-2 focus:ring-orange-50"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Dropdowns */}
                <div className="flex items-center gap-3">
                    <select
                        value={advancedFilters.domain}
                        onChange={(e) => setAdvancedFilters(prev => ({ ...prev, domain: e.target.value }))}
                        className="bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-xs font-semibold text-slate-600 outline-none focus:border-orange-400 cursor-pointer appearance-none"
                    >
                        <option value="">Domain</option>
                        <option value="IT">IT</option>
                        <option value="NON-IT">NON-IT</option>
                    </select>

                    <select
                        value={advancedFilters.experience}
                        onChange={(e) => setAdvancedFilters(prev => ({ ...prev, experience: e.target.value }))}
                        className="bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-xs font-semibold text-slate-600 outline-none focus:border-orange-400 cursor-pointer appearance-none"
                    >
                        <option value="">Experience</option>
                        <option value="Freshers">Freshers</option>
                        <option value="0-1 Years">0-1 Years</option>
                        <option value="1-2 Years">1-2 Years</option>
                        <option value="2-3 Years">2-3 Years</option>
                        <option value="4-5 Years">4-5 Years</option>
                    </select>

                    <div className="relative" ref={filterRef}>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 bg-white border ${showFilters ? 'border-orange-400 ring-2 ring-orange-50' : 'border-slate-200'} rounded-lg px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all`}
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                            </svg>
                            More Filters
                        </button>

                        {/* More Filters Dropdown */}
                        {showFilters && (
                            <div className="absolute right-0 mt-2 w-[280px] bg-white rounded-xl border border-slate-100 shadow-[0_10px_25px_rgba(0,0,0,0.1)] z-50 overflow-hidden">
                                <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto no-scrollbar">
                                    {/* Status (Multi-select Checkboxes) */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {statusOptions.map((status) => (
                                                <label key={status} className="flex items-center gap-2 cursor-pointer group">
                                                    <input
                                                        type="checkbox"
                                                        checked={advancedFilters.status.includes(status)}
                                                        onChange={(e) => {
                                                            const newStatus = e.target.checked
                                                                ? [...advancedFilters.status, status]
                                                                : advancedFilters.status.filter(s => s !== status);
                                                            setAdvancedFilters({ ...advancedFilters, status: newStatus });
                                                        }}
                                                        className="w-3.5 h-3.5 rounded border-slate-300 text-[#FF6B00] focus:ring-[#FF6B00]"
                                                    />
                                                    <span className="text-[11px] text-slate-600 group-hover:text-slate-900 transition-colors">{status.replace('_', ' ')}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Created By */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Created By</label>
                                        <select
                                            value={advancedFilters.createdBy}
                                            onChange={(e) => setAdvancedFilters({ ...advancedFilters, createdBy: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs text-slate-700 outline-none focus:border-orange-300"
                                        >
                                            <option value="All Users">All Users</option>
                                        </select>
                                    </div>

                                    {/* Date Range */}
                                    <div className="space-y-2.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Created Date Range</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <span className="text-[10px] text-slate-400">From</span>
                                                <input
                                                    type="date"
                                                    value={advancedFilters.dateFrom}
                                                    onChange={(e) => setAdvancedFilters({ ...advancedFilters, dateFrom: e.target.value })}
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 text-[10px] text-slate-700 outline-none focus:border-orange-300"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[10px] text-slate-400">To</span>
                                                <input
                                                    type="date"
                                                    value={advancedFilters.dateTo}
                                                    onChange={(e) => setAdvancedFilters({ ...advancedFilters, dateTo: e.target.value })}
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 text-[10px] text-slate-700 outline-none focus:border-orange-300"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Order By */}
                                    <div className="space-y-1.5 text-black">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Order By</label>
                                        <select
                                            value={advancedFilters.orderBy}
                                            onChange={(e) => setAdvancedFilters({ ...advancedFilters, orderBy: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs text-slate-700 outline-none focus:border-orange-300"
                                        >
                                            <option value="Newest to Oldest">Newest to Oldest</option>
                                            <option value="Oldest to Newest">Oldest to Newest</option>
                                            <option value="Job Title (A - Z)">Job Title (A - Z)</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                                    <button
                                        onClick={() => {
                                            setAdvancedFilters({
                                                status: [],
                                                createdBy: 'All Users',
                                                dateFrom: '',
                                                dateTo: '',
                                                orderBy: 'Newest to Oldest'
                                            });
                                        }}
                                        className="text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        Reset
                                    </button>
                                    <button
                                        onClick={() => setShowFilters(false)}
                                        className="px-3 py-1.5 bg-[#FF6B00] text-white text-[10px] font-bold rounded-md hover:bg-[#FF4E00] transition-colors shadow-sm"
                                    >
                                        Apply Filters
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Table Container */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
                <div className="relative">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200">
                                <th className="pl-8 pr-2 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-left w-[22%]">Job Title</th>
                                <th className="px-2 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center w-[12%]">Domain</th>
                                <th className="px-2 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center w-[12%]">Experience</th>
                                <th className="px-2 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center w-[10%]">Status</th>
                                <th className="px-2 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center w-[8%]">Positions</th>
                                <th className="px-2 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center w-[10%]">Applications</th>
                                <th className="px-2 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center w-[10%]">Question Sets</th>
                                <th className="px-2 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center w-[10%]">Posted</th>
                                <th className="px-2 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center w-[6%]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="9" className="py-8 text-center text-slate-400">
                                        <div className="flex items-center justify-center">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#FF6B00]"></div>
                                        </div>
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan="9" className="py-8 text-center text-red-500 text-sm">
                                        {error}
                                    </td>
                                </tr>
                            ) : positions.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="py-8 text-center text-slate-400 text-sm">
                                        No positions found
                                    </td>
                                </tr>
                            ) : (
                                positions.map((position) => (
                                    <tr key={position.id} className="hover:bg-slate-100/40 transition-colors group">
                                        <td className="pl-8 pr-2 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 flex-shrink-0 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                    </svg>
                                                </div>
                                                <div className="max-w-[200px]">
                                                    <p className="text-sm font-semibold text-slate-900 group-hover:text-[#FF6B00] transition-colors truncate">{position.title}</p>
                                                    <p className="text-[11px] text-slate-500 font-normal truncate">{position.code}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-2 py-4 text-center">
                                            <span className="text-xs font-normal text-slate-900">{position.domainType}</span>
                                        </td>
                                        <td className="px-2 py-4 text-center">
                                            <span className="text-xs font-normal text-slate-900 whitespace-nowrap">{position.minimumExperience}-{position.maximumExperience} Years</span>
                                        </td>
                                        <td className="px-2 py-4 text-center">
                                            <div className="relative group/status inline-block">
                                                <select
                                                    value={position.status}
                                                    onChange={(e) => handleStatusChange(position.id, e.target.value, position.status)}
                                                    disabled={position.status === 'CLOSED'}
                                                    className={`px-3 py-1 rounded-full text-[10px] font-normal border cursor-pointer appearance-none outline-none text-center min-w-[80px] transition-all shadow-sm ${getStatusColor(position.status)} ${position.status === 'CLOSED' ? 'opacity-70 cursor-not-allowed' : ''}`}
                                                >
                                                    {statusOptions.map(option => (
                                                        <option key={option} value={option} className="bg-white text-black">
                                                            {option}
                                                        </option>
                                                    ))}
                                                </select>
                                                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-40 group-hover/status:opacity-100 transition-opacity">
                                                    <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-2 py-4 text-center font-normal text-xs text-slate-900">{position.noOfPositions}</td>
                                        <td className="px-2 py-4 text-center font-normal text-xs text-slate-900">{position.candidatesLinked ?? position.interviewInviteSent ?? 0}</td>
                                        <td className="px-2 py-4 text-center font-normal text-xs text-slate-900">{position.questionSetCount ?? 0}</td>
                                        <td className="px-2 py-4 text-center">
                                            <span className="text-xs font-normal text-slate-900 whitespace-nowrap">{formatDate(position.createdAt)}</span>
                                        </td>
                                        <td className="px-2 py-4 text-center relative">
                                            <button
                                                onClick={() => setActiveDropdownId(activeDropdownId === position.id ? null : position.id)}
                                                className={`p-2 rounded-full transition-all ${activeDropdownId === position.id ? 'bg-slate-100 text-[#FF6B00]' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                                            >
                                                <svg className="w-5 h-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                                </svg>
                                            </button>

                                            {activeDropdownId === position.id && (
                                                <div
                                                    ref={dropdownRef}
                                                    className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in duration-200"
                                                >
                                                    <button
                                                        onClick={() => {
                                                            setSelectedPositionId(position.id);
                                                            setIsDrawerOpen(true);
                                                            setActiveDropdownId(null);
                                                        }}
                                                        className="w-full px-4 py-2.5 text-left text-[11px] font-normal text-black hover:bg-slate-50 flex items-center gap-2"
                                                    >
                                                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                        View Details
                                                    </button>
                                                    {position.status !== 'CLOSED' && (
                                                        <button
                                                            onClick={() => navigate(`/position/create?id=${position.id}`)}
                                                            className="w-full px-4 py-2.5 text-left text-[11px] font-normal text-black hover:bg-slate-50 flex items-center gap-2"
                                                        >
                                                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                            Edit Position
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* Pagination / Footer Info */}
            <div className="flex items-center justify-between pb-6 mt-4">
                <p className="text-xs font-semibold text-slate-400 italic">
                    Showing {positions.length > 0 ? (currentPage * pageSize) + 1 : 0} to {Math.min((currentPage + 1) * pageSize, totalCount)} of {totalCount} entries
                </p>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                        disabled={currentPage === 0}
                        className={`h-8 px-3 flex items-center gap-1.5 rounded-lg border border-slate-200 text-[#475569] text-[10px] font-bold hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all shadow-sm`}
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span>Prev</span>
                    </button>

                    <div className="h-8 min-w-[32px] px-2 flex items-center justify-center rounded-lg bg-[#FF6B00] text-white text-[10px] font-bold shadow-sm">
                        {currentPage + 1}
                    </div>

                    <button
                        onClick={() => setCurrentPage(prev => (!isLastPage ? prev + 1 : prev))}
                        disabled={isLastPage}
                        className={`h-8 px-3 flex items-center gap-1.5 rounded-lg border border-slate-200 text-[#475569] text-[10px] font-bold hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all shadow-sm`}
                    >
                        <span>Next</span>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </div>
            {/* Confirmation Modal */}
            {confirmModal.show && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-sm overflow-hidden animate-in zoom-in duration-200">
                        <div className="p-6 text-center">
                            <div className="w-12 h-12 rounded-full bg-orange-50 text-[#FF6B00] flex items-center justify-center mx-auto mb-4">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="text-base font-bold text-slate-800 mb-2">Confirm Status Change</h3>
                            <p className="text-sm text-slate-500 mb-4">
                                Are you sure you want to change the status to <span className="font-bold text-slate-700">{confirmModal.newStatus}</span>?
                            </p>
                            {confirmModal.newStatus === 'CLOSED' && (
                                <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-xl">
                                    <p className="text-[10px] font-bold text-red-600 flex items-center justify-center gap-1.5">
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        WARNING: Once closed, status cannot be changed.
                                    </p>
                                </div>
                            )}
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setConfirmModal({ show: false, positionId: null, newStatus: '' })}
                                    className="flex-1 px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-lg transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmStatusChange}
                                    className="flex-1 px-4 py-2 text-xs font-bold text-white bg-gradient-to-b from-[#FF6B00] to-[#FF4E00] rounded-lg shadow-lg shadow-orange-500/20 hover:brightness-110 transition-all"
                                >
                                    Confirm Change
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <PositionDetailsDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                positionId={selectedPositionId}
                onEdit={(id) => {
                    setIsDrawerOpen(false);
                    navigate(`/position/create?id=${id}`);
                }}
            />
        </div>
    );
};

export default Positions;
