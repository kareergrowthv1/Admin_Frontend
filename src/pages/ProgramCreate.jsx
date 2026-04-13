import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from '../config/axios';
import { toast } from 'react-hot-toast';
import PermissionWrapper from '../components/common/PermissionWrapper';

const ProgramCreate = () => {
    const navigate = useNavigate();
    const { user } = useSelector(state => state.auth);
    const [loading, setLoading] = useState(false);
    const [fetchingIncharges, setFetchingIncharges] = useState(false);
    const [availableIncharges, setAvailableIncharges] = useState([]);
    
    const [form, setForm] = useState({
        name: '',
        code: '',
        mentor_id: ''
    });

    useEffect(() => {
        fetchAvailableIncharges();
    }, []);

    const fetchAvailableIncharges = async () => {
        try {
            setFetchingIncharges(true);
            const response = await axios.get('/attendance/available-incharges');
            if (response.data.success) {
                setAvailableIncharges(response.data.data);
            }
        } catch (err) {
            console.error('Error fetching incharges:', err);
            toast.error('Failed to load available incharges');
        } finally {
            setFetchingIncharges(false);
        }
    };

    const handleInputChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.name.trim()) {
            toast.error('Please enter a Program Name');
            return;
        }
        if (!form.code.trim()) {
            toast.error('Please enter a Program Code');
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post('/attendance/departments', form);
            if (response.data.success) {
                toast.success('Program created successfully!');
                navigate('/attendance');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create program');
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="py-6">
            {/* Form - LOOSE layout (no card) */}
            <form onSubmit={handleSubmit} className="space-y-10 max-w-5xl">
                <div>
                    <div className="grid grid-cols-2 gap-8">
                        {/* Program Name */}
                        <div className="col-span-2 sm:col-span-1">
                            <label className="text-[12px] font-bold text-slate-700 mb-2 block uppercase tracking-tight">
                                Program Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="e.g., MBA, B.Tech CSE"
                                value={form.name}
                                onChange={(e) => handleInputChange('name', e.target.value)}
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] bg-white transition-all"
                            />
                        </div>

                        {/* Program Code */}
                        <div className="col-span-2 sm:col-span-1">
                            <label className="text-[12px] font-bold text-slate-700 mb-2 block uppercase tracking-tight">
                                Program Code <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="e.g., MBA-2026, CSE-01"
                                value={form.code}
                                onChange={(e) => handleInputChange('code', e.target.value)}
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] bg-white transition-all"
                            />
                        </div>

                        {/* Program Incharge */}
                        <div className="col-span-2">
                            <label className="text-[12px] font-bold text-slate-700 mb-2 block uppercase tracking-tight">
                                Assign Program Incharge (Sub-Admin)
                            </label>
                            <div className="relative">
                                <select
                                    value={form.mentor_id}
                                    onChange={(e) => handleInputChange('mentor_id', e.target.value)}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-sm appearance-none cursor-pointer shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] bg-white transition-all"
                                    disabled={fetchingIncharges}
                                >
                                    <option value="">Select an available Incharge</option>
                                    {availableIncharges.map(inc => (
                                        <option key={inc.id} value={inc.id}>
                                            {inc.first_name} {inc.last_name} ({inc.role_name} - {inc.email})
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400">
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                            <p className="mt-2 text-[10px] text-slate-500 font-medium italic">
                                Note: Only sub-admins who are not currently assigned to another program are shown.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Bottom Action Button */}
                <div className="pt-6 flex justify-start">
                    <PermissionWrapper feature="attendance" permission="write">
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-10 py-3 text-sm font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all disabled:opacity-50 active:scale-[0.98]"
                        >
                            {loading ? 'Creating...' : 'Create Program'}
                        </button>
                    </PermissionWrapper>
                </div>
            </form>
        </div>
    );
};

export default ProgramCreate;
