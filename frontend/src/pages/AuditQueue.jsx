import React, { useState, useEffect } from 'react';
import axios from 'axios';

function AuditQueue() {
  const [emissions, setEmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch the data when the page loads
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
      // If the backend returns 403, it means they aren't an admin!
      if (err.response && err.response.status === 403) {
        setError("🔒 Access Denied. Only Admins can view the Audit Queue.");
      } else {
        setError("Failed to load audit queue. Ensure you are logged in.");
      }
      setLoading(false);
    }
  };

  // The function that talks to your new PUT route
  const handleStatusUpdate = async (id, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      // Send the approval/rejection to the backend
      await axios.put(`/api/emissions/${id}/status`, { status: newStatus }, config);
      
      // Show a success message
      setSuccessMsg(`✅ Record successfully ${newStatus.toLowerCase()}!`);
      setTimeout(() => setSuccessMsg(''), 3000);

      // Refresh the table to show the new status
      fetchEmissions();
    } catch (err) {
      console.error("Error updating status:", err);
      setError("Failed to update status. You may not have Admin privileges.");
    }
  };

  // Helper to make the scopes look nice
  const formatScope = (scope) => {
    const map = { scope_1: 'Scope 1', scope_2: 'Scope 2', scope_3: 'Scope 3' };
    return map[scope] || scope;
  };

  if (loading) return <p style={{ textAlign: 'center', marginTop: '50px', color: '#666' }}>Loading Audit Queue...</p>;

  // Count how many items actually need attention
  const pendingCount = emissions.filter(e => e.status === 'Pending').length;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px', fontFamily: 'system-ui, sans-serif' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
        <h1 style={{ margin: 0, color: '#212529' }}>Admin Audit Queue</h1>
        {pendingCount > 0 && (
          <span style={{ background: '#ffc107', color: '#856404', padding: '5px 12px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.9rem' }}>
            {pendingCount} Pending Review
          </span>
        )}
      </div>
      
      {error && <div style={{ padding: '15px', marginBottom: '20px', borderRadius: '4px', background: '#f8d7da', color: '#721c24', fontWeight: 'bold' }}>{error}</div>}
      {successMsg && <div style={{ padding: '15px', marginBottom: '20px', borderRadius: '4px', background: '#d4edda', color: '#155724', fontWeight: 'bold' }}>{successMsg}</div>}

      {emissions.length === 0 ? (
        <p style={{ color: '#6c757d' }}>No emissions data found.</p>
      ) : (
        <div style={{ background: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #dee2e6' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={{ padding: '15px', borderBottom: '2px solid #dee2e6', color: '#495057' }}>Date</th>
                <th style={{ padding: '15px', borderBottom: '2px solid #dee2e6', color: '#495057' }}>Activity</th>
                <th style={{ padding: '15px', borderBottom: '2px solid #dee2e6', color: '#495057' }}>Raw Input</th>
                <th style={{ padding: '15px', borderBottom: '2px solid #dee2e6', color: '#495057' }}>Total CO2e</th>
                <th style={{ padding: '15px', borderBottom: '2px solid #dee2e6', color: '#495057' }}>Status</th>
                <th style={{ padding: '15px', borderBottom: '2px solid #dee2e6', color: '#495057', textAlign: 'center' }}>Admin Action</th>
              </tr>
            </thead>
            <tbody>
              {emissions.map((data) => (
                <tr key={data.id} style={{ borderBottom: '1px solid #eee', background: data.status === 'Pending' ? '#fffdf5' : 'white' }}>
                  <td style={{ padding: '15px', color: '#6c757d', fontSize: '0.9rem' }}>
                    {new Date(data.recorded_date).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '15px' }}>
                    <div style={{ fontWeight: 'bold', color: '#212529' }}>{formatScope(data.scope_category)}</div>
                    <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>{data.activity_type.replace(/_/g, ' ')}</div>
                  </td>
                  <td style={{ padding: '15px', fontWeight: '500' }}>{data.raw_amount}</td>
                  <td style={{ padding: '15px', fontWeight: 'bold', color: '#d9534f' }}>
                    {Number(data.calculated_co2e).toLocaleString()} kg
                  </td>
                  <td style={{ padding: '15px' }}>
                    {/* Dynamic Status Badges */}
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
                    {/* Only show the buttons if the item is Pending! */}
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