import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, ReferenceLine, Cell, LabelList 
} from 'recharts';

const initialTopics = [
  { id: 1, name: 'Human Rights', x: 3, y: 9, color: '#d32f2f' },
  { id: 2, name: 'Data Privacy', x: 8, y: 9, color: '#1976d2' },
  { id: 3, name: 'Carbon Emissions', x: 4, y: 6, color: '#388e3c' },
  { id: 4, name: 'Diversity', x: 6, y: 5, color: '#fbc02d' },
  { id: 5, name: 'Health & Safety', x: 5, y: 8, color: '#f57c00' },
  { id: 6, name: 'Anti-Corruption', x: 2, y: 5, color: '#7b1fa2' },
  { id: 7, name: 'Compliance', x: 3, y: 3, color: '#5d4037' },
  { id: 8, name: 'Business Continuity', x: 5, y: 2, color: '#0288d1' }
];

function MaterialityMatrix() {
  const [topics, setTopics] = useState(initialTopics);
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const currentYear = new Date().getFullYear();

  // 1. Load the user's organizations
  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/organizations', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setOrganizations(res.data);
        if (res.data.length > 0) setSelectedOrg(res.data[0].unit_id);
      } catch (err) {
        console.error("Failed to load orgs", err);
      }
    };
    fetchOrgs();
  }, []);

  // 2. Automatically fetch scores when the organization changes
  useEffect(() => {
    if (!selectedOrg) return;

    const fetchSavedScores = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`/api/materiality/${selectedOrg}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.data && res.data.length > 0) {
          const colors = ['#d32f2f', '#1976d2', '#388e3c', '#fbc02d', '#f57c00', '#7b1fa2'];
          const loadedTopics = res.data.map((item, index) => ({
            id: index + 1000, 
            name: item.name,
            x: item.x,
            y: item.y,
            color: colors[index % colors.length]
          }));
          setTopics(loadedTopics);
        } else {
          setTopics(initialTopics);
        }
      } catch (err) {
        console.error("Failed to load saved profile", err);
        setTopics(initialTopics);
      }
    };

    fetchSavedScores();
  }, [selectedOrg]);

  const handleScoreChange = (id, axis, value) => {
    setTopics(topics.map(topic => 
      topic.id === id ? { ...topic, [axis]: parseInt(value) } : topic
    ));
  };

  const handleSave = async () => {
    if (!selectedOrg) {
      alert("Please select an organization first.");
      return;
    }
    
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/materiality', {
        organization_id: selectedOrg,
        assessment_year: currentYear,
        topics: topics,
        overwrite_all: true // <-- CRITICAL FIX: Added this flag for the backend
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert("✅ Assessment Profile Saved Successfully!");
    } catch (error) {
      console.error("Save failed:", error);
      alert("Failed to save profile. Check your console logs.");
    } finally {
      setIsSaving(false);
    }
  };

  const MatrixTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ background: 'white', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <p style={{ margin: 0, fontWeight: 'bold', color: data.color }}>{data.name}</p>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>Stakeholder Importance: {data.y}/10</p>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>Business Impact: {data.x}/10</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ padding: '25px', background: '#fff', borderRadius: '8px', border: '1px solid #dee2e6', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '40px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px' }}>
        <div>
          <h2 style={{ marginTop: 0, color: '#212529', display: 'flex', alignItems: 'center', gap: '10px' }}>
            🎯 Double Materiality Assessment
          </h2>
          <p style={{ color: '#6c757d', margin: 0, maxWidth: '600px' }}>
            Plot ESG topics based on their importance to stakeholders and their overall impact on the business. Topics in the top-right quadrant should be prioritized.
          </p>
        </div>
        
        <div style={{ minWidth: '200px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '5px', color: '#495057' }}>Reporting Organization</label>
          <select 
            value={selectedOrg} 
            onChange={(e) => setSelectedOrg(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontWeight: 'bold' }}
          >
            {organizations.length === 0 && <option value="">Loading...</option>}
            {organizations.map(org => (
              <option key={org.unit_id} value={org.unit_id}>{org.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
        
        {/* LEFT COLUMN: The Sliders */}
        <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #e9ecef', maxHeight: '500px', overflowY: 'auto' }}>
          <h4 style={{ marginTop: 0, marginBottom: '20px', color: '#495057' }}>Adjust Topic Scores</h4>
          {topics.map(topic => (
            <div key={topic.id} style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #dee2e6' }}>
              <div style={{ fontWeight: 'bold', color: topic.color, marginBottom: '10px' }}>{topic.name}</div>
              
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#495057' }}>
                  <span>Stakeholders (Y)</span>
                  <span style={{ fontWeight: 'bold' }}>{topic.y}</span>
                </label>
                <input 
                  type="range" min="0" max="10" value={topic.y} 
                  onChange={(e) => handleScoreChange(topic.id, 'y', e.target.value)}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#495057' }}>
                  <span>Business Impact (X)</span>
                  <span style={{ fontWeight: 'bold' }}>{topic.x}</span>
                </label>
                <input 
                  type="range" min="0" max="10" value={topic.x} 
                  onChange={(e) => handleScoreChange(topic.id, 'x', e.target.value)}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* RIGHT COLUMN: The Scatter Plot Matrix */}
        <div style={{ height: '500px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '10%', left: '10%', color: '#adb5bd', fontWeight: 'bold', zIndex: 0 }}>MANAGE</div>
          <div style={{ position: 'absolute', top: '10%', right: '10%', color: '#198754', fontWeight: 'bold', zIndex: 0 }}>PRIORITIZE</div>
          <div style={{ position: 'absolute', bottom: '10%', left: '10%', color: '#adb5bd', fontWeight: 'bold', zIndex: 0 }}>MONITOR</div>
          <div style={{ position: 'absolute', bottom: '10%', right: '10%', color: '#adb5bd', fontWeight: 'bold', zIndex: 0 }}>MANAGE</div>

          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }} style={{ zIndex: 1 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
              
              <XAxis 
                type="number" dataKey="x" name="Business Impact" 
                domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} 
                label={{ value: 'Significance of ESG Impacts →', position: 'bottom', offset: 0, fontSize: 12, fill: '#6c757d' }} 
              />
              
              <YAxis 
                type="number" dataKey="y" name="Stakeholder Importance" 
                domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} 
                label={{ value: 'Importance to Stakeholders →', angle: -90, position: 'left', offset: 0, fontSize: 12, fill: '#6c757d' }} 
              />
              
              <ReferenceLine x={5} stroke="#495057" strokeWidth={2} opacity={0.5} />
              <ReferenceLine y={5} stroke="#495057" strokeWidth={2} opacity={0.5} />
              
              <Tooltip content={<MatrixTooltip />} cursor={{ strokeDasharray: '3 3' }} />
              
              <Scatter name="ESG Topics" data={topics} fill="#8884d8">
                {topics.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
                <LabelList dataKey="name" position="top" style={{ fontSize: '11px', fontWeight: 'bold', fill: '#495057' }} />
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

      </div>
      
      <div style={{ marginTop: '20px', textAlign: 'right', borderTop: '1px solid #dee2e6', paddingTop: '20px' }}>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          style={{ background: isSaving ? '#6c757d' : '#0d6efd', color: 'white', padding: '12px 25px', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: isSaving ? 'wait' : 'pointer', fontSize: '1rem', transition: 'background 0.2s' }}
        >
          {isSaving ? '⏳ Saving to Database...' : '💾 Save Assessment Profile'}
        </button>
      </div>
    </div>
  );
}

export default MaterialityMatrix;