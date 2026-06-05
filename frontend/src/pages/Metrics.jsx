import { useState, useEffect } from 'react';
import axios from 'axios';

function Metrics() {
  const [metrics, setMetrics] = useState([]);
  const [error, setError] = useState('');
  
  // State for the new metric form (defaulting to Environmental/Numeric/SUM)
  const [formData, setFormData] = useState({
    pillar: 'E',
    name: '',
    data_type: 'Numeric',
    unit_of_measure: '',
    aggregation_type: 'SUM'
  });

  // Fetch existing metrics when the page loads
  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      // Note: We don't need to manually send the token here! 
      // Our interceptor in main.jsx does it automatically for every request.
      const response = await axios.get('/api/metrics');
      setMetrics(response.data);
    } catch (err) {
      console.error("Connection error:", err);
      setError("Failed to load metrics. Check console for details.");
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/metrics', formData);
      
      // Reset the form fields after successful save
      setFormData({ 
        pillar: 'E', 
        name: '', 
        data_type: 'Numeric', 
        unit_of_measure: '', 
        aggregation_type: 'SUM' 
      });
      
      // Refresh the list to show the newly added metric
      fetchMetrics(); 
    } catch (err) {
      console.error("Error creating metric:", err);
      alert("Failed to save metric. Ensure you are logged in and the server is running.");
    }
  };

  // Helper function to color-code the pillars visually
  const getPillarStyle = (pillar) => {
    if (pillar === 'E') return { bg: '#e8f5e9', text: '#2e7d32', label: 'Environmental' };
    if (pillar === 'S') return { bg: '#e3f2fd', text: '#1565c0', label: 'Social' };
    if (pillar === 'G') return { bg: '#fff3e0', text: '#e65100', label: 'Governance' };
    return { bg: '#eee', text: '#333', label: 'Unknown' };
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '30px', color: '#212529' }}>Metrics Configuration</h1>
      
      {/* --- ADD METRIC FORM --- */}
      <div style={{ background: '#f8f9fa', padding: '25px', borderRadius: '8px', border: '1px solid #dee2e6', marginBottom: '40px' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.2rem', color: '#495057' }}>Define New ESG Metric</h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>ESG Pillar</label>
            <select name="pillar" value={formData.pillar} onChange={handleChange} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}>
              <option value="E">Environmental</option>
              <option value="S">Social</option>
              <option value="G">Governance</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Metric Name</label>
            <input 
              type="text" 
              name="name" 
              placeholder="e.g., Scope 1 Emissions" 
              value={formData.name} 
              onChange={handleChange} 
              required 
              style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Data Type</label>
            <select name="data_type" value={formData.data_type} onChange={handleChange} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}>
              <option value="Numeric">Numeric (Number)</option>
              <option value="Boolean">Boolean (Yes/No)</option>
              <option value="Text">Text (Description)</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Unit of Measure</label>
            <input 
              type="text" 
              name="unit_of_measure" 
              placeholder="e.g., Metric Tons, %, Count" 
              value={formData.unit_of_measure} 
              onChange={handleChange} 
              style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Aggregation Type</label>
            <select name="aggregation_type" value={formData.aggregation_type} onChange={handleChange} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}>
              <option value="SUM">SUM (Total over time)</option>
              <option value="AVG">AVG (Average over time)</option>
              <option value="LATEST">LATEST (Current status only)</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button type="submit" style={{ width: '100%', padding: '10px', background: '#0d6efd', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
              + Save Metric Definition
            </button>
          </div>
        </form>
      </div>

      {/* --- METRICS LEDGER --- */}
      <h2 style={{ fontSize: '1.2rem', color: '#495057', borderBottom: '2px solid #dee2e6', paddingBottom: '10px' }}>
        Active Metric Library
      </h2>
      
      {error && <p style={{ color: '#dc3545', background: '#f8d7da', padding: '10px', borderRadius: '4px' }}>{error}</p>}
      
      {metrics.length === 0 && !error ? (
        <p style={{ color: '#6c757d' }}>No metrics defined yet. Use the form above to add your first ESG metric.</p>
      ) : (
        <div style={{ display: 'grid', gap: '15px', marginTop: '20px' }}>
          {metrics.map((metric) => {
            const theme = getPillarStyle(metric.pillar);
            return (
              <div key={metric.metric_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', border: '1px solid #e0e0e0', padding: '15px 20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ background: theme.bg, color: theme.text, padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                      {theme.label}
                    </span>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#212529' }}>{metric.name}</h3>
                  </div>
                  <p style={{ margin: 0, color: '#6c757d', fontSize: '0.9rem' }}>
                    <strong>Type:</strong> {metric.data_type} | <strong>Unit:</strong> {metric.unit_of_measure || 'N/A'} | <strong>Rollup:</strong> {metric.aggregation_type}
                  </p>
                </div>

              </div>
            )
          })}
        </div>
      )}
    </div>
  );
}

export default Metrics;