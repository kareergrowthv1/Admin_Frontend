import React from 'react';
import { useNavigate } from 'react-router-dom';

const OrgDetailsModal = ({ isCollege }) => {
    const navigate = useNavigate();
    const isCollegeAdmin = isCollege === true;

    const title = isCollegeAdmin ? 'Complete College Details' : 'Complete Company Details';
    const message = isCollegeAdmin
        ? 'Please fill in your college details before accessing the platform.'
        : 'Please fill in your company details before accessing the platform.';
    const confirmLabel = isCollegeAdmin ? 'Fill College Details' : 'Fill Company Details';
    const navPath = isCollegeAdmin ? '/settings/college-details' : '/settings/company-details';

    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />

            <div className="flex min-h-full items-center justify-center p-4 text-center">
                <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">

                    {/* Header — same as ConfirmModal */}
                    <div className="flex items-center gap-3 mb-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50">
                            {/* Exclamation triangle matching FaExclamationTriangle */}
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 576 512"
                                className="h-4 w-4 text-rose-600 fill-rose-600"
                            >
                                <path d="M569.517 440.013C587.975 472.007 564.806 512 527.94 512H48.054c-36.937 0-59.999-40.055-41.577-71.987L246.423 23.985c18.467-32.009 64.72-31.951 83.154 0l239.94 416.028zM288 354c-25.405 0-46 20.595-46 46s20.595 46 46 46 46-20.595 46-46-20.595-46-46-46zm-43.673-165.346l7.418 136c.347 6.364 5.609 11.346 11.982 11.346h48.546c6.373 0 11.635-4.982 11.982-11.346l7.418-136c.375-6.874-5.098-12.654-11.982-12.654h-63.383c-6.884 0-12.356 5.78-11.981 12.654z" />
                            </svg>
                        </div>
                        <h3 className="font-heading text-lg font-bold leading-6 text-black">
                            {title}
                        </h3>
                    </div>

                    {/* Message */}
                    <div className="mt-2">
                        <p className="text-sm text-slate-500 font-sans">
                            {message}
                        </p>
                    </div>

                    {/* Single CTA button — no cancel */}
                    <div className="mt-8 flex justify-end">
                        <button
                            type="button"
                            className="inline-flex justify-center rounded-lg border border-transparent px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm focus:outline-none transition-all bg-blue-600 hover:bg-blue-700"
                            onClick={() => navigate(navPath)}
                        >
                            {confirmLabel}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default OrgDetailsModal;
