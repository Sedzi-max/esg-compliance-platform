import React, { useState, useEffect } from 'react';
import axios from 'axios';

// The GHG Protocol Dictionary for the cascading dropdowns
const ACTIVITY_OPTIONS = {
  scope_1: [
    { id: 'mobile_diesel_liters', label: 'Diesel (Mobile Fleet) - Liters' },
    { id: 'mobile_petrol_liters', label: 'Petrol/Gasoline (Fleet) - Liters' },
    { id: 'stationary_natural_gas_therms', label: 'Natural Gas (Heating) - Therms' },
    { id: 'generator_diesel_liters', label: 'Diesel (Generator) - Liters' }
  ],
  scope_2: [
    { id: 'electricity_grid_kwh', label: 'Grid Electricity - kWh' },
    { id: 'district_heating_kwh', label: 'District Heating - kWh' }
  ],
  scope_3: [
    { id: 'travel_flight_short_haul_km', label: 'Short Haul Flights - km' },
    { id: 'travel_flight_long_haul_km', label: 'Long Haul Flights - km' },
    { id: 'travel_hotel_stay_nights', label: 'Hotel Stays - Nights' },
    { id: 'waste_landfill_kg', label: 'Waste (Landfill) - kg' },
    { id: 'waste_recycled_kg', label: 'Waste (Recycled) - kg' }
  ]
};

function DataEntry() {
  const [organizations, setOrganizations] = useState([]);
  const [emissionsData, setEmissionsData] = useState([]);
  
  // UI States
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    organization_id: '',
    scope_category: '',
    activity_type: '',
    raw_amount: ''
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const [orgRes, emissionsRes] = await Promise.all([
        axios.get('/api/organizations', config),
        axios.get('/api/emissions', config).catch(() => ({ data: [] }))
      ]);
      
      setOrganizations(orgRes.data);
      setEmissionsData(emissionsRes.data);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load data. Ensure you are logged in.");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'scope_category' && { activity_type: '' }) 
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMsg('');
    setError(null);

    try {
      const cleanPayload = {
        ...formData,
        raw_amount: Number(formData.raw_amount)
      };

      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      await axios.post('/api/emissions', cleanPayload, config);
      
      setFormData({ ...formData, scope_category: '', activity_type: '', raw_amount: '' });
      
      fetchAllData();
      setSuccessMsg("GHG Emission securely calculated and logged!");
      setTimeout(() => setSuccessMsg(''), 3000);

    } catch (err) {
      console.error("Error logging emission:", err);
      setError("Failed to save data. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatScope = (scope) => {
    const map = { scope_1: 'Scope 1', scope_2: 'Scope 2', scope_3: 'Scope 3' };
    return map[scope] || scope;
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '40px' }}>
      <h1 style={{ marginBottom: '30px', color: '#212529' }}>Carbon Emission Entry</h1>
      
      {error && <p style={{ color: '#dc3545', background: '#f8d7da', padding: '10px', borderRadius: '4px', marginBottom: '15px' }}>{error}</p>}
      {successMsg && <p style={{ color: '#0f5132', background: '#d1e7dd', padding: '10px', borderRadius: '4px', marginBottom: '15px' }}>{successMsg}</p>}

      {/* --- DATA ENTRY FORM --- */}
      <div style={{ background: '#f8f9fa', padding: '25px', borderRadius: '8px', border: '1px solid #dee2e6', marginBottom: '40px' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.2rem', color: '#495057' }}>Log GHG Protocol Activity</h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Organization</label>
            <select name="organization_id" value={formData.organization_id} onChange={handleChange} required style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}>
              <option value="">-- Select Organization --</option>
              {organizations.map(org => (
                <option key={org.unit_id} value={org.unit_id}>{org.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Emission Scope</label>
            <select name="scope_category" value={formData.scope_category} onChange={handleChange} required style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}>
              <option value="">-- Select Scope --</option>
              <option value="scope_1">Scope 1: Direct Emissions</option>
              <option value="scope_2">Scope 2: Purchased Electricity</option>
              <option value="scope_3">Scope 3: Value Chain</option>
            </select>
          </div>

          {formData.scope_category && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Activity Type</label>
              <select name="activity_type" value={formData.activity_type} onChange={handleChange} required style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}>
                <option value="">-- Select Activity --</option>
                {ACTIVITY_OPTIONS[formData.scope_category].map(activity => (
                  <option key={activity.id} value={activity.id}>{activity.label}</option>
                ))}
              </select>
            </div>
          )}

          {formData.activity_type && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Raw Amount</label>
              <input 
                type="number" 
                step="any" 
                min="0"
                name="raw_amount" 
                placeholder="Enter value..." 
                value={formData.raw_amount} 
                onChange={handleChange} 
                required 
                style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
            </div>
          )}

          <div style={{ gridColumn: 'span 2' }}>
            <button 
              type="submit" 
              disabled={!formData.activity_type || !formData.raw_amount || isSubmitting} 
              style={{ 
                padding: '12px 20px', 
                background: isSubmitting ? '#6c757d' : '#198754', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px', 
                fontWeight: 'bold', 
                cursor: isSubmitting ? 'not-allowed' : 'pointer', 
                width: '100%' 
              }}
            >
              {isSubmitting ? 'Calculating...' : 'Calculate & Log Carbon Footprint'}
            </button>
          </div>
        </form>
      </div>

      {/* --- IMMUTABLE LEDGER --- */}
      <h2 style={{ fontSize: '1.2rem', color: '#495057', borderBottom: '2px solid #dee2e6', paddingBottom: '10px' }}>
        Recent Emissions Ledger
      </h2>
      
      {emissionsData.length === 0 ? (
        <p style={{ color: '#6c757d' }}>No emissions data logged yet.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <thead>
              <tr style={{ background: '#f1f3f5', textAlign: 'left' }}>
                <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6' }}>Date</th>
                <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6' }}>Scope</th>
                <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6' }}>Activity</th>
                <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6' }}>Raw Input</th>
                <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6', color: '#d9534f' }}>Total CO2e (kg)</th>
              </tr>
            </thead>
            <tbody>
              {emissionsData.map((data) => (
                <tr key={data.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px', color: '#6c757d', fontSize: '0.9rem' }}>
                    {new Date(data.recorded_date).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{formatScope(data.scope_category)}</td>
                  <td style={{ padding: '12px' }}>{data.activity_type.replace(/_/g, ' ')}</td>
                  <td style={{ padding: '12px' }}>{data.raw_amount}</td>
                  <td style={{ padding: '12px', fontWeight: 'bold', color: '#d9534f' }}>
                    {Number(data.calculated_co2e).toLocaleString()} kg
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

export default DataEntry;