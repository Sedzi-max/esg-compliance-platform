import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SurveyCampaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State properly mapped to your Postgres columns
  const [form, setForm] = useState({ 
      supplier_name: '', 
      activity_type: 'travel_flight_short_haul_km', 
      deadline: '' 
  });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/campaigns', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setCampaigns(response.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Failed to load active supply chain requests.");
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Generate a unique token
    const newToken = `camp_${Math.random().toString(36).substr(2, 6)}`;
    
    try {
      const jwtToken = localStorage.getItem('token');
      
      // Save it permanently to the Postgres Database
      await axios.post('/api/campaigns', {
        token: newToken,
        supplier_name: form.supplier_name,
        activity_type: form.activity_type,
        deadline: form.deadline
      }, {
        headers: { Authorization: `Bearer ${jwtToken}` }
      });

      // Update the UI immediately without needing to refresh
      const newCamp = {
        id: newToken,
        supplier: form.supplier_name,
        metric: form.activity_type,
        deadline: form.deadline,
        status: 'Active'
      };
      
      setCampaigns([newCamp, ...campaigns]);
      setForm({ supplier_name: '', activity_type: 'travel_flight_short_haul_km', deadline: '' });
      setSuccessMsg("Campaign successfully launched!");
      setTimeout(() => setSuccessMsg(''), 4000);
      
    } catch (err) {
      setError("Failed to save campaign to database. Check server connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyLink = (id) => {
    const link = `http://localhost:5173/supplier-portal/${id}`;
    navigator.clipboard.writeText(link);
    setSuccessMsg(`🔗 Secure tracking URL copied to clipboard!`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const formatActivity = (type) => {
    if (!type) return '';
    return type.replace(/_/g, ' ').toUpperCase();
  };

  if (loading) return <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280', fontFamily: 'system-ui' }}>Loading active supply chain requests...</div>;

  return (
    <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', padding: '40px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '36px', margin: '0 0 10px 0', fontWeight: '800', color: '#111827', letterSpacing: '-0.02em' }}>
          Scope 3 Campaign Manager
        </h1>
        <p style={{ margin: 0, color: '#4b5563', fontSize: '18px', maxWidth: '700px' }}>
          Collect carbon data securely from your external supply chain without granting access to internal accounts.
        </p>
      </div>

      {successMsg && <div style={{ backgroundColor: '#ecfdf5', color: '#065f46', padding: '16px', borderRadius: '8px', marginBottom: '24px', border: '1px solid #6ee7b7', fontWeight: '600' }}>{successMsg}</div>}
      {error && <div style={{ backgroundColor: '#fef2f2', color: '#991b1b', padding: '16px', borderRadius: '8px', marginBottom: '24px', border: '1px solid #f87171', fontWeight: '600' }}>⚠️ {error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px', maxWidth: '1000px' }}>
        
        {/* Creation Form */}
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '20px', color: '#111827', margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🚀 Launch Supplier Stream
          </h2>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={labelStyle}>Vendor / Supplier Name</label>
              <input 
                type="text" required placeholder="e.g., Dangote Cement Logistics"
                value={form.supplier_name} onChange={e => setForm({...form, supplier_name: e.target.value})}
                style={inputStyle}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ flex: '2 1 300px' }}>
                <label style={labelStyle}>Target Scope 3 Metric</label>
                <select 
                  value={form.activity_type} onChange={e => setForm({...form, activity_type: e.target.value})}
                  style={inputStyle}
                >
                  <option value="travel_flight_short_haul_km">Short Haul Transport - km</option>
                  <option value="travel_flight_long_haul_km">Long Haul Transport - km</option>
                  <option value="waste_landfill_kg">Value Chain Waste (Landfill) - kg</option>
                  <option value="waste_recycled_kg">Value Chain Waste (Recycled) - kg</option>
                  <option value="mobile_diesel_liters">Subcontracted Fleet Fuel - Liters</option>
                </select>
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <label style={labelStyle}>Submission Deadline</label>
                <input 
                  type="date" required
                  value={form.deadline} onChange={e => setForm({...form, deadline: e.target.value})}
                  style={inputStyle}
                />
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} style={{ backgroundColor: '#111827', color: 'white', border: 'none', padding: '14px', borderRadius: '8px', fontSize: '15px', fontWeight: '700', cursor: isSubmitting ? 'wait' : 'pointer', marginTop: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', transition: '0.2s' }}>
              {isSubmitting ? 'Generating Portal...' : 'Generate Tracking Portal'}
            </button>
          </form>
        </div>

        {/* Tracking Table */}
        <div style={{ backgroundColor: 'white', borderRadius: '16px', overflowX: 'auto', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #e5e7eb' }}>
          <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <tr>
                <th style={thStyle}>Supplier</th>
                <th style={thStyle}>Target Metric</th>
                <th style={thStyle}>Deadline</th>
                <th style={thStyle}>Status</th>
                <th style={{...thStyle, textAlign: 'right'}}>Secure Access</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((camp) => (
                <tr key={camp.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '20px' }}>
                    <div style={{ fontWeight: '700', color: '#111827', fontSize: '15px' }}>{camp.supplier}</div>
                    <div style={{ fontSize: '12px', color: '#9ca3af', fontFamily: 'monospace', marginTop: '4px' }}>{camp.id}</div>
                  </td>
                  <td style={{ padding: '20px', color: '#4b5563', fontSize: '13px', fontWeight: '600' }}>
                    {formatActivity(camp.metric)}
                  </td>
                  <td style={{ padding: '20px', color: '#6b7280', fontSize: '14px' }}>
                    {new Date(camp.deadline).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '20px' }}>
                    <span style={{ 
                        padding: '6px 12px', borderRadius: '50px', fontSize: '12px', fontWeight: '700', display: 'inline-block',
                        backgroundColor: camp.status === 'Completed' ? '#d1fae5' : camp.status === 'Overdue' ? '#fee2e2' : '#fef3c7',
                        color: camp.status === 'Completed' ? '#047857' : camp.status === 'Overdue' ? '#b91c1c' : '#b45309'
                    }}>
                        {camp.status || 'Active'}
                    </span>
                  </td>
                  <td style={{ padding: '20px', textAlign: 'right' }}>
                    <button 
                      onClick={() => copyLink(camp.id)}
                      style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      🔗 Copy Link
                    </button>
                  </td>
                </tr>
              ))}
              {campaigns.length === 0 && (
                  <tr><td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: '#6b7280' }}>No active campaigns. Launch a new stream above.</td></tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};

// Reusable Styles
const labelStyle = { display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' };
const inputStyle = { width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '15px', backgroundColor: '#f9fafb', boxSizing: 'border-box', outline: 'none', color: '#111827' };
const thStyle = { padding: '16px 20px', color: '#6b7280', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' };

export default SurveyCampaigns;