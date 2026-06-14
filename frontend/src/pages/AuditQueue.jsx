import React, { useState, useEffect } from 'react';
import axios from 'axios';

function AuditQueue() {
  const [emissions, setEmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      await axios.put(`/api/emissions/${id}/status`, { status: newStatus }, config);
      
      setSuccessMsg(`✅ Record successfully ${newStatus.toLowerCase()}!`);
      setTimeout(() => setSuccessMsg(''), 3000);

      fetchEmissions();
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

        {pendingCount > 0 && (
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

      {emissions.length === 0 ? (
        <p style={{ color: '#6c757d' }}>No emissions data found.</p>
      ) : (
        /* --- RESPONSIVE TABLE CONTAINER --- */
        <div style={{ background: '#fff', borderRadius: '8px', overflowX: 'auto', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #dee2e6' }}>
          
          <table style={{ width: '100%', minWidth: '950px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={{ padding: '15px', borderBottom: '2px solid #dee2e6', color: '#495057' }}>Date</th>
                <th style={{ padding: '15px', borderBottom: '2px solid #dee2e6', color: '#495057' }}>Activity</th>
                <th style={{ padding: '15px', borderBottom: '2px solid #dee2e6', color: '#495057' }}>Raw Input</th>
                <th style={{ padding: '15px', borderBottom: '2px solid #dee2e6', color: '#495057' }}>Total CO2e</th>
                <th style={{ padding: '15px', borderBottom: '2px solid #dee2e6', color: '#495057', textAlign: 'center' }}>Evidence</th>
                <th style={{ padding: '15px', borderBottom: '2px solid #dee2e6', color: '#495057' }}>Status</th>
                <th style={{ padding: '15px', borderBottom: '2px solid #dee2e6', color: '#495057', textAlign: 'center' }}>Admin Action</th>
              </tr>
            </thead>
            <tbody>
              {emissions.map((data) => (
                <tr key={data.id} style={{ borderBottom: '1px solid #eee', background: data.status === 'Pending' ? '#fffdf5' : 'white' }}>
                  <td style={{ padding: '15px', color: '#6c757d', fontSize: '0.9rem' }}>
                    {new Date(data.recorded_date || data.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '15px' }}>
                    <div style={{ fontWeight: 'bold', color: '#212529' }}>{formatScope(data.scope_category)}</div>
                    <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>{data.activity_type.replace(/_/g, ' ')}</div>
                  </td>
                  <td style={{ padding: '15px', fontWeight: '500' }}>{data.raw_amount}</td>
                  <td style={{ padding: '15px', fontWeight: 'bold', color: '#d9534f' }}>
                    {Number(data.calculated_co2e).toLocaleString()} kg
                  </td>
                  
                  {/* --- EVIDENCE LINK --- */}
                  <td style={{ padding: '15px', textAlign: 'center' }}>
                    {data.evidence_file_url ? (
                      <a 
                        href={`http://localhost:5000${data.evidence_file_url}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ color: '#0d6efd', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                      >
                        📄 View
                      </a>
                    ) : (
                      <span style={{ color: '#adb5bd', fontSize: '0.85rem' }}>- None -</span>
                    )}
                  </td>

                  <td style={{ padding: '15px' }}>
                    <span style={{ 
                      padding: '5px 10px', 
                      borderRadius: '4px', 
                      fontSize: '0.85rem', 
                      fontWeight: 'bold',
                      background: data.status === 'Approved' ? '#d1e7dd' : data.status === 'Rejected' ? '#f8d7da' : '#fff3cd',
                      color: data.status === 'Approved' ? '#0f5132' : data.status === 'Rejected' ? '#842029' : '#856404'
                    }}>
                      {data.status || 'Pending'}
                    </span>
                  </td>
                  <td style={{ padding: '15px', textAlign: 'center' }}>
                    {data.status === 'Pending' ? (
                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                        <button 
                          onClick={() => handleStatusUpdate(data.id, 'Approved')}
                          style={{ background: '#198754', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleStatusUpdate(data.id, 'Rejected')}
                          style={{ background: '#dc3545', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: '#adb5bd', fontSize: '0.85rem' }}>Locked</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AuditQueue;