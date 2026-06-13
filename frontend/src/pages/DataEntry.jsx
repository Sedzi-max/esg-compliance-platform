import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Papa from 'papaparse'; 

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

// --- ENTERPRISE SMART MAPPER DICTIONARIES ---
const SMART_MAPPER = {
  scopes: {
    'scope 1': 'scope_1',
    'scope 1 emissions': 'scope_1',
    'direct emissions': 'scope_1',
    'direct fuel combustion': 'scope_1',
    'scope 2': 'scope_2',
    'scope 2 emissions': 'scope_2',
    'purchased electricity': 'scope_2',
    'indirect emissions': 'scope_2',
    'scope 3': 'scope_3',
    'value chain': 'scope_3',
    'supply chain': 'scope_3'
  },
  activities: {
    // Scope 1
    'diesel': 'mobile_diesel_liters',
    'diesel (mobile fleet)': 'mobile_diesel_liters',
    'mobile diesel': 'mobile_diesel_liters',
    'petrol': 'mobile_petrol_liters',
    'gasoline': 'mobile_petrol_liters',
    'natural gas': 'stationary_natural_gas_therms',
    'generator diesel': 'generator_diesel_liters',
    // Scope 2
    'grid electricity': 'electricity_grid_kwh',
    'electricity': 'electricity_grid_kwh',
    'purchased electricity': 'electricity_grid_kwh',
    'energy consumed': 'electricity_grid_kwh',
    'district heating': 'district_heating_kwh',
    // Scope 3
    'short haul flights': 'travel_flight_short_haul_km',
    'long haul flights': 'travel_flight_long_haul_km',
    'hotel stays': 'travel_hotel_stay_nights',
    'waste (landfill)': 'waste_landfill_kg',
    'landfill waste': 'waste_landfill_kg',
    'waste (recycled)': 'waste_recycled_kg',
    'recycled waste': 'waste_recycled_kg'
  }
};

// --- AUTO-INFER SCOPE LOGIC ---
// If the CSV doesn't specify a scope, we can guess it from the activity ID
const ACTIVITY_TO_SCOPE_MAP = {
  'mobile_diesel_liters': 'scope_1',
  'mobile_petrol_liters': 'scope_1',
  'stationary_natural_gas_therms': 'scope_1',
  'generator_diesel_liters': 'scope_1',
  'electricity_grid_kwh': 'scope_2',
  'district_heating_kwh': 'scope_2',
  'travel_flight_short_haul_km': 'scope_3',
  'travel_flight_long_haul_km': 'scope_3',
  'travel_hotel_stay_nights': 'scope_3',
  'waste_landfill_kg': 'scope_3',
  'waste_recycled_kg': 'scope_3'
};

function DataEntry() {
  const [organizations, setOrganizations] = useState([]);
  const [emissionsData, setEmissionsData] = useState([]);
  const [metrics, setMetrics] = useState([]);
  
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef(null);

  const [entryMode, setEntryMode] = useState('E'); 
  const [envType, setEnvType] = useState('GHG'); 

  const [envFormData, setEnvFormData] = useState({
    organization_id: '', scope_category: '', activity_type: '', raw_amount: ''
  });

  const [genEnvFormData, setGenEnvFormData] = useState({
    organization_id: '', pillar: 'E', metric_name: '', numeric_value: '', unit_of_measure: '', text_value: ''
  });

  const [socFormData, setSocFormData] = useState({
    organization_id: '', pillar: 'S', metric_name: '', numeric_value: '', unit_of_measure: '', text_value: ''
  });

  const [govFormData, setGovFormData] = useState({
    organization_id: '', pillar: 'G', metric_name: '', numeric_value: '', unit_of_measure: '', text_value: ''
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const [orgRes, emissionsRes, metricsRes] = await Promise.all([
        axios.get('/api/organizations', config),
        axios.get('/api/emissions', config).catch(() => ({ data: [] })),
        axios.get('/api/metrics', config).catch(() => ({ data: [] }))
      ]);
      
      setOrganizations(orgRes.data);
      setEmissionsData(emissionsRes.data);
      setMetrics(metricsRes.data); 
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

  const handleGenEnvSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/observations', genEnvFormData, { headers: { Authorization: `Bearer ${token}` } });
      
      setGenEnvFormData({ ...genEnvFormData, numeric_value: '', text_value: '' }); 
      fetchAllData();
      showSuccess("General Environmental metric securely logged!");
    } catch (err) {
      setError('Error logging general environmental data. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/observations', socFormData, { headers: { Authorization: `Bearer ${token}` } });
      
      setSocFormData({ ...socFormData, numeric_value: '', text_value: '' }); 
      fetchAllData();
      showSuccess("Social metric securely logged!");
    } catch (err) {
      setError('Error logging social data. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGovSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/observations', govFormData, { headers: { Authorization: `Bearer ${token}` } });
      
      setGovFormData({ ...govFormData, numeric_value: '', text_value: '' }); 
      fetchAllData();
      showSuccess("Governance metric securely logged!");
    } catch (err) {
      setError('Error logging governance data. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

 // --- UPGRADED: SMART BULK CSV INGESTION (WIDE-FORMAT UNPACKER) ---
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
          const fallbackOrgId = envFormData.organization_id || socFormData.organization_id || govFormData.organization_id;
          
          let payload = [];

          rawRows.forEach((row, index) => {
            // 1. Find the Company/Organization
            const rawOrgName = row.Company || row.organization_name || row.Organization || row.Facility || row.company || '';
            let finalOrgId = fallbackOrgId;
            
            if (rawOrgName) {
              const org = organizations.find(o => o.name.toLowerCase().trim() === rawOrgName.toLowerCase().trim());
              if (org) finalOrgId = org.unit_id;
            }
            if (!finalOrgId) return; // Skip if we really can't find an org

            // 2. Unpack the "Wide" columns into individual database rows
            // We look at every column header in this row
            Object.keys(row).forEach(columnHeader => {
              // Skip the metadata columns
              if (['Year', 'Industry', 'Company', 'Organization', 'Facility'].includes(columnHeader)) return;

              const rawAmount = row[columnHeader];
              if (!rawAmount || rawAmount === '0' || rawAmount === '') return; // Skip empty cells

              const normalizedColumn = columnHeader.toLowerCase().replace(/_/g, ' ').trim();
              
              // 3. Try to translate the column header into a strict DB Activity ID
              let translatedActivity = SMART_MAPPER.activities[normalizedColumn] || normalizedColumn;
              let translatedScope = SMART_MAPPER.scopes[normalizedColumn] || null;

              // If it's a generic column like "Scope1 Emissions tCO2e", map it to a generic activity
              if (normalizedColumn.includes('scope1') || normalizedColumn.includes('scope 1')) {
                  translatedScope = 'scope_1';
                  translatedActivity = 'mobile_diesel_liters'; // Default proxy if not specified
              } else if (normalizedColumn.includes('scope2') || normalizedColumn.includes('scope 2') || normalizedColumn.includes('energy')) {
                  translatedScope = 'scope_2';
                  translatedActivity = 'electricity_grid_kwh';
              } else if (normalizedColumn.includes('scope3') || normalizedColumn.includes('scope 3') || normalizedColumn.includes('waste')) {
                  translatedScope = 'scope_3';
                  translatedActivity = 'waste_landfill_kg';
              }

              // Auto-Infer scope if missing
              if (!translatedScope && ACTIVITY_TO_SCOPE_MAP[translatedActivity]) {
                translatedScope = ACTIVITY_TO_SCOPE_MAP[translatedActivity];
              }

              // Only push to payload if we successfully mapped it to an environmental scope
              if (translatedScope && translatedActivity) {
                payload.push({
                  organization_id: finalOrgId,
                  scope_category: translatedScope,
                  activity_type: translatedActivity,
                  raw_amount: Number(rawAmount.toString().replace(/,/g, ''))
                });
              }
            });
          });

          if (payload.length === 0) {
            throw new Error("No valid environmental data found to unpack. Check organization names and column headers.");
          }

          const token = localStorage.getItem('token');
          await axios.post('/api/emissions/bulk', payload, { headers: { Authorization: `Bearer ${token}` } });

          fileInputRef.current.value = ""; 
          fetchAllData();
          showSuccess(`Unpacked Wide CSV: Processed ${payload.length} individual metric records successfully!`);
        } catch (err) {
          setError(err.message || "Failed to process CSV. Check formatting.");
        } finally {
          setIsSubmitting(false);
        }
      },
      error: () => {
        setError("Error parsing the CSV file.");
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
          
          {entryMode === 'E' && (
            <>
              <div style={{ display: 'flex', background: '#e9ecef', borderRadius: '20px', padding: '4px', marginBottom: '20px' }}>
                <button 
                  onClick={() => setEnvType('GHG')}
                  style={{ flex: 1, background: envType === 'GHG' ? '#198754' : 'transparent', color: envType === 'GHG' ? 'white' : '#495057', border: 'none', padding: '6px', borderRadius: '16px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Carbon Tracker (GHG)
                </button>
                <button 
                  onClick={() => setEnvType('GENERAL')}
                  style={{ flex: 1, background: envType === 'GENERAL' ? '#198754' : 'transparent', color: envType === 'GENERAL' ? 'white' : '#495057', border: 'none', padding: '6px', borderRadius: '16px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  General Env. Metrics
                </button>
              </div>

              {envType === 'GHG' ? (
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
                    {isSubmitting ? 'Processing...' : 'Submit to GHG Ledger'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleGenEnvSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Organization</label>
                    <select 
                      required 
                      value={genEnvFormData.organization_id}
                      onChange={(e) => setGenEnvFormData({...genEnvFormData, organization_id: e.target.value})}
                      style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                    >
                      <option value="">-- Select Organization --</option>
                      {organizations.map(org => (
                        <option key={org.unit_id} value={org.unit_id}>{org.name}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Environmental Metric Focus</label>
                    <select 
                      required 
                      value={genEnvFormData.metric_name}
                      onChange={(e) => {
                        const selectedMetric = metrics.find(m => m.name === e.target.value);
                        setGenEnvFormData({
                          ...genEnvFormData, 
                          metric_name: selectedMetric?.name || '', 
                          unit_of_measure: selectedMetric?.unit_of_measure || ''
                        });
                      }}
                      style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                    >
                      <option value="">-- Select Dynamic Metric --</option>
                      {metrics
                        .filter(metric => metric.pillar === 'E')
                        .map(metric => (
                          <option key={metric.metric_id} value={metric.name}>
                            {metric.name} {metric.unit_of_measure ? `(${metric.unit_of_measure})` : ''}
                          </option>
                        ))}
                    </select>
                  </div>

                  {genEnvFormData.metric_name && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                        Result / Value {genEnvFormData.unit_of_measure ? `(${genEnvFormData.unit_of_measure})` : ''}
                      </label>
                      <input 
                        type="number" 
                        step="any"
                        required 
                        min="0" 
                        placeholder="Enter value..."
                        value={genEnvFormData.numeric_value}
                        onChange={(e) => setGenEnvFormData({...genEnvFormData, numeric_value: e.target.value})}
                        style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                      />
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={isSubmitting || !genEnvFormData.metric_name}
                    style={{ 
                      background: (isSubmitting || !genEnvFormData.metric_name) ? '#6c757d' : '#198754', 
                      color: 'white', padding: '12px 20px', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: (isSubmitting || !genEnvFormData.metric_name) ? 'not-allowed' : 'pointer', marginTop: '10px' 
                    }}
                  >
                    {isSubmitting ? 'Logging Data...' : 'Submit Env. Log'}
                  </button>
                </form>
              )}
            </>
          )}

          {/* ================= SOCIAL FORM ================= */}
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
                    const selectedMetric = metrics.find(m => m.name === e.target.value);
                    setSocFormData({
                      ...socFormData, 
                      metric_name: selectedMetric?.name || '', 
                      unit_of_measure: selectedMetric?.unit_of_measure || ''
                    });
                  }}
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                  <option value="">-- Select Dynamic Metric --</option>
                  {metrics
                    .filter(metric => metric.pillar === 'S')
                    .map(metric => (
                      <option key={metric.metric_id} value={metric.name}>
                        {metric.name} {metric.unit_of_measure ? `(${metric.unit_of_measure})` : ''}
                      </option>
                    ))}
                </select>
              </div>

              {socFormData.metric_name && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                    Result / Value {socFormData.unit_of_measure ? `(${socFormData.unit_of_measure})` : ''}
                  </label>
                  <input 
                    type="number" 
                    step="any"
                    required 
                    min="0" 
                    placeholder="Enter value..."
                    value={socFormData.numeric_value}
                    onChange={(e) => setSocFormData({...socFormData, numeric_value: e.target.value})}
                    style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>
              )}

              <button 
                type="submit" 
                disabled={isSubmitting || !socFormData.metric_name}
                style={{ 
                  background: (isSubmitting || !socFormData.metric_name) ? '#6c757d' : '#0d6efd', 
                  color: 'white', padding: '12px 20px', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: (isSubmitting || !socFormData.metric_name) ? 'not-allowed' : 'pointer', marginTop: '10px' 
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
                <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Governance Metric Focus</label>
                <select 
                  required 
                  value={govFormData.metric_name}
                  onChange={(e) => {
                    const selectedMetric = metrics.find(m => m.name === e.target.value);
                    setGovFormData({
                      ...govFormData, 
                      metric_name: selectedMetric?.name || '', 
                      unit_of_measure: selectedMetric?.unit_of_measure || ''
                    });
                  }}
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                  <option value="">-- Select Dynamic Metric --</option>
                  {metrics
                    .filter(metric => metric.pillar === 'G')
                    .map(metric => (
                      <option key={metric.metric_id} value={metric.name}>
                        {metric.name} {metric.unit_of_measure ? `(${metric.unit_of_measure})` : ''}
                      </option>
                    ))}
                </select>
              </div>

              {govFormData.metric_name && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                    Result / Value {govFormData.unit_of_measure ? `(${govFormData.unit_of_measure})` : ''}
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
              )}

              <button 
                type="submit" 
                disabled={isSubmitting || !govFormData.metric_name}
                style={{ 
                  background: (isSubmitting || !govFormData.metric_name) ? '#6c757d' : '#e65100', 
                  color: 'white', padding: '12px 20px', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: (isSubmitting || !govFormData.metric_name) ? 'not-allowed' : 'pointer', marginTop: '10px' 
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
            <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>Fuzzy Matching Enabled:</p>
            <p style={{ margin: '0', fontSize: '0.75rem' }}>Upload files with headers like: <code>Facility</code>, <code>Metric</code>, <code>Value</code></p>
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