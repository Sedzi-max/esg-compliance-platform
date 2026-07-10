import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage'; 
import Dashboard from './pages/Dashboard';
import AuditorDashboard from './pages/AuditorDashboard'; 
import Organizations from './pages/Organizations';
import Metrics from './pages/Metrics';
import DataEntry from './pages/DataEntry';
import Login from './pages/Login';
import UserManagement from './pages/UserManagement'; 
import ProtectedRoute from './components/ProtectedRoute';
import AuditQueue from './pages/AuditQueue'; 
import SurveyCampaigns from './pages/SurveyCampaigns';
import SupplierPortal from './pages/SupplierPortal';
import FrameworkAlignment from './pages/FrameworkAlignment'; 
import EntityManagement from './pages/EntityManagement';
import SOPPage from './pages/SOPPage'; 
import EvidenceLocker from './pages/EvidenceLocker'; 
import FrameworkManager from './pages/FrameworkManager'; 
import Sidebar from './components/Sidebar'; 
import axios from 'axios';
import ScenarioAnalysis from './pages/ScenarioAnalysis';

// Tells React to use the live URL if it exists, otherwise fallback to localhost
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function App() {
  // Grab the user data to determine dashboard routing
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isAuditor = user?.role === 'auditor'; 

  return (
    <Routes>
      {/* --- PUBLIC MARKETING & SUPPLIER PORTALS --- */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/supplier-portal/:token" element={<SupplierPortal />} />

      {/* --- SECURE PLATFORM PORTAL --- */}
      <Route 
        path="/*" 
        element={
          <ProtectedRoute>
            <div style={{ fontFamily: 'system-ui, sans-serif', display: 'flex', minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
              
              {/* Plug in the new Sidebar */}
              <Sidebar />

              {/* Main Content Viewport */}
              <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
                <Routes>
                  <Route 
                    path="/dashboard" 
                    element={isAuditor ? <AuditorDashboard /> : <Dashboard />} 
                    />
                  <Route path="/data-entry" element={<DataEntry />} />
                  
                  {/* Manager & Admin Routes */}
                  <Route path="/audit-queue" element={<ProtectedRoute allowedRoles={['Admin', 'Manager']}><AuditQueue /></ProtectedRoute>} />
                  <Route path="/evidence-locker" element={<ProtectedRoute allowedRoles={['Admin', 'Manager']}><EvidenceLocker /></ProtectedRoute>} />
                  <Route path="/campaigns" element={<ProtectedRoute allowedRoles={['Admin', 'Manager']}><SurveyCampaigns /></ProtectedRoute>} />
                  <Route path="/alignment" element={<ProtectedRoute allowedRoles={['Admin', 'Manager']}><FrameworkAlignment /></ProtectedRoute>} />
                  
                  {/* NEW: Climate Stress Testing & Scenario Analysis Route */}
                  <Route path="/scenarios" element={<ProtectedRoute allowedRoles={['Admin', 'Manager']}><ScenarioAnalysis /></ProtectedRoute>} />

                  {/* Admin Only Routes */}
                  <Route path="/organizations" element={<ProtectedRoute allowedRoles={['Admin']}><Organizations /></ProtectedRoute>} />
                  <Route path="/entity-management" element={<ProtectedRoute allowedRoles={['Admin']}><EntityManagement /></ProtectedRoute>} />
                  <Route path="/metrics" element={<ProtectedRoute allowedRoles={['Admin']}><Metrics /></ProtectedRoute>} />
                  <Route path="/users" element={<ProtectedRoute allowedRoles={['Admin']}><UserManagement /></ProtectedRoute>} />
                  <Route path="/sop" element={<ProtectedRoute allowedRoles={['Admin']}><SOPPage /></ProtectedRoute>} />
                  <Route path="/admin/frameworks" element={<ProtectedRoute allowedRoles={['Admin']}><FrameworkManager /></ProtectedRoute>} />
                  
                  {/* Catch-all redirect */}
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  
                </Routes>
              </main>

            </div>
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
}

export default App;