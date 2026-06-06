import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function Dashboard() {
  const [rawObservations, setRawObservations] = useState([]);
  const [orgCount, setOrgCount] = useState(0);
  const [timeFilter, setTimeFilter] = useState('ALL'); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const COLORS = { E: '#2e7d32', S: '#1565c0', G: '#e65100' };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // ADDED: Auth tokens to allow the Dashboard to fetch secure data
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };

        const [orgRes, obsRes] = await Promise.all([
          axios.get('/api/organizations', config),
          axios.get('/api/observations', config)
        ]);
        setOrgCount(orgRes.data.length);
        setRawObservations(obsRes.data);
        setLoading(false);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
        setError("Failed to load dashboard metrics. Ensure you are logged in.");
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const exportToCSV = () => {
    const headers = ["Date", "Time", "Organization", "Jurisdiction", "ESG Pillar", "Metric Name", "Numeric Value", "Text Value", "Unit of Measure"];
    
    const csvRows = rawObservations.map(obs => {
      const dateObj = new Date(obs.timestamp);
      return [
        dateObj.toLocaleDateString(),
        dateObj.toLocaleTimeString(),
        `"${obs.organization_name}"`, 
        `"${obs.jurisdiction || ''}"`,
        obs.pillar,
        `"${obs.metric_name}"`,
        obs.numeric_value !== null ? obs.numeric_value : "",
        obs.text_value !== null ? `"${obs.text_value}"` : "",
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

  if (loading) return <p style={{ fontSize: '1.2rem', color: '#666', textAlign: 'center', marginTop: '50px' }}>Loading live data...</p>;

  // --- DYNAMIC FILTERING LOGIC ---
  const now = new Date();
  const filteredObs = rawObservations.filter(obs => {
    if (timeFilter === 'ALL') return true;
    const obsDate = new Date(obs.timestamp);
    const diffTime = Math.abs(now - obsDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (timeFilter === '30') return diffDays <= 30;
    if (timeFilter === '90') return diffDays <= 90;
    if (timeFilter === '365') return diffDays <= 365;
    return true;
  });

  const envCount = filteredObs.filter(o => o.pillar === 'E').length;
  const socCount = filteredObs.filter(o => o.pillar === 'S').length;
  const govCount = filteredObs.filter(o => o.pillar === 'G').length;
  const recentObs = filteredObs.slice(0, 5);

  const pieData = [
    { name: 'Environmental', value: envCount, fill: COLORS.E },
    { name: 'Social', value: socCount, fill: COLORS.S },
    { name: 'Governance', value: govCount, fill: COLORS.G }
  ].filter(d => d.value > 0);

  const numericObs = [...filteredObs].filter(obs => obs.numeric_value !== null).slice(0, 5);
  const barData = numericObs.reverse().map(obs => ({
    name: obs.metric_name,
    value: parseFloat(obs.numeric_value),
    unit: obs.unit_of_measure,
    fill: COLORS[obs.pillar]
  }));

  // --- NEW: ENERGY AGGREGATION LOGIC ---
  const energyObservations = filteredObs.filter(
    obs => obs.metric_name === 'Scope 2 Electricity Consumption' && obs.numeric_value !== null
  );

  const aggregatedEnergy = energyObservations.reduce((acc, curr) => {
    const orgName = curr.organization_name;
    if (!acc[orgName]) {
      acc[orgName] = { name: orgName, kWh: 0 };
    }
    acc[orgName].kWh += Number(curr.numeric_value);
    return acc;
  }, {});

  const energyChartData = Object.values(aggregatedEnergy);
  const totalEnergy = energyChartData.reduce((sum, item) => sum + item.kWh, 0);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ background: 'white', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <p style={{ margin: 0, fontWeight: 'bold', color: '#333' }}>{data.name}</p>
          <p style={{ margin: 0, color: data.fill || '#2e7d32', fontWeight: 'bold' }}>
            {data.value || data.kWh} {data.unit || 'kWh'}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}>
      
      {/* --- RESPONSIVE HEADER SECTION --- */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ margin: 0, color: '#212529', whiteSpace: 'nowrap', lineHeight: '1.2' }}>Platform Overview</h1>
        
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

          <button 
            onClick={exportToCSV} 
            style={{ background: '#198754', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            📊 Export CSV
          </button>

          <Link to="/data-entry" style={{ background: '#0d6efd', color: 'white', padding: '10px 20px', textDecoration: 'none', borderRadius: '4px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
            + Log New Data
          </Link>
        </div>
      </div>
      
      {error && <p style={{ color: '#dc3545', background: '#f8d7da', padding: '10px', borderRadius: '4px' }}>{error}</p>}

      {/* --- STATS CARDS --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <div style={{ padding: '20px', borderLeft: '5px solid #6c757d', borderRadius: '8px', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#6c757d', fontSize: '1rem' }}>Total Organizations</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#212529' }}>{orgCount}</p>
        </div>
        <div style={{ padding: '20px', borderLeft: `5px solid ${COLORS.E}`, borderRadius: '8px', background: '#e8f5e9', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: COLORS.E, fontSize: '1rem' }}>Total Energy Logged</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#1b5e20' }}>{totalEnergy.toLocaleString()} <span style={{ fontSize: '1rem', color: '#6c757d' }}>kWh</span></p>
        </div>
        <div style={{ padding: '20px', borderLeft: `5px solid ${COLORS.S}`, borderRadius: '8px', background: '#e3f2fd', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: COLORS.S, fontSize: '1rem' }}>Social Logs</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#0d47a1' }}>{socCount}</p>
        </div>
        <div style={{ padding: '20px', borderLeft: `5px solid ${COLORS.G}`, borderRadius: '8px', background: '#fff3e0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: COLORS.G, fontSize: '1rem' }}>Governance Logs</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#bf360c' }}>{govCount}</p>
        </div>
      </div>

      {/* --- NEW: ENERGY CONSUMPTION CHART --- */}
      <div style={{ background: '#fff', padding: '25px', marginBottom: '40px', border: '1px solid #e0e0e0', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#495057' }}>Energy Consumption by Facility (Scope 2)</h3>
        {energyChartData.length === 0 ? (
          <p style={{ color: '#666', textAlign: 'center', padding: '40px 0' }}>No electricity data logged in this timeframe.</p>
        ) : (
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
              <BarChart data={energyChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                <XAxis dataKey="name" tick={{ fill: '#6c757d', fontSize: 12 }} />
                <YAxis tick={{ fill: '#6c757d' }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8f9fa' }} />
                <Legend />
                <Bar dataKey="kWh" name="Electricity (kWh)" fill="#2e7d32" radius={[4, 4, 0, 0]} animationDuration={1000} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* --- SECONDARY DATA VISUALIZATION SECTION --- */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginBottom: '40px' }}>
        
        {/* Pie Chart Card */}
        <div style={{ background: '#fff', padding: '20px', border: '1px solid #e0e0e0', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginTop: 0, color: '#495057', textAlign: 'center' }}>ESG Distribution</h3>
          {pieData.length === 0 ? <p style={{ color: '#666', textAlign: 'center', marginTop: '40px' }}>No data in this timeframe.</p> : (
            <div style={{ width: '100%', height: 300, minHeight: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Bar Chart Card (Recent Entries) */}
        <div style={{ background: '#fff', padding: '20px', border: '1px solid #e0e0e0', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginTop: 0, color: '#495057', textAlign: 'center' }}>Recent Numeric Values</h3>
          {barData.length === 0 ? <p style={{ color: '#666', textAlign: 'center', marginTop: '40px' }}>No numeric data in this timeframe.</p> : (
            <div style={{ width: '100%', height: 300, minHeight: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{fontSize: 12}} />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} />
                </BarChart>
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