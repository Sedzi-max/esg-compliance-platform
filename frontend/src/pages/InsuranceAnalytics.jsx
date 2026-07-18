import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    ScatterChart, Scatter, ZAxis
} from 'recharts';

function InsuranceAnalytics() {
    const [selectedYear, setSelectedYear] = useState('2026');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [governance, setGovernance] = useState([]);
    const [emissions, setEmissions] = useState([]);
    const [scenarios, setScenarios] = useState([]);
    const [materiality, setMateriality] = useState([]);

    useEffect(() => {
        let isCurrent = true;
        fetchDashboard(isCurrent);
        return () => { isCurrent = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedYear]);

    const fetchDashboard = async (isCurrent = true) => {
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.get(
                `/api/insurance/dashboard-summary?year=${encodeURIComponent(selectedYear)}`,
                config
            );

            if (!isCurrent) return;
            setGovernance(response.data.governance || []);
            setEmissions(response.data.emissions || []);
            setScenarios(response.data.scenarios || []);
            setMateriality(response.data.materiality || []);
        } catch (err) {
            console.error('Failed to load insurance analytics:', err);
            if (isCurrent) {
                setError('Failed to load NIC Insurance ESG metrics. Please try again.');
                setGovernance([]);
                setEmissions([]);
                setScenarios([]);
                setMateriality([]);
            }
        } finally {
            if (isCurrent) setLoading(false);
        }
    };

    const esgCommitteeRate = governance.length > 0
        ? ((governance.filter(g => g.has_esg_committee).length / governance.length) * 100).toFixed(0)
        : null;

    const avgBoardOversight = (() => {
        const scored = governance.filter(g => g.board_oversight_score != null);
        if (scored.length === 0) return null;
        return (scored.reduce((sum, g) => sum + Number(g.board_oversight_score), 0) / scored.length).toFixed(1);
    })();

    const stressTestSubmissionRate = governance.length > 0
        ? ((governance.filter(g => g.nic_stress_test_submitted).length / governance.length) * 100).toFixed(0)
        : null;

    const complaintResolutionRate = (() => {
        const received = governance.reduce((sum, g) => sum + Number(g.customer_complaints_received || 0), 0);
        const resolved = governance.reduce((sum, g) => sum + Number(g.customer_complaints_resolved || 0), 0);
        return received > 0 ? ((resolved / received) * 100).toFixed(1) : null;
    })();

    const emissionsChartData = emissions.map(row => ({
        scope: row.scope_category,
        'CO2e (kg)': Number(row.total_co2e),
        'Water Usage': Number(row.water_usage),
        'Waste Generated': Number(row.waste_generated),
    }));

    const materialityChartData = materiality.map(row => ({
        topic: row.topic_name,
        x: Number(row.business_impact_score),
        y: Number(row.stakeholder_importance_score),
    }));

    const hasAnyData = governance.length > 0 || emissions.length > 0 || scenarios.length > 0 || materiality.length > 0;

    if (loading) {
        return <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>Compiling NIC Insurance ESG metrics...</div>;
    }

    return (
        <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '40px', fontFamily: 'system-ui, sans-serif' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px', borderBottom: '1px solid #e2e8f0', paddingBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', margin: '0 0 6px 0', fontWeight: '800', color: '#0f172a' }}>
                        🛡️ NIC Insurance ESG Intelligence Suite
                    </h1>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '15px' }}>
                        Monitoring against the National Insurance Commission's ESG Guidelines for the Insurance Industry in Ghana.
                    </p>
                </div>
                <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', fontWeight: '600', color: '#334155', outline: 'none', cursor: 'pointer', backgroundColor: 'white' }}
                >
                    <option value="2026">Fiscal Year 2026</option>
                    <option value="2025">Fiscal Year 2025</option>
                </select>
            </div>

            {error && (
                <div style={{ backgroundColor: '#fef2f2', color: '#991b1b', padding: '16px 20px', borderRadius: '10px', marginBottom: '24px', fontWeight: '600', fontSize: '14px', border: '1px solid #fecaca', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>⚠️ {error}</span>
                    <button onClick={() => fetchDashboard(true)} style={{ background: 'transparent', border: '1px solid #991b1b', color: '#991b1b', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                        Retry
                    </button>
                </div>
            )}

            {!error && !hasAnyData ? (
                <div style={{ textAlign: 'center', padding: '60px', backgroundColor: 'white', borderRadius: '16px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
                    No NIC Insurance ESG data has been logged for {selectedYear} yet. Once governance, emissions, scenario, or materiality data are recorded for insurer units, this dashboard will populate automatically.
                </div>
            ) : (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                        <SummaryCard icon="🏛️" label="ESG Committee Coverage" value={esgCommitteeRate !== null ? `${esgCommitteeRate}%` : '—'} />
                        <SummaryCard icon="📋" label="Avg Board Oversight Score" value={avgBoardOversight !== null ? avgBoardOversight : '—'} />
                        <SummaryCard icon="📤" label="NIC Stress Test Submission" value={stressTestSubmissionRate !== null ? `${stressTestSubmissionRate}%` : '—'} />
                        <SummaryCard icon="🤝" label="Complaint Resolution Rate" value={complaintResolutionRate !== null ? `${complaintResolutionRate}%` : '—'} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '32px' }}>

                        <div style={chartCardStyle}>
                            <h3 style={chartHeaderStyle}>Environmental Impact by Scope (§8.5.1)</h3>
                            {emissionsChartData.length === 0 ? (
                                <div style={emptyChartStyle}>No emissions/water/waste data logged for {selectedYear}.</div>
                            ) : (
                                <div style={{ width: '100%', height: '300px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={emissionsChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="scope" tick={{ fill: '#64748b', fontSize: 12 }} />
                                            <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} />
                                            <Tooltip />
                                            <Legend />
                                            <Bar dataKey="CO2e (kg)" fill="#10b981" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>

                        <div style={chartCardStyle}>
                            <h3 style={chartHeaderStyle}>Materiality Assessment (§6.4)</h3>
                            {materialityChartData.length === 0 ? (
                                <div style={emptyChartStyle}>No materiality assessment logged for {selectedYear}.</div>
                            ) : (
                                <div style={{ width: '100%', height: '300px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ScatterChart margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                            <CartesianGrid stroke="#e2e8f0" />
                                            <XAxis type="number" dataKey="x" name="Business Impact" domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 12 }} />
                                            <YAxis type="number" dataKey="y" name="Stakeholder Importance" domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 12 }} />
                                            <ZAxis range={[100, 100]} />
                                            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                            <Scatter name="ESG Topics" data={materialityChartData} fill="#4f46e5" />
                                        </ScatterChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>

                        <div style={{ ...chartCardStyle, gridColumn: '1 / -1' }}>
                            <h3 style={chartHeaderStyle}>Stress Testing & Scenario Analysis (§7.4)</h3>
                            {scenarios.length === 0 ? (
                                <div style={emptyChartStyle}>No scenario analyses logged for {selectedYear}.</div>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                        <thead>
                                            <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                                                <th style={thStyle}>Scenario</th>
                                                <th style={thStyle}>Time Horizon</th>
                                                <th style={thStyle}>Projected Financial Impact (GHS)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {scenarios.map((s, idx) => (
                                                <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                    <td style={{ padding: '12px' }}>{s.scenario_name}</td>
                                                    <td style={{ padding: '12px' }}>{s.time_horizon}</td>
                                                    <td style={{ padding: '12px' }}>{Number(s.projected_financial_impact_ghs).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                    </div>
                </>
            )}
        </div>
    );
}

const SummaryCard = ({ icon, label, value }) => (
    <div style={cardSummaryStyle}>
        <span style={{ fontSize: '24px' }}>{icon}</span>
        <div>
            <div style={cardLabelStyle}>{label}</div>
            <div style={cardValueStyle}>{value}</div>
        </div>
    </div>
);

const chartCardStyle = { backgroundColor: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' };
const chartHeaderStyle = { fontSize: '15px', fontWeight: '700', color: '#1e293b', margin: '0 0 20px 0' };
const emptyChartStyle = { padding: '60px 0', textAlign: 'center', color: '#94a3b8', fontSize: '13px' };
const cardSummaryStyle = { backgroundColor: 'white', borderRadius: '12px', padding: '16px 20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px' };
const cardLabelStyle = { fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' };
const cardValueStyle = { fontSize: '20px', fontWeight: '800', color: '#0f172a', marginTop: '2px' };
const thStyle = { padding: '12px', textAlign: 'left', fontWeight: '700', fontSize: '12px', color: '#6b7280' };

export default InsuranceAnalytics;
