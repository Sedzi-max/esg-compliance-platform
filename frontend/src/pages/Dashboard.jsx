import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

function Dashboard() {
  const [stats, setStats] = useState({
    orgCount: 0,
    obsCount: 0,
    envCount: 0,
    socCount: 0,
    govCount: 0
  });
  const [recentObs, setRecentObs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch both organizations and observations in parallel
        const [orgRes, obsRes] = await Promise.all([
          axios.get('http://localhost:5000/api/organizations'),
          axios.get('http://localhost:5000/api/observations')
        ]);

        const orgs = orgRes.data;
        const obs = obsRes.data;

        // Calculate our high-level platform stats
        setStats({
          orgCount: orgs.length,
          obsCount: obs.length,
          envCount: obs.filter(o => o.pillar === 'E').length,
          socCount: obs.filter(o => o.pillar === 'S').length,
          govCount: obs.filter(o => o.pillar === 'G').length,
        });

        // Grab just the 5 most recent observations for the activity feed
        setRecentObs(obs.slice(0, 5));
        setLoading(false);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) return <p style={{ fontSize: '1.2rem', color: '#666' }}>Loading live data...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2 style={{ margin: 0 }}>Platform Overview</h2>
        <Link to="/data-entry" style={{ background: '#0d6efd', color: 'white', padding: '10px 20px', textDecoration: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
          + Log New Data
        </Link>
      </div>
      
      {/* --- STATS CARDS --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        
        <div style={{ padding: '20px', border: '1px solid #e0e0e0', borderRadius: '8px', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#666', fontSize: '1rem' }}>Total Organizations</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#212529' }}>{stats.orgCount}</p>
        </div>

        <div style={{ padding: '20px', border: '1px solid #c8e6c9', borderRadius: '8px', background: '#e8f5e9', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#2e7d32', fontSize: '1rem' }}>Environmental Logs</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#1b5e20' }}>{stats.envCount}</p>
        </div>

        <div style={{ padding: '20px', border: '1px solid #bbdefb', borderRadius: '8px', background: '#e3f2fd', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#1565c0', fontSize: '1rem' }}>Social Logs</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#0d47a1' }}>{stats.socCount}</p>
        </div>

        <div style={{ padding: '20px', border: '1px solid #ffe0b2', borderRadius: '8px', background: '#fff3e0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#e65100', fontSize: '1rem' }}>Governance Logs</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#bf360c' }}>{stats.govCount}</p>
        </div>

      </div>

      {/* --- RECENT ACTIVITY FEED --- */}
      <h3>Recent Activity</h3>
      {recentObs.length === 0 ? (
        <p style={{ color: '#666' }}>No data logged yet. Head to Data Entry to get started.</p>
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