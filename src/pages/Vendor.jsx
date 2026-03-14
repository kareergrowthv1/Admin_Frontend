import React from 'react';

const Vendor = () => {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="hover:text-slate-600 cursor-pointer">Back</span>
                    <span className="mx-1 text-slate-200">•</span>
                    <span className="hover:text-slate-600 cursor-pointer">Organization</span>
                    <span className="mx-1 text-slate-200">/</span>
                    <span className="text-slate-900 font-bold uppercase">Vendor</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-[11px] font-medium text-slate-400">Last update at {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">VENDOR</h1>
                    <p className="text-slate-500">Manage your vendor relationships.</p>
                </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-8">
                <p className="text-slate-600">External partners and service provider management.</p>
            </div>
        </div>
    );
};

export default Vendor;
