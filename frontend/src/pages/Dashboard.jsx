import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { 
  PieChart, Pie, Cell, BarChart, Bar, Line, ComposedChart, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine 
} from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import myLogo from '../assets/logo.png';
import ReportGenerator from './ReportGenerator';
import MaterialityMatrix from '../components/MaterialityMatrix';
import SDGTracker from '../components/SDGTracker';
import SectorOnboarding from '../components/SectorOnboarding';
import IndustryBenchmarking from '../components/IndustryBenchmarking';
import DecarbonizationForecaster from '../components/DecarbonizationForecaster';
import ComplianceReadiness from '../components/ComplianceReadiness';

function Dashboard() {
  // --- TAB STATE ---
  const [activeTab, setActiveTab] = useState('Executive Overview');

  // --- EXISTING STATE ---
  const [rawObservations, setRawObservations] = useState([]);
  const [emissions, setEmissions] = useState([]); 
  const [targets, setTargets] = useState([]); 
  const [organizations, setOrganizations] = useState([]);
  const [orgCount, setOrgCount] = useState(0);
  const [timeFilter, setTimeFilter] = useState('ALL'); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSettingTarget, setIsSettingTarget] = useState(false);

  const reportRef = useRef();
  const [isExporting, setIsExporting] = useState(false);

  const userStr = localStorage.getItem('user');
  const isAdmin = userStr ? JSON.parse(userStr).role === 'Admin' : false;

  const [targetForm, setTargetForm] = useState({
    organization_id: '', scope_category: 'All', baseline_year: new Date().getFullYear(), target_year: new Date().getFullYear() + 5, reduction_percentage: 15
  });

  const COLORS = { 
    E: '#10b981', S: '#3b82f6', G: '#f59e0b',
    Actual: '#3b82f6', Target: '#ef4444',
    Scope1: '#6366f1', Scope2: '#10b981', Scope3: '#f59e0b',
    Chart1: '#3b82f6', Chart2: '#10b981', Chart3: '#f59e0b', Chart4: '#ef4444', Chart5: '#8b5cf6'
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const [orgRes, obsRes, emissionsRes, targetsRes] = await Promise.all([
    axios.get('/api/organizations', config),
    axios.get('/api/observations', config),
    axios.get('/api/emissions', config),
    axios.get('/api/targets', config)
    ]);
      
      setOrganizations(orgRes.data);
      setOrgCount(orgRes.data.length);
      setRawObservations(obsRes.data);
      setEmissions(emissionsRes.data);
      setTargets(targetsRes.data);
      setLoading(false);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      setError("Failed to load dashboard metrics. Ensure you are logged in.");
      setLoading(false);
    }
  };

  // --- CSV & PDF EXPORT ENGINE ---
  const exportToCSV = () => {
    const headers = ["Date", "Facility", "Category/Metric", "Raw Input", "Calculated CO2e (kg)", "Record Type/Status"];
    
    const emissionRows = emissions.map(e => {
      const dateObj = new Date(e.recorded_date || e.created_at);
      return [
        dateObj.toLocaleDateString(),
        `"${(e.organization_name || 'Unknown').replace(/"/g, '""')}"`,
        `"${String(e.scope_category).replace(/"/g, '""')}: ${String(e.activity_type).replace(/"/g, '""')}"`,
        e.raw_amount,
        e.calculated_co2e,
        `Carbon Emission (${e.status})`
      ].join(','); 
    });

    const obsRows = rawObservations.map(obs => {
      const dateObj = new Date(obs.timestamp);
      return [
        dateObj.toLocaleDateString(),
        `"${(obs.organization_name || 'Unknown').replace(/"/g, '""')}"`,
        `"${String(obs.pillar)} Pillar: ${String(obs.metric_name).replace(/"/g, '""')}"`,
        obs.numeric_value !== null ? obs.numeric_value : `"${obs.text_value}"`,
        "N/A", 
        "General Observation"
      ].join(','); 
    });

    const csvString = [headers.join(','), ...emissionRows, ...obsRows].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ESG_Full_Ledger_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link); 
  };

  const generatePDF = async () => {
    setIsExporting(true);
    try {
      const element = reportRef.current;
      const canvas = await html2canvas(element, { 
        scale: 2, 
        useCORS: true, 
        backgroundColor: '#f3f4f6',
        windowHeight: element.scrollHeight 
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight; 
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`ESG_Executive_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      
    } catch (error) {
      console.error("Failed to generate PDF", error);
      alert("There was an issue generating the PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };


const handleSetTarget = async (e) => {
    e.preventDefault();
    if (isSettingTarget) return;
    setIsSettingTarget(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/targets', targetForm, { headers: { Authorization: `Bearer ${token}` } });
      alert("Target set successfully!");
      await fetchAllData();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to set target.");
    } finally {
      setIsSettingTarget(false);
    }
  };

  if (loading) return <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280', fontSize: '18px', fontWeight: '500' }}>Loading forecasting engine...</div>;

  // --- DATA CALCULATIONS ---
  const now = new Date();

  const filteredObs = rawObservations.filter(obs => {
    if (timeFilter === 'ALL') return true;
    const obsDate = new Date(obs.timestamp);
    const diffDays = Math.ceil(Math.abs(now - obsDate) / (1000 * 60 * 60 * 24));
    if (timeFilter === '30') return diffDays <= 30;
    if (timeFilter === '90') return diffDays <= 90;
    if (timeFilter === '365') return diffDays <= 365;
    return true;
  });

  const approvedEmissions = emissions.filter(e => {
    if (e.status !== 'Approved') return false; 
    if (timeFilter === 'ALL') return true;
    const eDate = new Date(e.recorded_date);
    const diffDays = Math.ceil(Math.abs(now - eDate) / (1000 * 60 * 60 * 24));
    return diffDays <= Number(timeFilter);
  });

  const pendingEmissions = emissions.filter(e => {
    if (e.status !== 'Pending') return false; 
    if (timeFilter === 'ALL') return true;
    const eDate = new Date(e.recorded_date);
    const diffDays = Math.ceil(Math.abs(now - eDate) / (1000 * 60 * 60 * 24));
    return diffDays <= Number(timeFilter);
  });

  const envCount = filteredObs.filter(o => o.pillar === 'E').length;
  const socCount = filteredObs.filter(o => o.pillar === 'S').length;
  const govCount = filteredObs.filter(o => o.pillar === 'G').length;
  const totalCO2e = approvedEmissions.reduce((sum, item) => sum + Number(item.calculated_co2e), 0);
  const pendingCO2e = pendingEmissions.reduce((sum, item) => sum + Number(item.calculated_co2e), 0);
  const recentObs = filteredObs.slice(0, 5);

  const pieDataESG = [
    { name: 'Environmental', value: envCount, fill: COLORS.E },
    { name: 'Social', value: socCount, fill: COLORS.S },
    { name: 'Governance', value: govCount, fill: COLORS.G }
  ].filter(d => d.value > 0);

  const scopeTotals = { 'scope_1': 0, 'scope_2': 0, 'scope_3': 0 };
  const timeSeries = {};
  const facilities = {}; 

  const sortedEmissions = [...approvedEmissions].sort((a,b) => new Date(a.recorded_date) - new Date(b.recorded_date));

  sortedEmissions.forEach(e => {
    const amount = Number(e.calculated_co2e);
    if (scopeTotals[e.scope_category] !== undefined) scopeTotals[e.scope_category] += amount;
    
    const dateStr = new Date(e.recorded_date).toLocaleDateString();
    if (!timeSeries[dateStr]) timeSeries[dateStr] = 0;
    timeSeries[dateStr] += amount;

    const orgName = e.organization_name || 'Unknown Facility';
    facilities[orgName] = (facilities[orgName] || 0) + amount;
  });

  const pieDataScope = [
    { name: 'Scope 1', value: scopeTotals.scope_1, fill: COLORS.Scope1 },
    { name: 'Scope 2', value: scopeTotals.scope_2, fill: COLORS.Scope2 },
    { name: 'Scope 3', value: scopeTotals.scope_3, fill: COLORS.Scope3 }
  ].filter(d => d.value > 0);

  const barDataTimeline = Object.keys(timeSeries).map(date => ({
    date, co2e: timeSeries[date]
  }));

  const facilityData = Object.keys(facilities)
    .map(key => ({ name: key, CO2e: facilities[key] }))
    .sort((a, b) => b.CO2e - a.CO2e);

  const activeFacilitiesCount = facilityData.length;

  const emissionsByYear = approvedEmissions.reduce((acc, curr) => {
    const year = new Date(curr.recorded_date).getFullYear();
    if (!acc[year]) acc[year] = 0;
    acc[year] += Number(curr.calculated_co2e);
    return acc;
  }, {});

  let forecastData = [];
  const activeTarget = targets[0]; 

  if (activeTarget && Object.keys(emissionsByYear).length > 0) {
    const baseYear = activeTarget.baseline_year;
    const targetYear = activeTarget.target_year;
    const baseEmissions = emissionsByYear[baseYear] || totalCO2e; 
    
    const targetEmissions = baseEmissions * (1 - (activeTarget.reduction_percentage / 100));
    const yearsDiff = targetYear - baseYear;
    const annualDrop = yearsDiff > 0 ? (baseEmissions - targetEmissions) / yearsDiff : 0;

    for (let y = baseYear; y <= targetYear; y++) {
      const step = y - baseYear;
      forecastData.push({
        year: y.toString(),
        "Actual Emissions": emissionsByYear[y] || null, 
        "Target Trajectory": baseEmissions - (annualDrop * step)
      });
    }
  } else {
    forecastData = Object.keys(emissionsByYear).sort().map(y => ({
      year: y,
      "Actual Emissions": emissionsByYear[y]
    }));
  }

const SCOPE_FALLBACK_SUGGESTIONS = {
  scope_1: 'Consider transitioning mobile fleets to EV or auditing stationary generator usage.',
  scope_2: 'Evaluate purchasing Renewable Energy Certificates (RECs) or auditing facility HVAC efficiency.',
  scope_3: 'Initiate supplier sustainability audits and evaluate employee business travel policies.'
};


  const ACTIVITY_SUGGESTIONS = {
  mobile_diesel_liters: 'Consider auditing or transitioning your mobile diesel fleet to EV alternatives.',
  mobile_petrol_liters: 'Consider auditing or transitioning your mobile petrol fleet to EV alternatives.',
  generator_diesel_liters: 'Consider auditing backup generator usage and exploring solar/battery alternatives to reduce reliance on diesel generators.',
  stationary_natural_gas_therms: 'Consider a stationary combustion efficiency audit for natural gas heating/equipment.',
  electricity_grid_kwh: 'Evaluate purchasing Renewable Energy Certificates (RECs) or auditing facility HVAC/lighting efficiency.',
  district_heating_kwh: 'Evaluate the carbon intensity of your district heating supplier and potential efficiency upgrades.',
  travel_flight_long_haul_km: 'Review long-haul business travel policies and consider virtual-meeting alternatives or carbon offset programs.',
  travel_flight_short_haul_km: 'Review short-haul business travel policies — these trips often have viable lower-carbon alternatives (rail, virtual meetings).',
  travel_hotel_stay_nights: 'Consider prioritizing hotels with verified sustainability certifications for business travel.',
  waste_landfill_kg: 'Initiate a waste diversion program to shift landfill waste toward recycling or composting.',
  waste_recycled_kg: 'Review whether recycled waste volumes can be reduced at the source, since processing still carries a carbon cost.'
};

  const generateInsights = () => {
    const insights = [];
    if (approvedEmissions.length === 0) {
      insights.push({ type: 'warning', text: 'No approved carbon data available to generate insights.' });
      return insights;
    }

    if (activeTarget && forecastData.length > 0) {
      const currentYear = new Date().getFullYear().toString();
      const currentData = forecastData.find(d => d.year === currentYear);
      
      if (currentData && currentData["Actual Emissions"] && currentData["Target Trajectory"]) {
        const actual = currentData["Actual Emissions"];
        const target = currentData["Target Trajectory"];
        const diff = Math.round(actual - target); 

        if (diff > 0) {
          insights.push({ 
            type: 'danger', icon: '⚠️', title: 'Off-Track Target',
            text: `You are currently exceeding your Net-Zero trajectory for this year by ${diff.toLocaleString()} kg CO2e. Immediate operational reductions are recommended.` 
          });
        } else if (diff === 0) {
          insights.push({ 
            type: 'success', icon: '🎯', title: 'Exact Target Met',
            text: `Excellent. You are perfectly aligned with your Net-Zero trajectory for this year.` 
          });
        } else {
          insights.push({ 
            type: 'success', icon: '✅', title: 'Ahead of Target',
            text: `Outstanding. You are currently beating your Net-Zero trajectory by ${Math.abs(diff).toLocaleString()} kg CO2e.` 
          });
        }
      }
    }

    const highestScope = Object.keys(scopeTotals).reduce((a, b) => scopeTotals[a] > scopeTotals[b] ? a : b);
if (scopeTotals[highestScope] > 0) {
  const scopePercentage = ((scopeTotals[highestScope] / totalCO2e) * 100).toFixed(1);
  const scopeName = highestScope.replace('_', ' ').toUpperCase();

  // NEW: find which specific activity_type drives the most emissions
  // WITHIN this scope, rather than only knowing which scope is highest.
  const scopeActivityTotals = {};
  approvedEmissions.forEach(e => {
    if (e.scope_category === highestScope) {
      const key = e.activity_type;
      scopeActivityTotals[key] = (scopeActivityTotals[key] || 0) + Number(e.calculated_co2e);
    }
  });

  const activityKeys = Object.keys(scopeActivityTotals);
  const topActivity = activityKeys.length > 0
    ? activityKeys.reduce((a, b) => scopeActivityTotals[a] > scopeActivityTotals[b] ? a : b)
    : null;

  let insightText = `${scopeName} accounts for a massive ${scopePercentage}% of your total footprint.`;

  if (topActivity) {
    const activityShareOfScope = ((scopeActivityTotals[topActivity] / scopeTotals[highestScope]) * 100).toFixed(1);
    const activityLabel = topActivity.replace(/_/g, ' ');
    const suggestion = ACTIVITY_SUGGESTIONS[topActivity] || SCOPE_FALLBACK_SUGGESTIONS[highestScope];

    insightText = `${scopeName} accounts for a massive ${scopePercentage}% of your total footprint, driven primarily by ${activityLabel} (${activityShareOfScope}% of ${scopeName} emissions). ${suggestion}`;
  } else {
    insightText += ` ${SCOPE_FALLBACK_SUGGESTIONS[highestScope]}`;
  }

  insights.push({
    type: 'info', icon: '🔍', title: `Primary Emitter: ${scopeName}`,
    text: insightText
  });
}


    if (totalCO2e > 0 && (socCount === 0 || govCount === 0)) {
      insights.push({
        type: 'warning', icon: '⚖️', title: 'Lopsided ESG Reporting',
        text: 'Your platform has strong Environmental tracking, but lacks comprehensive Social or Governance logs. True ESG compliance requires all three pillars.'
      });
    }

    return insights;
  };

  const dynamicInsights = generateInsights();

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'white', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: '#111827' }}>{payload[0].payload.year || payload[0].payload.date}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ margin: 0, color: entry.color || entry.fill, fontWeight: '600', fontSize: '14px' }}>
              {entry.name}: {Number(entry.value).toLocaleString()} {entry.name === 'Actual Emissions' || entry.name === 'co2e' || entry.name === 'CO2e' ? 'kg' : ''}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // --- TAB STYLING ---
  const getTabStyle = (tabName) => ({
    padding: '12px 24px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '700',
    color: activeTab === tabName ? '#111827' : '#6b7280',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: activeTab === tabName ? '3px solid #10b981' : '3px solid transparent',
    transition: 'all 0.2s ease-in-out',
    outline: 'none'
  });

  return (
    <div ref={reportRef} style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', padding: '40px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {error && (
        <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '16px', borderRadius: '8px', marginBottom: '24px', border: '1px solid #f87171' }}>
            {error}
        </div>
      )}

      {/* --- STATIC HEADER SECTION (Visible on all tabs) --- */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ backgroundColor: 'white', padding: '8px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <img src={myLogo} alt="ESG Platform Logo" style={{ height: '40px', width: 'auto' }} />
              </div>
              <h1 style={{ fontSize: '36px', margin: 0, fontWeight: '800', color: '#111827', letterSpacing: '-0.02em' }}>
                Executive Dashboard
              </h1>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <select 
                  value={timeFilter} 
                  onChange={(e) => setTimeFilter(e.target.value)}
                  style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: 'white', fontSize: '14px', fontWeight: '500', color: '#374151', cursor: 'pointer', outline: 'none' }}
              >
                  <option value="ALL">All Time</option>
                  <option value="365">Last 12 Months</option>
                  <option value="90">Last 90 Days</option>
                  <option value="30">Last 30 Days</option>
              </select>

              <button onClick={exportToCSV} style={secondaryButtonStyle}>📊 Export CSV</button>
              
              <button 
                  onClick={generatePDF} 
                  disabled={isExporting}
                  style={isExporting ? {...secondaryButtonStyle, opacity: 0.6, cursor: 'wait'} : secondaryButtonStyle}
              >
                  {isExporting ? '⏳ Generating PDF...' : '📄 Export PDF'}
              </button>

              <Link to="/campaigns" style={{...secondaryButtonStyle, color: '#4f46e5', borderColor: '#c7d2fe', backgroundColor: '#eef2ff', textDecoration: 'none'}}>
                  🚀 Scope 3 Campaigns
              </Link>
          </div>
      </div>

      <div style={{ marginBottom: '32px' }}>
          <Link to="/data-entry" style={{
              backgroundColor: '#111827', color: 'white', textDecoration: 'none', padding: '12px 24px', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
              <span style={{ fontSize: '18px' }}>+</span> Log New Data
          </Link>
      </div>

      {/* --- TAB NAVIGATION BAR --- */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #d1d5db', marginBottom: '32px' }}>
        {['Executive Overview', 'Carbon & Facilities', 'Strategy & Compliance'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={getTabStyle(tab)}>
            {tab}
          </button>
        ))}
      </div>

      {/* =========================================
          TAB 1: EXECUTIVE OVERVIEW
      ========================================= */}
      {activeTab === 'Executive Overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* STATS KPI GRID - (Preserved your dynamic live data!) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px' }}>
              <div style={{...cardStyle, borderTop: '4px solid #10b981'}}>
                  <p style={cardLabelStyle}>Total Approved Carbon</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '12px' }}>
                      <span style={{...cardValueStyle, color: '#047857'}}>{totalCO2e.toLocaleString()}</span>
                      <span style={cardUnitStyle}>kg CO2e</span>
                  </div>
              </div>

              <div style={{...cardStyle, borderTop: '4px solid #f59e0b'}}>
                  <p style={cardLabelStyle}>Pending Audit</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '12px' }}>
                      <span style={cardValueStyle}>{pendingCO2e.toLocaleString()}</span>
                      <span style={cardUnitStyle}>kg CO2e</span>
                  </div>
              </div>

              <div style={{...cardStyle, borderTop: '4px solid #6b7280'}}>
                  <p style={cardLabelStyle}>Active Reporting Nodes</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '12px' }}>
                      <span style={cardValueStyle}>{activeFacilitiesCount}</span>
                      <span style={cardUnitStyle}>Facilities</span>
                  </div>
              </div>

              <div style={{...cardStyle, borderTop: '4px solid #3b82f6'}}>
                  <p style={cardLabelStyle}>Social Logs</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '12px' }}>
                      <span style={{...cardValueStyle, color: '#1d4ed8'}}>{socCount}</span>
                      <span style={cardUnitStyle}>Records</span>
                  </div>
              </div>

              <div style={{...cardStyle, borderTop: '4px solid #8b5cf6'}}>
                  <p style={cardLabelStyle}>Governance Logs</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '12px' }}>
                      <span style={{...cardValueStyle, color: '#6d28d9'}}>{govCount}</span>
                      <span style={cardUnitStyle}>Records</span>
                  </div>
              </div>
          </div>

          {/* 👈 NEW COMPLIANCE READINESS COMPONENT ADDED HERE */}
          <ComplianceReadiness />

          {/* AI INSIGHTS ENGINE */}
          {dynamicInsights.length > 0 && (
            <div>
              <h2 style={{ fontSize: '18px', color: '#111827', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ⚡ Strategic Insights
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                {dynamicInsights.map((insight, index) => {
                  const theme = {
                    danger: { bg: '#fef2f2', border: '#fecaca', text: '#991b1b' },
                    success: { bg: '#ecfdf5', border: '#a7f3d0', text: '#065f46' },
                    info: { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af' },
                    warning: { bg: '#fffbeb', border: '#fde68a', text: '#92400e' }
                  }[insight.type];

                  return (
                    <div key={index} style={{ background: theme.bg, border: `1px solid ${theme.border}`, padding: '24px', borderRadius: '12px', display: 'flex', gap: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                      <div style={{ fontSize: '24px' }}>{insight.icon}</div>
                      <div>
                        <h4 style={{ margin: '0 0 6px 0', color: theme.text, fontSize: '15px', fontWeight: '700' }}>{insight.title}</h4>
                        <p style={{ margin: 0, color: '#374151', fontSize: '14px', lineHeight: '1.5' }}>{insight.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* RECENT ACTIVITY FEED */}
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: '18px', color: '#111827', margin: '0 0 24px 0' }}>
              Recent Activity Log
            </h2>
            {recentObs.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: '14px' }}>No activity in this timeframe.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {recentObs.map((obs, index) => (
                  <div key={obs.observation_id} style={{ 
                    paddingBottom: index !== recentObs.length - 1 ? '16px' : '0', 
                    borderBottom: index !== recentObs.length - 1 ? '1px solid #f3f4f6' : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <p style={{ margin: '0 0 4px 0', fontWeight: '600', color: '#374151', fontSize: '15px' }}>
                        {obs.organization_name} logged <span style={{ color: '#3b82f6' }}>{obs.metric_name}</span>
                      </p>
                      <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af' }}>
                        {new Date(obs.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#111827' }}>
                        {obs.numeric_value !== null ? obs.numeric_value : obs.text_value} 
                        <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500', marginLeft: '6px' }}>
                          {obs.unit_of_measure}
                        </span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================
          TAB 2: CARBON & FACILITIES
      ========================================= */}
      {activeTab === 'Carbon & Facilities' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* FORECASTING & TARGETS */}
          <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? '2fr 1fr' : '1fr', gap: '24px' }}>
            <div style={chartContainerStyle}>
              <h3 style={chartTitleStyle}>Corporate Target Accountability (Actuals vs Goal)</h3>
              {forecastData.length === 0 ? <p style={{ color: '#6b7280', fontSize: '14px' }}>No approved data available.</p> : (
                <div style={{ width: '100%', height: '350px', minHeight: '350px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={forecastData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="year" tick={{fill: '#6b7280', fontSize: 12}} tickLine={false} axisLine={{stroke: '#e5e7eb'}} />
                      <YAxis tick={{fill: '#6b7280', fontSize: 12}} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      <Bar dataKey="Actual Emissions" fill={COLORS.Actual} radius={[4, 4, 0, 0]} maxBarSize={50} />
                      <Line type="monotone" dataKey="Target Trajectory" stroke={COLORS.Target} strokeWidth={3} strokeDasharray="5 5" dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {isAdmin && (
              <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '16px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                <h3 style={{ margin: '0 0 20px 0', color: '#111827', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>🎯 Set Reduction Goal</h3>
                <form onSubmit={handleSetTarget} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <label style={formLabelStyle}>Organization</label>
                    <select onChange={e => setTargetForm({...targetForm, organization_id: e.target.value})} required style={formInputStyle}>
                      <option value="">Select Org</option>
                      {organizations.map(o => <option key={o.unit_id} value={o.unit_id}>{o.name}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={formLabelStyle}>Base Year</label>
                      <input type="number" value={targetForm.baseline_year} onChange={e => setTargetForm({...targetForm, baseline_year: e.target.value})} style={formInputStyle} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={formLabelStyle}>Target Year</label>
                      <input type="number" value={targetForm.target_year} onChange={e => setTargetForm({...targetForm, target_year: e.target.value})} style={formInputStyle} />
                    </div>
                  </div>
                  <div>
                    <label style={formLabelStyle}>Reduction % Goal</label>
                    <input type="number" value={targetForm.reduction_percentage} onChange={e => setTargetForm({...targetForm, reduction_percentage: e.target.value})} style={formInputStyle} />
                  </div>
                  <button type="submit" disabled={isSettingTarget} style={{ background: '#111827', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: '600', cursor: isSettingTarget ? 'not-allowed' : 'pointer', marginTop: '10px', opacity: isSettingTarget ? 0.7 : 1 }}>
                    {isSettingTarget ? 'Saving...' : 'Lock In Target'}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* NEW: ANOMALY & VARIANCE ENGINE */}
          <VarianceAnalytics />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
            
            <div style={chartContainerStyle}>
              <h3 style={chartTitleStyle}>Emissions by Scope</h3>
              {pieDataScope.length === 0 ? <p style={{ color: '#6b7280', textAlign: 'center', marginTop: '40px', fontSize: '14px' }}>No scope data available.</p> : (
                <div style={{ width: '100%', height: '280px', minHeight: '280px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieDataScope} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value">
                        {pieDataScope.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '13px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div style={chartContainerStyle}>
              <h3 style={chartTitleStyle}>Facility Leaderboard</h3>
              {facilityData.length === 0 ? <p style={{ color: '#6b7280', textAlign: 'center', marginTop: '40px', fontSize: '14px' }}>No facility data available.</p> : (
                <div style={{ width: '100%', height: '280px', minHeight: '280px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={facilityData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                      <XAxis type="number" tick={{fill: '#6b7280', fontSize: 12}} axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" tick={{fill: '#4b5563', fontSize: 12, fontWeight: 500}} width={110} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(value) => `${value.toLocaleString()} kg CO₂e`} content={<CustomTooltip />} />
                      <Bar dataKey="CO2e" radius={[0, 4, 4, 0]} maxBarSize={30}>
                        {facilityData.map((entry, index) => {
                          const dynamicColors = [COLORS.Chart1, COLORS.Chart2, COLORS.Chart3, COLORS.Chart4, COLORS.Chart5];
                          return <Cell key={`cell-${index}`} fill={dynamicColors[index % dynamicColors.length]} />
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div style={chartContainerStyle}>
              <h3 style={chartTitleStyle}>Recent Ingestion Timeline</h3>
              {barDataTimeline.length === 0 ? <p style={{ color: '#6b7280', textAlign: 'center', marginTop: '40px', fontSize: '14px' }}>No timeline data available.</p> : (
                <div style={{ width: '100%', height: '280px', minHeight: '280px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barDataTimeline} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="date" tick={{fill: '#6b7280', fontSize: 12}} axisLine={{stroke: '#e5e7eb'}} tickLine={false} />
                      <YAxis tick={{fill: '#6b7280', fontSize: 12}} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="co2e" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div style={chartContainerStyle}>
              <h3 style={chartTitleStyle}>ESG Log Distribution</h3>
              {pieDataESG.length === 0 ? <p style={{ color: '#6b7280', textAlign: 'center', marginTop: '40px', fontSize: '14px' }}>No ESG data available.</p> : (
                <div style={{ width: '100%', height: '280px', minHeight: '280px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieDataESG} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value">
                        {pieDataESG.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '13px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          TAB 3: STRATEGY & COMPLIANCE
      ========================================= */}
      {activeTab === 'Strategy & Compliance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          <ReportGenerator />
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
            <SDGTracker />
            <MaterialityMatrix />
          </div>
          <DecarbonizationForecaster />
          <IndustryBenchmarking />

          <SectorOnboarding />

        </div>
      )}

    </div>
  );
}

// --- VARIANCE ENGINE HELPER & COMPONENT ---
export const calculateVarianceAndAnomalies = (monthlyData) => {
    // 0. Postgres SUM() returns strings, and no-data months now arrive as
    // null (not 0) from the backend — keep null as null so it's excluded
    // from the statistics below, only casting real values to Number.
    const parsedData = monthlyData.map(d => ({
        ...d,
        current_co2e: d.current_co2e !== null ? Number(d.current_co2e) : null,
        previous_co2e: d.previous_co2e !== null ? Number(d.previous_co2e) : null,
        hasCurrentData: d.current_co2e !== null,
    }));

    // 1. FIX: only include months that actually have submitted data in the
    // mean/stdDev — a month with no records yet is not the same as a
    // month with genuinely zero emissions, and including it dragged the
    // baseline down, making early real months look artificially anomalous.
    const valuesWithData = parsedData.filter(d => d.hasCurrentData).map(d => d.current_co2e);
    if (valuesWithData.length === 0) return parsedData.map(d => ({ ...d, isAnomaly: false, momVariance: null, threshold: null }));

    const mean = valuesWithData.reduce((sum, val) => sum + val, 0) / valuesWithData.length;

    const squaredDiffs = valuesWithData.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / valuesWithData.length;
    const stdDev = Math.sqrt(variance) || 1;

    const upperThreshold = Math.max(mean + (1.5 * stdDev), 100);

    return parsedData.map((dataPoint, index) => {
        if (!dataPoint.hasCurrentData) {
            return { ...dataPoint, isAnomaly: false, momVariance: null, threshold: upperThreshold };
        }

        // FIX: anomaly is now flagged if EITHER the internal-year threshold
        // is exceeded, OR the month deviates sharply from the same month
        // last year — since the chart's whole framing is "current vs. last
        // year's baseline," the anomaly check should account for that too.
        const exceedsInternalThreshold = dataPoint.current_co2e > upperThreshold;

        let exceedsYoyDeviation = false;
        if (dataPoint.previous_co2e !== null && dataPoint.previous_co2e > 0) {
            const yoyChangePct = Math.abs((dataPoint.current_co2e - dataPoint.previous_co2e) / dataPoint.previous_co2e) * 100;
            exceedsYoyDeviation = yoyChangePct > 75; // more than 75% off last year's same month
        }

        const isAnomaly = (exceedsInternalThreshold || exceedsYoyDeviation) && dataPoint.current_co2e > 0;

        let momVariance = null;
        // Find the previous month THAT HAS DATA, not just the previous index
        const priorWithData = [...parsedData.slice(0, index)].reverse().find(d => d.hasCurrentData);
        if (priorWithData) {
            if (priorWithData.current_co2e > 0) {
                momVariance = ((dataPoint.current_co2e - priorWithData.current_co2e) / priorWithData.current_co2e) * 100;
            } else if (dataPoint.current_co2e > 0) {
                momVariance = 999;
            }
        }

        return {
            ...dataPoint,
            isAnomaly,
            momVariance: momVariance !== null ? Number(momVariance.toFixed(1)) : null,
            threshold: upperThreshold,
        };
    });
};

function VarianceAnalytics() {
    const [trendData, setTrendData] = useState([]);
    const [anomalies, setAnomalies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchVarianceData();
    }, []);

    const fetchVarianceData = async () => {
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/analytics/variance', {
                headers: { Authorization: `Bearer ${token}` }
            });

            const processedData = calculateVarianceAndAnomalies(response.data);
            const filteredAnomalies = processedData.filter(d => d.isAnomaly);

            setTrendData(processedData);
            setAnomalies(filteredAnomalies);
        } catch (err) {
            console.error("Failed to fetch variance analytics", err);
            setError("Failed to load variance analytics. Please try again.");
            setTrendData([]);
            setAnomalies([]);
        } finally {
            setLoading(false);
        }
    };

    // Custom Tooltip to show MoM Variance natively inside the chart
    const CustomVarianceTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div style={{ background: 'white', padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                    <p style={{ margin: '0 0 12px 0', fontWeight: '800', color: '#111827' }}>{label} Emissions</p>
                    <p style={{ margin: '0 0 8px 0', color: '#3b82f6', fontWeight: '600' }}>
                        Current: {Number(data.current_co2e).toLocaleString()} kg
                    </p>
                    <p style={{ margin: '0 0 12px 0', color: '#6b7280', fontSize: '14px' }}>
                        Baseline: {Number(data.previous_co2e).toLocaleString()} kg
                    </p>
                    
                    {data.momVariance !== null && data.momVariance !== 0 && (
                        <div style={{ 
                            padding: '6px 10px', borderRadius: '4px', display: 'inline-block', fontSize: '13px', fontWeight: '700',
                            backgroundColor: data.momVariance > 0 ? '#fee2e2' : '#d1fae5',
                            color: data.momVariance > 0 ? '#991b1b' : '#065f46'
                        }}>
                            {data.momVariance > 0 ? '↑' : '↓'} {Math.abs(data.momVariance)}% MoM Variance
                        </div>
                    )}
                </div>
            );
        }
        return null;
    };

    if (loading) {
        return <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Calibrating variance engine...</div>;
    }

    if (error) {
        return (
            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', border: '1px solid #fecaca', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <div style={{ backgroundColor: '#fef2f2', color: '#991b1b', padding: '16px 20px', borderRadius: '10px', fontWeight: '600', fontSize: '14px', border: '1px solid #fecaca', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>⚠️ {error}</span>
                    <button onClick={fetchVarianceData} style={{ background: 'transparent', border: '1px solid #991b1b', color: '#991b1b', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#111827', margin: '0 0 8px 0' }}>
                        Anomaly & Variance Engine
                    </h2>
                    <p style={{ margin: 0, color: '#6b7280', fontSize: '15px' }}>
                        Tracking current trajectory against previous year baselines and standard deviation limits.
                    </p>
                </div>

                {/* Dynamic Anomaly Warning Badge */}
                {anomalies.length > 0 && (
                    <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '12px 20px', borderRadius: '8px', display: 'flex', alignItems: 'flex-start', gap: '12px', maxWidth: '400px' }}>
                        <span style={{ fontSize: '24px' }}>⚠️</span>
                        <div>
                            <h4 style={{ margin: '0 0 4px 0', color: '#991b1b', fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                High Variance Detected
                            </h4>
                            {anomalies.map((anom, idx) => (
                                <p key={idx} style={{ margin: 0, color: '#7f1d1d', fontSize: '13px', lineHeight: '1.5' }}>
                                    <strong>{anom.month}</strong> shows a massive spike {anom.momVariance !== null ? `(+${anom.momVariance}%) ` : ''}compared to baseline expectations. Double-check raw inputs for typos.
                                </p>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* The Comparative Chart */}
            <div style={{ width: '100%', height: '400px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={{ stroke: '#d1d5db' }} tickLine={false} />
                        <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                        
                        <Tooltip content={<CustomVarianceTooltip />} />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />

                        {/* Standard Deviation Danger Line */}
                        <ReferenceLine y={trendData[0]?.threshold} stroke="#ef4444" strokeDasharray="5 5" label={{ position: 'top', value: 'Std Dev Threshold', fill: '#ef4444', fontSize: 12 }} />

                        {/* Baseline Data (Line) */}
                        <Line type="monotone" name="Previous Year Baseline" dataKey="previous_co2e" stroke="#9ca3af" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />

                        {/* Current Data (Bar) with Dynamic Coloring for Anomalies */}
                        <Bar name="Current Year Actuals" dataKey="current_co2e" radius={[4, 4, 0, 0]} maxBarSize={50}>
                            {trendData.map((entry, index) => (
                                <Cell 
                                    key={`cell-${index}`} 
                                    fill={entry.isAnomaly ? '#ef4444' : '#3b82f6'} // Red if anomaly, Blue if normal
                                />
                            ))}
                        </Bar>
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

        </div>
    );
}

// --- Reusable Style Objects ---
const secondaryButtonStyle = {
  backgroundColor: 'white',
  color: '#374151',
  border: '1px solid #d1d5db',
  padding: '10px 16px',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: '600',
  cursor: 'pointer',
  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  display: 'flex',
  alignItems: 'center',
  gap: '6px'
};

const cardStyle = {
  backgroundColor: 'white',
  padding: '24px',
  borderRadius: '16px',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
  border: '1px solid #e5e7eb',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center'
};

const cardLabelStyle = {
  margin: 0,
  fontSize: '12px',
  fontWeight: '700',
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em'
};

const cardValueStyle = {
  fontSize: '36px',
  fontWeight: '800',
  color: '#111827',
  lineHeight: '1'
};

const cardUnitStyle = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#9ca3af'
};

const chartContainerStyle = {
  backgroundColor: 'white',
  padding: '32px',
  borderRadius: '16px',
  border: '1px solid #e5e7eb',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
};

const chartTitleStyle = {
  margin: '0 0 24px 0',
  color: '#111827',
  fontSize: '16px',
  fontWeight: '700',
  textAlign: 'center'
};

const formLabelStyle = {
  fontSize: '13px',
  fontWeight: '600',
  color: '#374151',
  marginBottom: '6px',
  display: 'block'
};

const formInputStyle = {
  width: '100%',
  padding: '10px',
  borderRadius: '8px',
  border: '1px solid #d1d5db',
  backgroundColor: '#f9fafb',
  boxSizing: 'border-box',
  outline: 'none',
  fontSize: '14px'
};

export default Dashboard;