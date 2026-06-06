import { Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Organizations from './pages/Organizations';
import Metrics from './pages/Metrics';
import DataEntry from './pages/DataEntry';
import Login from './pages/Login';
import UserManagement from './pages/UserManagement'; 
import ProtectedRoute from './components/ProtectedRoute';
import AuditQueue from './pages/AuditQueue'; 

function App() {
  const navigate = useNavigate();

  // Grab the user data so we know what to show them in the Sidebar
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  
  // Define what role counts as an Admin
  const isAdmin = user?.role === 'Admin'; 

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user'); 
    navigate('/login');
  };

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* --- SECURE PLATFORM --- */}
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
                  {/* Everyone gets to see the Dashboard and Data Entry */}
                  <li><Link to="/" style={{ color: 'white', textDecoration: 'none', fontSize: '1.1rem' }}>📊 Dashboard</Link></li>
                  <li><Link to="/data-entry" style={{ color: 'white', textDecoration: 'none', fontSize: '1.1rem' }}>📝 Data Entry</Link></li>
                  
                  {/* ONLY ADMINS see these links */}
                  {isAdmin && (
                    <>
                      <li style={{ marginTop: '20px', fontSize: '0.8rem', color: '#6c757d', textTransform: 'uppercase', fontWeight: 'bold' }}>Admin Settings</li>
                      
                      {/* Integrated your exact custom link styling here! */}
                      <li>
                        <Link to="/audit-queue" style={{ display: 'block', padding: '10px', color: 'white', textDecoration: 'none', fontSize: '1.1rem', marginLeft: '-10px', borderRadius: '4px' }}>
                           ✅ Audit Queue
                        </Link>
                      </li>
                      
                      <li><Link to="/organizations" style={{ color: 'white', textDecoration: 'none', fontSize: '1.1rem' }}>🏢 Organizations</Link></li>
                      <li><Link to="/metrics" style={{ color: 'white', textDecoration: 'none', fontSize: '1.1rem' }}>⚙️ Metrics Config</Link></li>
                      <li><Link to="/users" style={{ color: 'white', textDecoration: 'none', fontSize: '1.1rem' }}>👥 Manage Users</Link></li>
                    </>
                  )}
                </ul>

                <div style={{ borderTop: '1px solid #495057', paddingTop: '15px', marginBottom: '15px' }}>
                   <p style={{ margin: '0 0 5px 0', fontSize: '0.85rem', color: '#adb5bd' }}>Logged in as:</p>
                   <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 'bold' }}>{user?.email || 'User'}</p>
                </div>

                <button onClick={handleLogout} style={{ background: '#dc3545', color: 'white', padding: '10px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                  Log Out
                </button>
              </nav>

              {/* --- PROTECTED MAIN CONTENT --- */}
              <main style={{ flex: 1, padding: '40px', background: '#ffffff', overflowY: 'auto' }}>
                <Routes>
                  {/* Open to all authenticated users */}
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/data-entry" element={<DataEntry />} />
                  
                  {/* Locked to Admins only! */}
                  <Route 
                    path="/audit-queue" 
                    element={
                      <ProtectedRoute allowedRoles={['Admin']}>
                        <AuditQueue />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/organizations" 
                    element={
                      <ProtectedRoute allowedRoles={['Admin']}>
                        <Organizations />
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
                  
                  <Route path="*" element={<Navigate to="/" replace />} />
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