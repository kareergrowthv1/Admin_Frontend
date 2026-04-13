import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../features/auth/authAPI';
import { dashboardAPI } from '../features/dashboard/dashboardAPI';
import OrgDetailsModal from '../components/OrgDetailsModal';
import AtsDashboard from './AtsDashboard';
import CollegeDashboard from './CollegeDashboard';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState({
    stats: null,
    trends: { monthly: [], daily: [] },
    team: [],
    recentGrid: { positions: [], candidates: [], interviews: [], tasks: [] }
  });
  const [activities, setActivities] = useState([]);
  const [candidateStatus, setCandidateStatus] = useState([]);
  
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
  const [dashboardOptions, setDashboardOptions] = useState(() => {
    try {
      const perms = JSON.parse(localStorage.getItem('admin_permissions') || '[]');
      const dashPerm = perms.find(p => p.feature_key?.toLowerCase() === 'dashboard');
      return dashPerm?.dashboard_options || {
        dashboard_page: true,
        positions_stats: true,
        candidates_stats: true,
        students_stats: true,
        users_stats: true,
        attendance_stats: true,
        tasks_stats: true,
        new_position_btn: true,
        add_candidate_btn: true,
        analytics_chart: true,
        activity_feed: true,
        volume_chart: true,
        performance_radar: true,
        recent_positions: true,
        recent_students: true,
        recent_interviews: true,
        recent_tasks: true
      };
    } catch { return {}; }
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const storedUser = JSON.parse(localStorage.getItem('admin_user') || '{}');
        if (storedUser && storedUser.organizationId) {
          setUser(storedUser);
          const orgId = storedUser.organizationId;
          const isCollegeAuth = (storedUser.isCollege !== undefined) ? !!storedUser.isCollege : (localStorage.getItem('isCollege') === 'true');
          const isAtsRole = !isCollegeAuth; // Explicitly derive for better clarity

          const [statsRes, trendsRes, teamRes, recentGridRes, activityRes, candStatusRes, creditsRes, detailsRes] = await Promise.allSettled([
            dashboardAPI.getStats(orgId),
            dashboardAPI.getTrends(orgId),
            dashboardAPI.getTeamPerformance(orgId),
            dashboardAPI.getRecentGrid(orgId, isCollegeAuth),
            dashboardAPI.getRecentActivities(orgId, 6),
            dashboardAPI.getCandidateStatus(orgId),
            authAPI.getCredits(storedUser.id),
            isCollegeAuth ? authAPI.getCollegeDetails(orgId) : authAPI.getCompanyDetails(orgId)
          ]);

          setDashboardData({
            stats: statsRes.status === 'fulfilled' ? statsRes.value.data.data : null,
            trends: trendsRes.status === 'fulfilled' ? ((trendsRes.value.data && trendsRes.value.data.data) ? trendsRes.value.data.data : { monthly: [], daily: [] }) : { monthly: [], daily: [] },
            team: teamRes.status === 'fulfilled' ? teamRes.value.data.data : [],
            recentGrid: recentGridRes.status === 'fulfilled' ? recentGridRes.value.data.data : { positions: [], candidates: [], interviews: [], tasks: [] }
          });

          if (activityRes.status === 'fulfilled') setActivities(activityRes.value.data.data || []);
          if (candStatusRes.status === 'fulfilled') setCandidateStatus(candStatusRes.value.data.data || []);

          if (creditsRes.status === 'fulfilled' && creditsRes.value.data?.success) {
            localStorage.setItem('admin_credits', JSON.stringify(creditsRes.value.data.data));
            setCredits(creditsRes.value.data.data);
          }

          if (detailsRes.status === 'fulfilled' && detailsRes.value.data?.success) {
            setOrgDetails(detailsRes.value.data.data);
            setShowOrgModal(false);
          } else if (detailsRes.status === 'rejected' && detailsRes.reason?.response?.status === 404) {
            setShowOrgModal(true);
          }
        }
      } catch (err) {
        console.error('Dashboard init error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const isAdmin = (localStorage.getItem('is_admin') === 'true' || localStorage.getItem('isMainAdmin') === 'true' || user.roleCode === 'ADMIN' || user.roleCode === 'SUPERADMIN' || user.isAdmin === true);
  const isVisible = (key) => isAdmin || dashboardOptions[key] === true || dashboardOptions[key] === undefined;

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
  const expiryDate = credits?.expiryDate ? formatValidTill(credits.expiryDate) : null;
  const displayDate = validTill || expiryDate;

  const rawPermissions = localStorage.getItem('admin_permissions') || '[]';
  const hasAtsFeatures = rawPermissions.toLowerCase().includes('"jobs"') || rawPermissions.toLowerCase().includes('"clients"');
  
  const roleCode = (user.roleCode || user.role_code || localStorage.getItem('roleCode') || localStorage.getItem('Role') || '').trim().toUpperCase();
  const isAtsRole = roleCode.includes('ATS') || roleCode.includes('RECRUITER');
  const isCollegeRole = roleCode === 'ADMIN' || roleCode === 'ADMINISTRATOR' || roleCode === 'SUPERADMIN' || roleCode === 'SUPER ADMINISTRATOR';

  const isAts = isAtsRole || (!isCollegeRole && hasAtsFeatures);
  const isCollegeAdmin = isAts ? false : (user.isCollege === true || localStorage.getItem('isCollege') === 'true');

  console.log(`[Dashboard] Role Check: roleCode="${roleCode}", isAts=${isAts}, hasAtsFeatures=${hasAtsFeatures}, isCollegeAdmin=${isCollegeAdmin}`);

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent shadow-xl"></div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Syncing Dashboard Data...</p>
      </div>
    );
  }

  const commonProps = {
    dashboardData,
    activities,
    candidateStatus,
    credits,
    orgDetails,
    isVisible,
    navigate,
    displayDate,
    user
  };

  return (
    <>
      {showOrgModal && <OrgDetailsModal isCollege={isCollegeAdmin} />}
      {isCollegeAdmin ? (
        <CollegeDashboard {...commonProps} />
      ) : (
        <AtsDashboard {...commonProps} />
      )}
    </>
  );
};

export default Dashboard;
