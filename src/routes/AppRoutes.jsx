import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, RoleRoute, PublicOnlyRoute } from './ProtectedRoute';
import { isSessionValid } from '../utils/authStorage';
import Layout from '../components/layout/Layout';

import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import Inbox from '../pages/Inbox';
import Profile from '../pages/Profile';
import Settings from '../pages/Settings';
import CollegeDetailsSettings from '../pages/settings/CollegeDetailsSettings';
import CompanyDetailsSettings from '../pages/settings/CompanyDetailsSettings';
import AiScoringSettings from '../pages/settings/AiScoringSettings';
import CrossQuestionSettings from '../pages/settings/CrossQuestionSettings';
import SettingsRedirect from '../pages/settings/SettingsRedirect';
import Candidates from '../pages/Candidates';
import AddCandidate from '../pages/AddCandidate';
import Students from '../pages/Students';
import Roles from '../pages/Roles';
import MyTeam from '../pages/MyTeam';
import PublicRegistration from '../pages/PublicRegistration';

// College-only pages
import Positions from '../pages/Positions';
import PositionCreate from '../pages/PositionCreate';
import PositionView from '../pages/PositionView';
import PositionCandidatesPage from '../pages/PositionCandidatesPage';
import SetupInterview from '../pages/SetupInterview';
import CandidateReport from '../pages/CandidateReport';
import CandidateRecording from '../pages/CandidateRecording';

// ATS pages (no system restriction yet — ATS routing handled separately later)
import Jobs from '../pages/Jobs';
import JobCreate from '../pages/JobCreate';
import AssignedJDs from '../pages/AssignedJDs';
import Calendar from '../pages/Calendar';
import Reports from '../pages/Reports';
import MassEmail from '../pages/MassEmail';
import Clients from '../pages/Clients';
import Vendor from '../pages/Vendor';

const AppRoutes = () => {
  return (
    <Router>
      <Routes>

        {/* ── Public routes (login only when not authenticated) ── */}
        <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
        <Route path="/register/:linkId" element={<PublicRegistration />} />

        {/* ── Shared protected routes (both College & ATS) ───── */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Layout><Dashboard /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/inbox" element={
          <ProtectedRoute>
            <Layout><Inbox /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <Layout><Profile /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <Layout><Settings /></Layout>
          </ProtectedRoute>
        }>
          <Route index element={<SettingsRedirect />} />
          <Route path="college-details" element={<CollegeDetailsSettings />} />
          <Route path="company-details" element={<CompanyDetailsSettings />} />
          <Route path="ai-scoring" element={<AiScoringSettings />} />
          <Route path="cross-question" element={<CrossQuestionSettings />} />
        </Route>
        <Route path="/candidates" element={
          <ProtectedRoute>
            <Layout><Candidates /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/candidates/add" element={
          <ProtectedRoute>
            <Layout><AddCandidate /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/candidates/:candidateId/report" element={
          <ProtectedRoute>
            <CandidateReport />
          </ProtectedRoute>
        } />
        <Route path="/candidates/:candidateId/recording" element={
          <ProtectedRoute>
            <CandidateRecording />
          </ProtectedRoute>
        } />
        <Route path="/students" element={
          <RoleRoute requiredSystem="college">
            <Layout><Students /></Layout>
          </RoleRoute>
        } />
        <Route path="/roles" element={
          <ProtectedRoute>
            <Layout><Roles /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/team" element={
          <ProtectedRoute>
            <Layout><MyTeam /></Layout>
          </ProtectedRoute>
        } />

        {/* ── College-only routes (RoleRoute guards these) ───── */}
        <Route path="/positions" element={
          <RoleRoute requiredSystem="college">
            <Layout><Positions /></Layout>
          </RoleRoute>
        } />
        <Route path="/position/create" element={
          <RoleRoute requiredSystem="college">
            <Layout><PositionCreate /></Layout>
          </RoleRoute>
        } />
        <Route path="/position/view/:positionId" element={
          <RoleRoute requiredSystem="college">
            <Layout><PositionView /></Layout>
          </RoleRoute>
        } />
        <Route path="/positions/:positionId/candidates" element={
          <RoleRoute requiredSystem="college">
            <Layout><PositionCandidatesPage /></Layout>
          </RoleRoute>
        } />
        <Route path="/admins/positions/setup-interview" element={
          <RoleRoute requiredSystem="college">
            <Layout><SetupInterview /></Layout>
          </RoleRoute>
        } />

        {/* ── ATS routes (ProtectedRoute only — ATS system handled later) ── */}
        <Route path="/jobs" element={
          <ProtectedRoute>
            <Layout><Jobs /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/jobs/create" element={
          <ProtectedRoute>
            <Layout><JobCreate /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/assigned-jds" element={
          <ProtectedRoute>
            <Layout><AssignedJDs /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/calendar" element={
          <ProtectedRoute>
            <Layout><Calendar /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/reports" element={
          <ProtectedRoute>
            <Layout><Reports /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/mass-email" element={
          <ProtectedRoute>
            <Layout><MassEmail /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/clients" element={
          <ProtectedRoute>
            <Layout><Clients /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/vendor" element={
          <ProtectedRoute>
            <Layout><Vendor /></Layout>
          </ProtectedRoute>
        } />

        {/* ── Root and catch-all: same as reference — no routing without valid login ── */}
        <Route path="/" element={isSessionValid() ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />
        <Route path="*" element={isSessionValid() ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />

      </Routes>
    </Router>
  );
};

export default AppRoutes;
