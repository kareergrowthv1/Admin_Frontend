import React from 'react';

/**
 * Universal, high-fidelity pagination component for administrative tables.
 * Follows the "1, 2, 3 ... 10" numbering style with "Prev" and "Next" text boxes.
 */
const Pagination = ({ 
    currentPage, 
    totalPages, 
    onPageChange, 
    pageSize, 
    totalElements,
    className = ""
}) => {
    // Hide if only one page or no elements
    if (totalPages <= 1 || totalElements === 0) {
        return null;
    }

    const getPageRange = () => {
        const current = currentPage + 1;
        const last = totalPages;
        const delta = 1;
        const left = current - delta;
        const right = current + delta + 1;
        const range = [];
        const rangeWithDots = [];
        let l;

        for (let i = 1; i <= last; i++) {
            if (i === 1 || i === last || (i >= left && i < right)) {
                range.push(i);
            }
        }

        for (let i of range) {
            if (l) {
                if (i - l === 2) {
                    rangeWithDots.push(l + 1);
                } else if (i - l !== 1) {
                    rangeWithDots.push('...');
                }
            }
            rangeWithDots.push(i);
            l = i;
        }

        return rangeWithDots;
    };

    return (
        <div className={`flex items-center justify-between pb-6 mt-4 ${className}`}>
            <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-400 italic">
                    Showing {Math.min((currentPage * pageSize) + 1, totalElements)} to {Math.min((currentPage + 1) * pageSize, totalElements)} of {totalElements} records
                </span>
            </div>
            
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onPageChange(Math.max(currentPage - 1, 0))}
                    disabled={currentPage === 0}
                    className="h-8 px-4 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 text-[10px] font-bold hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-all shadow-sm cursor-pointer disabled:cursor-not-allowed"
                >
                    Prev
                </button>
                
                <div className="flex items-center gap-1.5">
                    {getPageRange().map((p, idx) => (
                        <button
                            key={idx}
                            onClick={() => typeof p === 'number' && onPageChange(p - 1)}
                            disabled={p === '...'}
                            className={`h-8 min-w-[32px] px-2 flex items-center justify-center rounded-lg text-[10px] font-bold transition-all shadow-sm
                                ${p === currentPage + 1 
                                    ? 'bg-blue-600 text-white shadow-blue-200' 
                                    : p === '...' 
                                        ? 'text-slate-400 cursor-default bg-transparent' 
                                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer'}
                            `}
                        >
                            {p}
                        </button>
                    ))}
                </div>

                <button
                    onClick={() => onPageChange(Math.min(currentPage + 1, totalPages - 1))}
                    disabled={currentPage === totalPages - 1}
                    className="h-8 px-4 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 text-[10px] font-bold hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-all shadow-sm cursor-pointer disabled:cursor-not-allowed"
                >
                    Next
                </button>
            </div>
        </div>
    );
};

export default Pagination;
