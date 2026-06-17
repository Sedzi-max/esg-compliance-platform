import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { 
  PieChart, Pie, Cell, BarChart, Bar, Line, ComposedChart, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import myLogo from '../assets/logo.png';
import ReportGenerator from './ReportGenerator';
import MaterialityMatrix from '../components/MaterialityMatrix';
import SDGTracker from '../components/SDGTracker';
import SectorOnboarding from '../components/SectorOnboarding';

function Dashboard() {
  const [rawObservations, setRawObservations] = useState([]);
  const [emissions, setEmissions] = useState([]); 
  const [targets, setTargets] = useState([]); 
  const [organizations, setOrganizations] = useState([]);
  const [orgCount, setOrgCount] = useState(0);
  const [timeFilter, setTimeFilter] = useState('ALL'); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reportRef = useRef();
  const [isExporting, setIsExporting] = useState(false);

  const userStr = localStorage.getItem('user');
  const isAdmin = userStr ? JSON.parse(userStr).role === 'Admin' : false;

  const [targetForm, setTargetForm] = useState({
    organization_id: '', scope_category: 'All', baseline_year: new Date().getFullYear(), target_year: new Date().getFullYear() + 5, reduction_percentage: 15
  });

  const COLORS = { 
    E: '#2e7d32', S: '#1565c0', G: '#e65100', 
    Actual: '#1976d2', Target: '#d32f2f',
    Scope1: '#0088FE', Scope2: '#00C49F', Scope3: '#FFBB28',
    Chart1: '#0d6efd', Chart2: '#198754', Chart3: '#ffc107', Chart4: '#dc3545', Chart5: '#6f42c1'
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
        axios.get('/api/emissions', config).catch(() => ({ data: [] })),
        axios.get('/api/targets', config).catch(() => ({ data: [] }))
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

  const exportToCSV = () => {
    const headers = ["Date", "Organization", "Metric Name", "Numeric Value", "Unit of Measure"];
    const csvRows = rawObservations.map(obs => {
      const dateObj = new Date(obs.timestamp);
      return [
        dateObj.toLocaleDateString(),
        `"${obs.organization_name}"`, 
        `"${obs.metric_name}"`,
        obs.numeric_value !== null ? obs.numeric_value : "",
        obs.unit_of_measure || ""
      ].join(','); 
    });

    const csvString = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ESG_Compliance_Report_${new Date().toISOString().split('T')[0]}.csv`);
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
        backgroundColor: '#f8f9fa',
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
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/targets', targetForm, { headers: { Authorization: `Bearer ${token}` } });
      alert("Target set successfully!");
      fetchAllData(); 
    } catch (err) {
      alert("Failed to set target.");
    }
  };

  if (loading) return <p style={{ fontSize: '1.2rem', color: '#666', textAlign: 'center', marginTop: '50px' }}>Loading forecasting engine...</p>;

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
  const facilities = {}; // NEW: For Leaderboard

  const sortedEmissions = [...approvedEmissions].sort((a,b) => new Date(a.recorded_date) - new Date(b.recorded_date));

  sortedEmissions.forEach(e => {
    const amount = Number(e.calculated_co2e);
    if (scopeTotals[e.scope_category] !== undefined) scopeTotals[e.scope_category] += amount;
    
    const dateStr = new Date(e.recorded_date).toLocaleDateString();
    if (!timeSeries[dateStr]) timeSeries[dateStr] = 0;
    timeSeries[dateStr] += amount;

    // Build facility map for leaderboard
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

  // NEW: Sort facility data for leaderboard
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
      
      let suggestion = "";
      if (highestScope === 'scope_1') suggestion = "Consider transitioning mobile fleets to EV or auditing stationary generator usage.";
      if (highestScope === 'scope_2') suggestion = "Evaluate purchasing Renewable Energy Certificates (RECs) or auditing facility HVAC efficiency.";
      if (highestScope === 'scope_3') suggestion = "Initiate supplier sustainability audits and evaluate employee business travel policies.";

      insights.push({
        type: 'info', icon: '🔍', title: `Primary Emitter: ${scopeName}`,
        text: `${scopeName} accounts for a massive ${scopePercentage}% of your total footprint. ${suggestion}`
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
        <div style={{ background: 'white', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <p style={{ margin: 0, fontWeight: 'bold', color: '#333' }}>{payload[0].payload.year || payload[0].payload.date}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ margin: 0, color: entry.color || entry.fill, fontWeight: 'bold' }}>
              {entry.name}: {Number(entry.value).toLocaleString()} {entry.name === 'Actual Emissions' || entry.name === 'co2e' || entry.name === 'CO2e' ? 'kg' : ''}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div ref={reportRef} style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px', background: '#f8f9fa', padding: '20px' }}>
      
      {/* --- RESPONSIVE HEADER SECTION --- */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <img src={myLogo} alt="ESG Platform Logo" style={{ height: '40px', width: 'auto', borderRadius: '4px' }} />
          <h1 style={{ margin: 0, color: '#212529', whiteSpace: 'nowrap', lineHeight: '1.2' }}>Platform Overview</h1>
        </div>
        
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select 
            value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)}
            style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontWeight: 'bold', cursor: 'pointer', background: 'white' }}
          >
            <option value="ALL">All Time</option>
            <option value="365">Last 12 Months</option>
            <option value="90">Last 90 Days</option>
            <option value="30">Last 30 Days</option>
          </select>

          <button onClick={exportToCSV} style={{ background: '#198754', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
            📊 Export CSV
          </button>

          <button 
            onClick={generatePDF} disabled={isExporting}
            style={{ background: isExporting ? '#6c757d' : '#dc3545', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: isExporting ? 'wait' : 'pointer' }}
          >
            {isExporting ? '⏳ Generating PDF...' : '📄 Export PDF'}
          </button>

          <Link to="/data-entry" style={{ background: '#0d6efd', color: 'white', padding: '10px 20px', textDecoration: 'none', borderRadius: '4px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
            + Log New Data
          </Link>
        </div>
      </div>
      
      {error && <p style={{ color: '#dc3545', background: '#f8d7da', padding: '10px', borderRadius: '4px' }}>{error}</p>}

      {/* --- STATS CARDS --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        
        <div style={{ padding: '20px', borderLeft: `5px solid #d32f2f`, borderRadius: '8px', background: '#ffebee', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#d32f2f', fontSize: '1rem' }}>Total Approved Carbon</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#b71c1c' }}>
            {totalCO2e.toLocaleString()} <span style={{ fontSize: '1rem', color: '#6c757d' }}>kg CO2e</span>
          </p>
        </div>

        <div style={{ padding: '20px', borderLeft: `5px solid #ffc107`, borderRadius: '8px', background: '#fffbeb', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#b48600', fontSize: '1rem' }}>Pending Audit (CO2e)</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#212529' }}>
            {pendingCO2e.toLocaleString()} <span style={{ fontSize: '1rem', color: '#6c757d' }}>kg</span>
          </p>
        </div>

        {/* UPDATED: Dynamic Active Facilities count replaces static Total Organizations */}
        <div style={{ padding: '20px', borderLeft: '5px solid #6c757d', borderRadius: '8px', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#6c757d', fontSize: '1rem' }}>Active Reporting Nodes</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#212529' }}>
            {activeFacilitiesCount} <span style={{ fontSize: '1rem', color: '#6c757d' }}>Facilities</span>
          </p>
        </div>

        <div style={{ padding: '20px', borderLeft: `5px solid ${COLORS.S}`, borderRadius: '8px', background: '#e3f2fd', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: COLORS.S, fontSize: '1rem' }}>Social Logs</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#0d47a1' }}>{socCount}</p>
        </div>

        <div style={{ padding: '20px', borderLeft: `5px solid ${COLORS.G}`, borderRadius: '8px', background: '#fff3e0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: COLORS.G, fontSize: '1rem' }}>Governance Logs</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#e65100' }}>{govCount}</p>
        </div>

      </div>

      <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'center' }}>
        <ReportGenerator />
      </div>

      <SectorOnboarding />
      <MaterialityMatrix />

      {/* --- AI INSIGHTS ENGINE --- */}
      {dynamicInsights.length > 0 && (
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.2rem', color: '#495057', borderBottom: '2px solid #dee2e6', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            ⚡ Strategic Insights
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
            {dynamicInsights.map((insight, index) => {
              const theme = {
                danger: { bg: '#fff5f5', border: '#ffc9c9', text: '#c92a2a' },
                success: { bg: '#f4fce3', border: '#d8f5a2', text: '#5c940d' },
                info: { bg: '#e7f5ff', border: '#a5d8ff', text: '#1864ab' },
                warning: { bg: '#fff9db', border: '#ffec99', text: '#e67700' }
              }[insight.type];

              return (
                <div key={index} style={{ background: theme.bg, border: `1px solid ${theme.border}`, padding: '20px', borderRadius: '8px', display: 'flex', gap: '15px' }}>
                  <div style={{ fontSize: '1.5rem' }}>{insight.icon}</div>
                  <div>
                    <h4 style={{ margin: '0 0 5px 0', color: theme.text, fontSize: '1rem' }}>{insight.title}</h4>
                    <p style={{ margin: 0, color: '#495057', fontSize: '0.9rem', lineHeight: '1.4' }}>{insight.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- FORECASTING CHART & TARGET SETTER --- */}
      <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? '2fr 1fr' : '1fr', gap: '20px', marginBottom: '40px' }}>
        
        <div style={{ background: '#fff', padding: '25px', border: '1px solid #e0e0e0', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginTop: 0, color: '#495057' }}>Net-Zero Trajectory vs Actuals</h3>
          {forecastData.length === 0 ? <p style={{ color: '#666' }}>No approved data available.</p> : (
            <div style={{ width: '100%', height: '350px', minHeight: '350px', minWidth: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={forecastData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="Actual Emissions" fill={COLORS.Actual} radius={[4, 4, 0, 0]} maxBarSize={60} />
                  <Line type="monotone" dataKey="Target Trajectory" stroke={COLORS.Target} strokeWidth={3} strokeDasharray="5 5" dot={true} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {isAdmin && (
          <div style={{ background: '#f8f9fa', padding: '25px', border: '1px solid #dee2e6', borderRadius: '8px' }}>
            <h3 style={{ marginTop: 0, color: '#495057' }}>🎯 Set Reduction Goal</h3>
            <form onSubmit={handleSetTarget} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Organization</label>
                <select onChange={e => setTargetForm({...targetForm, organization_id: e.target.value})} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
                  <option value="">Select Org</option>
                  {organizations.map(o => <option key={o.unit_id} value={o.unit_id}>{o.name}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Base Year</label>
                  <input type="number" value={targetForm.baseline_year} onChange={e => setTargetForm({...targetForm, baseline_year: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ccc' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Target Year</label>
                  <input type="number" value={targetForm.target_year} onChange={e => setTargetForm({...targetForm, target_year: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ccc' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Reduction % Goal</label>
                <input type="number" value={targetForm.reduction_percentage} onChange={e => setTargetForm({...targetForm, reduction_percentage: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ccc' }} />
              </div>

              <button type="submit" style={{ background: '#dc3545', color: 'white', border: 'none', padding: '10px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
                Lock In Target
              </button>
            </form>
          </div>
        )}
      </div>

      {/* --- SECONDARY DATA VISUALIZATION SECTION --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        
        <div style={{ gridColumn: '1 / -1' }}> 
          <SDGTracker />
        </div>

        {/* CHART 1: Emissions by Scope */}
        <div style={{ background: '#fff', padding: '20px', border: '1px solid #e0e0e0', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginTop: 0, color: '#495057', textAlign: 'center' }}>Emissions by Scope</h3>
          {pieDataScope.length === 0 ? <p style={{ color: '#666', textAlign: 'center', marginTop: '40px' }}>No scope data available.</p> : (
            <div style={{ width: '100%', height: '250px', minHeight: '250px', minWidth: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieDataScope} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}>
                    {pieDataScope.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value.toLocaleString()} kg`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* NEW CHART 2: Facility Leaderboard */}
        <div style={{ background: '#fff', padding: '20px', border: '1px solid #e0e0e0', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginTop: 0, color: '#495057', textAlign: 'center' }}>Facility Leaderboard</h3>
          {facilityData.length === 0 ? <p style={{ color: '#666', textAlign: 'center', marginTop: '40px' }}>No facility data available.</p> : (
            <div style={{ width: '100%', height: '250px', minHeight: '250px', minWidth: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={facilityData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" tick={{fontSize: 12}} width={100} />
                  <Tooltip formatter={(value) => `${value.toLocaleString()} kg CO₂e`} content={<CustomTooltip />} />
                  <Bar dataKey="CO2e" fill="#0d6efd" radius={[0, 4, 4, 0]}>
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

        {/* CHART 3: Ingestion Timeline */}
        <div style={{ background: '#fff', padding: '20px', border: '1px solid #e0e0e0', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginTop: 0, color: '#495057', textAlign: 'center' }}>Recent Ingestion Timeline</h3>
          {barDataTimeline.length === 0 ? <p style={{ color: '#666', textAlign: 'center', marginTop: '40px' }}>No timeline data available.</p> : (
            <div style={{ width: '100%', height: '250px', minHeight: '250px', minWidth: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barDataTimeline} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{fontSize: 12}} />
                  <YAxis tick={{fontSize: 12}} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="co2e" fill="#198754" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* CHART 4: General ESG Distribution */}
        <div style={{ background: '#fff', padding: '20px', border: '1px solid #e0e0e0', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginTop: 0, color: '#495057', textAlign: 'center' }}>ESG Log Distribution</h3>
          {pieDataESG.length === 0 ? <p style={{ color: '#666', textAlign: 'center', marginTop: '40px' }}>No ESG data available.</p> : (
            <div style={{ width: '100%', height: '250px', minHeight: '250px', minWidth: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieDataESG} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}>
                    {pieDataESG.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

      </div>

      {/* --- RECENT ACTIVITY FEED --- */}
      <h2 style={{ fontSize: '1.2rem', color: '#495057', borderBottom: '2px solid #dee2e6', paddingBottom: '10px' }}>
        Recent Activity Log
      </h2>
      {recentObs.length === 0 ? (
        <p style={{ color: '#666' }}>No activity in this timeframe.</p>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          {recentObs.map((obs, index) => (
            <div key={obs.observation_id} style={{ 
              padding: '15px 20px', 
              borderBottom: index !== recentObs.length - 1 ? '1px solid #dee2e6' : 'none',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>
                  {obs.organization_name} logged <span style={{ color: '#0d6efd' }}>{obs.metric_name}</span>
                </p>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#6c757d' }}>
                  {new Date(obs.timestamp).toLocaleString()}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold', color: '#212529' }}>
                  {obs.numeric_value !== null ? obs.numeric_value : obs.text_value} 
                  <span style={{ fontSize: '0.9rem', color: '#6c757d', fontWeight: 'normal', marginLeft: '5px' }}>
                    {obs.unit_of_measure}
                  </span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;