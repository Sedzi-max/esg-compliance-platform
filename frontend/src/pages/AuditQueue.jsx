import React, { useState, useEffect } from 'react';
import axios from 'axios';
import TraceabilityDrawer from '../components/TraceabilityDrawer';

function AuditQueue() {
  const [emissions, setEmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Tab State
  const [activeTab, setActiveTab] = useState('Pending');

  // Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Get current user role to determine if they can approve
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const canApprove = user?.role === 'Admin' || user?.role === 'Manager';

  const openDrawer = (record) => {
    setSelectedRecord(record);
    setDrawerOpen(true);
  };

  useEffect(() => {
    fetchEmissions();
  }, []);

  const fetchEmissions = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const response = await axios.get('/api/emissions', config);
      setEmissions(response.data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching audit queue:", err);
      if (err.response && err.response.status === 403) {
        setError("🔒 Access Denied. Only Admins can view the Audit Queue.");
      } else {
        setError("Failed to load audit queue. Ensure you are logged in.");
      }
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (e, id, newStatus) => {
    e.stopPropagation(); // Prevents the row click from opening the drawer
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      await axios.put(`/api/emissions/${id}/status`, { status: newStatus }, config);
      
      setSuccessMsg(`✅ Record successfully ${newStatus.toLowerCase()}!`);
      setTimeout(() => setSuccessMsg(''), 3000);

      // Update local state instantly for snappy UX
      setEmissions(emissions.map(e => e.id === id ? { ...e, status: newStatus } : e));
    } catch (err) {
      console.error("Error updating status:", err);
      setError("Failed to update status. You may not have Admin privileges.");
    }
  };

  const handleApproveAll = async () => {
    if (!window.confirm("Are you sure you want to approve ALL pending records? This will instantly populate your Dashboard charts.")) return;
    
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put('/api/emissions/bulk-approve', {}, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      
      setSuccessMsg(`✅ ${response.data.message || 'All pending records approved!'}`);
      setTimeout(() => setSuccessMsg(''), 5000);
      
      fetchEmissions();
    } catch (err) {
      console.error("Error bulk approving:", err);
      setError("Failed to bulk approve records.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatScope = (scope) => {
    const map = { scope_1: 'Scope 1', scope_2: 'Scope 2', scope_3: 'Scope 3' };
    return map[scope] || scope;
  };

  if (loading) return <p style={{ textAlign: 'center', marginTop: '50px', color: '#666' }}>Loading Audit Queue...</p>;

  // Filter data based on the active tab
  const filteredData = emissions.filter(e => e.status === activeTab);
  const pendingCount = emissions.filter(e => e.status === 'Pending').length;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* --- RESPONSIVE HEADER --- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '2px solid #eee', paddingBottom: '10px', flexWrap: 'wrap', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0, color: '#212529', lineHeight: '1.2' }}>Admin Audit Queue</h1>
          {pendingCount > 0 && (
            <span style={{ background: '#ffc107', color: '#856404', padding: '5px 12px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
              {pendingCount} Pending Review
            </span>
          )}
        </div>

        {canApprove && pendingCount > 0 && activeTab === 'Pending' && (
          <button 
            onClick={handleApproveAll}
            disabled={isSubmitting}
            style={{ 
              background: '#198754', color: 'white', padding: '10px 20px', border: 'none', 
              borderRadius: '6px', fontWeight: 'bold', cursor: isSubmitting ? 'wait' : 'pointer',
              fontSize: '1rem', boxShadow: '0 2px 4px rgba(25, 135, 84, 0.2)', whiteSpace: 'nowrap'
            }}
          >
            {isSubmitting ? 'Approving Data...' : '✅ Approve All Pending'}
          </button>
        )}
      </div>
      
      {error && <div style={{ padding: '15px', marginBottom: '20px', borderRadius: '4px', background: '#f8d7da', color: '#721c24', fontWeight: 'bold' }}>{error}</div>}
      {successMsg && <div style={{ padding: '15px', marginBottom: '20px', borderRadius: '4px', background: '#d4edda', color: '#155724', fontWeight: 'bold' }}>{successMsg}</div>}

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #dee2e6', marginBottom: '24px' }}>
        {['Pending', 'Approved', 'Rejected'].map((tab) => (
            <button 
                key={tab} 
                onClick={() => setActiveTab(tab)} 
                style={{
                    padding: '12px 24px', cursor: 'pointer', fontSize: '15px', fontWeight: '700', border: 'none', outline: 'none', backgroundColor: 'transparent', transition: 'all 0.2s',
                    color: activeTab === tab ? '#212529' : '#6c757d',
                    borderBottom: activeTab === tab ? '3px solid #0d6efd' : '3px solid transparent'
                }}
            >
                {tab}
            </button>
        ))}
      </div>

      {filteredData.length === 0 ? (
        <div style={{ background: '#fff', padding: '40px', borderRadius: '8px', textAlign: 'center', border: '1px solid #dee2e6', color: '#6c757d' }}>
            No {activeTab.toLowerCase()} records found.
        </div>
      ) : (
        /* --- RESPONSIVE TABLE CONTAINER --- */
        <div style={{ background: '#fff', borderRadius: '8px', overflowX: 'auto', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #dee2e6' }}>
          
          <table style={{ width: '100%', minWidth: '1000px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Facility & Activity</th>
                <th style={thStyle}>Carbon (CO2e)</th>
                <th style={thStyle}>Quality Tier</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Evidence</th>
                {canApprove && activeTab === 'Pending' && <th style={{ ...thStyle, textAlign: 'right' }}>Admin Action</th>}
              </tr>
            </thead>
            <tbody>
              {filteredData.map((data) => (
                <tr 
                  key={data.id} 
                  onClick={() => openDrawer(data)} 
                  style={{ 
                    borderBottom: '1px solid #eee', 
                    background: 'white',
                    cursor: 'pointer',
                    transition: 'background-color 0.1s'
                  }}
                  onMouseOver={e => e.currentTarget.style.backgroundColor = '#f8f9fa'} 
                  onMouseOut={e => e.currentTarget.style.backgroundColor = 'white'}
                >
                  {/* Date */}
                  <td style={tdStyle}>
                    <div style={{ color: '#495057', fontSize: '0.9rem', fontWeight: '500' }}>
                        {new Date(data.recorded_date || data.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  
                  {/* Facility & Activity */}
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 'bold', color: '#212529', marginBottom: '2px' }}>{data.organization_name}</div>
                    <div style={{ fontSize: '0.85rem', color: '#6c757d', fontWeight: '500' }}>
                        {formatScope(data.scope_category)}: {data.activity_type.replace(/_/g, ' ')}
                    </div>
                  </td>
                  
                  {/* Carbon Output */}
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 'bold', color: '#dc3545', fontSize: '1.05rem' }}>
                        {Number(data.calculated_co2e).toLocaleString()} kg
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#adb5bd', marginTop: '2px' }}>
                        Raw: {Number(data.raw_amount).toLocaleString()} {data.unit_of_measure}
                    </div>
                  </td>
                  
                  {/* Quality Tier (NEW) */}
                  <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ 
                              padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold',
                              backgroundColor: data.quality_tier === 'A' ? '#d1e7dd' : data.quality_tier === 'B' ? '#fff3cd' : '#f8d7da',
                              color: data.quality_tier === 'A' ? '#0f5132' : data.quality_tier === 'B' ? '#856404' : '#842029'
                          }}>
                              Tier {data.quality_tier || 'C'}
                          </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>{data.methodology || 'Spend-Based'}</div>
                  </td>

                  {/* Evidence Link */}
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    {data.evidence_file_url ? (
                      <a 
                        href={`http://localhost:5000${data.evidence_file_url}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()} 
                        style={{ color: '#0d6efd', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                      >
                        📄 View
                      </a>
                    ) : (
                      <span style={{ color: '#adb5bd', fontSize: '0.85rem' }}>- None -</span>
                    )}
                  </td>

                  {/* Actions */}
                  {canApprove && activeTab === 'Pending' && (
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                          <button 
                            onClick={(e) => handleStatusUpdate(e, data.id, 'Approved')} 
                            style={{ background: '#198754', color: 'white', border: 'none', padding: '6px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
                          >
                            Approve
                          </button>
                          <button 
                            onClick={(e) => handleStatusUpdate(e, data.id, 'Rejected')} 
                            style={{ background: '#fff', color: '#dc3545', border: '1px solid #dc3545', padding: '6px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* --- THE AUDIT TRACEABILITY DRAWER --- */}
      <TraceabilityDrawer 
        isOpen={drawerOpen} 
        onClose={() => setDrawerOpen(false)} 
        record={selectedRecord} 
      />

    </div>
  );
}

// Reusable Styles
const thStyle = { padding: '15px', borderBottom: '2px solid #dee2e6', color: '#495057', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.02em' };
const tdStyle = { padding: '15px', borderBottom: '1px solid #eee', verticalAlign: 'middle' };

export default AuditQueue;