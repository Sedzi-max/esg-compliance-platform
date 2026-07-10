import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

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
    'diesel': 'mobile_diesel_liters',
    'diesel (mobile fleet)': 'mobile_diesel_liters',
    'mobile diesel': 'mobile_diesel_liters',
    'petrol': 'mobile_petrol_liters',
    'gasoline': 'mobile_petrol_liters',
    'natural gas': 'stationary_natural_gas_therms',
    'generator diesel': 'generator_diesel_liters',
    'grid electricity': 'electricity_grid_kwh',
    'electricity': 'electricity_grid_kwh',
    'purchased electricity': 'electricity_grid_kwh',
    'energy consumed': 'electricity_grid_kwh',
    'district heating': 'district_heating_kwh',
    'short haul flights': 'travel_flight_short_haul_km',
    'long haul flights': 'travel_flight_long_haul_km',
    'hotel stays': 'travel_hotel_stay_nights',
    'waste (landfill)': 'waste_landfill_kg',
    'landfill waste': 'waste_landfill_kg',
    'waste (recycled)': 'waste_recycled_kg',
    'recycled waste': 'waste_recycled_kg'
  }
};

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

// --- BANK OF GHANA (BoG) PRINCIPLES ---
const BOG_PRINCIPLES = [
  { id: 'BoG-P1', label: 'P1: E&S Risk Management in Lending (Portfolio Screening)' },
  { id: 'BoG-P2', label: 'P2: Internal Footprint (Energy, Paper, Waste Metrics)' },
  { id: 'BoG-P3', label: 'P3: Corporate Governance & Anti-Corruption Protocols' },
  { id: 'BoG-P4', label: 'P4: Gender Equality (Board Diversity & Equal Pay Metrics)' },
  { id: 'BoG-P5', label: 'P5: Financial Inclusion (Unbanked Demographic Reach)' },
  { id: 'BoG-P6', label: 'P6: Resource Efficiency & Green Product Offerings' },
  { id: 'BoG-P7', label: 'P7: Transparent Annual ESG Reporting & Disclosure' }
];

function DataEntry() {
  const [organizations, setOrganizations] = useState([]);
  const [emissionsData, setEmissionsData] = useState([]);
  const [metrics, setMetrics] = useState([]);
  
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef(null);

  // CSV Bulk Upload State
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [uploadErrors, setUploadErrors] = useState([]);

  // Routing State
  const [userSector, setUserSector] = useState('Banking');
  const [entryMode, setEntryMode] = useState('E'); 
  const [envType, setEnvType] = useState('GHG'); 
  const [filePreviewName, setFilePreviewName] = useState("");

  // Form States
  const [envFormData, setEnvFormData] = useState({ organization_id: '', scope_category: '', activity_type: '', raw_amount: '', evidence_file: null });
  const [genEnvFormData, setGenEnvFormData] = useState({ organization_id: '', pillar: 'E', metric_name: '', numeric_value: '', unit_of_measure: '', text_value: '', evidence_file: null });
  const [socFormData, setSocFormData] = useState({ organization_id: '', pillar: 'S', metric_name: '', numeric_value: '', unit_of_measure: '', text_value: '', evidence_file: null });
  const [govFormData, setGovFormData] = useState({ organization_id: '', pillar: 'G', metric_name: '', numeric_value: '', unit_of_measure: '', text_value: '', evidence_file: null });
  
  // New BoG Form State
  const [bogFormData, setBogFormData] = useState({ organization_id: '', principle_id: '', numeric_value: '', evidence_file: null });

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

  const handleFileChange = (e, formType) => {
    const file = e.target.files[0];
    if (file) {
      if (formType === 'ghg') setEnvFormData({ ...envFormData, evidence_file: file });
      if (formType === 'genEnv') setGenEnvFormData({ ...genEnvFormData, evidence_file: file });
      if (formType === 'soc') setSocFormData({ ...socFormData, evidence_file: file });
      if (formType === 'gov') setGovFormData({ ...govFormData, evidence_file: file });
      if (formType === 'bog') setBogFormData({ ...bogFormData, evidence_file: file });
      setFilePreviewName(file.name);
    }
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  // 1. Duplicate Check Helper Function
  const checkForDuplicates = (formData) => {
    // Check against the recent emissions ledger state
    const isDuplicate = emissionsData.some(log => 
        log.organization_name === organizations.find(o => o.unit_id == formData.organization_id)?.name &&
        log.raw_amount == formData.raw_amount &&
        log.activity_type === formData.activity_type
    );
    return isDuplicate;
  };

  // 2. Wrapped Submit function with the validator
  const handleEnvSubmit = async (e) => {
    e.preventDefault();
    
    // Trigger Duplicate Check
    if (checkForDuplicates(envFormData)) {
        if (!window.confirm("⚠️ Warning: An identical log for this activity and value already exists in the ledger. Proceed anyway?")) {
            return;
        }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const submitData = new FormData();
      
      submitData.append('organization_id', envFormData.organization_id);
      submitData.append('scope_category', envFormData.scope_category);
      submitData.append('activity_type', envFormData.activity_type);
      submitData.append('raw_amount', envFormData.raw_amount);
      if (envFormData.evidence_file) submitData.append('evidence_file', envFormData.evidence_file);

      await axios.post('/api/emissions', submitData, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      
      setEnvFormData({ organization_id: '', scope_category: '', activity_type: '', raw_amount: '', evidence_file: null });
      setFilePreviewName('');
      fetchAllData();
      showSuccess("GHG Emission securely logged with verification invoice!");
    } catch (err) {
      setError("Failed to save data. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitObservationWithEvidence = async (formDataState, successMessage, resetStateFn) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const submitData = new FormData();
      submitData.append('organization_id', formDataState.organization_id);
      submitData.append('pillar', formDataState.pillar || 'G');
      submitData.append('metric_name', formDataState.metric_name || formDataState.principle_id);
      submitData.append('unit_of_measure', formDataState.unit_of_measure || '');
      
      if (formDataState.numeric_value) submitData.append('numeric_value', formDataState.numeric_value);
      if (formDataState.text_value) submitData.append('text_value', formDataState.text_value);
      if (formDataState.evidence_file) submitData.append('evidence_file', formDataState.evidence_file);

      await axios.post('/api/observations', submitData, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      
      resetStateFn({ ...formDataState, numeric_value: '', text_value: '', evidence_file: null }); 
      setFilePreviewName(''); 
      fetchAllData();
      showSuccess(successMessage);
    } catch (err) {
      setError(`Error logging data. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenEnvSubmit = (e) => { e.preventDefault(); submitObservationWithEvidence(genEnvFormData, "General Environmental metric securely logged!", setGenEnvFormData); };
  const handleSocSubmit = (e) => { e.preventDefault(); submitObservationWithEvidence(socFormData, "Social metric securely logged!", setSocFormData); };
  const handleGovSubmit = (e) => { e.preventDefault(); submitObservationWithEvidence(govFormData, "Governance metric securely logged!", setGovFormData); };
  const handleBogSubmit = (e) => { e.preventDefault(); submitObservationWithEvidence(bogFormData, "Bank of Ghana Compliance Clause securely logged!", setBogFormData); };

  const handleFileUpload = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      setIsSubmitting(true);
      setUploadSuccess('');
      setUploadErrors([]);

      const formData = new FormData();
      formData.append('file', file);

      try {
          const token = localStorage.getItem('token');
          const response = await axios.post('/api/upload-csv', formData, { 
            headers: { 'Authorization': `Bearer ${token}` } 
          });
          setUploadSuccess(`✅ Successfully processed ${response.data.rows_processed} rows and inserted ${response.data.successful_inserts} records.`);
          if (response.data.errors && response.data.errors.length > 0) setUploadErrors(response.data.errors);
          fetchAllData(); 
      } catch (err) {
          setUploadErrors([ err.response?.data?.error || "A critical error occurred while parsing the CSV." ]);
      } finally {
          setIsSubmitting(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const formatScope = (scope) => {
    const map = { scope_1: 'Scope 1', scope_2: 'Scope 2', scope_3: 'Scope 3' };
    return map[scope] || scope;
  };

  // --- AI DOCUMENT INTELLIGENCE UI ---
  const EvidenceAttachmentUI = ({ formType, onExtract }) => {
    const [isScanning, setIsScanning] = useState(false);
    const [scanComplete, setScanComplete] = useState(false);

    useEffect(() => {
      if (!filePreviewName) setScanComplete(false);
    }, [filePreviewName]);

    const handleAIScan = () => {
      setIsScanning(true);
      setTimeout(() => {
        setIsScanning(false);
        setScanComplete(true);
        const simulatedExtraction = Math.floor(Math.random() * (5000 - 150 + 1)) + 150;
        if (onExtract) onExtract(simulatedExtraction);
      }, 2500); 
    };

    return (
      <div style={{ background: '#f8f9fa', border: '2px dashed #ced4da', borderRadius: '8px', padding: '20px', textAlign: 'center', transition: 'border 0.3s', marginTop: '10px' }}>
        <label style={{ display: 'block', fontWeight: 'bold', color: '#495057', marginBottom: '10px' }}>
          📎 Attach Audit Evidence (Optional)
        </label>
        
        <input 
          type="file" id={`evidence_upload_${formType}`} onChange={(e) => handleFileChange(e, formType)}
          style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png,.csv"
        />
        
        {!filePreviewName ? (
          <button 
            type="button" 
            onClick={() => document.getElementById(`evidence_upload_${formType}`).click()}
            style={{ background: '#e9ecef', color: '#495057', border: '1px solid #ced4da', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
          >
            Browse Files
          </button>
        ) : (
          <div style={{ background: 'white', padding: '15px', borderRadius: '6px', border: '1px solid #dee2e6', marginTop: '10px' }}>
            <p style={{ margin: '0 0 15px 0', color: '#495057', fontWeight: 'bold', fontSize: '0.85rem' }}>
              📄 {filePreviewName} attached
            </p>
            
            {!scanComplete ? (
              <button 
                type="button" onClick={handleAIScan} disabled={isScanning}
                style={{ 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', 
                  padding: '10px 16px', borderRadius: '4px', cursor: isScanning ? 'wait' : 'pointer', fontWeight: 'bold', 
                  fontSize: '0.85rem', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                  boxShadow: '0 2px 4px rgba(118, 75, 162, 0.3)'
                }}
              >
                {isScanning ? '⏳ Extracting Data...' : '✨ Auto-Fill with Document AI'}
              </button>
            ) : (
              <div style={{ color: '#198754', fontSize: '0.85rem', fontWeight: 'bold', background: '#d1e7dd', padding: '10px', borderRadius: '4px' }}>
                ✨ Data successfully extracted from document!
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // --- ROUTING ENGINE: RENDER FORMS BASED ON SECTOR ---
  const renderSectorForm = () => {
    if (userSector === 'Banking') {
      return (
        <div style={{ background: '#f8f9fa', padding: '30px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.4rem', color: '#0f172a', marginBottom: '8px' }}>🏦 Bank of Ghana Compliance Portal</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '24px' }}>Log required data directly against the 7 mandatory Sustainable Banking Principles.</p>
          
          <form onSubmit={handleBogSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>Organization Unit</label>
              <select required value={bogFormData.organization_id} onChange={(e) => setBogFormData({...bogFormData, organization_id: e.target.value})} style={{ padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}>
                <option value="">-- Select Organization --</option>
                {organizations.map(org => <option key={org.unit_id} value={org.unit_id}>{org.name}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>Mandatory Principle</label>
              <select required value={bogFormData.principle_id} onChange={(e) => setBogFormData({...bogFormData, principle_id: e.target.value})} style={{ padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', background: '#f1f5f9' }}>
                <option value="">-- Select BoG Principle --</option>
                {BOG_PRINCIPLES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>

            <EvidenceAttachmentUI formType="bog" onExtract={(extractedValue) => setBogFormData({ ...bogFormData, numeric_value: extractedValue })} />

            {bogFormData.principle_id && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>Verified Result / Financial Value</label>
                <input type="number" step="any" required min="0" placeholder="Enter calculated result..." value={bogFormData.numeric_value} onChange={(e) => setBogFormData({...bogFormData, numeric_value: e.target.value})} style={{ padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
              </div>
            )}

            <button type="submit" disabled={isSubmitting || !bogFormData.principle_id} style={{ background: (isSubmitting || !bogFormData.principle_id) ? '#94a3b8' : '#2563eb', color: 'white', padding: '14px 20px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: (isSubmitting || !bogFormData.principle_id) ? 'not-allowed' : 'pointer', transition: 'background 0.2s', marginTop: '10px' }}>
              {isSubmitting ? 'Logging to Ledger...' : 'Submit Compliance Log'}
            </button>
          </form>
        </div>
      );
    }

    // Default "Generic" multi-tab view for all other industries
    return (
        <div style={{ background: '#f8f9fa', padding: '25px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #dee2e6', paddingBottom: '10px' }}>
            <button 
              onClick={() => { setEntryMode('E'); setFilePreviewName(''); }}
              style={{ background: entryMode === 'E' ? '#198754' : '#e9ecef', color: entryMode === 'E' ? 'white' : '#495057', padding: '8px 10px', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', flex: 1, fontSize: '0.85rem' }}
            >
              🌱 Env.
            </button>
            <button 
              onClick={() => { setEntryMode('S'); setFilePreviewName(''); }}
              style={{ background: entryMode === 'S' ? '#0d6efd' : '#e9ecef', color: entryMode === 'S' ? 'white' : '#495057', padding: '8px 10px', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', flex: 1, fontSize: '0.85rem' }}
            >
              🤝 Social
            </button>
            <button 
              onClick={() => { setEntryMode('G'); setFilePreviewName(''); }}
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
                  onClick={() => { setEnvType('GHG'); setFilePreviewName(''); }}
                  style={{ flex: 1, background: envType === 'GHG' ? '#198754' : 'transparent', color: envType === 'GHG' ? 'white' : '#495057', border: 'none', padding: '6px', borderRadius: '16px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Carbon Tracker (GHG)
                </button>
                <button 
                  onClick={() => { setEnvType('GENERAL'); setFilePreviewName(''); }}
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
                    <EvidenceAttachmentUI formType="ghg" onExtract={(extractedValue) => setEnvFormData({ ...envFormData, raw_amount: extractedValue })} />
                  )}

                  {envFormData.activity_type && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Raw Amount</label>
                      <input type="number" step="any" min="0" name="raw_amount" placeholder="Enter value..." value={envFormData.raw_amount} onChange={handleEnvChange} required style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
                    </div>
                  )}

                  <button type="submit" disabled={!envFormData.activity_type || !envFormData.raw_amount || isSubmitting} style={{ padding: '12px 20px', background: (!envFormData.activity_type || !envFormData.raw_amount || isSubmitting) ? '#6c757d' : '#198754', cursor: (!envFormData.activity_type || !envFormData.raw_amount || isSubmitting) ? 'not-allowed' : 'pointer', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', marginTop: '10px' }}>
                    {isSubmitting ? 'Processing...' : 'Submit to GHG Ledger'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleGenEnvSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Organization</label>
                    <select required value={genEnvFormData.organization_id} onChange={(e) => setGenEnvFormData({...genEnvFormData, organization_id: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}>
                      <option value="">-- Select Organization --</option>
                      {organizations.map(org => (<option key={org.unit_id} value={org.unit_id}>{org.name}</option>))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Environmental Metric Focus</label>
                    <select required value={genEnvFormData.metric_name} onChange={(e) => {
                        const selectedMetric = metrics.find(m => m.name === e.target.value);
                        setGenEnvFormData({ ...genEnvFormData, metric_name: selectedMetric?.name || '', unit_of_measure: selectedMetric?.unit_of_measure || '' });
                      }} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}>
                      <option value="">-- Select Dynamic Metric --</option>
                      {metrics.filter(metric => metric.pillar === 'E').map(metric => (
                        <option key={metric.metric_id} value={metric.name}>{metric.name} {metric.unit_of_measure ? `(${metric.unit_of_measure})` : ''}</option>
                      ))}
                    </select>
                  </div>

                  <EvidenceAttachmentUI formType="genEnv" onExtract={(extractedValue) => setGenEnvFormData({ ...genEnvFormData, numeric_value: extractedValue })} />

                  {genEnvFormData.metric_name && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Result / Value {genEnvFormData.unit_of_measure ? `(${genEnvFormData.unit_of_measure})` : ''}</label>
                      <input type="number" step="any" required min="0" placeholder="Enter value..." value={genEnvFormData.numeric_value} onChange={(e) => setGenEnvFormData({...genEnvFormData, numeric_value: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
                    </div>
                  )}

                  <button type="submit" disabled={isSubmitting || !genEnvFormData.metric_name} style={{ background: (isSubmitting || !genEnvFormData.metric_name) ? '#6c757d' : '#198754', color: 'white', padding: '12px 20px', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: (isSubmitting || !genEnvFormData.metric_name) ? 'not-allowed' : 'pointer', marginTop: '10px' }}>
                    {isSubmitting ? 'Logging Data...' : 'Submit Env. Log'}
                  </button>
                </form>
              )}
            </>
          )}

          {/* SOCIAL FORM */}
          {entryMode === 'S' && (
            <form onSubmit={handleSocSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Organization</label>
                <select required value={socFormData.organization_id} onChange={(e) => setSocFormData({...socFormData, organization_id: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}>
                  <option value="">-- Select Organization --</option>
                  {organizations.map(org => (<option key={org.unit_id} value={org.unit_id}>{org.name}</option>))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Social Metric Focus</label>
                <select required value={socFormData.metric_name} onChange={(e) => {
                    const selectedMetric = metrics.find(m => m.name === e.target.value);
                    setSocFormData({ ...socFormData, metric_name: selectedMetric?.name || '', unit_of_measure: selectedMetric?.unit_of_measure || '' });
                  }} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}>
                  <option value="">-- Select Dynamic Metric --</option>
                  {metrics.filter(metric => metric.pillar === 'S').map(metric => (
                    <option key={metric.metric_id} value={metric.name}>{metric.name} {metric.unit_of_measure ? `(${metric.unit_of_measure})` : ''}</option>
                  ))}
                </select>
              </div>

              <EvidenceAttachmentUI formType="soc" onExtract={(extractedValue) => setSocFormData({ ...socFormData, numeric_value: extractedValue })} />

              {socFormData.metric_name && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Result / Value {socFormData.unit_of_measure ? `(${socFormData.unit_of_measure})` : ''}</label>
                  <input type="number" step="any" required min="0" placeholder="Enter value..." value={socFormData.numeric_value} onChange={(e) => setSocFormData({...socFormData, numeric_value: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
                </div>
              )}

              <button type="submit" disabled={isSubmitting || !socFormData.metric_name} style={{ background: (isSubmitting || !socFormData.metric_name) ? '#6c757d' : '#0d6efd', color: 'white', padding: '12px 20px', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: (isSubmitting || !socFormData.metric_name) ? 'not-allowed' : 'pointer', marginTop: '10px' }}>
                {isSubmitting ? 'Logging Data...' : 'Submit Social Log'}
              </button>
            </form>
          )}

          {/* GOVERNANCE FORM */}
          {entryMode === 'G' && (
            <form onSubmit={handleGovSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Organization</label>
                <select required value={govFormData.organization_id} onChange={(e) => setGovFormData({...govFormData, organization_id: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}>
                  <option value="">-- Select Organization --</option>
                  {organizations.map(org => (<option key={org.unit_id} value={org.unit_id}>{org.name}</option>))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Governance Metric Focus</label>
                <select required value={govFormData.metric_name} onChange={(e) => {
                    const selectedMetric = metrics.find(m => m.name === e.target.value);
                    setGovFormData({ ...govFormData, metric_name: selectedMetric?.name || '', unit_of_measure: selectedMetric?.unit_of_measure || '' });
                  }} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}>
                  <option value="">-- Select Dynamic Metric --</option>
                  {metrics.filter(metric => metric.pillar === 'G').map(metric => (
                    <option key={metric.metric_id} value={metric.name}>{metric.name} {metric.unit_of_measure ? `(${metric.unit_of_measure})` : ''}</option>
                  ))}
                </select>
              </div>

              <EvidenceAttachmentUI formType="gov" onExtract={(extractedValue) => setGovFormData({ ...govFormData, numeric_value: extractedValue })} />

              {govFormData.metric_name && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Result / Value {govFormData.unit_of_measure ? `(${govFormData.unit_of_measure})` : ''}</label>
                  {govFormData.unit_of_measure === 'Status' ? (
                    <select required onChange={(e) => setGovFormData({...govFormData, text_value: e.target.value, numeric_value: e.target.value === 'Pass' ? 100 : 0})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}>
                      <option value="">Select Status...</option>
                      <option value="Pass">Pass / Completed</option>
                      <option value="Fail">Fail / Incomplete</option>
                    </select>
                  ) : (
                    <input type="number" required min="0" max="100" placeholder="e.g., 45" value={govFormData.numeric_value} onChange={(e) => setGovFormData({...govFormData, numeric_value: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
                  )}
                </div>
              )}

              <button type="submit" disabled={isSubmitting || !govFormData.metric_name} style={{ background: (isSubmitting || !govFormData.metric_name) ? '#6c757d' : '#e65100', color: 'white', padding: '12px 20px', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: (isSubmitting || !govFormData.metric_name) ? 'not-allowed' : 'pointer', marginTop: '10px' }}>
                {isSubmitting ? 'Logging Data...' : 'Submit Governance Log'}
              </button>
            </form>
          )}
        </div>
    );
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '40px' }}>
      
      {/* SECTOR SIMULATOR TOGGLE */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        <div style={{ background: '#e2e8f0', padding: '6px', borderRadius: '8px', display: 'flex', gap: '4px' }}>
          <button onClick={() => setUserSector('Banking')} style={{ background: userSector === 'Banking' ? 'white' : 'transparent', color: userSector === 'Banking' ? '#0f172a' : '#64748b', border: 'none', padding: '6px 12px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', boxShadow: userSector === 'Banking' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none' }}>
            🏦 Banking View
          </button>
          <button onClick={() => setUserSector('Generic')} style={{ background: userSector === 'Generic' ? 'white' : 'transparent', color: userSector === 'Generic' ? '#0f172a' : '#64748b', border: 'none', padding: '6px 12px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', boxShadow: userSector === 'Generic' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none' }}>
            🏭 Generic View
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ color: '#212529', margin: '0 0 8px 0' }}>Data Ingestion Portal</h1>
        <p style={{ margin: 0, color: '#6b7280' }}>
            Your workspace is currently configured for the <strong style={{ color: '#2563eb' }}>{userSector}</strong> sector.
        </p>
      </div>
      
      {error && <p style={{ color: '#dc3545', background: '#f8d7da', padding: '15px', borderRadius: '4px', fontWeight: 'bold' }}>{error}</p>}
      {successMsg && <p style={{ color: '#0f5132', background: '#d1e7dd', padding: '15px', borderRadius: '4px', fontWeight: 'bold' }}>{successMsg}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '40px' }}>
        
        {/* DYNAMIC ROUTING RENDERER */}
        {renderSectorForm()}

        {/* Bulk CSV Upload Card */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b', margin: '0 0 8px 0' }}>Bulk CSV Upload</h3>
                <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
                    Upload your raw facility data. The engine will automatically compile it and route it to the auditor queue.
                </p>
            </div>

            {/* Data Schema Guide */}
            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '16px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155', margin: '0 0 8px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Required Columns:
                    <a 
                        href="/esg_data_template.csv" 
                        download
                        style={{ fontSize: '0.75rem', color: '#2563eb', textDecoration: 'underline', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                        Download Template
                    </a>
                </h4>
                <ul style={{ fontSize: '0.75rem', color: '#475569', margin: 0, paddingLeft: '20px', fontFamily: 'monospace', lineHeight: '1.6', textAlign: 'left' }}>
                    <li><span style={{ fontWeight: 'bold', color: '#1e293b' }}>organization_name</span> (e.g., Accra Branch)</li>
                    <li><span style={{ fontWeight: 'bold', color: '#1e293b' }}>pillar</span> (E, S, G, or F)</li>
                    <li><span style={{ fontWeight: 'bold', color: '#1e293b' }}>activity_type</span> (e.g., electricity_grid_kwh)</li>
                    <li><span style={{ fontWeight: 'bold', color: '#1e293b' }}>raw_amount</span> (Numbers only)</li>
                    <li><span style={{ fontWeight: 'bold', color: '#1e293b' }}>unit</span> (e.g., liters, GHC)</li>
                </ul>
            </div>

            {/* Upload Button Area */}
            <div style={{ marginTop: 'auto' }}>
                <label style={{ display: 'flex', width: '100%', cursor: 'pointer', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', border: '2px dashed #93c5fd', background: '#eff6ff', padding: '24px', boxSizing: 'border-box', transition: 'all 0.2s' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ margin: '0 auto 8px auto', display: 'inline-flex', height: '40px', width: '40px', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: '#dbeafe' }}>
                            <svg style={{ height: '24px', width: '24px', color: '#2563eb' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                        </div>
                        <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155', margin: '0 0 4px 0' }}>Click to Select CSV File</div>
                        <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>CSV files up to 10MB</p>
                    </div>
                    <input id="file-upload" type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileUpload} />
                </label>
                
                {/* Upload Status Messages */}
                {isSubmitting && <p style={{ fontSize: '0.875rem', color: '#2563eb', marginTop: '10px', textAlign: 'center', fontWeight: 'bold' }}>⏳ Processing CSV...</p>}
                {uploadSuccess && <p style={{ fontSize: '0.85rem', color: '#0f5132', background: '#d1e7dd', padding: '10px', borderRadius: '4px', marginTop: '10px', textAlign: 'center' }}>{uploadSuccess}</p>}
                {uploadErrors.length > 0 && (
                    <div style={{ background: '#f8d7da', padding: '10px', borderRadius: '4px', marginTop: '10px' }}>
                        <p style={{ color: '#842029', fontSize: '0.85rem', fontWeight: 'bold', margin: '0 0 5px 0' }}>Upload Errors:</p>
                        <ul style={{ color: '#842029', fontSize: '0.75rem', margin: 0, paddingLeft: '15px' }}>
                            {uploadErrors.map((err, idx) => <li key={idx}>{err}</li>)}
                        </ul>
                    </div>
                )}
            </div>
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