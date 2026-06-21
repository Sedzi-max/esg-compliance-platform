import React, { useState } from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine, AreaChart, Area
} from 'recharts';

function IndustryBenchmarking() {
    // In production, this would be fetched dynamically based on the user's industry/sector
    const [selectedMetric, setSelectedMetric] = useState('fleet_efficiency');

    // --- MOCK DATA ENGINE ---
    // Simulating aggregated, anonymized data from the multi-tenant database
    const benchmarkData = {
        fleet_efficiency: {
            title: "Fleet Fuel Efficiency (Scope 1)",
            unit: "kg CO2e per ton-mile",
            userValue: 1.2,
            globalAverage: 0.9,
            regionalAverage: 1.1, // Localized benchmark
            topPerformers: 0.6,
            userPercentile: 25,
            insight: "Your fleet emits 1.2 kg of CO2e per ton-mile. You are in the bottom 25th percentile for fuel efficiency compared to 50 other regional logistics operators on this platform."
        },
        facility_energy: {
            title: "Facility Energy Intensity (Scope 2)",
            unit: "kWh per square meter",
            userValue: 145,
            globalAverage: 180,
            regionalAverage: 210,
            topPerformers: 95,
            userPercentile: 78,
            insight: "Excellent performance. Your facilities consume 145 kWh/sqm, placing you in the top 25% of commercial real estate operators in your sector."
        }
    };

    const activeData = benchmarkData[selectedMetric];

    // Data for the Head-to-Head Bar Chart
    const comparisonChartData = [
        { name: 'Top 10% Performers', value: activeData.topPerformers, fill: '#10b981' }, // Green
        { name: 'Global Average', value: activeData.globalAverage, fill: '#9ca3af' },    // Gray
        { name: 'Regional Average', value: activeData.regionalAverage, fill: '#6b7280' },  // Darker Gray
        { name: 'Your Company', value: activeData.userValue, fill: activeData.userPercentile < 50 ? '#ef4444' : '#3b82f6' } // Red if bad, Blue if good
    ];

    // Simulated Bell Curve / Distribution Data
    const distributionData = [
        { range: '0.4-0.6', count: 5 },
        { range: '0.6-0.8', count: 15 },
        { range: '0.8-1.0', count: 40 }, // Peak (Average is 0.9)
        { range: '1.0-1.2', count: 25 },
        { range: '1.2-1.4', count: 10, isUser: true }, // User falls here (1.2)
        { range: '1.4-1.6', count: 5 }
    ];

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{ background: 'white', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                    <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', color: '#111827' }}>{payload[0].payload.name || payload[0].payload.range}</p>
                    <p style={{ margin: 0, color: payload[0].fill, fontWeight: '600', fontSize: '14px' }}>
                        {payload[0].value || payload[0].payload.count} {payload[0].payload.name ? activeData.unit : 'Companies'}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#111827', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        📊 Anonymized Industry Benchmarking
                    </h2>
                    <p style={{ margin: 0, color: '#6b7280', fontSize: '15px', maxWidth: '600px' }}>
                        Compare your operational efficiency against aggregated, strictly anonymized data from other organizations on the platform.
                    </p>
                </div>

                <select 
                    value={selectedMetric} 
                    onChange={(e) => setSelectedMetric(e.target.value)}
                    style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#f9fafb', fontSize: '14px', fontWeight: '600', color: '#374151', cursor: 'pointer', outline: 'none' }}
                >
                    <option value="fleet_efficiency">Logistics: Fleet Efficiency</option>
                    <option value="facility_energy">Real Estate: Facility Energy</option>
                </select>
            </div>

            {/* Dynamic Insight Badge */}
            <div style={{ 
                backgroundColor: activeData.userPercentile < 50 ? '#fef2f2' : '#eff6ff', 
                border: `1px solid ${activeData.userPercentile < 50 ? '#fecaca' : '#bfdbfe'}`, 
                padding: '20px', borderRadius: '12px', marginBottom: '32px', display: 'flex', gap: '16px', alignItems: 'flex-start' 
            }}>
                <span style={{ fontSize: '28px' }}>
                    {activeData.userPercentile < 50 ? '⚠️' : '🏆'}
                </span>
                <div>
                    <h4 style={{ margin: '0 0 6px 0', color: activeData.userPercentile < 50 ? '#991b1b' : '#1e40af', fontSize: '16px', fontWeight: '700' }}>
                        {activeData.userPercentile < 50 ? 'Efficiency Warning' : 'Top Quartile Performer'}
                    </h4>
                    <p style={{ margin: 0, color: activeData.userPercentile < 50 ? '#7f1d1d' : '#1e3a8a', fontSize: '14px', lineHeight: '1.5' }}>
                        {activeData.insight}
                    </p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '32px' }}>
                
                {/* Chart 1: Direct Head-to-Head Comparison */}
                <div>
                    <h3 style={{ margin: '0 0 16px 0', color: '#374151', fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
                        Head-to-Head Comparison
                    </h3>
                    <div style={{ width: '100%', height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={comparisonChartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                                <XAxis type="number" tick={{fill: '#6b7280', fontSize: 12}} axisLine={false} tickLine={false} />
                                <YAxis dataKey="name" type="category" tick={{fill: '#4b5563', fontSize: 12, fontWeight: 600}} width={120} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={35}>
                                    {comparisonChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Chart 2: The Industry Distribution Curve */}
                {selectedMetric === 'fleet_efficiency' && (
                    <div>
                        <h3 style={{ margin: '0 0 16px 0', color: '#374151', fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
                            Industry Distribution Curve
                        </h3>
                        <div style={{ width: '100%', height: '300px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={distributionData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                    <XAxis dataKey="range" tick={{fill: '#6b7280', fontSize: 12}} axisLine={{stroke: '#d1d5db'}} tickLine={false} />
                                    <YAxis tick={{fill: '#6b7280', fontSize: 12}} axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    
                                    {/* The Bell Curve */}
                                    <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                                    
                                    {/* Pinpointing the User on the curve */}
                                    <ReferenceLine x="1.2-1.4" stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'top', value: 'Your Co.', fill: '#ef4444', fontSize: 12, fontWeight: 'bold' }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}

export default IndustryBenchmarking;