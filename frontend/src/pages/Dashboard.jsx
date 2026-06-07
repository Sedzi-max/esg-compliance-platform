import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { 
  PieChart, Pie, Cell, BarChart, Bar, Line, ComposedChart, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
// Import your new logo
import myLogo from '../assets/logo.png';

function Dashboard() {
  const [rawObservations, setRawObservations] = useState([]);
  const [emissions, setEmissions] = useState([]); 
  const [targets, setTargets] = useState([]); 
  const [organizations, setOrganizations] = useState([]);
  const [orgCount, setOrgCount] = useState(0);
  const [timeFilter, setTimeFilter] = useState('ALL'); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Create a reference to the main dashboard container and export state
  const reportRef = useRef();
  const [isExporting, setIsExporting] = useState(false);

  // Check if current user is an Admin
  const userStr = localStorage.getItem('user');
  const isAdmin = userStr ? JSON.parse(userStr).role === 'Admin' : false;

  const [targetForm, setTargetForm] = useState({
    organization_id: '', scope_category: 'All', baseline_year: new Date().getFullYear(), target_year: new Date().getFullYear() + 5, reduction_percentage: 15
  });

  const COLORS = { 
    E: '#2e7d32', S: '#1565c0', G: '#e65100', 
    Actual: '#1976d2', Target: '#d32f2f',
    Scope1: '#0088FE', Scope2: '#00C49F', Scope3: '#FFBB28'
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

  // 2. The PDF Generation Engine
  const generatePDF = async () => {
    setIsExporting(true);
    try {
      const element = reportRef.current;
      
      // Take a high-res screenshot of the dashboard
      const canvas = await html2canvas(element, { 
        scale: 2, // Doubles the resolution for crisp text
        useCORS: true, // Ensures charts render correctly
        backgroundColor: '#f8f9fa' // Matches your app background
      });
      
      const imgData = canvas.toDataURL('image/png');
      
      // Initialize an A4, Portrait PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Calculate dimensions to fit the image perfectly on the page
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
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

  // --- FILTER 1: Generic Observations ---
  const filteredObs = rawObservations.filter(obs => {
    if (timeFilter === 'ALL') return true;
    const obsDate = new Date(obs.timestamp);
    const diffDays = Math.ceil(Math.abs(now - obsDate) / (1000 * 60 * 60 * 24));
    if (timeFilter === '30') return diffDays <= 30;
    if (timeFilter === '90') return diffDays <= 90;
    if (timeFilter === '365') return diffDays <= 365;
    return true;
  });

  // --- FILTER 2: Carbon Emissions ---
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

  // --- STAT CALCULATIONS ---
  const envCount = filteredObs.filter(o => o.pillar === 'E').length;
  const socCount = filteredObs.filter(o => o.pillar === 'S').length;
  const govCount = filteredObs.filter(o => o.pillar === 'G').length;
  const totalCO2e = approvedEmissions.reduce((sum, item) => sum + Number(item.calculated_co2e), 0);
  const pendingCO2e = pendingEmissions.reduce((sum, item) => sum + Number(item.calculated_co2e), 0);
  
  const recentObs = filteredObs.slice(0, 5);

  // --- CHART DATA PREP ---
  const pieDataESG = [
    { name: 'Environmental', value: envCount, fill: COLORS.E },
    { name: 'Social', value: socCount, fill: COLORS.S },
    { name: 'Governance', value: govCount, fill: COLORS.G }
  ].filter(d => d.value > 0);

  const scopeTotals = { 'scope_1': 0, 'scope_2': 0, 'scope_3': 0 };
  const timeSeries = {};

  // Sort emissions chronologically for the timeline chart
  const sortedEmissions = [...approvedEmissions].sort((a,b) => new Date(a.recorded_date) - new Date(b.recorded_date));

  sortedEmissions.forEach(e => {
    const amount = Number(e.calculated_co2e);
    if (scopeTotals[e.scope_category] !== undefined) scopeTotals[e.scope_category] += amount;
    
    const dateStr = new Date(e.recorded_date).toLocaleDateString();
    if (!timeSeries[dateStr]) timeSeries[dateStr] = 0;
    timeSeries[dateStr] += amount;
  });

  const pieDataScope = [
    { name: 'Scope 1', value: scopeTotals.scope_1, fill: COLORS.Scope1 },
    { name: 'Scope 2', value: scopeTotals.scope_2, fill: COLORS.Scope2 },
    { name: 'Scope 3', value: scopeTotals.scope_3, fill: COLORS.Scope3 }
  ].filter(d => d.value > 0);

  const barDataTimeline = Object.keys(timeSeries).map(date => ({
    date, co2e: timeSeries[date]
  }));

  // ==============================================================
  // FORECASTING MATH ENGINE
  // ==============================================================
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

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'white', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <p style={{ margin: 0, fontWeight: 'bold', color: '#333' }}>{payload[0].payload.year || payload[0].payload.date}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ margin: 0, color: entry.color || entry.fill, fontWeight: 'bold' }}>
              {entry.name}: {Number(entry.value).toLocaleString()} {entry.name === 'Actual Emissions' || entry.name === 'co2e' ? 'kg' : ''}
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

        {/* BRANDING CONTAINER: Logo + Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <img 
            src={myLogo} 
            alt="ESG Platform Logo" 
            style={{ height: '40px', width: 'auto', borderRadius: '4px' }} 
          />
          <h1 style={{ margin: 0, color: '#212529', whiteSpace: 'nowrap', lineHeight: '1.2' }}>Platform Overview</h1>
        </div>
        
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select 
            value={timeFilter} 
            onChange={(e) => setTimeFilter(e.target.value)}
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
            onClick={generatePDF} 
            disabled={isExporting}
            style={{ 
              background: isExporting ? '#6c757d' : '#dc3545', 
              color: 'white', 
              padding: '10px 20px', 
              border: 'none', 
              borderRadius: '4px', 
              fontWeight: 'bold', 
              cursor: isExporting ? 'wait' : 'pointer' 
            }}
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

        {activeTarget ? (
          <div style={{ padding: '20px', borderLeft: `5px solid #198754`, borderRadius: '8px', background: '#e8f5e9', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#198754', fontSize: '1rem' }}>Active Corporate Goal</h3>
            <p style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0, color: '#155724' }}>
              Reduce by {activeTarget.reduction_percentage}% by {activeTarget.target_year}
            </p>
          </div>
        ) : (
          <div style={{ padding: '20px', borderLeft: '5px solid #6c757d', borderRadius: '8px', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#6c757d', fontSize: '1rem' }}>Total Organizations</h3>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#212529' }}>{orgCount}</p>
          </div>
        )}

        <div style={{ padding: '20px', borderLeft: `5px solid ${COLORS.S}`, borderRadius: '8px', background: '#e3f2fd', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: COLORS.S, fontSize: '1rem' }}>Social Logs</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#0d47a1' }}>{socCount}</p>
        </div>
      </div>

      {/* --- FORECASTING CHART & TARGET SETTER --- */}
      <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? '2fr 1fr' : '1fr', gap: '20px', marginBottom: '40px' }}>
        
        <div style={{ background: '#fff', padding: '25px', border: '1px solid #e0e0e0', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginTop: 0, color: '#495057' }}>Net-Zero Trajectory vs Actuals</h3>
          {forecastData.length === 0 ? <p style={{ color: '#666' }}>No approved data available.</p> : (
            <div style={{ width: '100%', height: '350px' }}>
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

      {/* --- SECONDARY DATA VISUALIZATION SECTION (THE BLEND) --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        
        {/* CHART 1: Emissions by Scope */}
        <div style={{ background: '#fff', padding: '20px', border: '1px solid #e0e0e0', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginTop: 0, color: '#495057', textAlign: 'center' }}>Emissions by Scope</h3>
          {pieDataScope.length === 0 ? <p style={{ color: '#666', textAlign: 'center', marginTop: '40px' }}>No scope data available.</p> : (
            <div style={{ width: '100%', height: '250px' }}>
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

        {/* CHART 2: Ingestion Timeline */}
        <div style={{ background: '#fff', padding: '20px', border: '1px solid #e0e0e0', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginTop: 0, color: '#495057', textAlign: 'center' }}>Recent Ingestion Timeline</h3>
          {barDataTimeline.length === 0 ? <p style={{ color: '#666', textAlign: 'center', marginTop: '40px' }}>No timeline data available.</p> : (
            <div style={{ width: '100%', height: '250px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barDataTimeline} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{fontSize: 12}} />
                  <YAxis tick={{fontSize: 12}} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="co2e" fill="#0d6efd" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* CHART 3: General ESG Distribution */}
        <div style={{ background: '#fff', padding: '20px', border: '1px solid #e0e0e0', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginTop: 0, color: '#495057', textAlign: 'center' }}>ESG Log Distribution</h3>
          {pieDataESG.length === 0 ? <p style={{ color: '#666', textAlign: 'center', marginTop: '40px' }}>No ESG data available.</p> : (
            <div style={{ width: '100%', height: '250px' }}>
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

      {/* --- RESTORED: RECENT ACTIVITY FEED --- */}
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