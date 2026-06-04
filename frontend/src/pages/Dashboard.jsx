import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function Dashboard() {
  // 1. New States for storing raw data and our active filter
  const [rawObservations, setRawObservations] = useState([]);
  const [orgCount, setOrgCount] = useState(0);
  const [timeFilter, setTimeFilter] = useState('ALL'); 
  const [loading, setLoading] = useState(true);

  const COLORS = { E: '#4caf50', S: '#2196f3', G: '#ff9800' };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [orgRes, obsRes] = await Promise.all([
          axios.get('http://localhost:5000/api/organizations'),
          axios.get('http://localhost:5000/api/observations')
        ]);
        setOrgCount(orgRes.data.length);
        setRawObservations(obsRes.data);
        setLoading(false);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) return <p style={{ fontSize: '1.2rem', color: '#666' }}>Loading live data...</p>;

  // --- 2. DYNAMIC FILTERING LOGIC ---
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

  // Recalculate stats based on the filtered data
  const envCount = filteredObs.filter(o => o.pillar === 'E').length;
  const socCount = filteredObs.filter(o => o.pillar === 'S').length;
  const govCount = filteredObs.filter(o => o.pillar === 'G').length;
  const recentObs = filteredObs.slice(0, 5);

  // --- 3. CHART DATA PROCESSING ---
  const pieData = [
    { name: 'Environmental', value: envCount, fill: COLORS.E },
    { name: 'Social', value: socCount, fill: COLORS.S },
    { name: 'Governance', value: govCount, fill: COLORS.G }
  ].filter(d => d.value > 0);

  const barData = [...recentObs].reverse().map(obs => ({
    name: obs.metric_name,
    value: parseFloat(obs.numeric_value),
    unit: obs.unit_of_measure,
    fill: COLORS[obs.pillar]
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ background: 'white', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>{data.name}</p>
          <p style={{ margin: 0, color: data.fill }}>{data.value} {data.unit}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2 style={{ margin: 0 }}>Platform Overview</h2>
        
        {/* 4. The Time Filter Dropdown */}
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <select 
            value={timeFilter} 
            onChange={(e) => setTimeFilter(e.target.value)}
            style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontWeight: 'bold', cursor: 'pointer' }}
          >
            <option value="ALL">All Time</option>
            <option value="365">Last 12 Months</option>
            <option value="90">Last 90 Days</option>
            <option value="30">Last 30 Days</option>
          </select>

          <Link to="/data-entry" style={{ background: '#0d6efd', color: 'white', padding: '10px 20px', textDecoration: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
            + Log New Data
          </Link>
        </div>
      </div>
      
      {/* --- STATS CARDS --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <div style={{ padding: '20px', border: '1px solid #e0e0e0', borderRadius: '8px', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#666', fontSize: '1rem' }}>Total Organizations</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#212529' }}>{orgCount}</p>
        </div>
        <div style={{ padding: '20px', border: '1px solid #c8e6c9', borderRadius: '8px', background: '#e8f5e9', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#2e7d32', fontSize: '1rem' }}>Environmental Logs</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#1b5e20' }}>{envCount}</p>
        </div>
        <div style={{ padding: '20px', border: '1px solid #bbdefb', borderRadius: '8px', background: '#e3f2fd', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#1565c0', fontSize: '1rem' }}>Social Logs</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#0d47a1' }}>{socCount}</p>
        </div>
        <div style={{ padding: '20px', border: '1px solid #ffe0b2', borderRadius: '8px', background: '#fff3e0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#e65100', fontSize: '1rem' }}>Governance Logs</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#bf360c' }}>{govCount}</p>
        </div>
      </div>

      {/* --- DATA VISUALIZATION SECTION --- */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginBottom: '40px' }}>
        
        {/* Pie Chart Card */}
        <div style={{ background: '#fff', padding: '20px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
          <h3 style={{ marginTop: 0, color: '#333' }}>ESG Distribution</h3>
          {pieData.length === 0 ? <p style={{ color: '#666' }}>No data in this timeframe.</p> : (
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
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

        {/* Bar Chart Card */}
        <div style={{ background: '#fff', padding: '20px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
          <h3 style={{ marginTop: 0, color: '#333' }}>Recent Metric Values</h3>
          {barData.length === 0 ? <p style={{ color: '#666' }}>No data in this timeframe.</p> : (
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
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
      <h3>Recent Activity Log</h3>
      {recentObs.length === 0 ? (
        <p style={{ color: '#666' }}>No activity in this timeframe.</p>
      ) : (
        <div style={{ background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '8px', overflow: 'hidden' }}>
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
                  {obs.numeric_value} <span style={{ fontSize: '0.9rem', color: '#6c757d', fontWeight: 'normal' }}>{obs.unit_of_measure}</span>
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