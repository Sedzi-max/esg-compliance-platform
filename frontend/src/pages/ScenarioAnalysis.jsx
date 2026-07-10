import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ScenarioAnalysis() {
  const [scenarios, setScenarios] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    assessment_year: new Date().getFullYear(),
    scenario_name: '',
    time_horizon: 'Short-Term',
    physical_risk_impact: '',
    transition_risk_impact: '',
    projected_financial_impact_ghs: '',
    mitigation_strategy: ''
  });

  // 1. Fetch existing scenarios on load
  const fetchScenarios = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/scenarios', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setScenarios(res.data);
    } catch (error) {
      console.error("Failed to fetch scenarios:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchScenarios();
  }, []);

  // 2. Handle Form Input Changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 3. Submit New Scenario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/scenarios', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert("✅ Scenario Analysis Logged Successfully!");
      setShowModal(false);
      
      // Reset form
      setFormData({
        assessment_year: new Date().getFullYear(),
        scenario_name: '',
        time_horizon: 'Short-Term',
        physical_risk_impact: '',
        transition_risk_impact: '',
        projected_financial_impact_ghs: '',
        mitigation_strategy: ''
      });
      
      // Refresh the table
      fetchScenarios();
      
    } catch (error) {
      console.error("Submit error:", error);
      alert(error.response?.data?.error || "Failed to save scenario.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '25px', background: '#f8f9fa', minHeight: '100vh' }}>
      
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #dee2e6', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <div>
          <h2 style={{ marginTop: 0, color: '#212529', display: 'flex', alignItems: 'center', gap: '10px' }}>
            🌍 Climate Scenario Analysis & Stress Testing
          </h2>
          <p style={{ color: '#6c757d', margin: 0, maxWidth: '800px' }}>
            Fulfill NIC guidelines by forecasting forward-looking physical and transitional climate risks to your underwriting and investment portfolios.
          </p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          style={{ background: '#0d6efd', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          + Log New Stress Test
        </button>
      </div>

      {/* DATA TABLE SECTION */}
      <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #dee2e6', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: '#f1f3f5', color: '#495057', fontSize: '0.85rem', textTransform: 'uppercase' }}>
            <tr>
              <th style={{ padding: '15px', borderBottom: '2px solid #dee2e6' }}>Year</th>
              <th style={{ padding: '15px', borderBottom: '2px solid #dee2e6' }}>Scenario Name</th>
              <th style={{ padding: '15px', borderBottom: '2px solid #dee2e6' }}>Horizon</th>
              <th style={{ padding: '15px', borderBottom: '2px solid #dee2e6' }}>Financial Impact (GHS)</th>
              <th style={{ padding: '15px', borderBottom: '2px solid #dee2e6' }}>Mitigation Strategy</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#6c757d' }}>Loading forecasts...</td></tr>
            ) : scenarios.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#6c757d' }}>No scenario analyses found. Click "Log New Stress Test" to begin.</td></tr>
            ) : (
              scenarios.map((scenario) => (
                <tr key={scenario.scenario_id} style={{ borderBottom: '1px solid #e9ecef', transition: 'background 0.2s' }}>
                  <td style={{ padding: '15px', fontWeight: 'bold' }}>{scenario.assessment_year}</td>
                  <td style={{ padding: '15px', color: '#0d6efd', fontWeight: 'bold' }}>{scenario.scenario_name}</td>
                  <td style={{ padding: '15px' }}>
                    <span style={{ padding: '4px 8px', background: '#e9ecef', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                      {scenario.time_horizon}
                    </span>
                  </td>
                  <td style={{ padding: '15px', color: '#dc3545', fontWeight: 'bold' }}>
                    {Number(scenario.projected_financial_impact_ghs).toLocaleString('en-GH', { style: 'currency', currency: 'GHS' })}
                  </td>
                  <td style={{ padding: '15px', fontSize: '0.9rem', color: '#495057', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {scenario.mitigation_strategy}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* NEW SCENARIO MODAL */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '700px', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
            
            <div style={{ background: '#0f172a', color: 'white', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Log Scenario Analysis</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '5px' }}>Assessment Year</label>
                  <input type="number" name="assessment_year" value={formData.assessment_year} onChange={handleInputChange} required style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '5px' }}>Time Horizon</label>
                  <select name="time_horizon" value={formData.time_horizon} onChange={handleInputChange} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <option value="Short-Term">Short-Term (1-3 Yrs)</option>
                    <option value="Medium-Term">Medium-Term (3-10 Yrs)</option>
                    <option value="Long-Term">Long-Term (10+ Yrs)</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '5px' }}>Scenario Name</label>
                <input type="text" name="scenario_name" placeholder="e.g., Net Zero 2050 (+1.5°C)" value={formData.scenario_name} onChange={handleInputChange} required style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '5px' }}>Physical Risk Impact</label>
                <textarea name="physical_risk_impact" placeholder="Describe impacts from extreme weather, flooding, etc." value={formData.physical_risk_impact} onChange={handleInputChange} required rows="3" style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', resize: 'vertical' }}></textarea>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '5px' }}>Transition Risk Impact</label>
                <textarea name="transition_risk_impact" placeholder="Describe impacts from policy changes, tech shifts, market demands." value={formData.transition_risk_impact} onChange={handleInputChange} required rows="3" style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', resize: 'vertical' }}></textarea>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '5px' }}>Projected Financial Impact (Value at Risk in GHS)</label>
                <input type="number" step="0.01" name="projected_financial_impact_ghs" placeholder="e.g., 4500000" value={formData.projected_financial_impact_ghs} onChange={handleInputChange} required style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
              </div>

              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '5px' }}>Mitigation Strategy</label>
                <textarea name="mitigation_strategy" placeholder="How will the organization adapt or mitigate these risks?" value={formData.mitigation_strategy} onChange={handleInputChange} required rows="3" style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', resize: 'vertical' }}></textarea>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #dee2e6', paddingTop: '15px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '10px 20px', background: '#e9ecef', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                <button type="submit" disabled={isSubmitting} style={{ padding: '10px 20px', background: '#198754', color: 'white', border: 'none', borderRadius: '4px', cursor: isSubmitting ? 'wait' : 'pointer', fontWeight: 'bold' }}>
                  {isSubmitting ? 'Saving...' : 'Save Stress Test'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default ScenarioAnalysis;