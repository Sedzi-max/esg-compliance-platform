import React, { useState, useEffect } from 'react';
import axios from 'axios';

// FIX: this is the actual feature the Consultant Review meant by "Alignment
// Matrix" — a materiality assessment mapping topics against stakeholder
// importance (y) and business impact (x). The backend (/api/materiality)
// already existed and worked; there was simply no frontend page consuming it
// at all, which is why "scoring logic, criteria rule sets, and visual matrix
// views" read as unpopulated — there was nothing here to populate.
//
// Default topics reuse the same 9 material topics already derived from GSE's
// framework_mappings clauses (parsed from their "Topic: Sub-metric"
// descriptions) for the GSE-Aligned Report Generator work, so the two
// features stay conceptually consistent rather than inventing a second,
// different topic taxonomy.
const DEFAULT_TOPICS = [
  'Anti-corruption',
  'Emissions (carbon footprint)',
  'Corporate governance',
  'Waste management',
  'Water and effluents management',
  'Pay ratios',
  'Diversity and equal opportunity',
  'Occupational health and safety',
  'Training and education'
];

const SCALE_MIN = 1;
const SCALE_MAX = 10;

function MaterialityMatrix() {
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [selectedYear, setSelectedYear] = useState('2026');

  const [topics, setTopics] = useState(DEFAULT_TOPICS.map(name => ({ name, x: 5, y: 5 })));
  const [newTopicName, setNewTopicName] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchOrganizations();
  }, []);

  useEffect(() => {
    if (selectedOrgId) fetchExistingAssessment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrgId, selectedYear]);

  const fetchOrganizations = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/organizations', { headers: { Authorization: `Bearer ${token}` } });
      setOrganizations(res.data);
      if (res.data.length > 0 && !selectedOrgId) setSelectedOrgId(res.data[0].unit_id);
    } catch (err) {
      console.error("Failed to load organizations:", err);
      setError("Failed to load organizations.");
    }
  };

  const fetchExistingAssessment = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/materiality/${selectedOrgId}?year=${selectedYear}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.length === 0) {
        // No saved assessment yet for this org/year — start from the default
        // topic list at a neutral midpoint rather than an empty page.
        setTopics(DEFAULT_TOPICS.map(name => ({ name, x: 5, y: 5 })));
      } else {
        // Merge: keep any default topic not yet scored at its neutral
        // midpoint, use real saved scores for everything that is.
        const savedNames = new Set(res.data.map(t => t.name));
        const merged = [
          ...res.data.map(t => ({ name: t.name, x: Number(t.x), y: Number(t.y) })),
          ...DEFAULT_TOPICS.filter(name => !savedNames.has(name)).map(name => ({ name, x: 5, y: 5 }))
        ];
        setTopics(merged);
      }
    } catch (err) {
      console.error("Failed to load materiality assessment:", err);
      setError("Failed to load the existing materiality assessment for this organization/year.");
    } finally {
      setLoading(false);
    }
  };

  const updateTopicScore = (name, axis, value) => {
    setTopics(topics.map(t => t.name === name ? { ...t, [axis]: Number(value) } : t));
  };

  const addCustomTopic = () => {
    const trimmed = newTopicName.trim();
    if (!trimmed) return;
    if (topics.some(t => t.name.toLowerCase() === trimmed.toLowerCase())) {
      setError(`"${trimmed}" is already in the list.`);
      return;
    }
    setTopics([...topics, { name: trimmed, x: 5, y: 5 }]);
    setNewTopicName('');
    setError(null);
  };

  const removeTopic = (name) => {
    setTopics(topics.filter(t => t.name !== name));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessMsg('');
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/materiality', {
        unit_id: selectedOrgId,
        assessment_year: selectedYear,
        overwrite_all: true,
        topics: topics.map(t => ({ name: t.name, x: t.x, y: t.y }))
      }, { headers: { Authorization: `Bearer ${token}` } });

      setSuccessMsg('Materiality assessment saved.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error("Failed to save materiality assessment:", err);
      setError(err.response?.data?.error || "Failed to save the materiality assessment.");
    } finally {
      setSaving(false);
    }
  };

  // --- Matrix chart geometry ---
  const CHART_SIZE = 320;
  const MARGIN = 44;
  const PLOT = CHART_SIZE - MARGIN * 2;

  const toPixelX = (score) => MARGIN + ((score - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * PLOT;
  const toPixelY = (score) => MARGIN + PLOT - ((score - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * PLOT;
  const midpoint = (SCALE_MIN + SCALE_MAX) / 2;

  const zoneOf = (t) => {
    if (t.x >= midpoint && t.y >= midpoint) return { label: 'Prioritize', color: '#dc2626' };
    if (t.x < midpoint && t.y < midpoint) return { label: 'Monitor', color: '#6b7280' };
    return { label: 'Manage', color: '#d97706' };
  };

  return (
    <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', padding: '40px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', margin: '0 0 8px 0', fontWeight: '800', color: '#111827', letterSpacing: '-0.02em' }}>
          Materiality Assessment
        </h1>
        <p style={{ margin: 0, color: '#4b5563', fontSize: '16px', maxWidth: '650px' }}>
          Map material ESG topics by stakeholder importance and business impact to prioritize reporting focus.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '12px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' }}>Organization</label>
          <select value={selectedOrgId} onChange={(e) => setSelectedOrgId(e.target.value)} style={selectStyle}>
            {organizations.map(org => <option key={org.unit_id} value={org.unit_id}>{org.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '12px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' }}>Assessment Year</label>
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} style={selectStyle}>
            <option value="2024">2024</option>
            <option value="2025">2025</option>
            <option value="2026">2026</option>
          </select>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: '#fef2f2', color: '#991b1b', padding: '14px 18px', borderRadius: '10px', marginBottom: '20px', fontWeight: '600', fontSize: '14px', border: '1px solid #fecaca' }}>
          ⚠️ {error}
        </div>
      )}
      {successMsg && (
        <div style={{ backgroundColor: '#ecfdf5', color: '#065f46', padding: '14px 18px', borderRadius: '10px', marginBottom: '20px', fontWeight: '600', fontSize: '14px', border: '1px solid #a7f3d0' }}>
          ✅ {successMsg}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>Loading assessment...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 1fr) minmax(340px, 1fr)', gap: '24px' }}>

          {/* Left: score entry */}
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '28px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', margin: '0 0 20px 0' }}>Topic Scores</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '520px', overflowY: 'auto', paddingRight: '4px' }}>
              {topics.map(t => (
                <div key={t.name} style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>{t.name}</span>
                    <button onClick={() => removeTopic(t.name)} style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Remove</button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6b7280' }}>
                      <span>Stakeholder Importance</span><span>{t.y}</span>
                    </div>
                    <input type="range" min={SCALE_MIN} max={SCALE_MAX} value={t.y} onChange={(e) => updateTopicScore(t.name, 'y', e.target.value)} style={{ width: '100%' }} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6b7280' }}>
                      <span>Business Impact</span><span>{t.x}</span>
                    </div>
                    <input type="range" min={SCALE_MIN} max={SCALE_MAX} value={t.x} onChange={(e) => updateTopicScore(t.name, 'x', e.target.value)} style={{ width: '100%' }} />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
              <input
                type="text" value={newTopicName} onChange={(e) => setNewTopicName(e.target.value)}
                placeholder="Add a custom topic..."
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTopic(); } }}
                style={{ flex: 1, padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', outline: 'none' }}
              />
              <button onClick={addCustomTopic} style={{ padding: '10px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#111827', color: 'white', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                Add
              </button>
            </div>

            <button
              onClick={handleSave} disabled={saving || !selectedOrgId}
              style={{ width: '100%', marginTop: '20px', padding: '14px', borderRadius: '8px', border: 'none', backgroundColor: '#10b981', color: 'white', fontSize: '15px', fontWeight: '700', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Saving...' : 'Save Assessment'}
            </button>
          </div>

          {/* Right: visual matrix */}
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '28px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', margin: '0 0 20px 0', alignSelf: 'flex-start' }}>Materiality Matrix</h2>

            <svg viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`} style={{ width: '100%', maxWidth: '420px' }}>
              {/* Quadrant backgrounds */}
              <rect x={MARGIN} y={MARGIN} width={PLOT / 2} height={PLOT / 2} fill="#fef3c7" />
              <rect x={MARGIN + PLOT / 2} y={MARGIN} width={PLOT / 2} height={PLOT / 2} fill="#fee2e2" />
              <rect x={MARGIN} y={MARGIN + PLOT / 2} width={PLOT / 2} height={PLOT / 2} fill="#f3f4f6" />
              <rect x={MARGIN + PLOT / 2} y={MARGIN + PLOT / 2} width={PLOT / 2} height={PLOT / 2} fill="#fef3c7" />

              {/* Axes */}
              <line x1={MARGIN} y1={MARGIN} x2={MARGIN} y2={MARGIN + PLOT} stroke="#9ca3af" strokeWidth="1.5" />
              <line x1={MARGIN} y1={MARGIN + PLOT} x2={MARGIN + PLOT} y2={MARGIN + PLOT} stroke="#9ca3af" strokeWidth="1.5" />

              {/* Quadrant labels */}
              <text x={MARGIN + PLOT - 6} y={MARGIN + 16} textAnchor="end" fontSize="11" fontWeight="700" fill="#dc2626">PRIORITIZE</text>
              <text x={MARGIN + 6} y={MARGIN + PLOT - 8} textAnchor="start" fontSize="11" fontWeight="700" fill="#6b7280">MONITOR</text>

              {/* Axis labels */}
              <text x={MARGIN + PLOT / 2} y={CHART_SIZE - 6} textAnchor="middle" fontSize="12" fontWeight="600" fill="#374151">Business Impact →</text>
              <text x={12} y={MARGIN + PLOT / 2} textAnchor="middle" fontSize="12" fontWeight="600" fill="#374151" transform={`rotate(-90, 12, ${MARGIN + PLOT / 2})`}>Stakeholder Importance →</text>

              {/* Plotted topics */}
              {topics.map(t => {
                const zone = zoneOf(t);
                const px = toPixelX(t.x);
                const py = toPixelY(t.y);
                return (
                  <g key={t.name}>
                    <circle cx={px} cy={py} r="6" fill={zone.color} stroke="white" strokeWidth="1.5" />
                    <text x={px + 9} y={py + 4} fontSize="9.5" fill="#374151">{t.name.length > 22 ? t.name.slice(0, 20) + '…' : t.name}</text>
                  </g>
                );
              })}
            </svg>

            <div style={{ display: 'flex', gap: '16px', marginTop: '16px', fontSize: '12px', color: '#6b7280' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#dc2626', display: 'inline-block' }} />Prioritize</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#d97706', display: 'inline-block' }} />Manage</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#6b7280', display: 'inline-block' }} />Monitor</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const selectStyle = { padding: '10px 16px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', fontWeight: '600', color: '#111827', outline: 'none', cursor: 'pointer', backgroundColor: 'white' };

export default MaterialityMatrix;
