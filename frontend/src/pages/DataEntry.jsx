import { useState, useEffect } from 'react';
import axios from 'axios';

function DataEntry() {
  const [organizations, setOrganizations] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [observations, setObservations] = useState([]);
  const [error, setError] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    unit_id: '',
    metric_id: '',
    numeric_value: '',
    text_value: ''
  });

  // Load all required data when the page opens
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      // We can fetch all three datasets at the same time for speed
      const [orgRes, metricRes, obsRes] = await Promise.all([
        axios.get('/api/organizations'),
        axios.get('/api/metrics'),
        axios.get('/api/observations')
      ]);
      
      setOrganizations(orgRes.data);
      setMetrics(metricRes.data);
      setObservations(obsRes.data);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load data. Ensure you are logged in.");
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // 1. Clean the payload before sending it to PostgreSQL
      const cleanPayload = {
        unit_id: formData.unit_id,
        metric_id: formData.metric_id,
        // If the number box is empty, send 'null' instead of an empty string
        numeric_value: formData.numeric_value === '' ? null : Number(formData.numeric_value),
        // If the text box is empty, send 'null' instead of an empty string
        text_value: formData.text_value === '' ? null : formData.text_value
      };

      // 2. Send the cleaned payload
      await axios.post('/api/observations', cleanPayload);
      
      // 3. Clear the input values but keep the selected Org and Metric for fast entry
      setFormData({ ...formData, numeric_value: '', text_value: '' });
      
      // 4. Refresh the ledger
      fetchAllData();
    } catch (err) {
      console.error("Error logging observation:", err);
      alert("Failed to save observation.");
    }
  };

  // Find the currently selected metric so we know whether to show a Number or Text input
  const selectedMetric = metrics.find(m => m.metric_id === formData.metric_id);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '40px' }}>
      <h1 style={{ marginBottom: '30px', color: '#212529' }}>Data Entry & Ledger</h1>
      
      {error && <p style={{ color: '#dc3545', background: '#f8d7da', padding: '10px', borderRadius: '4px' }}>{error}</p>}

      {/* --- DATA ENTRY FORM --- */}
      <div style={{ background: '#f8f9fa', padding: '25px', borderRadius: '8px', border: '1px solid #dee2e6', marginBottom: '40px' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.2rem', color: '#495057' }}>Log New Observation</h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          
          {/* Organization Dropdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Organization Unit</label>
            <select name="unit_id" value={formData.unit_id} onChange={handleChange} required style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}>
              <option value="">-- Select Organization --</option>
              {organizations.map(org => (
                <option key={org.unit_id} value={org.unit_id}>{org.name} ({org.jurisdiction})</option>
              ))}
            </select>
          </div>

          {/* Metric Dropdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>ESG Metric</label>
            <select name="metric_id" value={formData.metric_id} onChange={handleChange} required style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}>
              <option value="">-- Select Metric --</option>
              {metrics.map(metric => (
                <option key={metric.metric_id} value={metric.metric_id}>{metric.name} [{metric.pillar}]</option>
              ))}
            </select>
          </div>

          {/* Dynamic Input: Only show if a metric is selected */}
          {selectedMetric && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', gridColumn: 'span 2' }}>
              <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                Value recorded in {selectedMetric.unit_of_measure || 'Standard Format'}
              </label>
              
              {selectedMetric.data_type === 'Numeric' ? (
                <input 
                  type="number" 
                  step="any" 
                  name="numeric_value" 
                  placeholder={`Enter number (${selectedMetric.unit_of_measure})`} 
                  value={formData.numeric_value} 
                  onChange={handleChange} 
                  required 
                  style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              ) : selectedMetric.data_type === 'Boolean' ? (
                <select name="text_value" value={formData.text_value} onChange={handleChange} required style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}>
                  <option value="">-- Select Yes/No --</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              ) : (
                <textarea 
                  name="text_value" 
                  placeholder="Enter descriptive text..." 
                  value={formData.text_value} 
                  onChange={handleChange} 
                  required 
                  style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', minHeight: '80px' }}
                />
              )}
            </div>
          )}

          <div style={{ gridColumn: 'span 2' }}>
            <button type="submit" disabled={!formData.unit_id || !formData.metric_id} style={{ padding: '12px 20px', background: '#198754', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}>
              Securely Log Data
            </button>
          </div>
        </form>
      </div>

      {/* --- IMMUTABLE LEDGER --- */}
      <h2 style={{ fontSize: '1.2rem', color: '#495057', borderBottom: '2px solid #dee2e6', paddingBottom: '10px' }}>
        Recent Observations
      </h2>
      
      {observations.length === 0 ? (
        <p style={{ color: '#6c757d' }}>No data logged yet.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <thead>
              <tr style={{ background: '#f1f3f5', textAlign: 'left' }}>
                <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6' }}>Date/Time</th>
                <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6' }}>Organization</th>
                <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6' }}>Pillar</th>
                <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6' }}>Metric</th>
                <th style={{ padding: '12px', borderBottom: '2px solid #dee2e6' }}>Value</th>
              </tr>
            </thead>
            <tbody>
              {observations.map((obs) => (
                <tr key={obs.observation_id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px', color: '#6c757d', fontSize: '0.9rem' }}>
                    {new Date(obs.timestamp).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px', fontWeight: '500' }}>{obs.organization_name}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ 
                      background: obs.pillar === 'E' ? '#e8f5e9' : obs.pillar === 'S' ? '#e3f2fd' : '#fff3e0',
                      color: obs.pillar === 'E' ? '#2e7d32' : obs.pillar === 'S' ? '#1565c0' : '#e65100',
                      padding: '3px 6px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold'
                    }}>
                      {obs.pillar}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>{obs.metric_name}</td>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>
                    {obs.numeric_value !== null ? `${obs.numeric_value} ${obs.unit_of_measure}` : obs.text_value}
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