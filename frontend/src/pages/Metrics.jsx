import { useState, useEffect } from 'react';
import axios from 'axios';

function Metrics() {
  const [metrics, setMetrics] = useState([]);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    pillar: 'E',
    name: '',
    data_type: 'Numeric',
    unit_of_measure: '',
    aggregation_type: 'SUM'
  });

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = () => {
    axios.get('http://localhost:5000/api/metrics')
      .then(response => setMetrics(response.data))
      .catch(err => {
        console.error("Error fetching metrics:", err);
        setError("Failed to load metrics from server.");
      });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    axios.post('http://localhost:5000/api/metrics', formData)
      .then(() => {
        setFormData({ pillar: 'E', name: '', data_type: 'Numeric', unit_of_measure: '', aggregation_type: 'SUM' });
        fetchMetrics();
      })
      .catch(err => {
        console.error("Error creating metric:", err);
        alert("Failed to create metric configuration.");
      });
  };

  return (
    <div>
      <h2>ESG Metric Definitions</h2>
      
      {/* Form */}
      <div style={{ background: '#f3e5f5', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
        <h3 style={{ marginTop: 0 }}>Define New Metric</h3>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Pillar</label>
            <select name="pillar" value={formData.pillar} onChange={handleChange} style={{ padding: '8px', width: '100%' }}>
              <option value="E">E (Environmental)</option>
              <option value="S">S (Social)</option>
              <option value="G">G (Governance)</option>
            </select>
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Metric Name</label>
            <input type="text" name="name" placeholder="e.g., Water Consumption" value={formData.name} onChange={handleChange} required style={{ padding: '8px', width: '100%', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Data Type</label>
            <select name="data_type" value={formData.data_type} onChange={handleChange} style={{ padding: '8px', width: '100%' }}>
              <option value="Numeric">Numeric</option>
              <option value="Boolean">Boolean</option>
              <option value="Text">Text</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Unit of Measure</label>
            <input type="text" name="unit_of_measure" placeholder="e.g., m³, kWh, Count" value={formData.unit_of_measure} onChange={handleChange} style={{ padding: '8px', width: '100%', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Aggregation</label>
            <select name="aggregation_type" value={formData.aggregation_type} onChange={handleChange} style={{ padding: '8px', width: '100%' }}>
              <option value="SUM">SUM</option>
              <option value="AVG">AVG</option>
              <option value="LATEST">LATEST</option>
            </select>
          </div>

          <button type="submit" style={{ padding: '10px', background: '#9c27b0', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            Add Parameter
          </button>
        </form>
      </div>

      {/* Metrics Display */}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left', background: '#f5f5f5' }}>
            <th style={{ padding: '12px' }}>Pillar</th>
            <th style={{ padding: '12px' }}>Metric Name</th>
            <th style={{ padding: '12px' }}>Data Type</th>
            <th style={{ padding: '12px' }}>Unit</th>
            <th style={{ padding: '12px' }}>Aggregation Type</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((metric) => (
            <tr key={metric.metric_id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '12px' }}>
                <span style={{ 
                  padding: '4px 8px', 
                  borderRadius: '4px', 
                  fontWeight: 'bold',
                  color: 'white',
                  background: metric.pillar === 'E' ? '#4caf50' : metric.pillar === 'S' ? '#2196f3' : '#ff9800'
                }}>
                  {metric.pillar}
                </span>
              </td>
              <td style={{ padding: '12px', fontWeight: '500' }}>{metric.name}</td>
              <td style={{ padding: '12px', color: '#666' }}>{metric.data_type}</td>
              <td style={{ padding: '12px' }}>{metric.unit_of_measure || 'N/A'}</td>
              <td style={{ padding: '12px', color: '#666' }}><kbd>{metric.aggregation_type}</kbd></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Metrics;