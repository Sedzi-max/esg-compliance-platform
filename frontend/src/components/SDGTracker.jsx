import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';

// Official UN SDG Colors
const SDG_COLORS = {
  'SDG 5: Gender Equality': '#FF3A21',
  'SDG 6: Clean Water': '#26BDE2',
  'SDG 8: Decent Work': '#A21942',
  'SDG 12: Responsible Consumption': '#BF8B2E',
  'SDG 13: Climate Action': '#3F7E44',
  'Default': '#0d6efd'
};

function SDGTracker() {
  const [sdgData, setSdgData] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentYear = new Date().getFullYear().toString();

  useEffect(() => {
    const fetchSDGData = async () => {
      try {
        const token = localStorage.getItem('token');
        // We leverage the exact same dynamic reporting route we built earlier!
        const response = await axios.get(`/api/reports/framework?framework=SDG&year=${currentYear}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Format the data for Recharts
        const formattedData = response.data.map(item => ({
          name: item.framework_code,
          description: item.disclosure_requirement,
          value: Number(item.total_raw_amount) || Number(item.total_tco2e) || 0,
          color: SDG_COLORS[item.framework_code] || SDG_COLORS['Default']
        }));

        setSdgData(formattedData);
      } catch (error) {
        console.error("Failed to fetch SDG data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSDGData();
  }, [currentYear]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ background: 'white', padding: '15px', border: `2px solid ${data.color}`, borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: data.color }}>{data.name}</p>
          <p style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#6c757d', maxWidth: '200px' }}>{data.description}</p>
          <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', color: '#212529' }}>
            {data.value.toLocaleString()} <span style={{ fontSize: '0.85rem', color: '#6c757d', fontWeight: 'normal' }}>Units</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ background: '#fff', padding: '25px', border: '1px solid #e0e0e0', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
      <h3 style={{ marginTop: 0, color: '#495057', display: 'flex', alignItems: 'center', gap: '10px' }}>
        🌍 UN Sustainable Development Goals ({currentYear})
      </h3>
      <p style={{ color: '#6c757d', fontSize: '0.9rem', marginBottom: '20px' }}>
        Tracking your operational impact against global targets.
      </p>

      {loading ? (
        <p style={{ color: '#6c757d', textAlign: 'center', padding: '40px 0' }}>Syncing with UN Targets...</p>
      ) : sdgData.length === 0 ? (
        <p style={{ color: '#6c757d', textAlign: 'center', padding: '40px 0' }}>No approved data mapped to SDGs yet.</p>
      ) : (
        <div style={{ width: '100%', height: '300px', minHeight: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sdgData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis 
                dataKey="name" 
                type="category" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fontWeight: 'bold', fill: '#495057' }} 
                width={150}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8f9fa' }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={30}>
                {sdgData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default SDGTracker;