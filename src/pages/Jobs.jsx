import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Jobs = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');

    const tabs = [
        { name: 'All', count: 118 },
        { name: 'Active', count: 78 },
        { name: 'Hold', count: 23 },
        { name: 'Closed', count: 7 },
        { name: 'Draft', count: 10 },
    ];

    const mockJobs = [
        {
            id: 1,
            title: 'Senior Full Stack Developer',
            client: 'Royal Thai Retreats',
            experience: '5-8 Years',
            location: 'Bangalore, India',
            workMode: 'Hybrid',
            status: 'Active',
            priority: 'High',
            applications: 42,
            views: 1250,
            visibility: 'Public',
            hiddenFields: 3,
            posted: '2 hr',
            type: 'Full-time'
        },
        {
            id: 2,
            title: 'UX/UI Designer',
            client: 'Digital Dynamics Corp',
            experience: '2-4 Years',
            location: 'Remote',
            workMode: 'Remote',
            status: 'Active',
            priority: 'Medium',
            applications: 18,
            views: 890,
            visibility: 'Internal',
            hiddenFields: 5,
            posted: '5 hr',
            type: 'Contract'
        },
        {
            id: 3,
            title: 'Backend Engineer (Node.js)',
            client: 'InnoSoft',
            experience: '4-6 Years',
            location: 'Pune, India',
            workMode: 'On-site',
            status: 'Hold',
            priority: 'High',
            applications: 25,
            views: 450,
            visibility: 'Public',
            hiddenFields: 2,
            posted: '1 day',
            type: 'Full-time'
        },
        {
            id: 4,
            title: 'Product Manager',
            client: 'Global Innovations Ltd',
            experience: '8-12 Years',
            location: 'Gurgaon, India',
            workMode: 'Hybrid',
            status: 'Closed',
            priority: 'Low',
            applications: 64,
            views: 2100,
            visibility: 'Public',
            hiddenFields: 0,
            posted: '3 days',
            type: 'Full-time'
        },
        {
            id: 5,
            title: 'DevOps Specialist',
            client: 'Cloud Services Group',
            experience: '5-7 Years',
            location: 'Hyderabad, India',
            workMode: 'Remote',
            status: 'Active',
            priority: 'High',
            applications: 12,
            views: 320,
            visibility: 'Private',
            hiddenFields: 8,
            posted: '1 week',
            type: 'Full-time'
        }
    ];

    const getStatusColor = (status) => {
        switch (status) {
            case 'Active': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            case 'Hold': return 'bg-orange-50 text-[#FF6B00] border-orange-100';
            case 'Closed': return 'bg-red-50 text-red-600 border-red-100';
            case 'Draft': return 'bg-slate-50 text-slate-600 border-slate-100';
            default: return 'bg-slate-50 text-slate-600 border-slate-100';
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'High': return 'text-red-500 bg-red-50';
            case 'Medium': return 'text-amber-500 bg-amber-50';
            case 'Low': return 'text-blue-500 bg-blue-50';
            default: return 'text-slate-500 bg-slate-50';
        }
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-800">Jobs Management</h1>
                <button
                    onClick={() => navigate('/jobs/create')}
                    className="px-6 py-2.5 text-xs font-bold rounded-lg bg-gradient-to-b from-[#FF6B00] to-[#FF4E00] text-white hover:brightness-110 shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Job
                </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-8 border-b border-slate-100 overflow-x-auto no-scrollbar">
                {tabs.map((tab) => (
                    <button
                        key={tab.name}
                        onClick={() => setActiveTab(tab.name)}
                        className={`relative pb-4 flex items-center gap-2 transition-all group ${activeTab === tab.name ? 'text-[#FF6B00] font-bold' : 'text-slate-400 font-medium'}`}
                    >
                        <span className="text-sm">{tab.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === tab.name ? 'bg-orange-100 text-[#FF6B00]' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'} transition-colors`}>
                            {tab.count}
                        </span>
                        {activeTab === tab.name && (
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
                        placeholder="Search jobs by title or client..."
                        className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-600 placeholder-slate-400 outline-none transition-all focus:border-orange-400 focus:ring-2 focus:ring-orange-50"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Dropdowns */}
                <div className="flex items-center gap-3">
                    <select className="bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-xs font-semibold text-slate-600 outline-none focus:border-orange-400 cursor-pointer">
                        <option>Experience</option>
                        <option>Freshers</option>
                        <option>1-3 Years</option>
                        <option>3-5 Years</option>
                        <option>5+ Years</option>
                    </select>

                    <select className="bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-xs font-semibold text-slate-600 outline-none focus:border-orange-400 cursor-pointer">
                        <option>Expected Salary</option>
                        <option>Under 5L</option>
                        <option>5L - 10L</option>
                        <option>10L - 20L</option>
                        <option>20L+</option>
                    </select>

                    <button className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                        More Filters
                    </button>
                </div>
            </div>

            {/* Table Container */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="pl-4 pr-2 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-left w-[22%]">Title</th>
                                <th className="px-2 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-left w-[16%]">Location & Work Mode</th>
                                <th className="px-2 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center w-[10%]">Status</th>
                                <th className="px-2 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center w-[10%]">Priority</th>
                                <th className="px-2 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center w-[10%]">Applications</th>
                                <th className="px-2 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center w-[10%]">Views</th>
                                <th className="px-2 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center w-[10%]">Visibility</th>
                                <th className="px-2 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center w-[10%]">Posted</th>
                                <th className="px-2 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center w-[2%]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {mockJobs.map((job) => (
                                <tr key={job.id} className="hover:bg-slate-50/30 transition-colors group">
                                    <td className="pl-4 pr-2 py-4">
                                        <div className="flex items-center gap-2.5">
                                            <div className="h-8 w-8 flex-shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                            <div className="max-w-[180px]">
                                                <p className="text-xs font-bold text-slate-700 group-hover:text-[#FF6B00] transition-colors truncate">{job.title}</p>
                                                <p className="text-[10px] text-slate-400 font-medium truncate">{job.client}</p>
                                                <p className="text-[10px] text-slate-900 mt-0.5">{job.experience} Exp</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-2 py-4">
                                        <div className="flex flex-col items-start gap-0.5">
                                            <div className="flex items-center gap-1">
                                                <svg className="h-3 w-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                </svg>
                                                <span className="text-xs font-medium text-slate-600 truncate max-w-[120px]">{job.location}</span>
                                            </div>
                                            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-tight ml-4">{job.workMode}</span>
                                        </div>
                                    </td>
                                    <td className="px-2 py-4 text-center">
                                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${getStatusColor(job.status)} uppercase tracking-wide`}>
                                            {job.status}
                                        </span>
                                    </td>
                                    <td className="px-2 py-4 text-center">
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${getPriorityColor(job.priority)}`}>
                                            {job.priority}
                                        </span>
                                    </td>
                                    <td className="px-2 py-4 text-center font-bold text-xs text-slate-700">{job.applications}</td>
                                    <td className="px-2 py-4 text-center font-bold text-xs text-slate-700">{job.views}</td>
                                    <td className="px-2 py-4 text-center">
                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${job.visibility === 'Public' ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : job.visibility === 'Internal' ? 'text-blue-600 bg-blue-50 border-blue-100' : 'text-slate-500 bg-slate-50 border-slate-100'}`}>
                                            {job.visibility}
                                        </span>
                                    </td>
                                    <td className="px-2 py-4 text-center">
                                        <span className="text-xs font-medium text-slate-400 whitespace-nowrap">{job.posted}</span>
                                    </td>
                                    <td className="px-2 py-4 text-center">
                                        <button className="p-1 text-slate-300 hover:text-slate-600 transition-colors">
                                            <svg className="w-5 h-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* Pagination / Footer Info */}
            <div className="flex items-center justify-between pb-6 mt-4">
                <p className="text-xs font-medium text-slate-400 italic">Showing 1 to 5 of 118 jobs</p>
                <div className="flex items-center gap-2">
                    <button className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-50">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <button className="h-8 w-8 flex items-center justify-center rounded-lg bg-[#FF6B00] text-white text-xs font-bold shadow-sm">1</button>
                    <button className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors">2</button>
                    <button className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors">3</button>
                    <button className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Jobs;
