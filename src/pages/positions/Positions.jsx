import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from '../../config/axios';
import { toast } from 'react-hot-toast';

import PermissionWrapper from '../../components/common/PermissionWrapper';
import Pagination from '../../components/common/Pagination';
import { getFeatureDataScope, getLoggedInUserId } from '../../utils/permissionUtils';
import { X, Briefcase, RefreshCw } from 'lucide-react';

const Positions = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const filterUserId = searchParams.get('userId');
    const filterUserName = searchParams.get('userName');

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
    const [activeStatusDropdownId, setActiveStatusDropdownId] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const dropdownRef = useRef(null);
    const statusDropdownRef = useRef(null);
    const [selectedPositionId, setSelectedPositionId] = useState(null);
    const [publicLinkModal, setPublicLinkModal] = useState({ show: false, link: '', positionTitle: '' });
    const [publicLinkSettingsModal, setPublicLinkSettingsModal] = useState({ show: false, position: null, validityDays: 30 });
    const [generatingLink, setGeneratingLink] = useState(false);
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
            if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
                setActiveStatusDropdownId(null);
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
            const params = {};
            const dataScope = getFeatureDataScope('positions');
            if (dataScope === 'OWN') {
                params.createdBy = getLoggedInUserId();
            }

            const response = await axios.get('/admins/positions/counts', { params });
            if (response.data && response.data.data) {
                setStatusCounts(response.data.data);
                setTotalCount(response.data.data.ALL || 0);
            }
        } catch (err) {
            console.error('Error fetching status counts:', err);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await Promise.all([
                fetchPositions(true),
                fetchStatusCounts()
            ]);
        } catch (err) {
            console.error('Refresh failed:', err);
            toast.error('Failed to refresh data');
        } finally {
            setIsRefreshing(false);
        }
    };

    const fetchPositions = async (isManualRefresh = false) => {
        try {
            setLoading(true);
            setError(null);

            const params = {
                page: currentPage,
                size: pageSize
            };

            if (isManualRefresh) {
                params._t = Date.now();
            }

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

            // Enforce OWN scope if applicable
            const dataScope = getFeatureDataScope('positions');
            if (filterUserId) {
                params.createdBy = filterUserId;
            } else if (dataScope === 'OWN') {
                params.createdBy = getLoggedInUserId();
            } else if (advancedFilters.createdBy && advancedFilters.createdBy !== 'All Users') {
                params.createdBy = advancedFilters.createdBy;
            }

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
            setActiveStatusDropdownId(null);
        } catch (err) {
            console.error('Error updating status:', err);
            toast.error(err.response?.data?.message || 'Failed to update status');
        }
    };

    const handleGeneratePublicLink = async (validityDays) => {
        const position = publicLinkSettingsModal.position;
        setPublicLinkSettingsModal({ show: false, position: null, validityDays: 30 });
        setGeneratingLink(true);
        try {
            // 1. Fetch available question sets for this position
            const qsRes = await axios.get(`/admins/question-sets?positionId=${position.id}`);
            const questionSets = qsRes.data?.content || [];
            
            if (questionSets.length === 0) {
                toast.error('No question set found for this position. Please add one first.');
                setGeneratingLink(false);
                return;
            }

            const questionSetId = questionSets[0].id;

            // 2. Fetch sections for the selected question set
            const secRes = await axios.get(`/admins/question-sections/question-set/${questionSetId}`);
            const sections = secRes.data?.data || [];
            
            const questionSectionId = sections.length > 0 ? sections[0].id : null;

            // 3. Generate public link with obtained question_set_id and question_section_id
            const genRes = await axios.post('/candidates/public-link', {
                position_id: position.id,
                organization_id: user.organizationId,
                question_set_id: questionSetId,
                question_section_id: questionSectionId,
                link_validity_days: validityDays
            });
            
            if (genRes.data && genRes.data.success) {
                setPublicLinkModal({
                    show: true,
                    link: genRes.data.data.public_link,
                    positionTitle: position.title
                });
            }
        } catch (err) {
            console.error('Error handling public link:', err);
            toast.error('Failed to generate public link');
        } finally {
            setGeneratingLink(false);
            setActiveDropdownId(null);
        }
    };

    const openPublicLinkSettings = (position) => {
        setPublicLinkSettingsModal({ show: true, position, validityDays: 30 });
        setActiveDropdownId(null);
    };

    const getStatusColor = (status) => {
        const statusMap = {
            'ACTIVE': 'bg-green-50 text-green-700 border-green-200',
            'ON_HOLD': 'bg-blue-50 text-blue-700 border-blue-200',
            'CLOSED': 'bg-red-50 text-red-700 border-red-200',
            'DRAFT': 'bg-orange-50 text-orange-600 border-orange-300',
            'EXPIRED': 'bg-red-50 text-red-700 border-red-200',
            'INACTIVE': 'bg-yellow-50 text-yellow-700 border-yellow-200'
        };
        return statusMap[status] || 'bg-slate-50 text-slate-500 border-slate-200';
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
        <div className="space-y-6 pt-2 pb-12">
            {/* Filtered By Indicator */}
            {filterUserId && filterUserName && (
                <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                            <Briefcase size={16} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider leading-none mb-1">Filtered by Member</p>
                            <h3 className="text-sm font-bold text-indigo-900 capitalize leading-none">{filterUserName}</h3>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            searchParams.delete('userId');
                            searchParams.delete('userName');
                            setSearchParams(searchParams);
                        }}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1.5 group"
                    >
                        <span>Clear Filter</span>
                        <X size={14} className="group-hover:rotate-90 transition-transform" />
                    </button>
                </div>
            )}
            {/* Tabs */}
            <div className="flex items-center gap-8 border-b border-slate-100 overflow-x-auto no-scrollbar">
                {tabs.map((tab) => (
                    <button
                        key={tab.value}
                        onClick={() => setActiveTab(tab.value)}
                        className={`relative pb-2 flex items-center gap-2 transition-all group ${activeTab === tab.value ? 'text-blue-600 font-normal' : 'text-black font-normal'}`}
                    >
                        <span className="text-xs">{tab.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === tab.value ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'} transition-colors`}>
                            {tab.count}
                        </span>
                        {activeTab === tab.value && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                        )}
                    </button>
                ))}
            </div>

            {/* Filters Bar */}
            <div className="flex flex-wrap items-center gap-4">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Search positions..."
                        className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-600 placeholder-slate-400 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <button
                    onClick={handleRefresh}
                    className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors shadow-sm shrink-0"
                    title="Refresh"
                >
                    <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
                </button>

                <div className="flex items-center gap-3">
                    <select
                        value={advancedFilters.domain}
                        onChange={(e) => setAdvancedFilters(prev => ({ ...prev, domain: e.target.value }))}
                        className="bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-xs font-semibold text-slate-600 outline-none focus:border-blue-400 cursor-pointer appearance-none"
                    >
                        <option value="">Domain</option>
                        <option value="IT">IT</option>
                        <option value="NON-IT">NON-IT</option>
                    </select>

                    <select
                        value={advancedFilters.experience}
                        onChange={(e) => setAdvancedFilters(prev => ({ ...prev, experience: e.target.value }))}
                        className="bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-xs font-semibold text-slate-600 outline-none focus:border-blue-400 cursor-pointer appearance-none"
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
                            className={`flex items-center gap-2 bg-white border ${showFilters ? 'border-blue-400 ring-2 ring-blue-50' : 'border-slate-200'} rounded-lg px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all`}
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
                                                        className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
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
                                            className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-300"
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
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 text-[10px] text-slate-700 outline-none focus:border-blue-300"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[10px] text-slate-400">To</span>
                                                <input
                                                    type="date"
                                                    value={advancedFilters.dateTo}
                                                    onChange={(e) => setAdvancedFilters({ ...advancedFilters, dateTo: e.target.value })}
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 text-[10px] text-slate-700 outline-none focus:border-blue-300"
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
                                            className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-300"
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
                                        className="px-3 py-1.5 bg-blue-600 text-white text-[10px] font-bold rounded-md hover:bg-blue-700 transition-colors shadow-sm"
                                    >
                                        Apply Filters
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Create Position button */}
                    <PermissionWrapper feature="positions" permission="create">
                        <button
                            onClick={() => navigate('/position/create')}
                            className="ml-auto flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-all shrink-0"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            + New Position
                        </button>
                    </PermissionWrapper>
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
                                <th className="px-2 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center w-[10%]">Candidates</th>
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
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
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
                                                    <p className="text-sm text-black group-hover:text-blue-600 transition-colors truncate">{position.title}</p>
                                                    <p className="text-[11px] text-black font-normal truncate">{position.code}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-2 py-4 text-center">
                                            <span className="text-xs text-black">{position.domainType}</span>
                                        </td>
                                        <td className="px-2 py-4 text-center">
                                            <span className="text-xs text-black whitespace-nowrap">{position.minimumExperience}-{position.maximumExperience} Years</span>
                                        </td>
                                        <td className="px-2 py-4 text-center">
                                            {((localStorage.getItem('positionsPermissions') && JSON.parse(localStorage.getItem('positionsPermissions')).includes('UPDATE')) || 
                                              (localStorage.getItem('admin_user') && JSON.parse(localStorage.getItem('admin_user')).is_admin)) ? (
                                                <div className="relative inline-block">
                                                    <button
                                                        onClick={() => {
                                                            setActiveStatusDropdownId(activeStatusDropdownId === position.id ? null : position.id);
                                                        }}
                                                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold border-[1.5px] flex items-center justify-center gap-1.5 min-w-[90px] transition-all shadow-sm ${getStatusColor(position.status)} ${position.status === 'CLOSED' ? 'hover:brightness-95 active:scale-95 cursor-pointer' : 'hover:brightness-95 active:scale-95 cursor-pointer'}`}
                                                    >
                                                        <span className="uppercase tracking-widest">{position.status}</span>
                                                        <svg className={`w-2.5 h-2.5 transition-transform duration-200 ${activeStatusDropdownId === position.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </button>
                                                    
                                                    {activeStatusDropdownId === position.id && (
                                                        <div 
                                                            ref={statusDropdownRef}
                                                            className="absolute left-1/2 -translate-x-1/2 mt-2 w-32 bg-white rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.1)] border border-slate-100 py-1 z-[60] animate-in fade-in slide-in-from-top-2 duration-200"
                                                        >
                                                            {statusOptions.map(option => (
                                                                <button
                                                                    key={option}
                                                                    onClick={() => {
                                                                        if (option !== position.status) {
                                                                            handleStatusChange(position.id, option, position.status);
                                                                        }
                                                                        setActiveStatusDropdownId(null);
                                                                    }}
                                                                    className={`w-full px-3 py-2 text-left text-[10px] font-bold transition-all flex items-center justify-between group
                                                                        ${option === position.status ? 'bg-slate-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                                                                    `}
                                                                >
                                                                    <span className="capitalize tracking-normal">{formatStatusName(option)}</span>
                                                                    {option === position.status && (
                                                                        <div className="w-1 h-1 rounded-full bg-blue-600" />
                                                                    )}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold border min-w-[90px] text-center inline-block uppercase tracking-widest ${getStatusColor(position.status)}`}>
                                                    {position.status}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-2 py-4 text-center font-normal text-xs text-black">{position.noOfPositions}</td>
                                        <td className="px-2 py-4 text-center font-normal text-xs text-black">
                                            <button
                                                onClick={() => navigate(`/candidates?positionId=${position.id}`)}
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 hover:bg-blue-100 transition-all shadow-sm active:scale-95"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                </svg>
                                                <span className="font-bold">{position.candidatesLinked ?? position.interviewInviteSent ?? 0}</span>
                                            </button>
                                        </td>
                                        <td className="px-2 py-4 text-center font-normal text-xs text-black">
                                            <button
                                                onClick={() => navigate(`/admins/positions/setup-interview?positionId=${position.id}`, { state: { position } })}
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-600 rounded-2xl border border-purple-100 hover:bg-purple-100 transition-all shadow-sm active:scale-95"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                                </svg>
                                                <span className="font-bold">{position.questionSetCount ?? 0}</span>
                                            </button>
                                        </td>
                                        <td className="px-2 py-4 text-center">
                                            <span className="text-xs text-black whitespace-nowrap">{formatDate(position.createdAt)}</span>
                                        </td>
                                        <td className="px-2 py-4 text-center relative">
                                            {position.status === 'DRAFT' ? (
                                                <PermissionWrapper feature="positions" permission="update">
                                                    <button
                                                        onClick={() => navigate(`/position/create?id=${position.id}`)}
                                                        className="text-[12px] font-normal text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                                                    >
                                                        Edit
                                                    </button>
                                                </PermissionWrapper>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => setActiveDropdownId(activeDropdownId === position.id ? null : position.id)}
                                                        className={`p-2 rounded-full transition-all ${activeDropdownId === position.id ? 'bg-slate-100 text-blue-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
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
                                                                    navigate(`/position/view/${position.id}`);
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
                                                                <PermissionWrapper feature="positions" permission="update">
                                                                    <button
                                                                        onClick={() => navigate(`/position/create?id=${position.id}`)}
                                                                        className="w-full px-4 py-2.5 text-left text-[11px] font-normal text-black hover:bg-slate-50 flex items-center gap-2"
                                                                    >
                                                                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                        </svg>
                                                                        Edit Position
                                                                    </button>
                                                                </PermissionWrapper>
                                                            )}
                                                            <button
                                                                onClick={() => openPublicLinkSettings(position)}
                                                                disabled={generatingLink}
                                                                className="w-full px-4 py-2.5 text-left text-[11px] font-normal text-black hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50"
                                                            >
                                                                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 015.656 0l4 4a4 4 0 01-5.656 5.656l-1.101-1.101" />
                                                                </svg>
                                                                Generate Public Link
                                                            </button>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* Pagination */}
            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                pageSize={pageSize}
                totalElements={totalCount}
            />
            {/* Confirmation Modal */}
            {confirmModal.show && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-sm overflow-hidden animate-in zoom-in duration-200">
                        <div className="p-6 text-center">
                            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
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
                                    className="flex-1 px-4 py-2 text-xs font-bold text-white bg-gradient-to-b from-blue-600 to-blue-700 rounded-lg shadow-lg shadow-blue-500/20 hover:brightness-110 transition-all"
                                >
                                    Confirm Change
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Public Link Modal */}
            {publicLinkModal.show && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden animate-in zoom-in duration-200">
                        <div className="relative p-8">
                            <button 
                                onClick={() => setPublicLinkModal({ show: false, link: '', positionTitle: '' })}
                                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all"
                            >
                                <X size={20} />
                            </button>

                            <div className="text-center mb-8">
                                <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 shadow-sm border border-blue-100">
                                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 015.656 0l4 4a4 4 0 01-5.656 5.656l-1.101-1.101" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Public Registration Link</h3>
                                <p className="text-sm text-slate-500">
                                    Share this link with candidates to register for <span className="font-bold text-slate-700">{publicLinkModal.positionTitle}</span>
                                </p>
                            </div>

                            <div className="space-y-6">
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 group relative">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Registration URL</div>
                                    <div className="flex items-center gap-3 bg-white border border-slate-100 rounded-xl p-3 shadow-sm group-hover:border-blue-200 transition-all">
                                        <p className="flex-1 text-[13px] text-slate-600 font-medium truncate select-all">{publicLinkModal.link}</p>
                                        <button 
                                            onClick={() => {
                                                navigator.clipboard.writeText(publicLinkModal.link);
                                                toast.success('Link copied to clipboard!');
                                            }}
                                            className="px-4 py-2 bg-blue-600 text-white text-[11px] font-bold rounded-lg hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-500/20 shrink-0"
                                        >
                                            Copy Link
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                                    <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <p className="text-[11px] text-amber-700 leading-relaxed">
                                        Anyone with this link can register. The link is valid for 30 days. You can track registrations in the candidates page.
                                    </p>
                                </div>

                                <button 
                                    onClick={() => setPublicLinkModal({ show: false, link: '', positionTitle: '' })}
                                    className="w-full py-3.5 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-2xl transition-all border border-transparent hover:border-slate-200"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Public Link Settings Modal */}
            {publicLinkSettingsModal.show && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
                        <div className="p-8">
                            <div className="flex items-start gap-4 mb-8">
                                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 shadow-sm border border-amber-100">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">Link Expiry Settings</h3>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Set how long the registration link remains active for <span className="font-semibold text-slate-700">{publicLinkSettingsModal.position?.title}</span>
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-900 mb-3 ml-1">Validity Period (Days)</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[7, 15, 30].map((days) => (
                                            <button
                                                key={days}
                                                onClick={() => setPublicLinkSettingsModal(prev => ({ ...prev, validityDays: days }))}
                                                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border ${
                                                    publicLinkSettingsModal.validityDays === days
                                                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/10'
                                                        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-200'
                                                }`}
                                            >
                                                {days} Days
                                            </button>
                                        ))}
                                    </div>
                                    <div className="mt-3">
                                        <input 
                                            type="number" 
                                            min="1" 
                                            max="365"
                                            value={publicLinkSettingsModal.validityDays}
                                            onChange={(e) => setPublicLinkSettingsModal(prev => ({ ...prev, validityDays: parseInt(e.target.value) || 1 }))}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                                            placeholder="Enter custom days"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-2">
                                    <button 
                                        onClick={() => setPublicLinkSettingsModal({ show: false, position: null, validityDays: 30 })}
                                        className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={() => handleGeneratePublicLink(publicLinkSettingsModal.validityDays)}
                                        className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-500/10"
                                    >
                                        Generate Link
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Positions;
