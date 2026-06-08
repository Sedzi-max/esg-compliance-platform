import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Papa from 'papaparse'; 
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState([]);
  const [emissionsData, setEmissionsData] = useState([]);
  
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef(null);

  // UI State to toggle between Environmental, Social, and Governance forms
  const [entryMode, setEntryMode] = useState('E'); // 'E', 'S', or 'G'

  // 1. State for Environmental (Carbon) Data
  const [envFormData, setEnvFormData] = useState({
    organization_id: '',
    scope_category: '',
    activity_type: '',
    raw_amount: ''
  });

  // 2. State for Social Data (NEW)
  const [socFormData, setSocFormData] = useState({
    organization_id: '',
    pillar: 'S', 
    metric_name: 'Employee Turnover Rate',
    numeric_value: '',
    unit_of_measure: '%',
    text_value: ''
  });

  // 3. State for Governance Data
  const [govFormData, setGovFormData] = useState({
    organization_id: '',
    pillar: 'G', 
    metric_name: 'Board Independence Ratio',
    numeric_value: '',
    unit_of_measure: '%',
    text_value: ''
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

  const handleEnvChange = (e) => {
    const { name, value } = e.target;
    setEnvFormData(prev => ({
      ...prev, [name]: value, ...(name === 'scope_category' && { activity_type: '' }) 
    }));
  };

  // --- SUBMIT: ENVIRONMENTAL DATA ---
  const handleEnvSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/emissions', 
        { ...envFormData, raw_amount: Number(envFormData.raw_amount) }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setEnvFormData({ ...envFormData, scope_category: '', activity_type: '', raw_amount: '' });
      fetchAllData();
      showSuccess("GHG Emission securely logged and sent to Audit Queue!");
    } catch (err) {
      setError("Failed to save data. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- SUBMIT: SOCIAL DATA (NEW) ---
  const handleSocSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/observations', socFormData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSocFormData({ ...socFormData, numeric_value: '', text_value: '' }); 
      navigate('/'); 
    } catch (err) {
      setError('Error logging social data. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- SUBMIT: GOVERNANCE DATA ---
  const handleGovSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/observations', govFormData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setGovFormData({ ...govFormData, numeric_value: '', text_value: '' }); 
      navigate('/'); 
    } catch (err) {
      setError('Error logging governance data. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- BULK CSV INGESTION ---
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsSubmitting(true);
    setError(null);

    Papa.parse(file, {
      header: true, 
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rawRows = results.data;
          const payload = rawRows.map((row, index) => {
            const org = organizations.find(o => o.name.toLowerCase().trim() === row.organization_name?.toLowerCase().trim());
            if (!org) throw new Error(`Row ${index + 1}: Organization '${row.organization_name}' not found.`);
            if (!row.scope_category || !row.activity_type || !row.raw_amount) throw new Error(`Row ${index + 1}: Missing required fields.`);

            return {
              organization_id: org.unit_id,
              scope_category: row.scope_category.trim(),
              activity_type: row.activity_type.trim(),
              raw_amount: Number(row.raw_amount)
            };
          });

          const token = localStorage.getItem('token');
          await axios.post('/api/emissions/bulk', payload, { headers: { Authorization: `Bearer ${token}` } });

          fileInputRef.current.value = ""; 
          fetchAllData();
          showSuccess(`Successfully processed ${payload.length} bulk records! Check Audit Queue.`);
        } catch (err) {
          setError(err.message || "Failed to process CSV. Check formatting.");
        } finally {
          setIsSubmitting(false);
        }
      },
      error: () => {
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
        
        {/* MANUAL ENTRY FORM CONTAINER */}
        <div style={{ background: '#f8f9fa', padding: '25px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
          
          {/* THREE-WAY TAB TOGGLE */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #dee2e6', paddingBottom: '10px' }}>
            <button 
              onClick={() => setEntryMode('E')}
              style={{ background: entryMode === 'E' ? '#198754' : '#e9ecef', color: entryMode === 'E' ? 'white' : '#495057', padding: '8px 10px', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', flex: 1, fontSize: '0.85rem' }}
            >
              🌱 Env.
            </button>
            <button 
              onClick={() => setEntryMode('S')}
              style={{ background: entryMode === 'S' ? '#0d6efd' : '#e9ecef', color: entryMode === 'S' ? 'white' : '#495057', padding: '8px 10px', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', flex: 1, fontSize: '0.85rem' }}
            >
              🤝 Social
            </button>
            <button 
              onClick={() => setEntryMode('G')}
              style={{ background: entryMode === 'G' ? '#e65100' : '#e9ecef', color: entryMode === 'G' ? 'white' : '#495057', padding: '8px 10px', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', flex: 1, fontSize: '0.85rem' }}
            >
              🏛️ Gov.
            </button>
          </div>

          <h2 style={{ marginTop: 0, fontSize: '1.2rem', color: entryMode === 'E' ? '#198754' : entryMode === 'S' ? '#0d6efd' : '#e65100' }}>
            Log Single {entryMode === 'E' ? 'Activity' : 'Metric'}
          </h2>
          
          {/* ================= ENVIRONMENTAL FORM ================= */}
          {entryMode === 'E' && (
            <form onSubmit={handleEnvSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Organization</label>
                <select name="organization_id" value={envFormData.organization_id} onChange={handleEnvChange} required style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}>
                  <option value="">-- Select Organization --</option>
                  {organizations.map(org => (<option key={org.unit_id} value={org.unit_id}>{org.name}</option>))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Emission Scope</label>
                <select name="scope_category" value={envFormData.scope_category} onChange={handleEnvChange} required style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}>
                  <option value="">-- Select Scope --</option>
                  <option value="scope_1">Scope 1: Direct Emissions</option>
                  <option value="scope_2">Scope 2: Purchased Electricity</option>
                  <option value="scope_3">Scope 3: Value Chain</option>
                </select>
              </div>

              {envFormData.scope_category && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Activity Type</label>
                  <select name="activity_type" value={envFormData.activity_type} onChange={handleEnvChange} required style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <option value="">-- Select Activity --</option>
                    {ACTIVITY_OPTIONS[envFormData.scope_category].map(activity => (
                      <option key={activity.id} value={activity.id}>{activity.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {envFormData.activity_type && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Raw Amount</label>
                  <input type="number" step="any" min="0" name="raw_amount" placeholder="Enter value..." value={envFormData.raw_amount} onChange={handleEnvChange} required style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
                </div>
              )}

              <button 
                type="submit" 
                disabled={!envFormData.activity_type || !envFormData.raw_amount || isSubmitting} 
                style={{ 
                  padding: '12px 20px', 
                  background: (!envFormData.activity_type || !envFormData.raw_amount || isSubmitting) ? '#6c757d' : '#198754', 
                  cursor: (!envFormData.activity_type || !envFormData.raw_amount || isSubmitting) ? 'not-allowed' : 'pointer', 
                  color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', marginTop: '10px' 
                }}
              >
                {isSubmitting ? 'Processing...' : 'Submit to Ledger'}
              </button>
            </form>
          )}

          {/* ================= SOCIAL FORM (NEW) ================= */}
          {entryMode === 'S' && (
            <form onSubmit={handleSocSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Organization</label>
                <select 
                  required 
                  value={socFormData.organization_id}
                  onChange={(e) => setSocFormData({...socFormData, organization_id: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                  <option value="">-- Select Organization --</option>
                  {organizations.map(org => (
                    <option key={org.unit_id} value={org.unit_id}>{org.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Social Metric Focus</label>
                <select 
                  required 
                  value={socFormData.metric_name}
                  onChange={(e) => {
                    const val = e.target.value;
                    let unit = '%';
                    if (val.includes('Hours')) unit = 'Hours';
                    if (val.includes('Rate') && val.includes('Injury')) unit = 'Per 1M Hours';
                    setSocFormData({...socFormData, metric_name: val, unit_of_measure: unit});
                  }}
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                  <option value="Employee Turnover Rate">Employee Turnover Rate</option>
                  <option value="Gender Pay Gap">Gender Pay Gap</option>
                  <option value="Diversity Ratio (Management)">Diversity Ratio (Management)</option>
                  <option value="Lost Time Injury Rate (LTIR)">Lost Time Injury Rate (LTIR)</option>
                  <option value="Average Training Hours">Average Training Hours per Employee</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                  Result / Value ({socFormData.unit_of_measure})
                </label>
                <input 
                  type="number" 
                  step="any"
                  required 
                  min="0" 
                  placeholder={`e.g., ${socFormData.unit_of_measure === '%' ? '15' : '40'}`}
                  value={socFormData.numeric_value}
                  onChange={(e) => setSocFormData({...socFormData, numeric_value: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                style={{ 
                  background: isSubmitting ? '#6c757d' : '#0d6efd', 
                  color: 'white', padding: '12px 20px', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: isSubmitting ? 'wait' : 'pointer', marginTop: '10px' 
                }}
              >
                {isSubmitting ? 'Logging Data...' : 'Submit Social Log'}
              </button>
            </form>
          )}

          {/* ================= GOVERNANCE FORM ================= */}
          {entryMode === 'G' && (
            <form onSubmit={handleGovSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Organization</label>
                <select 
                  required 
                  value={govFormData.organization_id}
                  onChange={(e) => setGovFormData({...govFormData, organization_id: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                  <option value="">-- Select Organization --</option>
                  {organizations.map(org => (
                    <option key={org.unit_id} value={org.unit_id}>{org.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Metric Focus</label>
                <select 
                  required 
                  value={govFormData.metric_name}
                  onChange={(e) => {
                    const val = e.target.value;
                    let unit = '%';
                    if (val.includes('Audit') || val.includes('Training')) unit = 'Status';
                    setGovFormData({...govFormData, metric_name: val, unit_of_measure: unit});
                  }}
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                  <option value="Board Independence Ratio">Board Independence Ratio</option>
                  <option value="Women on Board Ratio">Women on Board Ratio</option>
                  <option value="Data Privacy Audit Completion">Data Privacy Audit Completion</option>
                  <option value="Anti-Bribery Training Coverage">Anti-Bribery Training Coverage</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                  Result / Value ({govFormData.unit_of_measure})
                </label>
                {govFormData.unit_of_measure === 'Status' ? (
                  <select 
                    required
                    onChange={(e) => setGovFormData({...govFormData, text_value: e.target.value, numeric_value: e.target.value === 'Pass' ? 100 : 0})}
                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                  >
                    <option value="">Select Status...</option>
                    <option value="Pass">Pass / Completed</option>
                    <option value="Fail">Fail / Incomplete</option>
                  </select>
                ) : (
                  <input 
                    type="number" 
                    required 
                    min="0" 
                    max="100"
                    placeholder="e.g., 45"
                    value={govFormData.numeric_value}
                    onChange={(e) => setGovFormData({...govFormData, numeric_value: e.target.value})}
                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                )}
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                style={{ 
                  background: isSubmitting ? '#6c757d' : '#e65100', 
                  color: 'white', padding: '12px 20px', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: isSubmitting ? 'wait' : 'pointer', marginTop: '10px' 
                }}
              >
                {isSubmitting ? 'Logging Data...' : 'Submit Governance Log'}
              </button>
            </form>
          )}
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
                  <td style={{ padding: '12px', color: '#6c757d', fontSize: '0.9rem' }}>{new Date(data.created_at).toLocaleDateString()}</td>
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