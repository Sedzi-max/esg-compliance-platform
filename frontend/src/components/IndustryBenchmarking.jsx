import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area
} from 'recharts';

function IndustryBenchmarking() {
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [data, setData] = useState(null);

    useEffect(() => {
        fetchBenchmarking(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [year]);

    const fetchBenchmarking = async (isCurrent = true) => {
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`/api/benchmarking/overview?year=${encodeURIComponent(year)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (isCurrent) setData(response.data);
        } catch (err) {
            console.error('Failed to load benchmarking data:', err);
            if (isCurrent) {
                setError('Failed to load industry benchmarking. Please try again.');
                setData(null);
            }
        } finally {
            if (isCurrent) setLoading(false);
        }
    };

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const entry = payload[0];
            return (
                <div style={{ background: 'white', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                    <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', color: '#111827' }}>{entry.payload.name || entry.payload.range}</p>
                    <p style={{ margin: 0, color: entry.fill, fontWeight: '600', fontSize: '14px' }}>
                        {entry.payload.name ? `${entry.value} ${data?.unit || ''}` : `${entry.payload.count} companies`}
                    </p>
                </div>
            );
        }
        return null;
    };

    if (loading) {
        return (
            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', textAlign: 'center', color: '#6b7280' }}>
                Compiling anonymized industry benchmarking...
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', border: '1px solid #fecaca', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <div style={{ backgroundColor: '#fef2f2', color: '#991b1b', padding: '16px 20px', borderRadius: '10px', fontWeight: '600', fontSize: '14px', border: '1px solid #fecaca', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>⚠️ {error}</span>
                    <button onClick={() => fetchBenchmarking(true)} style={{ background: 'transparent', border: '1px solid #991b1b', color: '#991b1b', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#111827', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        📊 Anonymized Industry Benchmarking
                    </h2>
                    <p style={{ margin: 0, color: '#6b7280', fontSize: '15px', maxWidth: '600px' }}>
                        Real, anonymized aggregate data from other {data?.sector || ''} companies on the platform — no individual company's figures are ever shown.
                    </p>
                </div>

                <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#f9fafb', fontSize: '14px', fontWeight: '600', color: '#374151', cursor: 'pointer', outline: 'none' }}
                >
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                </select>
            </div>

            {data?.insufficientData ? (
                <div style={{ backgroundColor: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: '12px', padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                    <div style={{ fontSize: '28px', marginBottom: '12px' }}>🔒</div>
                    <p style={{ margin: 0, maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto' }}>{data.message}</p>
                </div>
            ) : (
                <>
                    {/* General-sector caveat, since that metric isn't normalized by company size */}
                    {data?.sector === 'general' && (
                        <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: '#92400e' }}>
                            ⚠️ This metric is a raw total, not adjusted for company size, revenue, or facility count — treat it as directional, not a precise ranking.
                        </div>
                    )}

                    <div style={{
                        backgroundColor: data?.userPercentile !== null && data.userPercentile < 50 ? '#fef2f2' : '#eff6ff',
                        border: `1px solid ${data?.userPercentile !== null && data.userPercentile < 50 ? '#fecaca' : '#bfdbfe'}`,
                        padding: '20px', borderRadius: '12px', marginBottom: '32px', display: 'flex', gap: '16px', alignItems: 'flex-start'
                    }}>
                        <span style={{ fontSize: '28px' }}>
                            {data?.userPercentile !== null && data.userPercentile < 50 ? '⚠️' : '🏆'}
                        </span>
                        <div>
                            <h4 style={{ margin: '0 0 6px 0', color: data?.userPercentile !== null && data.userPercentile < 50 ? '#991b1b' : '#1e40af', fontSize: '16px', fontWeight: '700' }}>
                                {data?.metricLabel}
                            </h4>
                            <p style={{ margin: 0, color: data?.userPercentile !== null && data.userPercentile < 50 ? '#7f1d1d' : '#1e3a8a', fontSize: '14px', lineHeight: '1.5' }}>
                                {data?.userValue !== null
                                    ? `Your value: ${data.userValue.toFixed(1)} ${data.unit}. Sector average: ${data.average.toFixed(1)} ${data.unit}, based on ${data.peerCount} other ${data.sector} companies. `
                                    : `You haven't logged this metric yet — sector average is ${data.average.toFixed(1)} ${data.unit} across ${data.peerCount} companies. `}
                                {data?.userPercentile !== null && `You're at the ${data.userPercentile}th percentile.`}
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '32px' }}>

                        <div>
                            <h3 style={{ margin: '0 0 16px 0', color: '#374151', fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
                                Head-to-Head Comparison
                            </h3>
                            <div style={{ width: '100%', height: '300px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={[
                                            { name: 'Top 10% Performers', value: data.topPerformerValue, fill: '#10b981' },
                                            { name: 'Sector Average', value: data.average, fill: '#9ca3af' },
                                            ...(data.userValue !== null ? [{ name: 'Your Company', value: data.userValue, fill: data.userPercentile < 50 ? '#ef4444' : '#3b82f6' }] : []),
                                        ]}
                                        layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                                        <XAxis type="number" tick={{fill: '#6b7280', fontSize: 12}} axisLine={false} tickLine={false} />
                                        <YAxis dataKey="name" type="category" tick={{fill: '#4b5563', fontSize: 12, fontWeight: 600}} width={120} axisLine={false} tickLine={false} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={35}>
                                            {[0, 1, 2].map((i) => <Cell key={i} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div>
                            <h3 style={{ margin: '0 0 16px 0', color: '#374151', fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
                                Industry Distribution ({data.peerCount + (data.userValue !== null ? 1 : 0)} companies)
                            </h3>
                            <div style={{ width: '100%', height: '300px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data.distribution} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                        <XAxis dataKey="range" tick={{fill: '#6b7280', fontSize: 11}} axisLine={{stroke: '#d1d5db'}} tickLine={false} />
                                        <YAxis tick={{fill: '#6b7280', fontSize: 12}} axisLine={false} tickLine={false} allowDecimals={false} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                    </div>
                </>
            )}
        </div>
    );
}

export default IndustryBenchmarking;
