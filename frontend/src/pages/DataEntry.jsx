import { useState, useEffect } from 'react';
import axios from 'axios';

function DataEntry() {
  const [organizations, setOrganizations] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [observations, setObservations] = useState([]);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    unit_id: '',
    metric_id: '',
    numeric_value: '',
    text_value: ''
  });

  // Fetch all required data when the page loads
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const orgRes = await axios.get('http://localhost:5000/api/organizations');
      const metricRes = await axios.get('http://localhost:5000/api/metrics');
      const obsRes = await axios.get('http://localhost:5000/api/observations');
      
      setOrganizations(orgRes.data);
      setMetrics(metricRes.data);
      setObservations(obsRes.data);

      // Auto-populate the dropdowns with the first available option
      if (orgRes.data.length > 0 && metricRes.data.length > 0) {
        setFormData(prev => ({
          ...prev,
          unit_id: orgRes.data[0].unit_id,
          metric_id: metricRes.data[0].metric_id
        }));
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load platform data.");
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/observations', formData);
      // Clear values but keep the selected org/metric for easy bulk entry
      setFormData({ ...formData, numeric_value: '', text_value: '' });
      // Refresh the ledger
      const obsRes = await axios.get('http://localhost:5000/api/observations');
      setObservations(obsRes.data);
    } catch (err) {
      console.error("Error logging observation:", err);
      alert("Failed to log data.");
    }
  };

  return (
    <div>
      <h2>Log ESG Data</h2>
      
      {/* Form */}
      <div style={{ background: '#e8f5e9', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
        <h3 style={{ marginTop: 0 }}>New Observation</h3>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Organization Unit</label>
            <select name="unit_id" value={formData.unit_id} onChange={handleChange} required style={{ padding: '10px', width: '100%', borderRadius: '4px', border: '1px solid #ccc' }}>
              {organizations.map(org => (
                <option key={org.unit_id} value={org.unit_id}>{org.name} ({org.unit_type})</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Metric</label>
            <select name="metric_id" value={formData.metric_id} onChange={handleChange} required style={{ padding: '10px', width: '100%', borderRadius: '4px', border: '1px solid #ccc' }}>
              {metrics.map(m => (
                <option key={m.metric_id} value={m.metric_id}>[{m.pillar}] {m.name} ({m.unit_of_measure})</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Numeric Value</label>
            <input type="number" step="any" name="numeric_value" value={formData.numeric_value} onChange={handleChange} placeholder="e.g., 150.5" required style={{ padding: '10px', width: '100%', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Notes (Optional)</label>
            <input type="text" name="text_value" value={formData.text_value} onChange={handleChange} placeholder="e.g., Q2 Audit Estimate" style={{ padding: '10px', width: '100%', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }} />
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <button type="submit" style={{ padding: '12px 24px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}>
              Submit Data Log
            </button>
          </div>
        </form>
      </div>

      {/* Ledger Display */}
      <h2>Observation Ledger</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', fontSize: '0.95rem' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left', background: '#f5f5f5' }}>
            <th style={{ padding: '12px' }}>Date</th>
            <th style={{ padding: '12px' }}>Organization</th>
            <th style={{ padding: '12px' }}>Pillar</th>
            <th style={{ padding: '12px' }}>Metric</th>
            <th style={{ padding: '12px' }}>Value</th>
          </tr>
        </thead>
        <tbody>
          {observations.map((obs) => (
            <tr key={obs.observation_id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '12px', color: '#666' }}>{new Date(obs.timestamp).toLocaleDateString()}</td>
              <td style={{ padding: '12px', fontWeight: '500' }}>{obs.organization_name}</td>
              <td style={{ padding: '12px' }}>
                <span style={{ padding: '2px 6px', borderRadius: '4px', color: 'white', background: obs.pillar === 'E' ? '#4caf50' : obs.pillar === 'S' ? '#2196f3' : '#ff9800', fontSize: '0.8rem', fontWeight: 'bold' }}>
                  {obs.pillar}
                </span>
              </td>
              <td style={{ padding: '12px' }}>{obs.metric_name}</td>
              <td style={{ padding: '12px', fontWeight: 'bold', color: '#2e7d32' }}>
                {obs.numeric_value} <span style={{ fontWeight: 'normal', color: '#666', fontSize: '0.85rem' }}>{obs.unit_of_measure}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DataEntry;