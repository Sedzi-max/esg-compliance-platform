import { Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
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
import SOPPage from './pages/SOPPage'; // 👈 SOP Imported here

function App() {
  const navigate = useNavigate();

  // Grab the user data so we know what to show them in the Sidebar
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  
  // Define our RBAC Roles
  const isAdmin = user?.role === 'Admin'; 
  const isManager = user?.role === 'Manager';
  const isAuditor = user?.role === 'auditor'; 

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user'); 
    navigate('/login');
  };

  return (
    <Routes>
      {/* --- PUBLIC MARKETING & SUPPLIER PORTS (NO AUTH MANDATED) --- */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      
      {/* CRITICAL FIX: Public portal must sit outside ProtectedRoute so vendors can submit records */}
      <Route path="/supplier-portal/:token" element={<SupplierPortal />} />

      {/* --- SECURE PLATFORM PORTAL --- */}
      <Route 
        path="/*" 
        element={
          <ProtectedRoute>
            <div style={{ fontFamily: 'system-ui, sans-serif', display: 'flex', minHeight: '100vh' }}>
              
              {/* --- DYNAMIC SIDEBAR --- */}
              <nav style={{ width: '250px', background: '#212529', color: 'white', padding: '20px', display: 'flex', flexDirection: 'column' }}>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '30px', borderBottom: '1px solid #495057', paddingBottom: '10px' }}>
                  ESG Platform
                </h2>
                
                <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '15px', flex: 1 }}>
                  
                  {/* DYNAMIC SIDEBAR LOGIC: Auditors see a restricted menu */}
                  {isAuditor ? (
                    <li>
                      <Link to="/dashboard" style={{ color: 'white', textDecoration: 'none', fontSize: '1.1rem' }}>
                        🔍 Assurance Portal
                      </Link>
                    </li>
                  ) : (
                    <>
                      <li><Link to="/dashboard" style={{ color: 'white', textDecoration: 'none', fontSize: '1.1rem' }}>📊 Dashboard</Link></li>
                      <li><Link to="/data-entry" style={{ color: 'white', textDecoration: 'none', fontSize: '1.1rem' }}>📝 Data Entry</Link></li>
                    </>
                  )}
                  
                  {/* Both ADMINS and MANAGERS see the Audit Queue & Campaigns */}
                  {(isAdmin || isManager) && (
                    <>
                      <li style={{ marginTop: '20px', fontSize: '0.8rem', color: '#6c757d', textTransform: 'uppercase', fontWeight: 'bold' }}>Review Data</li>
                      <li>
                        <Link to="/audit-queue" style={{ display: 'block', padding: '5px 0', color: 'white', textDecoration: 'none', fontSize: '1.1rem' }}>
                          ✅ Audit Queue
                        </Link>
                      </li>
                      <li>
                        <Link to="/campaigns" style={{ display: 'block', padding: '5px 0', color: 'white', textDecoration: 'none', fontSize: '1.1rem' }}>
                          🚀 Scope 3 Campaigns
                        </Link>
                      </li>
                      <li>
                        <Link to="/alignment" style={{ display: 'block', padding: '5px 0', color: 'white', textDecoration: 'none', fontSize: '1.1rem' }}>
                          🎯 Compliance Alignment
                        </Link>
                      </li>
                    </>
                  )}

                  {/* ONLY ADMINS see these core system links */}
                  {isAdmin && (
                    <>
                      <li style={{ marginTop: '20px', fontSize: '0.8rem', color: '#6c757d', textTransform: 'uppercase', fontWeight: 'bold' }}>Admin Settings</li>
                      <li><Link to="/organizations" style={{ display: 'block', padding: '5px 0', color: 'white', textDecoration: 'none', fontSize: '1.1rem' }}>🏢 Organizations</Link></li>
                      <li><Link to="/entity-management" style={{ display: 'block', padding: '5px 0', color: 'white', textDecoration: 'none', fontSize: '1.1rem' }}>🌐 Entity Boundaries</Link></li>
                      <li><Link to="/metrics" style={{ display: 'block', padding: '5px 0', color: 'white', textDecoration: 'none', fontSize: '1.1rem' }}>⚙️ Metrics Config</Link></li>
                      <li><Link to="/users" style={{ display: 'block', padding: '5px 0', color: 'white', textDecoration: 'none', fontSize: '1.1rem' }}>👥 Manage Users</Link></li>
                      
                      {/* 👈 SOP SIDEBAR LINK ADDED HERE */}
                      <li><Link to="/sop" style={{ display: 'block', padding: '5px 0', color: 'white', textDecoration: 'none', fontSize: '1.1rem' }}>📄 Platform SOP</Link></li>
                    </>
                  )}
                </ul>

                <div style={{ borderTop: '1px solid #495057', paddingTop: '15px', marginBottom: '15px' }}>
                   <p style={{ margin: '0 0 5px 0', fontSize: '0.85rem', color: '#adb5bd' }}>Logged in as:</p>
                   <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 'bold' }}>{user?.email || 'User'}</p>
                   <p style={{ margin: 0, fontSize: '0.75rem', color: '#198754' }}>Role: {user?.role}</p>
                </div>

                <button onClick={handleLogout} style={{ background: '#dc3545', color: 'white', padding: '10px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                  Log Out
                </button>
              </nav>

              {/* --- PROTECTED MAIN CONTENT --- */}
              <main style={{ flex: 1, padding: '40px', background: '#ffffff', overflowY: 'auto' }}>
                <Routes>
                  
                  <Route 
                    path="/dashboard" 
                    element={isAuditor ? <AuditorDashboard /> : <Dashboard />} 
                  />

                  <Route path="/data-entry" element={<DataEntry />} />
                  
                  <Route 
                    path="/audit-queue" 
                    element={
                      <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                        <AuditQueue />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/campaigns" 
                    element={
                      <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                        <SurveyCampaigns />
                      </ProtectedRoute>
                    } 
                  />

                  <Route 
                    path="/alignment" 
                    element={
                      <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                        <FrameworkAlignment />
                      </ProtectedRoute>
                    } 
                  />

                  {/* Locked strictly to Executive Admins only! */}
                  <Route 
                    path="/organizations" 
                    element={
                      <ProtectedRoute allowedRoles={['Admin']}>
                        <Organizations />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/entity-management" 
                    element={
                      <ProtectedRoute allowedRoles={['Admin']}>
                        <EntityManagement />
                      </ProtectedRoute>
                    } 
                  />

                  <Route 
                    path="/metrics" 
                    element={
                      <ProtectedRoute allowedRoles={['Admin']}>
                        <Metrics />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/users" 
                    element={
                      <ProtectedRoute allowedRoles={['Admin']}>
                        <UserManagement />
                      </ProtectedRoute>
                    } 
                  />

                  {/* 👈 SOP ROUTE ADDED HERE */}
                  <Route 
                    path="/sop" 
                    element={
                      <ProtectedRoute allowedRoles={['Admin']}>
                        <SOPPage />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Catch-all redirects safely to /dashboard */}
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