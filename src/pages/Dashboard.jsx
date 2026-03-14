import React, { useState, useEffect } from 'react';
import { authAPI } from '../features/auth/authAPI';
import OrgDetailsModal from '../components/OrgDetailsModal';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('All');
  const [credits, setCredits] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('admin_credits') || 'null');
    } catch {
      return null;
    }
  });
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('admin_user') || '{}');
    } catch {
      return {};
    }
  });
  const [orgDetails, setOrgDetails] = useState(null);
  const [showOrgModal, setShowOrgModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const storedUser = JSON.parse(localStorage.getItem('admin_user') || '{}');
        if (storedUser && storedUser.organizationId) {
          setUser(storedUser);

          // Fetch credits
          try {
            const res = await authAPI.getCredits(storedUser.id);
            if (res.data?.success && res.data?.data) {
              localStorage.setItem('admin_credits', JSON.stringify(res.data.data));
              setCredits(res.data.data);
            }
          } catch (err) {
            console.error('Failed to fetch credits:', err);
          }

          // Fetch org details and check if they need to be filled
          try {
            const isCollege = storedUser.isCollege === true;
            const detailsRes = isCollege
              ? await authAPI.getCollegeDetails(storedUser.organizationId)
              : await authAPI.getCompanyDetails(storedUser.organizationId);

            if (detailsRes.data?.success && detailsRes.data?.data) {
              const details = detailsRes.data.data;
              setOrgDetails(details);
              // Successfully retrieved, do NOT show modal
              setShowOrgModal(false);
            }
          } catch (err) {
            const status = err?.response?.status;
            if (status === 404) {
              // No record exists yet — must prompt user to fill details
              setShowOrgModal(true);
            } else {
              // Network or other error — don't block the user
              console.error('Failed to fetch org details:', err);
            }
          }
        }
      } catch (err) {
        console.error('Dashboard init error:', err);
      }
    };

    fetchData();
  }, []);

  const tabs = [
    { name: 'All', count: 118 },
    { name: 'Applied', count: 78 },
    { name: 'Shortlisted', count: 23 },
    { name: 'Invited to Interview', count: 7 },
    { name: 'Interviewed', count: 8 },
    { name: 'Hired', count: 2 },
  ];

  const talentData = [
    { name: 'Suriyan Pimwan', gender: 'Male', age: 23, salary: 'THB 300', experience: '4 Years', rating: 4.0, status: 'Applied', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=100' },
    { name: 'Phuvanai Suwannawong', gender: 'Male', age: 20, salary: 'THB 200', experience: '2 Years', rating: 4.4, status: 'Applied', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100' },
    { name: 'Waradet Chinawat', gender: 'Male', age: 28, salary: 'THB 450', experience: '2 Years', rating: 4.7, status: 'Shortlisted', badge: 'SUPER CANDIDATE', avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&q=80&w=100' },
    { name: 'Suwannee Wongsuwan', gender: 'Female', age: 28, salary: 'THB 600', experience: '11 Years', rating: 3.9, status: 'Applied', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=100' },
    { name: 'Alex Somchai', gender: 'Male', age: 25, salary: 'THB 550', experience: '4 Years', rating: 4.8, status: 'Applied', badge: 'TOP TALENT', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100' },
  ];

  const formatValidTill = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    const day = d.getDate();
    const month = d.toLocaleString('en-US', { month: 'short' });
    const year = d.getFullYear();
    const suffix = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
    return { day, suffix, month, year };
  };

  const validTill = credits?.validTill ? formatValidTill(credits.validTill) : null;

  // Check if user is ATS admin (isCollege = false) or College admin (isCollege = true)
  const isAts = user.isCollege === false;
  const showScreening = isAts; // Only show screening for ATS admins

  const isCollegeAdmin = user.isCollege === true;
  const orgName = isCollegeAdmin ? orgDetails?.collegeName : orgDetails?.companyName;
  const orgEmail = isCollegeAdmin ? orgDetails?.collegeEmail : orgDetails?.companyEmail;
  const orgWebsite = orgDetails?.websiteUrl;
  const orgCity = orgDetails?.city;

  return (
    <div className="space-y-8">
      {/* Mandatory Org Details Modal */}
      {showOrgModal && <OrgDetailsModal isCollege={user.isCollege} />}
      {/* Main Dashboard Heading */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-slate-800">Dashboard</h1>
      </div>

      {/* Credit Stats Cards */}
      {credits && (
        <div className="flex gap-4">
          {/* Left side: credit rows */}
          <div className="flex-1 space-y-4">
            {/* Interview Credits Row */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.18)] transition-all hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <p className="text-[10px] font-bold tracking-widest text-slate-600 uppercase">Total Interview Credits</p>
                    <p className="text-2xl font-black text-slate-800 tracking-tight">{credits.totalInterviews}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50">
                    <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.18)] transition-all hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <p className="text-[10px] font-bold tracking-widest text-slate-600 uppercase">Utilized Credits</p>
                    <p className="text-2xl font-black text-slate-800 tracking-tight">{credits.utilizedInterviews}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50">
                    <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.18)] transition-all hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <p className="text-[10px] font-bold tracking-widest text-slate-600 uppercase">Remaining Credits</p>
                    <p className="text-2xl font-black text-slate-800 tracking-tight">{credits.remainingInterviews ?? (credits.totalInterviews - credits.utilizedInterviews)}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50">
                    <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            {/* Position Credits Row */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.18)] transition-all hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <p className="text-[10px] font-bold tracking-widest text-slate-600 uppercase">Total Position Credits</p>
                    <p className="text-2xl font-black text-slate-800 tracking-tight">{credits.totalPositions}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50">
                    <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.18)] transition-all hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <p className="text-[10px] font-bold tracking-widest text-slate-600 uppercase">Utilized Credits</p>
                    <p className="text-2xl font-black text-slate-800 tracking-tight">{credits.utilizedPositions}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50">
                    <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.18)] transition-all hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <p className="text-[10px] font-bold tracking-widest text-slate-600 uppercase">Remaining Credits</p>
                    <p className="text-2xl font-black text-slate-800 tracking-tight">{credits.remainingPositions ?? (credits.totalPositions - credits.utilizedPositions)}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50">
                    <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            {/* Screening Credits Row */}
            {showScreening && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.18)] transition-all hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <p className="text-[10px] font-bold tracking-widest text-slate-600 uppercase">Total Screening Credits</p>
                      <p className="text-2xl font-black text-slate-800 tracking-tight">{credits.totalScreening}</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50">
                      <svg className="h-5 w-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.18)] transition-all hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <p className="text-[10px] font-bold tracking-widest text-slate-600 uppercase">Utilized Credits</p>
                      <p className="text-2xl font-black text-slate-800 tracking-tight">{credits.utilizedScreening}</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50">
                      <svg className="h-5 w-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.18)] transition-all hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <p className="text-[10px] font-bold tracking-widest text-slate-600 uppercase">Remaining Credits</p>
                      <p className="text-2xl font-black text-slate-800 tracking-tight">{credits.remainingScreening ?? (credits.totalScreening - credits.utilizedScreening)}</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50">
                      <svg className="h-5 w-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* Right side: Valid Till card — spans full height of all rows */}
          {validTill && (
            <div className="hidden lg:flex w-64 shrink-0 rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50/50 via-pink-50/30 to-blue-50/30 p-5 shadow-[0_1px_4px_rgba(0,0,0,0.18)] transition-all hover:shadow-md">
              <div className="flex flex-col items-center justify-center w-full text-center">
                <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-2">Valid Till</p>
                <p className="text-4xl font-black text-slate-800">{validTill.day}<sup className="text-lg font-bold text-slate-500">{validTill.suffix}</sup></p>
                <p className="text-lg font-bold text-slate-600">{validTill.month} {validTill.year}</p>
              </div>
            </div>
          )}
        </div>
      )
      }

      {/* Org Details Summary Strip (shown when details are filled) */}
      {orgDetails && orgName && (
        <div className="rounded-2xl border border-slate-100 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.08)] overflow-hidden">
          <div className="flex flex-wrap items-center gap-6 px-6 py-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-2xl shadow-inner">
              {isCollegeAdmin ? '🏛️' : '🏢'}
            </div>

            <div className="flex-1 min-w-[200px]">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-0.5">
                {isCollegeAdmin ? 'College Information' : 'Company Information'}
              </p>
              <h2 className="text-lg font-black text-slate-800 tracking-tight">{orgName}</h2>
              {isCollegeAdmin && orgDetails?.university && (
                <p className="text-xs font-bold text-orange-600 mt-0.5 flex items-center gap-1.5">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  </svg>
                  {orgDetails.university}
                </p>
              )}
            </div>

            <div className="h-10 w-px bg-slate-100 hidden md:block"></div>

            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Contact Details</p>
              <div className="flex flex-col gap-1">
                {orgEmail && <p className="text-xs font-bold text-slate-700 flex items-center gap-2">
                  <svg className="h-3 w-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {orgEmail}
                </p>}
                {orgWebsite && <a
                  href={orgWebsite.startsWith('http') ? orgWebsite : `https://${orgWebsite}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-2"
                >
                  <svg className="h-3 w-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9h18" />
                  </svg>
                  {orgWebsite.replace(/^https?:\/\//, '')}
                </a>}
              </div>
            </div>

            <div className="h-10 w-px bg-slate-100 hidden lg:block"></div>

            <div className="space-y-1 hidden lg:block">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Location</p>
              <p className="text-xs font-bold text-slate-700 flex items-center gap-2">
                <svg className="h-3 w-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {orgDetails.address ? `${orgDetails.address}, ` : ''}{orgCity}{orgDetails.state ? `, ${orgDetails.state}` : ''}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-8">
        {/* Top/First: Job Details Card */}
        <section className="h-fit rounded-[32px] border border-slate-100 bg-slate-50/30 p-8">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-700 shadow-lg shadow-emerald-50">
              <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707m12.728 12.728L5.657 5.657" />
              </svg>
            </div>
          </div>
          <div className="mb-4">
            <p className="text-sm font-medium text-slate-400">Royal Thai Retreats • RTR-082</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-800">Housekeeping Attendant</h1>
          </div>
          <div className="mb-8 flex items-center gap-3">
            <span className="flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-xs font-semibold text-slate-600 shadow-sm">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Phuket
            </span>
            <span className="flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-xs font-semibold text-slate-600 shadow-sm">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Housekeeping
            </span>
          </div>

          <div className="mb-8 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between border-b border-slate-50 pb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rate Amount</p>
                <p className="mt-1 text-lg font-bold text-slate-800">THB 200 - 600/hour</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Deadline</p>
                <p className="mt-1 text-lg font-bold text-slate-800">10 April 2021</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-y-6">
              {[
                { label: 'Created at', value: '1 April 2021' },
                { label: 'Status', value: 'Hiring', badge: true },
                { label: 'Job Period', value: '14 April 2021 - 14 May 2021' },
                { label: 'Number of Opening', value: '15' },
                { label: 'Employment Type', value: 'Part-time' },
                { label: 'Required Experience', value: '1-2 years in housekeeping' },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{item.label}</p>
                  {item.badge ? (
                    <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-orange-600" />
                      {item.value}
                    </span>
                  ) : (
                    <p className="mt-1 text-sm font-semibold text-slate-700">{item.value}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Job Description</h3>
            <p className="text-xs leading-relaxed text-slate-500">
              Royal Thai Retreats is seeking reliable and hardworking Housekeeping Attendants to join our team...
            </p>
          </div>
        </section>

        {/* Bottom Section: Talent List Container */}
        <div className="flex flex-col space-y-6">
          <section className="rounded-[32px] border border-slate-100 bg-slate-50/10 p-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold tracking-tight text-slate-800">Talent List</h2>
            </div>

            {/* Tabs */}
            <div className="mb-8 flex border-b border-slate-100">
              {tabs.map((tab) => (
                <button
                  key={tab.name}
                  onClick={() => setActiveTab(tab.name)}
                  className={`relative px-4 pb-4 text-sm font-semibold transition-all ${activeTab === tab.name ? 'text-orange-600' : 'text-slate-400 hover:text-slate-600'
                    }`}
                >
                  {tab.name}
                  <span className={`ml-2 rounded-lg px-2 py-0.5 text-[10px] ${activeTab === tab.name ? 'bg-orange-100 text-orange-600' : 'bg-slate-50 text-slate-400'
                    }`}>
                    {tab.count}
                  </span>
                  {activeTab === tab.name && (
                    <span className="absolute bottom-0 left-0 h-0.5 w-full bg-orange-600 shadow-sm" />
                  )}
                </button>
              ))}
            </div>

            {/* Filters & Search - Dashboard Inner Search is OK according to Image 2 */}
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
              <div className="relative flex-grow max-w-sm">
                <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
                  <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search"
                  className="w-full rounded-2xl border-slate-100 bg-slate-50 py-3 pl-10 pr-4 text-sm focus:border-orange-200 focus:ring-4 focus:ring-orange-500/5 transition-all"
                />
              </div>
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50">
                  Experience
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50">
                  Expected Salary
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  More Filter
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-y border-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-4 py-4">Name</th>
                    <th className="px-4 py-4">Expected salary</th>
                    <th className="px-4 py-4">Experience</th>
                    <th className="px-4 py-4">Rating</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {talentData.map((person) => (
                    <tr key={person.name} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-5">
                        <div className="flex items-center gap-3">
                          <img src={person.avatar} className="h-10 w-10 rounded-2xl object-cover shadow-sm" alt="" />
                          <div>
                            <div className="flex items-center gap-2 font-bold text-slate-700">
                              {person.name}
                              {person.badge && (
                                <span className={`text-[9px] font-black tracking-tight px-1.5 py-0.5 rounded ${person.badge === 'SUPER CANDIDATE' ? 'bg-yellow-400/20 text-yellow-600' : 'bg-emerald-400/20 text-emerald-600'
                                  }`}>
                                  {person.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-medium text-slate-400">{person.gender} • {person.age} Years Old</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-5 text-sm font-bold text-slate-700">{person.salary}</td>
                      <td className="px-4 py-5 text-sm font-bold text-slate-700">{person.experience}</td>
                      <td className="px-4 py-5">
                        <div className="flex items-center gap-1">
                          <svg className="h-4 w-4 text-yellow-500 fill-yellow-500" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="text-sm font-bold text-slate-700">{person.rating}</span>
                        </div>
                      </td>
                      <td className="px-4 py-5">
                        <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-bold ${person.status === 'Applied' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
                          }`}>
                          {person.status}
                        </span>
                      </td>
                      <td className="px-4 py-5 text-right">
                        <button className="text-slate-400 hover:text-slate-600 transition-colors">
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div >
  );
};

export default Dashboard;
