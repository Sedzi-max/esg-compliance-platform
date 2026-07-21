import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';

// Import Auth tools
import { AuthProvider, useAuth } from './AuthContext';

// Page Imports
import LandingPage from './pages/LandingPage'; 
import Dashboard from './pages/Dashboard';
import AuditorDashboard from './pages/AuditorDashboard'; 
import Organizations from './pages/Organizations';
import Metrics from './pages/Metrics';
import DataEntry from './pages/DataEntry';
import Login from './pages/Login';
import UserManagement from './pages/UserManagement'; 
import AuditQueue from './pages/AuditQueue'; 
import SurveyCampaigns from './pages/SurveyCampaigns';
import SupplierPortal from './pages/SupplierPortal';
import FrameworkAlignment from './pages/FrameworkAlignment'; 
import EntityManagement from './pages/EntityManagement';
import SOPPage from './pages/SOPPage'; 
import EvidenceLocker from './pages/EvidenceLocker'; 
import FrameworkManager from './pages/FrameworkManager'; 
import ScenarioAnalysis from './pages/ScenarioAnalysis';
import BankingAnalytics from './pages/BankingAnalytics';
import BankingDataEntry from './pages/BankingDataEntry';
import InsuranceAnalytics from './pages/InsuranceAnalytics';
import EnergyAnalytics from './pages/EnergyAnalytics';
import PlatformOverview from './pages/PlatformOverview';
import EnergyDataEntry from './pages/EnergyDataEntry';
import InsuranceDataEntry from './pages/InsuranceDataEntry';


// Component Imports
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar'; 

// Tells React to use the live URL if it exists, otherwise fallback to localhost
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'https://esg-compliance-platform-production.up.railway.app';

// ==========================================
// DYNAMIC DASHBOARD ROUTER
// ==========================================
// This helper component listens to the live AuthContext to route the user
const DashboardRouter = () => {
  const { user } = useAuth();
  // Standardized casing check to match our Sidebar fix
  const isAuditor = user?.role?.toLowerCase() === 'auditor'; 
  
  return isAuditor ? <AuditorDashboard /> : <Dashboard />;
};

function App() {
  return (
    // 1. Wrap the entire application in the AuthProvider
    <AuthProvider>
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
                
                {/* Plug in the new Context-aware Sidebar */}
                <Sidebar />

                {/* Main Content Viewport */}
                <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
                  <Routes>
                    
                    {/* 2. Utilize the DashboardRouter helper component */}
                    <Route path="/dashboard" element={<DashboardRouter />} />
                    
                    <Route path="/data-entry" element={<DataEntry />} />
                    
                    {/* Manager & Admin Routes */}
                    <Route path="/audit-queue" element={<ProtectedRoute allowedRoles={['Admin', 'Manager']}><AuditQueue /></ProtectedRoute>} />
                    <Route path="/evidence-locker" element={<ProtectedRoute allowedRoles={['Admin', 'Manager']}><EvidenceLocker /></ProtectedRoute>} />
                    <Route path="/campaigns" element={<ProtectedRoute allowedRoles={['Admin', 'Manager']}><SurveyCampaigns /></ProtectedRoute>} />
                    <Route path="/alignment" element={<ProtectedRoute allowedRoles={['Admin', 'Manager']}><FrameworkAlignment /></ProtectedRoute>} />
                    
                    {/* Climate Stress Testing & Scenario Analysis Route */}
                    <Route path="/scenarios" element={<ProtectedRoute allowedRoles={['Admin', 'Manager']}><ScenarioAnalysis /></ProtectedRoute>} />
                    <Route path="/banking-analytics" element={<ProtectedRoute allowedRoles={['Admin', 'Manager']}><BankingAnalytics /></ProtectedRoute>} />
                    <Route path="/banking-data-entry" element={<ProtectedRoute allowedRoles={['Admin']}><BankingDataEntry /></ProtectedRoute>} />
                    <Route path="/insurance-analytics" element={<ProtectedRoute allowedRoles={['Admin', 'Manager']}><InsuranceAnalytics /></ProtectedRoute>} />
                    <Route path="/energy-analytics" element={<ProtectedRoute allowedRoles={['Admin', 'Manager']}><EnergyAnalytics /></ProtectedRoute>} />
                    <Route path="/platform-overview" element={<ProtectedRoute allowedRoles={['Super Admin']}><PlatformOverview /></ProtectedRoute>} />
                    <Route path="/energy-data-entry" element={<ProtectedRoute allowedRoles={['Admin']}><EnergyDataEntry /></ProtectedRoute>} />
                    <Route path="/insurance-data-entry" element={<ProtectedRoute allowedRoles={['Admin']}><InsuranceDataEntry /></ProtectedRoute>} />

                    
                    {/* Admin Only Routes */}
                    <Route path="/organizations" element={<ProtectedRoute allowedRoles={['Admin']}><Organizations /></ProtectedRoute>} />
                    <Route path="/entity-management" element={<ProtectedRoute allowedRoles={['Admin']}><EntityManagement /></ProtectedRoute>} />
                    <Route path="/metrics" element={<ProtectedRoute allowedRoles={['Admin']}><Metrics /></ProtectedRoute>} />
                    <Route path="/users" element={<ProtectedRoute allowedRoles={['Admin', 'Super Admin']}><UserManagement /></ProtectedRoute>} />
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
    </AuthProvider>
  );
}

export default App;