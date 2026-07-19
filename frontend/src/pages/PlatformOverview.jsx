import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const SECTOR_COLORS = { general: '#6b7280', banking: '#3b82f6', insurance: '#8b5cf6', energy: '#f59e0b' };
const SECTOR_LABELS = { general: 'General', banking: 'Banking', insurance: 'Insurance', energy: 'Energy' };

function PlatformOverview() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [companiesBySector, setCompaniesBySector] = useState([]);
    const [usersByRole, setUsersByRole] = useState([]);
    const [pendingCount, setPendingCount] = useState(0);
    const [companies, setCompanies] = useState([]);
    const [activitySummary, setActivitySummary] = useState({ approved_records: 0, pending_records: 0, total_approved_co2e: 0 });

    useEffect(() => {
        fetchOverview();
    }, []);

    const fetchOverview = async () => {
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/platform/overview', {
                headers: { Authorization: `Bearer ${token}` }
            });

            setCompaniesBySector(response.data.companiesBySector || []);
            setUsersByRole(response.data.usersByRole || []);
            setPendingCount(response.data.pendingCount || 0);
            setCompanies(response.data.companies || []);
            setActivitySummary(response.data.activitySummary || { approved_records: 0, pending_records: 0, total_approved_co2e: 0 });
        } catch (err) {
            console.error('Failed to load platform overview:', err);
            setError('Failed to load platform overview. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const totalCompanies = companiesBySector.reduce((sum, s) => sum + Number(s.company_count), 0);

    const sectorChartData = companiesBySector.map(row => ({
        name: SECTOR_LABELS[row.sector] || row.sector,
        value: Number(row.company_count),
        fill: SECTOR_COLORS[row.sector] || '#94a3b8',
    }));

    const roleChartData = usersByRole
        .filter(row => row.role !== 'Pending' && row.role !== 'Super Admin')
        .map(row => ({ role: row.role, count: Number(row.user_count) }));

    if (loading) {
        return <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>Compiling platform overview...</div>;
    }

    return (
        <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '40px', fontFamily: 'system-ui, sans-serif' }}>

            <div style={{ marginBottom: '32px', borderBottom: '1px solid #e2e8f0', paddingBottom: '24px' }}>
                <h1 style={{ fontSize: '28px', margin: '0 0 6px 0', fontWeight: '800', color: '#0f172a' }}>
                    🌐 Platform Overview
                </h1>
                <p style={{ margin: 0, color: '#64748b', fontSize: '15px' }}>
                    Cross-company view of ESG Radar — visible only to Super Admin.
                </p>
            </div>

            {error && (
                <div style={{ backgroundColor: '#fef2f2', color: '#991b1b', padding: '16px 20px', borderRadius: '10px', marginBottom: '24px', fontWeight: '600', fontSize: '14px', border: '1px solid #fecaca', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>⚠️ {error}</span>
                    <button onClick={fetchOverview} style={{ background: 'transparent', border: '1px solid #991b1b', color: '#991b1b', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                        Retry
                    </button>
                </div>
            )}

            {!error && (
                <>
                    {/* Summary cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                        <SummaryCard icon="🏢" label="Total Companies" value={totalCompanies} />
                        <SummaryCard icon="⏳" label="Pending Registrations" value={pendingCount} />
                        <SummaryCard icon="✅" label="Approved Records" value={Number(activitySummary.approved_records).toLocaleString()} />
                        <SummaryCard icon="🌍" label="Total Approved CO2e" value={`${Number(activitySummary.total_approved_co2e).toLocaleString()} kg`} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '32px', marginBottom: '32px' }}>

                        {/* Companies by sector */}
                        <div style={chartCardStyle}>
                            <h3 style={chartHeaderStyle}>Companies by Sector</h3>
                            {sectorChartData.length === 0 ? (
                                <div style={emptyChartStyle}>No companies registered yet.</div>
                            ) : (
                                <div style={{ width: '100%', height: '280px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={sectorChartData} cx="50%" cy="50%" innerRadius={65} outerRadius={95} paddingAngle={5} dataKey="value">
                                                {sectorChartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} stroke="none" />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend iconType="circle" wrapperStyle={{ fontSize: '13px' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>

                        {/* Users by role */}
                        <div style={chartCardStyle}>
                            <h3 style={chartHeaderStyle}>Users by Role (Platform-Wide)</h3>
                            {roleChartData.length === 0 ? (
                                <div style={emptyChartStyle}>No approved users yet.</div>
                            ) : (
                                <div style={{ width: '100%', height: '280px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={roleChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="role" tick={{ fill: '#64748b', fontSize: 12 }} />
                                            <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} allowDecimals={false} />
                                            <Tooltip />
                                            <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Company directory */}
                    <div style={chartCardStyle}>
                        <h3 style={chartHeaderStyle}>Companies</h3>
                        {companies.length === 0 ? (
                            <div style={emptyChartStyle}>No companies registered yet.</div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                                            <th style={thStyle}>Company</th>
                                            <th style={thStyle}>Sector</th>
                                            <th style={thStyle}>Users</th>
                                            <th style={thStyle}>Data Logged?</th>
                                            <th style={thStyle}>Registered</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {companies.map((c) => (
                                            <tr key={c.unit_id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                <td style={{ padding: '12px', fontWeight: '600' }}>{c.name}</td>
                                                <td style={{ padding: '12px' }}>
                                                    <span style={{
                                                        padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700',
                                                        backgroundColor: `${SECTOR_COLORS[c.sector] || '#94a3b8'}20`,
                                                        color: SECTOR_COLORS[c.sector] || '#64748b',
                                                    }}>
                                                        {SECTOR_LABELS[c.sector] || c.sector}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px' }}>{c.user_count}</td>
                                                <td style={{ padding: '12px' }}>{c.has_logged_data ? '✅ Yes' : '— No'}</td>
                                                <td style={{ padding: '12px', color: '#6b7280' }}>{new Date(c.created_at).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

const SummaryCard = ({ icon, label, value }) => (
    <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px 20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ fontSize: '24px' }}>{icon}</span>
        <div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>{value}</div>
        </div>
    </div>
);

const chartCardStyle = { backgroundColor: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' };
const chartHeaderStyle = { fontSize: '15px', fontWeight: '700', color: '#1e293b', margin: '0 0 20px 0' };
const emptyChartStyle = { padding: '60px 0', textAlign: 'center', color: '#94a3b8', fontSize: '13px' };
const thStyle = { padding: '12px', textAlign: 'left', fontWeight: '700', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' };

export default PlatformOverview;
