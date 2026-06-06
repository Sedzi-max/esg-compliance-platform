import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Papa from 'papaparse'; // Our new CSV Parser

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
  
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef(null);

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
      setError("Failed to load data. Ensure you are logged in.");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev, [name]: value, ...(name === 'scope_category' && { activity_type: '' }) 
    }));
  };

  // --- MANUAL SINGLE ENTRY ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/emissions', 
        { ...formData, raw_amount: Number(formData.raw_amount) }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setFormData({ ...formData, scope_category: '', activity_type: '', raw_amount: '' });
      fetchAllData();
      showSuccess("GHG Emission securely logged and sent to Audit Queue!");
    } catch (err) {
      setError("Failed to save data. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- NEW: BULK CSV INGESTION ---
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsSubmitting(true);
    setError(null);

    Papa.parse(file, {
      header: true, // Expects row 1 to have column names
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rawRows = results.data;
          
          // Map the uploaded data to our expected API payload
          const payload = rawRows.map((row, index) => {
            // Find the database ID by matching the organization name they typed in the Excel file
            const org = organizations.find(o => o.name.toLowerCase().trim() === row.organization_name?.toLowerCase().trim());
            
            if (!org) throw new Error(`Row ${index + 1}: Organization '${row.organization_name}' not found in system.`);
            if (!row.scope_category || !row.activity_type || !row.raw_amount) throw new Error(`Row ${index + 1}: Missing required fields.`);

            return {
              organization_id: org.unit_id,
              scope_category: row.scope_category.trim(),
              activity_type: row.activity_type.trim(),
              raw_amount: Number(row.raw_amount)
            };
          });

          // Send the massive payload to our new bulk route!
          const token = localStorage.getItem('token');
          await axios.post('/api/emissions/bulk', payload, { headers: { Authorization: `Bearer ${token}` } });

          fileInputRef.current.value = ""; // Clear the file input
          fetchAllData();
          showSuccess(`Successfully processed ${payload.length} bulk records! Check Audit Queue.`);
        } catch (err) {
          setError(err.message || "Failed to process CSV. Check formatting.");
        } finally {
          setIsSubmitting(false);
        }
      },
      error: (err) => {
        setError("Error reading CSV file.");
        setIsSubmitting(false);
      }
    });
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const formatScope = (scope) => {
    const map = { scope_1: 'Scope 1', scope_2: 'Scope 2', scope_3: 'Scope 3' };
    return map[scope] || scope;
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '40px' }}>
      <h1 style={{ marginBottom: '30px', color: '#212529' }}>Data Ingestion</h1>
      
      {error && <p style={{ color: '#dc3545', background: '#f8d7da', padding: '15px', borderRadius: '4px', fontWeight: 'bold' }}>{error}</p>}
      {successMsg && <p style={{ color: '#0f5132', background: '#d1e7dd', padding: '15px', borderRadius: '4px', fontWeight: 'bold' }}>{successMsg}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '40px' }}>
        
        {/* MANUAL ENTRY FORM */}
        <div style={{ background: '#f8f9fa', padding: '25px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.2rem', color: '#495057' }}>Log Single Activity</h2>
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Organization</label>
              <select name="organization_id" value={formData.organization_id} onChange={handleChange} required style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}>
                <option value="">-- Select Organization --</option>
                {organizations.map(org => (<option key={org.unit_id} value={org.unit_id}>{org.name}</option>))}
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
                <input type="number" step="any" min="0" name="raw_amount" placeholder="Enter value..." value={formData.raw_amount} onChange={handleChange} required style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
              </div>
            )}

            <button type="submit" disabled={!formData.activity_type || !formData.raw_amount || isSubmitting} style={{ padding: '12px 20px', background: isSubmitting ? '#6c757d' : '#198754', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
              {isSubmitting ? 'Processing...' : 'Submit to Ledger'}
            </button>
          </form>
        </div>

        {/* BULK UPLOAD DROPZONE */}
        <div style={{ background: '#e3f2fd', padding: '25px', borderRadius: '8px', border: '2px dashed #90caf9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.2rem', color: '#1565c0' }}>Bulk CSV Upload</h2>
          <p style={{ color: '#1976d2', fontSize: '0.9rem', marginBottom: '20px' }}>Upload hundreds of records instantly. Ensure your headers match the required format exactly.</p>
          
          <div style={{ background: '#fff', padding: '15px', borderRadius: '4px', marginBottom: '20px', fontSize: '0.8rem', color: '#666', textAlign: 'left', width: '100%', border: '1px solid #bbdefb' }}>
            <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>Required CSV Headers:</p>
            <code style={{ background: '#f1f3f5', padding: '2px 5px' }}>organization_name, scope_category, activity_type, raw_amount</code>
          </div>

          <label style={{ cursor: 'pointer', background: '#0d6efd', color: 'white', padding: '12px 20px', borderRadius: '4px', fontWeight: 'bold', width: '100%', display: 'inline-block' }}>
            {isSubmitting ? 'Parsing CSV...' : '📁 Select CSV File'}
            <input type="file" accept=".csv" onChange={handleFileUpload} ref={fileInputRef} style={{ display: 'none' }} disabled={isSubmitting} />
          </label>
        </div>

      </div>

      {/* --- IMMUTABLE LEDGER --- */}
      <h2 style={{ fontSize: '1.2rem', color: '#495057', borderBottom: '2px solid #dee2e6', paddingBottom: '10px' }}>
        Recent Emissions Ledger (Global)
      </h2>
      
      {emissionsData.length === 0 ? (
        <p style={{ color: '#6c757d' }}>No emissions data logged yet.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <thead>
              <tr style={{ background: '#f1f3f5', textAlign: 'left' }}>
                <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6' }}>Date</th>
                <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6' }}>Status</th>
                <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6' }}>Scope</th>
                <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6' }}>Activity</th>
                <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6' }}>Raw Input</th>
                <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6', color: '#d9534f' }}>Total CO2e</th>
              </tr>
            </thead>
            <tbody>
              {emissionsData.map((data) => (
                <tr key={data.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px', color: '#6c757d', fontSize: '0.9rem' }}>{new Date(data.recorded_date).toLocaleDateString()}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', background: data.status === 'Approved' ? '#d1e7dd' : data.status === 'Rejected' ? '#f8d7da' : '#fff3cd', color: data.status === 'Approved' ? '#0f5132' : data.status === 'Rejected' ? '#842029' : '#856404' }}>
                      {data.status || 'Pending'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{formatScope(data.scope_category)}</td>
                  <td style={{ padding: '12px' }}>{data.activity_type.replace(/_/g, ' ')}</td>
                  <td style={{ padding: '12px' }}>{data.raw_amount}</td>
                  <td style={{ padding: '12px', fontWeight: 'bold', color: '#d9534f' }}>{Number(data.calculated_co2e).toLocaleString()} kg</td>
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