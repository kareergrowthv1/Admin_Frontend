import React, { useState, useEffect } from 'react';
import axios from '../../config/axios';
import { toast } from 'react-hot-toast';
import Pagination from '../../components/common/Pagination';

const Clients = () => {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const initialFormState = {
        clientName: '',
        clientEmail: '',
        clientPhone: '',
        managerName: '',
        managerEmail: '',
        managerPhone: '',
        code: '',
        status: 'ACTIVE'
    };
    const [form, setForm] = useState(initialFormState);

    const fetchClients = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/admins/clients', {
                params: {
                    limit: 10,
                    offset: page * 10,
                    searchTerm: searchTerm || undefined
                }
            });
            if (res.data.success) {
                setClients(res.data.data);
                setTotalElements(res.data.totalElements);
            }
        } catch (err) {
            console.error('Failed to fetch clients:', err);
            toast.error('Failed to load clients');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClients();
    }, [page, searchTerm]);

    const handleInputChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.clientName) {
            toast.error('Company Name is required');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await axios.post('/admins/clients', form);
            if (res.data.success) {
                toast.success('Client added successfully');
                setIsSlideOverOpen(false);
                setForm(initialFormState);
                fetchClients(); // Refresh list
            }
        } catch (err) {
            console.error('Failed to add client:', err);
            toast.error(err.response?.data?.message || 'Failed to add client');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusColor = (status) => {
        return status === 'ACTIVE' 
            ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
            : 'bg-slate-50 text-slate-400 border-slate-100';
    };

    const inputClass = "w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-all";
    const labelClass = "block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2";

    return (
        <div className="pt-2 pb-12 space-y-6">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-800">Clients</h1>
                    <p className="text-sm text-slate-500 font-medium">Manage your hiring companies and contact persons.</p>
                </div>
                <button 
                    onClick={() => setIsSlideOverOpen(true)}
                    className="px-5 py-2.5 text-[11px] font-bold tracking-wide rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Client
                </button>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[300px]">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Search by company name, code or manager..."
                        className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-600 placeholder-slate-400 outline-none transition-all focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="pl-6 pr-3 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Company</th>
                                <th className="px-3 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Manager</th>
                                <th className="px-3 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Contact Info</th>
                                <th className="px-3 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">Status</th>
                                <th className="px-3 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">Joined</th>
                                <th className="px-3 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                                            <p className="text-xs font-bold text-slate-400">Loading clients...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : clients.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="py-20 text-center">
                                        <p className="text-sm font-bold text-slate-400">No clients found</p>
                                    </td>
                                </tr>
                            ) : clients.map((client) => (
                                <tr key={client.id} className="hover:bg-slate-50/30 transition-colors group">
                                    <td className="pl-6 pr-3 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-100 flex items-center justify-center font-bold text-slate-600 text-xs">
                                                {client.clientName.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{client.clientName}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{client.code}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-3 py-4 text-xs font-semibold text-slate-600">
                                        {client.managerName || '-'}
                                    </td>
                                    <td className="px-3 py-4">
                                        <div className="space-y-0.5">
                                            <p className="text-[11px] font-bold text-slate-700">{client.clientEmail || '-'}</p>
                                            <p className="text-[10px] text-slate-400 font-medium">{client.clientPhone || '-'}</p>
                                        </div>
                                    </td>
                                    <td className="px-3 py-4 text-center">
                                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${getStatusColor(client.status)} uppercase tracking-wide`}>
                                            {client.status}
                                        </span>
                                    </td>
                                    <td className="px-3 py-4 text-center text-[10px] font-bold text-slate-400">
                                        {client.createdAt ? new Date(client.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

            {/* Pagination */}
            {!loading && clients.length > 0 && (
                <Pagination
                    currentPage={page}
                    totalPages={Math.ceil(totalElements / 10)}
                    onPageChange={(p) => setPage(p)}
                    pageSize={10}
                    totalElements={totalElements}
                />
            )}

            {/* Slide-over for Adding Client */}
            <div className={`fixed inset-0 z-50 overflow-hidden transition-all duration-500 ${isSlideOverOpen ? 'visible' : 'invisible'}`}>
                <div 
                    className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-500 ${isSlideOverOpen ? 'opacity-100' : 'opacity-0'}`} 
                    onClick={() => !isSubmitting && setIsSlideOverOpen(false)} 
                />
                <div className={`absolute inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl transition-transform duration-500 ease-in-out ${isSlideOverOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="flex h-full flex-col">
                        <div className="flex items-center justify-between border-b border-slate-100 px-8 py-6">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">New Client</h2>
                                <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-wider">Company & Point of Contact Info</p>
                            </div>
                            <button 
                                onClick={() => setIsSlideOverOpen(false)} 
                                disabled={isSubmitting}
                                className="rounded-xl p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all disabled:opacity-50"
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 no-scrollbar space-y-8">
                            {/* Section: Company Details */}
                            <div className="space-y-5">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-1 h-4 bg-blue-600 rounded-full" />
                                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Company Details</h3>
                                </div>
                                
                                <div>
                                    <label className={labelClass}>Company Name <span className="text-red-500">*</span></label>
                                    <input 
                                        type="text" 
                                        className={inputClass} 
                                        placeholder="e.g. Acme Corporation" 
                                        value={form.clientName} 
                                        onChange={(e) => handleInputChange('clientName', e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClass}>Client Email</label>
                                        <input 
                                            type="email" 
                                            className={inputClass} 
                                            placeholder="company@email.com" 
                                            value={form.clientEmail} 
                                            onChange={(e) => handleInputChange('clientEmail', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Client Phone</label>
                                        <input 
                                            type="text" 
                                            className={inputClass} 
                                            placeholder="+91 98765 43210" 
                                            value={form.clientPhone} 
                                            onChange={(e) => handleInputChange('clientPhone', e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className={labelClass}>Internal Client Code (Optional)</label>
                                    <input 
                                        type="text" 
                                        className={inputClass} 
                                        placeholder="e.g. ACM-01" 
                                        value={form.code} 
                                        onChange={(e) => handleInputChange('code', e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Section: Point of Contact */}
                            <div className="space-y-5">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-1 h-4 bg-blue-600 rounded-full" />
                                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Point of Contact</h3>
                                </div>

                                <div>
                                    <label className={labelClass}>Manager Name</label>
                                    <input 
                                        type="text" 
                                        className={inputClass} 
                                        placeholder="e.g. John Doe" 
                                        value={form.managerName} 
                                        onChange={(e) => handleInputChange('managerName', e.target.value)}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClass}>Manager Email</label>
                                        <input 
                                            type="email" 
                                            className={inputClass} 
                                            placeholder="manager@company.com" 
                                            value={form.managerEmail} 
                                            onChange={(e) => handleInputChange('managerEmail', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Manager Phone</label>
                                        <input 
                                            type="text" 
                                            className={inputClass} 
                                            placeholder="+91 91234 56789" 
                                            value={form.managerPhone} 
                                            onChange={(e) => handleInputChange('managerPhone', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </form>

                        <div className="border-t border-slate-100 p-8 bg-slate-50/50">
                            <div className="flex gap-4">
                                <button 
                                    type="button"
                                    onClick={() => setIsSlideOverOpen(false)}
                                    disabled={isSubmitting}
                                    className="flex-1 px-6 py-3 text-xs font-bold rounded-xl border border-slate-200 text-slate-600 hover:bg-white transition-all disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className="flex-[2] px-6 py-3 text-xs font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            Saving...
                                        </>
                                    ) : (
                                        'Create Client'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Clients;
