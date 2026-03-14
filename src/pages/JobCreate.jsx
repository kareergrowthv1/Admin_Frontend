import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const JobCreate = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        status: 'Active',
        requirementCategory: '',
        client: '',
        noOfPositions: 1,
        offeredCtc: '',
        requirementName: '',
        experienceMin: '',
        experienceMax: '',
        priorityLevel: '',
        jobFamily: '',
        workLocation: '',
        managerDetails: '',
        customerReferenceId: '',
        spocName: '',
        spocEmail: '',
        spocPhone: '',
        applicationDeadline: '',
        jobTitle: '',
        positionRole: '',
        experienceRequired: '',
        location: '',
        salaryRange: '',
        jobType: 'Full-time',
        skillsRequired: '',
        optionalSkills: '',
        jobDescription: '',
    });

    const [selectedVendors, setSelectedVendors] = useState([]);
    const [selectedPlatforms, setSelectedPlatforms] = useState([]);
    const [showToVendor, setShowToVendor] = useState({});

    const vendors = [
        { id: 1, company: 'Tech Solutions Inc', contact: 'John Smith' },
        { id: 2, company: 'Global Innovations Ltd', contact: 'Sarah Johnson' },
        { id: 3, company: 'Digital Dynamics Corp', contact: 'Michael Chen' },
        { id: 4, company: 'Cloud Services Group', contact: 'Emily Davis' },
        { id: 5, company: 'Enterprise Solutions LLC', contact: 'David Wilson' },
        { id: 6, company: 'NextGen Technologies', contact: 'Lisa Anderson' },
    ];

    const platforms = ['LinkedIn', 'Naukri', 'Indeed', 'Shine', 'Monster'];

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const toggleVendor = (id) => {
        setSelectedVendors(prev =>
            prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
        );
    };

    const togglePlatform = (p) => {
        setSelectedPlatforms(prev =>
            prev.includes(p) ? prev.filter(v => v !== p) : [...prev, p]
        );
    };

    const toggleShowToVendor = (field) => {
        setShowToVendor(prev => ({ ...prev, [field]: !prev[field] }));
    };

    // Reusable field wrapper with "Show to vendor" toggle
    const FieldWrapper = ({ label, required, fieldKey, children }) => (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
                <label className="text-[12px] font-semibold text-slate-700">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
                <button
                    type="button"
                    onClick={() => toggleShowToVendor(fieldKey)}
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-md transition-colors ${showToVendor[fieldKey] ? 'bg-orange-100 text-[#FF6B00]' : 'bg-slate-100 text-slate-400 hover:text-slate-600'}`}
                >
                    Show to vendor
                </button>
            </div>
            {children}
        </div>
    );

    const inputClass = "w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 placeholder-slate-300 outline-none transition-all focus:border-orange-400 focus:ring-2 focus:ring-orange-100";
    const selectClass = "w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-orange-400 focus:ring-2 focus:ring-orange-100 appearance-none cursor-pointer";

    return (
        <div className="space-y-0">
            {/* Top breadcrumb + action buttons */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="hover:text-slate-600 cursor-pointer" onClick={() => navigate('/jobs')}>Back</span>
                    <span className="mx-1 text-slate-200">•</span>
                    <span className="hover:text-slate-600 cursor-pointer" onClick={() => navigate('/jobs')}>Job List</span>
                    <span className="mx-1 text-slate-200">/</span>
                    <span className="text-slate-800 font-bold">Create Job</span>
                </div>
                <div className="flex items-center gap-3">
                    <button className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 transition-colors">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                        </svg>
                    </button>
                    <button className="px-5 py-2 text-xs font-bold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                        Save as Draft
                    </button>
                    <button className="px-6 py-2 text-xs font-bold rounded-lg bg-gradient-to-b from-[#FF6B00] to-[#FF4E00] text-white hover:brightness-110 shadow-lg shadow-orange-500/20 transition-all">
                        Publish Now
                    </button>
                </div>
            </div>

            {/* Page Title */}
            <h1 className="text-2xl font-bold text-slate-800 mb-6">Create Job</h1>

            {/* Main form */}
            <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-[0_1px_4px_rgba(0,0,0,0.1)]">
                {/* Section: Requirement Details */}
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-6 pb-2 border-b border-slate-100">Requirement Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5 mb-8">
                    <FieldWrapper label="Status" required fieldKey="status">
                        <div className="flex items-center gap-4">
                            {['Active', 'Inactive', 'Hold'].map(s => (
                                <label key={s} className="flex items-center gap-1.5 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="status"
                                        value={s}
                                        checked={form.status === s}
                                        onChange={() => handleChange('status', s)}
                                        className="accent-orange-500 h-3.5 w-3.5"
                                    />
                                    <span className="text-xs font-medium text-slate-600">{s}</span>
                                </label>
                            ))}
                        </div>
                    </FieldWrapper>

                    <FieldWrapper label="Requirement Category" required fieldKey="requirementCategory">
                        <select className={selectClass} value={form.requirementCategory} onChange={e => handleChange('requirementCategory', e.target.value)}>
                            <option value="">Select category</option>
                            <option value="IT">IT</option>
                            <option value="Non-IT">Non-IT</option>
                            <option value="Engineering">Engineering</option>
                            <option value="Management">Management</option>
                        </select>
                    </FieldWrapper>

                    <FieldWrapper label="Client" required fieldKey="client">
                        <select className={selectClass} value={form.client} onChange={e => handleChange('client', e.target.value)}>
                            <option value="">Select client</option>
                            <option value="Royal Thai Retreats">Royal Thai Retreats</option>
                            <option value="TechCorp">TechCorp</option>
                            <option value="InnoSoft">InnoSoft</option>
                        </select>
                    </FieldWrapper>

                    <FieldWrapper label="No. of Positions" required fieldKey="noOfPositions">
                        <input type="number" min="1" className={inputClass} value={form.noOfPositions} onChange={e => handleChange('noOfPositions', e.target.value)} />
                    </FieldWrapper>

                    <FieldWrapper label="Offered CTC" required fieldKey="offeredCtc">
                        <input type="text" className={inputClass} placeholder="e.g., 10 (in Lacs)" value={form.offeredCtc} onChange={e => handleChange('offeredCtc', e.target.value)} />
                        <p className="text-[10px] text-slate-400">Enter value in Lacs (e.g., 10 for ₹10 Lacs)</p>
                    </FieldWrapper>

                    <FieldWrapper label="Requirement Name" required fieldKey="requirementName">
                        <input type="text" className={inputClass} placeholder="Enter requirement name" value={form.requirementName} onChange={e => handleChange('requirementName', e.target.value)} />
                    </FieldWrapper>

                    <FieldWrapper label="Experience Range (Min)" required fieldKey="experienceMin">
                        <input type="number" className={inputClass} placeholder="Min years" value={form.experienceMin} onChange={e => handleChange('experienceMin', e.target.value)} />
                    </FieldWrapper>

                    <FieldWrapper label="Experience Range (Max)" required fieldKey="experienceMax">
                        <input type="number" className={inputClass} placeholder="Max years" value={form.experienceMax} onChange={e => handleChange('experienceMax', e.target.value)} />
                    </FieldWrapper>

                    <FieldWrapper label="Priority Level" required fieldKey="priorityLevel">
                        <select className={selectClass} value={form.priorityLevel} onChange={e => handleChange('priorityLevel', e.target.value)}>
                            <option value="">Select priority</option>
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                        </select>
                    </FieldWrapper>

                    <FieldWrapper label="Job Family" required fieldKey="jobFamily">
                        <select className={selectClass} value={form.jobFamily} onChange={e => handleChange('jobFamily', e.target.value)}>
                            <option value="">Select job family</option>
                            <option value="Technology">Technology</option>
                            <option value="Operations">Operations</option>
                            <option value="Finance">Finance</option>
                            <option value="HR">HR</option>
                        </select>
                    </FieldWrapper>

                    <FieldWrapper label="Work Location" required fieldKey="workLocation">
                        <input type="text" className={inputClass} placeholder="e.g., San Francisco, CA" value={form.workLocation} onChange={e => handleChange('workLocation', e.target.value)} />
                    </FieldWrapper>

                    <FieldWrapper label="Manager Details" fieldKey="managerDetails">
                        <input type="text" className={inputClass} placeholder="Enter manager details" value={form.managerDetails} onChange={e => handleChange('managerDetails', e.target.value)} />
                    </FieldWrapper>

                    <FieldWrapper label="Customer Reference ID" fieldKey="customerReferenceId">
                        <input type="text" className={inputClass} placeholder="Enter reference ID" value={form.customerReferenceId} onChange={e => handleChange('customerReferenceId', e.target.value)} />
                    </FieldWrapper>

                    <FieldWrapper label="SPOC Name" fieldKey="spocName">
                        <input type="text" className={inputClass} placeholder="Enter SPOC name" value={form.spocName} onChange={e => handleChange('spocName', e.target.value)} />
                    </FieldWrapper>

                    <FieldWrapper label="SPOC Email ID" fieldKey="spocEmail">
                        <input type="email" className={inputClass} placeholder="spoc@example.com" value={form.spocEmail} onChange={e => handleChange('spocEmail', e.target.value)} />
                    </FieldWrapper>

                    <FieldWrapper label="SPOC Phone Number" fieldKey="spocPhone">
                        <input type="text" className={inputClass} placeholder="Enter phone number" value={form.spocPhone} onChange={e => handleChange('spocPhone', e.target.value)} />
                    </FieldWrapper>

                    <FieldWrapper label="Application Deadline" required fieldKey="applicationDeadline">
                        <input type="date" className={inputClass} value={form.applicationDeadline} onChange={e => handleChange('applicationDeadline', e.target.value)} />
                    </FieldWrapper>
                </div>

                {/* Section: Job Details */}
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-6 pb-2 border-b border-slate-100">Job Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5 mb-8">
                    <FieldWrapper label="Job Title" required fieldKey="jobTitle">
                        <input type="text" className={inputClass} placeholder="e.g., Senior Full Stack Developer" value={form.jobTitle} onChange={e => handleChange('jobTitle', e.target.value)} />
                    </FieldWrapper>

                    <FieldWrapper label="Position/Role" required fieldKey="positionRole">
                        <input type="text" className={inputClass} placeholder="e.g., Full Stack Developer" value={form.positionRole} onChange={e => handleChange('positionRole', e.target.value)} />
                    </FieldWrapper>

                    <FieldWrapper label="Experience Required" required fieldKey="experienceRequired">
                        <input type="text" className={inputClass} placeholder="e.g., 3-5 years" value={form.experienceRequired} onChange={e => handleChange('experienceRequired', e.target.value)} />
                    </FieldWrapper>

                    <FieldWrapper label="Location" required fieldKey="location">
                        <input type="text" className={inputClass} placeholder="e.g., San Francisco, CA or Remote" value={form.location} onChange={e => handleChange('location', e.target.value)} />
                    </FieldWrapper>

                    <FieldWrapper label="Salary Range" required fieldKey="salaryRange">
                        <input type="text" className={inputClass} placeholder="e.g., ₹10 Lacs - ₹15 Lacs" value={form.salaryRange} onChange={e => handleChange('salaryRange', e.target.value)} />
                    </FieldWrapper>

                    <FieldWrapper label="Job Type" required fieldKey="jobType">
                        <select className={selectClass} value={form.jobType} onChange={e => handleChange('jobType', e.target.value)}>
                            <option value="Full-time">Full-time</option>
                            <option value="Part-time">Part-time</option>
                            <option value="Contract">Contract</option>
                            <option value="Internship">Internship</option>
                        </select>
                    </FieldWrapper>

                    <FieldWrapper label="Skills Required" required fieldKey="skillsRequired">
                        <input type="text" className={inputClass} placeholder="e.g., React, Node.js, TypeScript, AWS" value={form.skillsRequired} onChange={e => handleChange('skillsRequired', e.target.value)} />
                    </FieldWrapper>

                    <FieldWrapper label="Optional Skills" fieldKey="optionalSkills">
                        <input type="text" className={inputClass} placeholder="e.g., Docker, Kubernetes, CI/CD" value={form.optionalSkills} onChange={e => handleChange('optionalSkills', e.target.value)} />
                    </FieldWrapper>
                </div>

                {/* Job Description - full width */}
                <div className="mb-8">
                    <FieldWrapper label="Job Description" required fieldKey="jobDescription">
                        <textarea
                            className={`${inputClass} min-h-[140px] resize-y`}
                            placeholder="Describe the role, responsibilities, and what you're looking for..."
                            value={form.jobDescription}
                            onChange={e => handleChange('jobDescription', e.target.value)}
                            rows={5}
                        />
                    </FieldWrapper>
                </div>

                {/* Section: Select Vendors */}
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-6 pb-2 border-b border-slate-100">Select Vendors</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    {vendors.map(v => (
                        <label
                            key={v.id}
                            className={`flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-all ${selectedVendors.includes(v.id) ? 'border-orange-400 bg-orange-50/50 shadow-sm' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'}`}
                        >
                            <input
                                type="checkbox"
                                checked={selectedVendors.includes(v.id)}
                                onChange={() => toggleVendor(v.id)}
                                className="accent-orange-500 h-4 w-4 rounded"
                            />
                            <div>
                                <p className="text-xs font-bold text-slate-700">{v.company}</p>
                                <p className="text-[10px] text-slate-400">({v.contact})</p>
                            </div>
                        </label>
                    ))}
                </div>

                {/* Section: Post to Platforms */}
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-6 pb-2 border-b border-slate-100">
                    Post to Platforms <span className="text-red-500">*</span>
                </h2>
                <div className="mb-4">
                    <FieldWrapper label="" fieldKey="platforms">
                        <div className="flex flex-wrap gap-3">
                            {platforms.map(p => (
                                <label
                                    key={p}
                                    className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 cursor-pointer transition-all ${selectedPlatforms.includes(p) ? 'border-orange-400 bg-orange-50/50 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedPlatforms.includes(p)}
                                        onChange={() => togglePlatform(p)}
                                        className="accent-orange-500 h-3.5 w-3.5 rounded"
                                    />
                                    <span className="text-xs font-semibold text-slate-700">{p}</span>
                                </label>
                            ))}
                        </div>
                    </FieldWrapper>
                </div>

                {/* Bottom Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100 mt-8">
                    <button className="px-6 py-2.5 text-xs font-bold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors" onClick={() => navigate('/jobs')}>
                        Cancel
                    </button>
                    <button className="px-6 py-2.5 text-xs font-bold rounded-lg bg-gradient-to-b from-[#FF6B00] to-[#FF4E00] text-white hover:brightness-110 shadow-lg shadow-orange-500/20 transition-all">
                        Post Job
                    </button>
                </div>
            </div>
        </div>
    );
};

export default JobCreate;
