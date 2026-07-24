import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Compass, AlertTriangle, CheckCircle2, Plus, Trash2, Save } from 'lucide-react';

// FIX: "premium for top companies" polish pass, same treatment applied to
// Login.jsx — Sora for headings/buttons, Inter for body/data, lucide-react
// icons instead of plain symbols, and custom-styled range sliders instead of
// bare browser defaults. Colors unchanged (still navy #0a192f / green
// #10b981) and all existing logic (fetch/save/add/remove/chart geometry) is
// untouched — this is an execution upgrade only.
//
// FIX (round 2): the chart itself was capped at 420px regardless of its
// card's real width, and every topic's name was rendered as a permanent,
// always-visible SVG <text> label next to its dot — with real data (more
// than a handful of topics, or topics landing at similar scores) those
// labels overlapped into unreadable garbled text. Replaced with: a larger,
// responsive chart (fills its card instead of a fixed small cap) and a
// single hover-triggered tooltip instead of N permanent labels, so the
// default view stays clean regardless of how much data is plotted.
//
// REQUIRES: the same Google Fonts <link> tags already added to
// frontend/index.html for Login.jsx (Sora + Inter) — no further index.html
// changes needed if that's already in place.

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

const FONT_HEADING = "'Sora', system-ui, sans-serif";
const FONT_BODY = "'Inter', system-ui, sans-serif";

function MaterialityMatrix() {
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [selectedYear, setSelectedYear] = useState('2026');

  const [topics, setTopics] = useState(DEFAULT_TOPICS.map(name => ({ name, x: 5, y: 5 })));
  const [newTopicName, setNewTopicName] = useState('');
  const [hoveredTopic, setHoveredTopic] = useState(null);

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
        setTopics(DEFAULT_TOPICS.map(name => ({ name, x: 5, y: 5 })));
      } else {
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
  // FIX: was 320/44 (fixed small canvas). Bumped up and made the SVG fill its
  // card's real width via viewBox scaling instead of a hard maxWidth cap.
  const CHART_SIZE = 480;
  const MARGIN = 56;
  const PLOT = CHART_SIZE - MARGIN * 2;

  const toPixelX = (score) => MARGIN + ((score - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * PLOT;
  const toPixelY = (score) => MARGIN + PLOT - ((score - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * PLOT;
  const midpoint = (SCALE_MIN + SCALE_MAX) / 2;
  const midPx = MARGIN + PLOT / 2;

  const zoneOf = (t) => {
    if (t.x >= midpoint && t.y >= midpoint) return { label: 'Prioritize', color: '#dc2626' };
    if (t.x < midpoint && t.y < midpoint) return { label: 'Monitor', color: '#6b7280' };
    return { label: 'Manage', color: '#d97706' };
  };

  const sliderPct = (v) => ((v - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100;

  return (
    <div style={{ backgroundColor: '#e9edf2', minHeight: '100vh', padding: '40px', fontFamily: FONT_BODY }}>

      <style>{`
        .materiality-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 6px;
          border-radius: 999px;
          outline: none;
          background: linear-gradient(to right, #10b981 0%, #10b981 var(--fill), #e5e7eb var(--fill), #e5e7eb 100%);
        }
        .materiality-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #0a192f;
          border: 2px solid white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.35);
          cursor: pointer;
        }
        .materiality-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #0a192f;
          border: 2px solid white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.35);
          cursor: pointer;
        }
        .materiality-dot {
          transition: r 0.15s ease;
          cursor: pointer;
        }
      `}</style>

      <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#0a192f', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Compass size={24} color="#10b981" strokeWidth={2} />
        </div>
        <div>
          <h1 style={{ fontFamily: FONT_HEADING, fontSize: '30px', margin: '0 0 4px 0', fontWeight: '800', color: '#111827', letterSpacing: '-0.02em' }}>
            Materiality Assessment
          </h1>
          <p style={{ margin: 0, color: '#4b5563', fontSize: '15px', maxWidth: '650px' }}>
            Map material ESG topics by stakeholder importance and business impact to prioritize reporting focus.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '12px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', fontFamily: FONT_HEADING }}>Organization</label>
          <select value={selectedOrgId} onChange={(e) => setSelectedOrgId(e.target.value)} style={selectStyle}>
            {organizations.map(org => <option key={org.unit_id} value={org.unit_id}>{org.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '12px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', fontFamily: FONT_HEADING }}>Assessment Year</label>
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} style={selectStyle}>
            <option value="2024">2024</option>
            <option value="2025">2025</option>
            <option value="2026">2026</option>
          </select>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: '#fef2f2', color: '#991b1b', padding: '14px 18px', borderRadius: '10px', marginBottom: '20px', fontWeight: '600', fontSize: '14px', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertTriangle size={18} strokeWidth={2} /> {error}
        </div>
      )}
      {successMsg && (
        <div style={{ backgroundColor: '#ecfdf5', color: '#065f46', padding: '14px 18px', borderRadius: '10px', marginBottom: '20px', fontWeight: '600', fontSize: '14px', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle2 size={18} strokeWidth={2} /> {successMsg}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>Loading assessment...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 0.85fr) minmax(440px, 1.3fr)', gap: '24px' }}>

          {/* Left: score entry */}
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '28px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontFamily: FONT_HEADING, fontSize: '16px', fontWeight: '700', color: '#111827', margin: '0 0 20px 0' }}>Topic Scores</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '560px', overflowY: 'auto', paddingRight: '4px' }}>
              {topics.map(t => (
                <div
                  key={t.name}
                  style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: '16px' }}
                  onMouseEnter={() => setHoveredTopic(t.name)}
                  onMouseLeave={() => setHoveredTopic(null)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: hoveredTopic === t.name ? '#0a192f' : '#111827' }}>{t.name}</span>
                    <button
                      onClick={() => removeTopic(t.name)}
                      style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                      aria-label={`Remove ${t.name}`}
                    >
                      <Trash2 size={15} strokeWidth={2} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6b7280' }}>
                      <span>Stakeholder Importance</span><span style={{ fontWeight: '700', color: '#0a192f' }}>{t.y}</span>
                    </div>
                    <input
                      type="range" min={SCALE_MIN} max={SCALE_MAX} value={t.y}
                      onChange={(e) => updateTopicScore(t.name, 'y', e.target.value)}
                      className="materiality-slider"
                      style={{ '--fill': `${sliderPct(t.y)}%` }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6b7280' }}>
                      <span>Business Impact</span><span style={{ fontWeight: '700', color: '#0a192f' }}>{t.x}</span>
                    </div>
                    <input
                      type="range" min={SCALE_MIN} max={SCALE_MAX} value={t.x}
                      onChange={(e) => updateTopicScore(t.name, 'x', e.target.value)}
                      className="materiality-slider"
                      style={{ '--fill': `${sliderPct(t.x)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
              <input
                type="text" value={newTopicName} onChange={(e) => setNewTopicName(e.target.value)}
                placeholder="Add a custom topic..."
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTopic(); } }}
                style={{ flex: 1, padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', outline: 'none', fontFamily: FONT_BODY }}
              />
              <button
                onClick={addCustomTopic}
                style={{ fontFamily: FONT_HEADING, padding: '10px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#111827', color: 'white', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={14} strokeWidth={2.5} /> Add
              </button>
            </div>

            <button
              onClick={handleSave} disabled={saving || !selectedOrgId}
              style={{ fontFamily: FONT_HEADING, width: '100%', marginTop: '20px', padding: '14px', borderRadius: '8px', border: 'none', backgroundColor: '#10b981', color: 'white', fontSize: '15px', fontWeight: '700', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Save size={17} strokeWidth={2} /> {saving ? 'Saving...' : 'Save Assessment'}
            </button>
          </div>

          {/* Right: visual matrix */}
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '28px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h2 style={{ fontFamily: FONT_HEADING, fontSize: '16px', fontWeight: '700', color: '#111827', margin: '0 0 20px 0', alignSelf: 'flex-start' }}>Materiality Matrix</h2>

            <svg viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`} style={{ width: '100%', height: 'auto' }}>
              {/* Quadrant backgrounds */}
              <rect x={MARGIN} y={MARGIN} width={PLOT / 2} height={PLOT / 2} fill="#fef3c7" />
              <rect x={MARGIN + PLOT / 2} y={MARGIN} width={PLOT / 2} height={PLOT / 2} fill="#fee2e2" />
              <rect x={MARGIN} y={MARGIN + PLOT / 2} width={PLOT / 2} height={PLOT / 2} fill="#f3f4f6" />
              <rect x={MARGIN + PLOT / 2} y={MARGIN + PLOT / 2} width={PLOT / 2} height={PLOT / 2} fill="#fef3c7" />

              {/* FIX: added a clean center cross dividing the four quadrants —
                  previously only the outer border existed, so the quadrant
                  boundary was implied only by the color change, not a real line. */}
              <line x1={midPx} y1={MARGIN} x2={midPx} y2={MARGIN + PLOT} stroke="white" strokeWidth="2" />
              <line x1={MARGIN} y1={midPx} x2={MARGIN + PLOT} y2={midPx} stroke="white" strokeWidth="2" />

              {/* Outer axes */}
              <line x1={MARGIN} y1={MARGIN} x2={MARGIN} y2={MARGIN + PLOT} stroke="#9ca3af" strokeWidth="1.5" />
              <line x1={MARGIN} y1={MARGIN + PLOT} x2={MARGIN + PLOT} y2={MARGIN + PLOT} stroke="#9ca3af" strokeWidth="1.5" />

              {/* Quadrant labels */}
              <text x={MARGIN + PLOT - 10} y={MARGIN + 22} textAnchor="end" fontSize="14" fontWeight="700" fontFamily={FONT_HEADING} fill="#dc2626">PRIORITIZE</text>
              <text x={MARGIN + 10} y={MARGIN + PLOT - 12} textAnchor="start" fontSize="14" fontWeight="700" fontFamily={FONT_HEADING} fill="#6b7280">MONITOR</text>

              {/* Axis labels */}
              <text x={MARGIN + PLOT / 2} y={CHART_SIZE - 8} textAnchor="middle" fontSize="14" fontWeight="600" fontFamily={FONT_BODY} fill="#374151">Business Impact →</text>
              <text x={16} y={MARGIN + PLOT / 2} textAnchor="middle" fontSize="14" fontWeight="600" fontFamily={FONT_BODY} fill="#374151" transform={`rotate(-90, 16, ${MARGIN + PLOT / 2})`}>Stakeholder Importance →</text>

              {/* FIX: replaced N always-visible text labels (which overlapped
                  into unreadable garble with real data) with clean dots and a
                  single hover-triggered tooltip. */}
              {topics.map(t => {
                const zone = zoneOf(t);
                const px = toPixelX(t.x);
                const py = toPixelY(t.y);
                const isHovered = hoveredTopic === t.name;
                return (
                  <circle
                    key={t.name}
                    className="materiality-dot"
                    cx={px} cy={py} r={isHovered ? 10 : 7}
                    fill={zone.color} stroke="white" strokeWidth="2"
                    onMouseEnter={() => setHoveredTopic(t.name)}
                    onMouseLeave={() => setHoveredTopic(null)}
                  />
                );
              })}

              {/* Tooltip for whichever topic is hovered (from either the dot
                  or its matching row in the score-entry list on the left) */}
              {(() => {
                const t = topics.find(t => t.name === hoveredTopic);
                if (!t) return null;
                const zone = zoneOf(t);
                const px = toPixelX(t.x);
                const py = toPixelY(t.y);
                const labelWidth = Math.max(90, t.name.length * 6.5 + 20);
                const flipLeft = px + labelWidth + 14 > CHART_SIZE;
                const boxX = flipLeft ? px - labelWidth - 14 : px + 14;
                const boxY = py - 24 < MARGIN ? py + 10 : py - 34;
                return (
                  <g pointerEvents="none">
                    <rect x={boxX} y={boxY} width={labelWidth} height="42" rx="6" fill="#0a192f" opacity="0.95" />
                    <text x={boxX + 10} y={boxY + 17} fontSize="11.5" fontWeight="700" fontFamily={FONT_HEADING} fill="white">{t.name}</text>
                    <text x={boxX + 10} y={boxY + 32} fontSize="10.5" fontFamily={FONT_BODY} fill={zone.color}>{zone.label} · Impact {t.x} / Importance {t.y}</text>
                  </g>
                );
              })()}
            </svg>

            <div style={{ display: 'flex', gap: '16px', marginTop: '16px', fontSize: '12px', color: '#6b7280' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#dc2626', display: 'inline-block' }} />Prioritize</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#d97706', display: 'inline-block' }} />Manage</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#6b7280', display: 'inline-block' }} />Monitor</span>
            </div>
            <p style={{ margin: '10px 0 0 0', fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>Hover a point (or a topic on the left) for details.</p>
          </div>
        </div>
      )}
    </div>
  );
}

const selectStyle = { fontFamily: FONT_BODY, padding: '10px 16px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', fontWeight: '600', color: '#111827', outline: 'none', cursor: 'pointer', backgroundColor: 'white' };

export default MaterialityMatrix;
