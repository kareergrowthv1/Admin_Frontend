import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, RoleRoute, PublicOnlyRoute, FeatureRoute } from './ProtectedRoute';
import { PermissionProvider } from '../contexts/PermissionContext';
import { isSessionValid } from '../utils/authStorage';
import Layout from '../components/layout/Layout';
import { checkIsCollege } from './ProtectedRoute';

import Login from '../pages/auth/Login';
import Dashboard from '../pages/Dashboard';
import Inbox from '../pages/inbox/Inbox';
import Profile from '../pages/Profile';
import Settings from '../pages/Settings';
import CollegeDetailsSettings from '../pages/settings/CollegeDetailsSettings';
import CompanyDetailsSettings from '../pages/settings/CompanyDetailsSettings';
import AiScoringSettings from '../pages/settings/AiScoringSettings';
import CrossQuestionSettings from '../pages/settings/CrossQuestionSettings';
import SettingsRedirect from '../pages/settings/SettingsRedirect';
import EmailTemplateSettings from '../pages/settings/EmailTemplateSettings';
import Candidates from '../pages/candidates/Candidates';
import AddCandidate from '../pages/candidates/AddCandidate';
import AtsCandidates from '../pages/candidates/AtsCandidates';
import AddAtsCandidate from '../pages/candidates/AddAtsCandidate';

const CandidatesRouter = () => {
    if (checkIsCollege()) return <Candidates />;
    return <AtsCandidates />;
};

const AddCandidatesRouter = () => {
    if (checkIsCollege()) return <AddCandidate />;
    return <AddAtsCandidate />;
};

import Students from '../pages/students/Students';
import StudentCreate from '../pages/students/StudentCreate';
import Roles from '../pages/roles/Roles';
import MyTeam from '../pages/team/MyTeam';
import RoleEditor from '../pages/roles/RoleEditor';
import PublicRegistration from '../pages/PublicRegistration';
import TaskCreate from '../pages/tasks/TaskCreate';

// College-only pages
import Positions from '../pages/positions/Positions';
import PositionCreate from '../pages/positions/PositionCreate';
import PositionView from '../pages/positions/PositionView';
import SetupInterview from '../pages/interviews/SetupInterview';
import CandidateReport from '../pages/candidates/CandidateReport';
import CandidateRecording from '../pages/candidates/CandidateRecording';
import DepartmentsView from '../pages/attendance/DepartmentsView';
import BranchesView from '../pages/attendance/BranchesView';
import SubjectsView from '../pages/attendance/SubjectsView';
import AttendanceSheet from '../pages/attendance/AttendanceSheet';
import Tasks from '../pages/tasks/Tasks';

// ATS pages
import Jobs from '../pages/jobs/Jobs';
import JobCreate from '../pages/jobs/JobCreate';
import JobApplications from '../pages/jobs/JobApplications';
import AssignedJDs from '../pages/jobs/AssignedJDs';
import Calendar from '../pages/calendar/Calendar';
import Reports from '../pages/reports/Reports';
import MassEmail from '../pages/mass-email/MassEmail';
import Clients from '../pages/clients/Clients';
import Vendor from '../pages/vendor/Vendor';

const AppRoutes = () => {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      {/* PermissionProvider wraps the entire app so permission helpers are available everywhere */}
      <PermissionProvider>
        <Routes>

          {/* ── Public routes ── */}
          <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
          <Route path="/register/:linkId" element={<PublicRegistration />} />

          {/* ── Core protected routes (always accessible when logged in) ── */}
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
            <Route path="email-templates" element={<EmailTemplateSettings />} />
            <Route path="ai-scoring" element={<AiScoringSettings />} />
            <Route path="cross-question" element={<CrossQuestionSettings />} />
          </Route>

          {/* ── Feature-gated shared routes ── */}
          <Route path="/candidates" element={
            <FeatureRoute featureKey="candidates">
              <Layout><CandidatesRouter /></Layout>
            </FeatureRoute>
          } />
          <Route path="/candidates/add" element={
            <FeatureRoute featureKey="candidates">
              <Layout><AddCandidatesRouter /></Layout>
            </FeatureRoute>
          } />

          {/* ATS Aliases for Candidates (used in AtsCandidates.jsx and AddAtsCandidate.jsx) */}
          <Route path="/admins/ats-candidates" element={
            <FeatureRoute featureKey="candidates">
              <Layout><CandidatesRouter /></Layout>
            </FeatureRoute>
          } />
          <Route path="/admins/ats-candidates/add" element={
            <FeatureRoute featureKey="candidates">
              <Layout><AddCandidatesRouter /></Layout>
            </FeatureRoute>
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

          {/* ── College-only + feature-gated routes ── */}
          <Route path="/students" element={
            <FeatureRoute featureKey="students" requiredSystem="college">
              <Layout><Students /></Layout>
            </FeatureRoute>
          } />
          <Route path="/students/add" element={
            <FeatureRoute featureKey="students" requiredSystem="college">
              <Layout><StudentCreate /></Layout>
            </FeatureRoute>
          } />
          <Route path="/students/edit/:id" element={
            <FeatureRoute featureKey="students" requiredSystem="college">
              <Layout><StudentCreate /></Layout>
            </FeatureRoute>
          } />

          <Route path="/positions" element={
            <FeatureRoute featureKey="positions" requiredSystem="college">
              <Layout><Positions /></Layout>
            </FeatureRoute>
          } />
          <Route path="/position/create" element={
            <FeatureRoute featureKey="positions" requiredSystem="college">
              <Layout><PositionCreate /></Layout>
            </FeatureRoute>
          } />
          <Route path="/position/view/:positionId" element={
            <FeatureRoute featureKey="positions" requiredSystem="college">
              <Layout><PositionView /></Layout>
            </FeatureRoute>
          } />
          <Route path="/admins/positions/setup-interview" element={
            <ProtectedRoute>
              <Layout><SetupInterview /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/attendance" element={
            <FeatureRoute featureKey="attendance" requiredSystem="college">
              <Layout><DepartmentsView /></Layout>
            </FeatureRoute>
          } />
          <Route path="/department" element={
            <FeatureRoute featureKey="departments" requiredSystem="college">
              <Layout><DepartmentsView /></Layout>
            </FeatureRoute>
          } />
          <Route path="/branch" element={
            <FeatureRoute featureKey="branches" requiredSystem="college">
              <Layout><BranchesView /></Layout>
            </FeatureRoute>
          } />
          <Route path="/subjects" element={
            <FeatureRoute featureKey="subjects" requiredSystem="college">
              <Layout><SubjectsView /></Layout>
            </FeatureRoute>
          } />
          <Route path="/attendance/branches" element={
            <FeatureRoute featureKey="branches" requiredSystem="college">
              <Layout><BranchesView /></Layout>
            </FeatureRoute>
          } />
          <Route path="/attendance/branches/:deptId" element={
            <FeatureRoute featureKey="attendance" requiredSystem="college">
              <Layout><BranchesView /></Layout>
            </FeatureRoute>
          } />
          <Route path="/attendance/subjects" element={
            <FeatureRoute featureKey="subjects" requiredSystem="college">
              <Layout><SubjectsView /></Layout>
            </FeatureRoute>
          } />
          <Route path="/attendance/:deptId/:branchId/subjects" element={
            <FeatureRoute featureKey="attendance" requiredSystem="college">
              <Layout><SubjectsView /></Layout>
            </FeatureRoute>
          } />
          <Route path="/attendance/subjects/:deptId/:branchId" element={
            <FeatureRoute featureKey="attendance" requiredSystem="college">
              <Layout><SubjectsView /></Layout>
            </FeatureRoute>
          } />
          <Route path="/attendance/:deptId/:branchId/:subjectId/sheet" element={
            <FeatureRoute featureKey="attendance" requiredSystem="college">
              <Layout><AttendanceSheet /></Layout>
            </FeatureRoute>
          } />
          <Route path="/attendance/sheet/:branchId/:subjectId" element={
            <FeatureRoute featureKey="attendance" requiredSystem="college">
              <Layout><AttendanceSheet /></Layout>
            </FeatureRoute>
          } />

          <Route path="/tasks" element={
            <FeatureRoute featureKey="tasks" requiredSystem="college">
              <Layout><Tasks /></Layout>
            </FeatureRoute>
          } />
          <Route path="/tasks/create" element={
            <FeatureRoute featureKey="tasks" requiredSystem="college">
              <Layout><TaskCreate /></Layout>
            </FeatureRoute>
          } />
          <Route path="/tasks/edit/:id" element={
            <FeatureRoute featureKey="tasks" requiredSystem="college">
              <Layout><TaskCreate /></Layout>
            </FeatureRoute>
          } />

          {/* ── Org management (available to both systems, gated by feature perms) ── */}
          <Route path="/roles" element={
            <FeatureRoute featureKey="roles">
              <Layout><Roles /></Layout>
            </FeatureRoute>
          } />
          <Route path="/roles/new" element={
            <FeatureRoute featureKey="roles">
              <Layout><RoleEditor /></Layout>
            </FeatureRoute>
          } />
          <Route path="/roles/edit/:id" element={
            <FeatureRoute featureKey="roles">
              <Layout><RoleEditor /></Layout>
            </FeatureRoute>
          } />
          <Route path="/team" element={
            <FeatureRoute featureKey="myTeam">
              <Layout><MyTeam hideTabs={true} /></Layout>
            </FeatureRoute>
          } />
          <Route path="/mass-email" element={
            <FeatureRoute featureKey="massEmail">
              <Layout><MassEmail /></Layout>
            </FeatureRoute>
          } />

          {/* ── ATS-only feature-gated routes ── */}
          <Route path="/jobs" element={
            <FeatureRoute featureKey="jobs">
              <Layout><Jobs /></Layout>
            </FeatureRoute>
          } />
          <Route path="/jobs/create" element={
            <FeatureRoute featureKey="jobs">
              <Layout><JobCreate /></Layout>
            </FeatureRoute>
          } />
          <Route path="/jobs/applications/:jobId" element={
            <FeatureRoute featureKey="jobs">
              <Layout><JobApplications /></Layout>
            </FeatureRoute>
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
          <Route path="/clients" element={
            <FeatureRoute featureKey="clients">
              <Layout><Clients /></Layout>
            </FeatureRoute>
          } />
          <Route path="/vendor" element={
            <FeatureRoute featureKey="vendor">
              <Layout><Vendor /></Layout>
            </FeatureRoute>
          } />

          {/* ── Root and catch-all ── */}
          <Route path="/" element={isSessionValid() ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />
          <Route path="*" element={isSessionValid() ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />

        </Routes>
      </PermissionProvider>
    </Router>
  );
};

export default AppRoutes;
