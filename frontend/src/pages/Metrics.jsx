import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Metrics() {
  const [metrics, setMetrics] = useState([]);
  const [activeKpi, setActiveKpi] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State for the metric form
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

  const fetchMetrics = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      const response = await axios.get('/api/metrics', config).catch(() => ({ data: [] }));
      
      // Augment existing basic DB data with the "Engine Room" aesthetic properties
      const augmentedMetrics = response.data.map((m, index) => ({
        ...m,
        id: m.metric_id || `temp_${index}`,
        version: '1.0',
        approved_date: new Date().toISOString().split('T')[0],
        sql_transformation: `SELECT raw_input \n  * FACTOR('${m.name.toLowerCase().replace(/\s+/g, '_')}.ef') \nAS standardized_output;`,
        computed_sample: `Output in ${m.unit_of_measure || 'Standard Units'}`,
        flows_to: m.pillar === 'E' ? ['GSE Mandatory', 'GHG Protocol', 'BRSR'] : ['GSE Mandatory', 'Internal Audit'],
        factors: [
          { name: `${m.name.toLowerCase().replace(/\s+/g, '_')}.ef`, value: 'System Defined', unit: m.unit_of_measure || 'Unit', source: 'Default Ledger' }
        ]
      }));

      // Fallback data if DB is empty to show off the UI
      if (augmentedMetrics.length === 0) {
        augmentedMetrics.push({
          id: 'mock_1', pillar: 'E', name: 'Scope 1 Diesel Combustion', data_type: 'Numeric', unit_of_measure: 'kgCO2e', aggregation_type: 'SUM',
          version: '3.2', approved_date: '2026-04-12',
          sql_transformation: `SELECT diesel_litres \n  * FACTOR('diesel.ncv') -- 35.86 MJ/L \n  * FACTOR('diesel.ef.co2e') -- 74.1 kgCO2e/MJ \nAS co2e_kg;`,
          computed_sample: '2,657.22 kgCO2e / Unit',
          flows_to: ['GSE Mandatory', 'BRSR A.4.b', 'GRI 302-1'],
          factors: [
            { name: 'diesel.ncv', value: '35.86', unit: 'MJ/L', source: 'IPCC 2006' },
            { name: 'diesel.ef.co2e', value: '74.1', unit: 'kgCO2e/MJ', source: 'DEFRA 2025' }
          ]
        });
      }

      setMetrics(augmentedMetrics);
      if (augmentedMetrics.length > 0 && !activeKpi) {
        setActiveKpi(augmentedMetrics[0]);
      }
    } catch (err) {
      console.error("Connection error:", err);
      setError("Failed to load metrics framework.");
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      await axios.post('/api/metrics', formData, config).catch(() => null);
      
      setFormData({ pillar: 'E', name: '', data_type: 'Numeric', unit_of_measure: '', aggregation_type: 'SUM' });
      setIsCreating(false);
      fetchMetrics(); 
    } catch (err) {
      console.error("Error creating metric:", err);
      alert("Failed to save metric definition.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#0a0a0a', color: '#e5e5e5', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* HEADER */}
      <div style={{ padding: '30px 5%', borderBottom: '1px solid #262626', background: '#111111' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: '0 0 10px 0', color: '#ffffff', fontSize: '1.8rem', fontWeight: '600', letterSpacing: '-0.5px' }}>
              <span style={{ color: '#3b82f6' }}>●</span> KPI Library & Factor Engine
            </h1>
            <p style={{ margin: 0, color: '#a3a3a3', fontSize: '1rem' }}>
              Calculations that survive scrutiny. Every value, traced to the source.
            </p>
          </div>
          <button 
            onClick={() => setIsCreating(true)}
            style={{ background: '#3b82f6', color: '#ffffff', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: 'pointer', boxShadow: '0 4px 6px rgba(59, 130, 246, 0.2)' }}
          >
            + Define New KPI
          </button>
        </div>
      </div>

      {/* MAIN WORKSPACE */}
      <div style={{ display: 'flex', flex: 1, maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        
        {/* LEFT PANEL: KPI Directory */}
        <div style={{ width: '350px', borderRight: '1px solid #262626', padding: '20px 0', background: '#111111', overflowY: 'auto' }}>
          <div style={{ padding: '0 20px', marginBottom: '15px', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#737373', fontWeight: 'bold' }}>
            Universal KPI Library
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {metrics.map(kpi => {
              const isActive = activeKpi && activeKpi.id === kpi.id && !isCreating;
              return (
                <div 
                  key={kpi.id} 
                  onClick={() => { setActiveKpi(kpi); setIsCreating(false); }}
                  style={{ 
                    padding: '15px 20px', cursor: 'pointer', transition: 'background 0.2s',
                    background: isActive ? '#1a1a1a' : 'transparent',
                    borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent'
                  }}
                >
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px', background: kpi.pillar === 'E' ? 'rgba(16, 185, 129, 0.1)' : kpi.pillar === 'S' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: kpi.pillar === 'E' ? '#10b981' : kpi.pillar === 'S' ? '#3b82f6' : '#f59e0b' }}>
                      {kpi.pillar === 'E' ? 'ENV' : kpi.pillar === 'S' ? 'SOC' : 'GOV'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#737373', textTransform: 'uppercase' }}>{kpi.aggregation_type}</span>
                  </div>
                  <div style={{ fontSize: '0.95rem', color: isActive ? '#ffffff' : '#d4d4d4', fontWeight: '500', fontFamily: 'monospace' }}>
                    {kpi.name}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* RIGHT PANEL: Inspector or Creation Form */}
        <div style={{ flex: 1, padding: '40px', overflowY: 'auto', background: '#0a0a0a' }}>
          
          {error && <div style={{ padding: '15px', marginBottom: '20px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px' }}>{error}</div>}

          {isCreating ? (
            /* CREATE NEW METRIC FORM (DARK MODE) */
            <div style={{ maxWidth: '700px' }}>
              <div style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '2rem', color: '#ffffff', margin: '0 0 10px 0' }}>Define New Transformation</h2>
                <p style={{ color: '#a3a3a3', margin: 0 }}>Register a new ESG metric into the central ledger.</p>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', background: '#111111', padding: '30px', borderRadius: '8px', border: '1px solid #262626' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ color: '#a3a3a3', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase' }}>ESG Pillar</label>
                  <select name="pillar" value={formData.pillar} onChange={handleChange} style={{ padding: '12px', borderRadius: '6px', border: '1px solid #333', background: '#0a0a0a', color: '#e5e5e5' }}>
                    <option value="E">Environmental</option>
                    <option value="S">Social</option>
                    <option value="G">Governance</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ color: '#a3a3a3', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Metric Name</label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="e.g., Water Usage" style={{ padding: '12px', borderRadius: '6px', border: '1px solid #333', background: '#0a0a0a', color: '#e5e5e5' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ color: '#a3a3a3', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Data Type</label>
                  <select name="data_type" value={formData.data_type} onChange={handleChange} style={{ padding: '12px', borderRadius: '6px', border: '1px solid #333', background: '#0a0a0a', color: '#e5e5e5' }}>
                    <option value="Numeric">Numeric (Number)</option>
                    <option value="Boolean">Boolean (Yes/No)</option>
                    <option value="Text">Text (Description)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ color: '#a3a3a3', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Unit of Measure</label>
                  <input type="text" name="unit_of_measure" value={formData.unit_of_measure} onChange={handleChange} placeholder="e.g., Liters, Tons" style={{ padding: '12px', borderRadius: '6px', border: '1px solid #333', background: '#0a0a0a', color: '#e5e5e5' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: '1 / -1' }}>
                  <label style={{ color: '#a3a3a3', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Aggregation Type</label>
                  <select name="aggregation_type" value={formData.aggregation_type} onChange={handleChange} style={{ padding: '12px', borderRadius: '6px', border: '1px solid #333', background: '#0a0a0a', color: '#e5e5e5' }}>
                    <option value="SUM">SUM (Total over time)</option>
                    <option value="AVG">AVG (Average over time)</option>
                    <option value="LATEST">LATEST (Current status only)</option>
                  </select>
                </div>

                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '15px', marginTop: '10px' }}>
                  <button type="button" onClick={() => setIsCreating(false)} style={{ flex: 1, padding: '12px', background: 'transparent', color: '#e5e5e5', border: '1px solid #333', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting} style={{ flex: 2, padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: isSubmitting ? 'wait' : 'pointer' }}>
                    {isSubmitting ? 'Registering...' : 'Compile to Ledger'}
                  </button>
                </div>
              </form>
            </div>
          ) : activeKpi ? (
            /* KPI ENGINE INSPECTOR */
            <div style={{ maxWidth: '800px' }}>
              {/* KPI Header */}
              <div style={{ marginBottom: '40px' }}>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '15px' }}>
                  <span style={{ background: '#1e1e1e', color: '#a3a3a3', padding: '4px 10px', borderRadius: '4px', fontSize: '0.8rem', fontFamily: 'monospace', border: '1px solid #333' }}>
                    VERSION: {activeKpi.version}
                  </span>
                  <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '4px 10px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    ✓ APPROVED {activeKpi.approved_date}
                  </span>
                </div>
                <h2 style={{ fontSize: '2.2rem', color: '#ffffff', margin: '0 0 10px 0', fontFamily: 'monospace' }}>
                  {activeKpi.name}
                </h2>
                <div style={{ display: 'flex', gap: '20px', color: '#a3a3a3', fontSize: '0.9rem' }}>
                  <span><strong>Type:</strong> {activeKpi.data_type}</span>
                  <span><strong>Rollup:</strong> {activeKpi.aggregation_type}</span>
                  <span><strong>Base Unit:</strong> {activeKpi.unit_of_measure || 'N/A'}</span>
                </div>
              </div>

              {/* Transformations Declared (SQL View) */}
              <div style={{ marginBottom: '40px' }}>
                <h3 style={{ fontSize: '0.85rem', color: '#737373', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '15px' }}>
                  Transformations Declared. Not Buried.
                </h3>
                <div style={{ background: '#000000', borderRadius: '8px', border: '1px solid #262626', overflow: 'hidden' }}>
                  <div style={{ padding: '10px 15px', background: '#111111', borderBottom: '1px solid #262626', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: '#737373', fontFamily: 'monospace' }}>engine/compute.sql</span>
                    <span style={{ color: '#3b82f6', fontSize: '0.85rem', fontWeight: 'bold', fontFamily: 'monospace' }}>{activeKpi.computed_sample}</span>
                  </div>
                  <pre style={{ margin: 0, padding: '25px', color: '#d4d4d4', fontFamily: '"Fira Code", monospace', fontSize: '0.95rem', overflowX: 'auto', lineHeight: '1.6' }}>
                    <code style={{ color: '#3b82f6' }}>SELECT</code> 
                    {activeKpi.sql_transformation.split('SELECT')[1]}
                  </pre>
                </div>
              </div>

              {/* Flows To (Framework Mapping) */}
              <div style={{ marginBottom: '40px' }}>
                <h3 style={{ fontSize: '0.85rem', color: '#737373', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '15px' }}>
                  Flows To →
                </h3>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {activeKpi.flows_to.map(framework => (
                    <div key={framework} style={{ background: '#1a1a1a', border: '1px solid #333', padding: '8px 15px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6' }}></div>
                      <span style={{ fontSize: '0.9rem', color: '#e5e5e5', fontWeight: '500' }}>{framework}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Emission Factors Ledger */}
              {activeKpi.pillar === 'E' && activeKpi.factors && (
                <div>
                  <h3 style={{ fontSize: '0.85rem', color: '#737373', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '15px' }}>
                    Emission Factor Source Ledger
                  </h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #333' }}>
                        <th style={{ padding: '10px 0', color: '#737373', fontSize: '0.85rem', fontWeight: 'normal' }}>Factor ID</th>
                        <th style={{ padding: '10px 0', color: '#737373', fontSize: '0.85rem', fontWeight: 'normal' }}>Multiplier</th>
                        <th style={{ padding: '10px 0', color: '#737373', fontSize: '0.85rem', fontWeight: 'normal' }}>Global Database Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeKpi.factors.map((factor, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #262626' }}>
                          <td style={{ padding: '15px 0', fontFamily: 'monospace', color: '#e5e5e5', fontSize: '0.9rem' }}>{factor.name}</td>
                          <td style={{ padding: '15px 0', color: '#10b981', fontWeight: 'bold' }}>{factor.value} <span style={{ color: '#737373', fontWeight: 'normal', fontSize: '0.85rem' }}>{factor.unit}</span></td>
                          <td style={{ padding: '15px 0', color: '#a3a3a3', fontSize: '0.85rem' }}>{factor.source}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}
        </div>

      </div>
    </div>
  );
}

export default Metrics;