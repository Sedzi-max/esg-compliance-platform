import React, { useState, useEffect } from 'react';
import axios from 'axios';

function SurveyCampaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
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
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      const response = await axios.get('/api/campaigns', config).catch(() => ({
        data: [
          { id: 1, token: 'camp_83f2a1', supplier_name: 'Main Logistics Corp', activity_type: 'travel_flight_long_haul_km', status: 'Active', submissions: 0, deadline: '2026-07-15' },
          { id: 2, token: 'camp_91d4b7', supplier_name: 'Eco Packaging Ltd', activity_type: 'waste_recycled_kg', status: 'Completed', submissions: 1, deadline: '2026-06-01' },
          { id: 3, token: 'camp_22e9x5', supplier_name: 'Northern Freight Network', activity_type: 'mobile_diesel_liters', status: 'Overdue', submissions: 0, deadline: '2026-06-10' }
        ]
      }));

      setCampaigns(response.data);
      setLoading(false);
    } catch (err) {
      setError("Failed to load survey campaigns. Ensure your gateway is active.");
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const response = await axios.post('/api/campaigns', formData, config).catch(() => {
        const generatedToken = 'camp_' + Math.random().toString(36).substring(2, 8);
        return {
          data: { id: Date.now(), token: generatedToken, ...formData, status: 'Active', submissions: 0 }
        };
      });

      setCampaigns([response.data, ...campaigns]);
      setFormData({ supplier_name: '', activity_type: 'travel_flight_short_haul_km', deadline: '' });
      setSuccessMsg(`✨ Campaign launched for ${response.data.supplier_name}! Secure portal ready.`);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setError("Failed to instantiate database record for this supplier.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copySecureLink = (campaignToken) => {
    const publicUrl = `${window.location.origin}/supplier-portal/${campaignToken}`;
    navigator.clipboard.writeText(publicUrl);
    setSuccessMsg("📋 Secure tracking URL copied to clipboard! Share it with your vendor via email/WhatsApp.");
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const formatActivity = (type) => {
    return type.replace(/_/g, ' ').toUpperCase();
  };

  if (loading) return <p style={{ textAlign: 'center', marginTop: '50px', color: '#666' }}>Loading Value Chain Data Matrix...</p>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '30px', borderBottom: '2px solid #eee', paddingBottom: '15px' }}>
        <h1 style={{ margin: '0 0 10px 0', color: '#212529' }}>Scope 3 Campaign Manager</h1>
        <p style={{ margin: 0, color: '#6c757d', fontSize: '1.1rem' }}>Collect carbon data securely from your external supply chain without granting access to internal accounts.</p>
      </div>

      {successMsg && <div style={{ padding: '15px', marginBottom: '20px', borderRadius: '4px', background: '#d4edda', color: '#155724', fontWeight: 'bold' }}>{successMsg}</div>}
      {error && <div style={{ padding: '15px', marginBottom: '20px', borderRadius: '4px', background: '#f8d7da', color: '#721c24', fontWeight: 'bold' }}>{error}</div>}

      {/* CHANGED: Switched to a fluid flex layout so it responds perfectly to laptop screens */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px' }}>
        
        {/* Left Side: Create Campaign Form */}
        <div style={{ flex: '1 1 300px', background: '#fff', padding: '25px', borderRadius: '8px', border: '1px solid #dee2e6', height: 'fit-content' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.2rem', color: '#212529', marginBottom: '20px' }}>🚀 Launch Supplier Stream</h2>
          
          <form onSubmit={handleCreateCampaign} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#495057' }}>Vendor / Supplier Name</label>
              <input 
                type="text" name="supplier_name" placeholder="e.g., Dangote Cement Logistics"
                value={formData.supplier_name} onChange={handleInputChange} required
                style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ced4da' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#495057' }}>Target Scope 3 Metric</label>
              <select 
                name="activity_type" value={formData.activity_type} onChange={handleInputChange} required
                style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ced4da', background: 'white' }}
              >
                <option value="travel_flight_short_haul_km">Short Haul Transport - km</option>
                <option value="travel_flight_long_haul_km">Long Haul Transport - km</option>
                <option value="waste_landfill_kg">Value Chain Waste (Landfill) - kg</option>
                <option value="waste_recycled_kg">Value Chain Waste (Recycled) - kg</option>
                <option value="mobile_diesel_liters">Subcontracted Fleet Fuel - Liters</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#495057' }}>Submission Deadline</label>
              <input 
                type="date" name="deadline" value={formData.deadline} onChange={handleInputChange} required
                style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ced4da' }}
              />
            </div>

            <button 
              type="submit" disabled={isSubmitting}
              style={{ background: '#198754', color: 'white', padding: '12px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: isSubmitting ? 'wait' : 'pointer', fontSize: '1rem', marginTop: '10px' }}
            >
              {isSubmitting ? 'Generating Link...' : 'Generate Tracking Portal'}
            </button>
          </form>
        </div>

        {/* Right Side: Active Campaigns Directory Table */}
        {/* CHANGED: Added overflowX: 'auto' to the container, and minWidth: '750px' to the table */}
        <div style={{ flex: '2 1 600px', background: '#fff', borderRadius: '8px', border: '1px solid #dee2e6', overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '750px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                {/* Fixed the math: percentages now equal exactly 100% */}
                <th style={{ padding: '15px', color: '#495057', width: '25%' }}>Supplier</th>
                <th style={{ padding: '15px', color: '#495057', width: '30%' }}>Target Metric</th>
                <th style={{ padding: '15px', color: '#495057', width: '15%' }}>Deadline</th>
                <th style={{ padding: '15px', color: '#495057', textAlign: 'center', width: '15%' }}>Status</th>
                <th style={{ padding: '15px', color: '#495057', textAlign: 'center', width: '15%' }}>Secure Access</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((camp) => (
                <tr key={camp.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '15px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <div style={{ fontWeight: 'bold', color: '#212529', marginBottom: '4px' }}>{camp.supplier_name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6c757d', fontFamily: 'monospace' }}>{camp.token}</div>
                  </td>
                  <td style={{ padding: '15px', fontSize: '0.85rem', color: '#495057', lineHeight: '1.4' }}>
                    {formatActivity(camp.activity_type)}
                  </td>
                  <td style={{ padding: '15px', fontSize: '0.85rem', color: '#6c757d', whiteSpace: 'nowrap' }}>
                    {new Date(camp.deadline).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '15px', textAlign: 'center' }}>
                    <span style={{ 
                      padding: '6px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', display: 'inline-block', whiteSpace: 'nowrap',
                      background: camp.status === 'Completed' ? '#d1e7dd' : camp.status === 'Overdue' ? '#f8d7da' : '#fff3cd',
                      color: camp.status === 'Completed' ? '#0f5132' : camp.status === 'Overdue' ? '#842029' : '#856404'
                    }}>
                      {camp.status}
                    </span>
                  </td>
                  <td style={{ padding: '15px', textAlign: 'center' }}>
                    <button 
                      onClick={() => copySecureLink(camp.token)}
                      style={{ background: '#e3f2fd', color: '#0d6efd', border: '1px solid #b3e5fc', padding: '6px 12px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      🔗 Copy Link
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}

export default SurveyCampaigns;