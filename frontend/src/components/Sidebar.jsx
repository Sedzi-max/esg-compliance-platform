import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext'; // Ensure this path matches your folder structure

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  // Grab the live user state and the logout function directly from Context
  const { user, logout } = useAuth();
  
  // Standardize the casing check so 'Auditor' or 'auditor' both work
  const isAdmin = user?.role?.toLowerCase() === 'admin'; 
  const isManager = user?.role?.toLowerCase() === 'manager';
  const isAuditor = user?.role?.toLowerCase() === 'auditor'; 

  const handleLogout = () => {
    logout(); // Use the global logout function
    navigate('/login');
  };

  // Helper function to style the active link dynamically
  const getLinkStyle = (path) => {
    const isActive = location.pathname.startsWith(path);
    return {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '10px 16px',
      color: isActive ? '#ffffff' : '#9ca3af',
      backgroundColor: isActive ? '#374151' : 'transparent',
      textDecoration: 'none',
      fontSize: '15px',
      fontWeight: isActive ? '700' : '500',
      borderRadius: '8px',
      transition: 'all 0.2s ease',
    };
  };

  const getSectionHeaderStyle = () => ({
    marginTop: '24px',
    marginBottom: '8px',
    paddingLeft: '16px',
    fontSize: '12px',
    color: '#6b7280',
    textTransform: 'uppercase',
    fontWeight: '800',
    letterSpacing: '0.05em'
  });

  return (
    <nav style={{ 
      width: '260px', 
      background: '#111827', 
      color: 'white', 
      display: 'flex', 
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
      borderRight: '1px solid #1f2937'
    }}>
      
      {/* Header / Logo Area */}
      <div style={{ padding: '24px', borderBottom: '1px solid #1f2937', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '20px', margin: 0, fontWeight: '800', letterSpacing: '-0.02em', color: '#f3f4f6' }}>
          ESG Radar
        </h2>
        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#10b981', fontWeight: '600' }}>
          Compliance Engine
        </p>
      </div>
      
      {/* Navigation Links */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          
          {isAuditor ? (
            <li>
              <Link to="/dashboard" style={getLinkStyle('/dashboard')}>🔍 Assurance Portal</Link>
            </li>
          ) : (
            <>
              <li><Link to="/dashboard" style={getLinkStyle('/dashboard')}>📊 Executive Dashboard</Link></li>
              <li><Link to="/data-entry" style={getLinkStyle('/data-entry')}>📝 Log New Data</Link></li>
            </>
          )}
          
          {(isAdmin || isManager) && (
            <>
              <li style={getSectionHeaderStyle()}>Verification</li>
              <li><Link to="/audit-queue" style={getLinkStyle('/audit-queue')}>✅ Audit Queue</Link></li>
              <li><Link to="/evidence-locker" style={getLinkStyle('/evidence-locker')}>🗄️ Evidence Locker</Link></li>
              
              <li style={getSectionHeaderStyle()}>Supply Chain</li>
              <li><Link to="/campaigns" style={getLinkStyle('/campaigns')}>🚀 Scope 3 Campaigns</Link></li>
              <li><Link to="/alignment" style={getLinkStyle('/alignment')}>🎯 Alignment Matrix</Link></li>
              
              {/* Climate Stress Testing */}
              <li style={getSectionHeaderStyle()}>Risk & Forecasting</li>
              <li><Link to="/scenarios" style={getLinkStyle('/scenarios')}>🌍 Climate Stress Testing</Link></li>
            </>
          )}

          {isAdmin && (
            <>
              <li style={getSectionHeaderStyle()}>System Admin</li>
              <li><Link to="/organizations" style={getLinkStyle('/organizations')}>🏢 Facilities</Link></li>
              <li><Link to="/entity-management" style={getLinkStyle('/entity-management')}>🌐 Boundaries</Link></li>
              <li><Link to="/metrics" style={getLinkStyle('/metrics')}>⚙️ Metrics Config</Link></li>
              <li><Link to="/admin/frameworks" style={getLinkStyle('/admin/frameworks')}>📐 Framework Maps</Link></li>
              <li><Link to="/users" style={getLinkStyle('/users')}>👥 Access Control</Link></li>
              <li><Link to="/sop" style={getLinkStyle('/sop')}>📄 Platform SOP</Link></li>
            </>
          )}
        </ul>
      </div>

      {/* Footer Profile Area */}
      <div style={{ padding: '20px', borderTop: '1px solid #1f2937', backgroundColor: '#1f2937' }}>
         <div style={{ marginBottom: '16px' }}>
             <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#9ca3af', fontWeight: '600' }}>Logged in as:</p>
             <p style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
               {user?.email || 'User'}
             </p>
             <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#10b981', fontWeight: '700', textTransform: 'uppercase' }}>
               {user?.role}
             </p>
         </div>

         <button 
            onClick={handleLogout} 
            style={{ width: '100%', background: '#dc2626', color: 'white', padding: '10px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', transition: 'background 0.2s' }}
            onMouseOver={e => e.target.style.background = '#b91c1c'}
            onMouseOut={e => e.target.style.background = '#dc2626'}
          >
            Secure Log Out
         </button>
      </div>
    </nav>
  );
}

export default Sidebar;