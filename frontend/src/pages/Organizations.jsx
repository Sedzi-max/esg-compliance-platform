import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Organizations() {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Using your existing data schema
  const [formData, setFormData] = useState({
    name: '',
    unit_type: 'Facility',
    jurisdiction: ''
  });

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/organizations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Add a mock 'status' property to the incoming data just for UI flair
      const enhancedData = res.data.map(org => ({ ...org, status: 'Active' }));
      setOrganizations(enhancedData);
    } catch (err) {
      console.error("Failed to load organizations");
      setError("Failed to load connected assets. Check your server connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMsg('');

    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/organizations', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccessMsg(`🏢 Infrastructure '${formData.name}' successfully provisioned!`);
      setFormData({ name: '', unit_type: 'Facility', jurisdiction: '' });
      fetchOrganizations(); // Refresh the directory
      
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError('Failed to deploy infrastructure. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // UI mock toggle for the enterprise feel
  const toggleStatus = (unit_id) => {
    setOrganizations(organizations.map(org => 
      org.unit_id === unit_id 
        ? { ...org, status: org.status === 'Active' ? 'Inactive' : 'Active' } 
        : org
    ));
  };

  if (loading) return <p style={{ textAlign: 'center', marginTop: '50px', color: '#666' }}>Loading Asset Matrix...</p>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* --- HEADER --- */}
      <div style={{ marginBottom: '30px', borderBottom: '2px solid #eee', paddingBottom: '15px' }}>
        <h1 style={{ margin: '0 0 10px 0', color: '#212529' }}>Corporate Facility Manager</h1>
        <p style={{ margin: 0, color: '#6c757d', fontSize: '1.1rem' }}>Configure and track physical assets, plants, and operational nodes across your enterprise.</p>
      </div>

      {successMsg && <div style={{ padding: '15px', marginBottom: '20px', borderRadius: '4px', background: '#d4edda', color: '#155724', fontWeight: 'bold' }}>{successMsg}</div>}
      {error && <div style={{ padding: '15px', marginBottom: '20px', borderRadius: '4px', background: '#f8d7da', color: '#721c24', fontWeight: 'bold' }}>{error}</div>}

      {/* --- RESPONSIVE FLEX LAYOUT --- */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px' }}>
        
        {/* LEFT COLUMN: Create Organization Form */}
        <div style={{ flex: '1 1 300px', background: '#fff', padding: '25px', borderRadius: '8px', border: '1px solid #dee2e6', height: 'fit-content', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.2rem', color: '#212529', marginBottom: '20px' }}>➕ Provision New Asset</h2>
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#495057' }}>Facility Name</label>
              <input 
                type="text" name="name" placeholder="e.g., Tema Distribution Center"
                value={formData.name} onChange={handleChange} required
                style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ced4da' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#495057' }}>Facility Type</label>
              <select 
                name="unit_type" value={formData.unit_type} onChange={handleChange} required
                style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ced4da', background: 'white' }}
              >
                <option value="HQ">Headquarters (HQ)</option>
                <option value="Facility">Manufacturing / General Facility</option>
                <option value="Retail">Retail Store</option>
                <option value="Fleet">Vehicle Fleet</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#495057' }}>Jurisdiction</label>
              <input 
                type="text" name="jurisdiction" placeholder="e.g., Ghana"
                value={formData.jurisdiction} onChange={handleChange} required
                style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ced4da' }}
              />
            </div>

            <button 
              type="submit" disabled={isSubmitting}
              style={{ background: '#212529', color: 'white', padding: '12px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: isSubmitting ? 'wait' : 'pointer', fontSize: '1rem', marginTop: '10px' }}
            >
              {isSubmitting ? 'Provisioning...' : 'Deploy Infrastructure'}
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: Active Facilities Table */}
        <div style={{ flex: '2 1 600px', background: '#fff', borderRadius: '8px', border: '1px solid #dee2e6', overflowX: 'auto', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                <th style={{ padding: '15px 20px', color: '#495057', width: '40%' }}>Asset / Facility</th>
                <th style={{ padding: '15px 20px', color: '#495057', width: '25%' }}>Sector Data</th>
                <th style={{ padding: '15px 20px', color: '#495057', textAlign: 'center', width: '15%' }}>Status</th>
                <th style={{ padding: '15px 20px', color: '#495057', textAlign: 'right', width: '20%' }}>Controls</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((org) => (
                <tr key={org.unit_id} style={{ borderBottom: '1px solid #eee', opacity: org.status === 'Inactive' ? 0.6 : 1 }}>
                  <td style={{ padding: '15px 20px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <div style={{ fontWeight: 'bold', color: '#212529', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{org.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6c757d', fontFamily: 'monospace' }}>ID: {org.unit_id}</div>
                  </td>
                  <td style={{ padding: '15px 20px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#495057' }}>{org.unit_type}</div>
                    <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>{org.jurisdiction}</div>
                  </td>
                  <td style={{ padding: '15px 20px', textAlign: 'center' }}>
                    <span style={{ 
                      padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', display: 'inline-block',
                      background: org.status === 'Active' ? '#d1e7dd' : '#e2e3e5',
                      color: org.status === 'Active' ? '#0f5132' : '#41464b'
                    }}>
                      {org.status}
                    </span>
                  </td>
                  <td style={{ padding: '15px 20px', textAlign: 'right' }}>
                    <button 
                      onClick={() => toggleStatus(org.unit_id)}
                      style={{ 
                        background: 'transparent', 
                        color: org.status === 'Active' ? '#dc3545' : '#198754', 
                        border: `1px solid ${org.status === 'Active' ? '#dc3545' : '#198754'}`, 
                        padding: '6px 12px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap'
                      }}
                    >
                      {org.status === 'Active' ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))}
              {organizations.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ padding: '30px', textAlign: 'center', color: '#6c757d' }}>
                    No infrastructure assets found. Provision a facility to begin data tracking.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}

export default Organizations;