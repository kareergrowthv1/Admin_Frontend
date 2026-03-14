import React from 'react';

const Field = ({ label, id, value, onChange, type = 'text', placeholder = '', required = false }) => (
    <div>
        <label htmlFor={id} className="block text-xs font-medium text-slate-900 mb-1.5">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        {type === 'textarea' ? (
            <textarea
                id={id}
                rows={3}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder:text-slate-400 resize-none outline-none"
            />
        ) : (
            <input
                id={id}
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder:text-slate-400 outline-none"
            />
        )}
    </div>
);

export default Field;
