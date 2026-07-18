import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function BankingAnalytics() {
    const [selectedYear, setSelectedYear] = useState('2026');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [portfolioScreeningData, setPortfolioScreeningData] = useState([]);
    const [inclusionGrowthData, setInclusionGrowthData] = useState([]);
    const [genderEqualityData, setGenderEqualityData] = useState([]);
    const [principleMaturityData, setPrincipleMaturityData] = useState([]);

    useEffect(() => {
        let isCurrent = true;
        fetchAllBankingMetrics(isCurrent);
        return () => { isCurrent = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedYear]);

    const fetchAllBankingMetrics = async (isCurrent = true) => {
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const yearParam = encodeURIComponent(selectedYear);

            // No .catch() swallowing here — a failed request throws and is
            // handled below, so an outage is never mistaken for "no data yet."
            const [portfolioRes, inclusionRes, genderRes, maturityRes] = await Promise.all([
                axios.get(`/api/banking/portfolio-screening?year=${yearParam}`, config),
                axios.get(`/api/banking/financial-inclusion?year=${yearParam}`, config),
                axios.get(`/api/banking/gender-equality?year=${yearParam}`, config),
                axios.get(`/api/banking/principle-maturity?year=${yearParam}`, config),
            ]);

            if (!isCurrent) return;

            setPortfolioScreeningData(portfolioRes.data.map(row => ({
                sector: row.sector,
                'Total Loans': Number(row.total_loans),
                'E&S Screened': Number(row.es_screened),
            })));

            setInclusionGrowthData(inclusionRes.data.map(row => ({
                month: MONTH_NAMES[row.period_month - 1] || row.period_month,
                'Basic Accounts Opened': Number(row.basic_accounts_opened),
                'Mobile Money Trans (k)': Number(row.mobile_money_transactions_k),
            })));

            setGenderEqualityData(genderRes.data.map(row => ({
                name: row.category,
                Male: Number(row.male_count),
                Female: Number(row.female_count),
            })));

            setPrincipleMaturityData(maturityRes.data.map(row => ({
                subject: `${row.principle_code}: ${row.principle_name}`,
                score: Number(row.score),
                fullMark: 100,
            })));

        } catch (err) {
            console.error("Failed to load banking analytics:", err);
            if (isCurrent) {
                setError("Failed to load Bank of Ghana ESG metrics. Please try again.");
                setPortfolioScreeningData([]);
                setInclusionGrowthData([]);
                setGenderEqualityData([]);
                setPrincipleMaturityData([]);
            }
        } finally {
            if (isCurrent) setLoading(false);
        }
    };

    // --- Derived summary figures, computed from real fetched data. Each
    // guards against an empty dataset instead of showing a stale/fake number. ---
    const avgScreeningRate = (() => {
        const totalLoans = portfolioScreeningData.reduce((sum, s) => sum + s['Total Loans'], 0);
        const totalScreened = portfolioScreeningData.reduce((sum, s) => sum + s['E&S Screened'], 0);
        return totalLoans > 0 ? ((totalScreened / totalLoans) * 100).toFixed(1) : null;
    })();

    const totalTransactionsK = inclusionGrowthData.length > 0
        ? inclusionGrowthData.reduce((sum, m) => sum + m['Mobile Money Trans (k)'], 0)
        : null;

    const femaleLeadershipRatio = (() => {
        const leadership = genderEqualityData.find(g => g.name === 'Senior Leadership');
        if (!leadership) return null;
        const total = leadership.Male + leadership.Female;
        return total > 0 ? ((leadership.Female / total) * 100).toFixed(1) : null;
    })();

    const hasAnyData = portfolioScreeningData.length > 0 || inclusionGrowthData.length > 0
        || genderEqualityData.length > 0 || principleMaturityData.length > 0;

    if (loading) {
        return <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>Compiling Bank of Ghana ESG metrics...</div>;
    }

    return (
        <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '40px', fontFamily: 'system-ui, sans-serif' }}>

            {/* Dashboard Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px', borderBottom: '1px solid #e2e8f0', paddingBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', margin: '0 0 6px 0', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>
                        🇬🇭 Bank of Ghana ESG Intelligence Suite
                    </h1>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '15px' }}>
                        Phase 3 dynamic monitoring dashboard for the Sustainable Banking Principles and high-risk lending metrics.
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
                    <button onClick={() => fetchAllBankingMetrics(true)} style={{ background: 'transparent', border: '1px solid #991b1b', color: '#991b1b', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                        Retry
                    </button>
                </div>
            )}

            {!error && !hasAnyData ? (
                <div style={{ textAlign: 'center', padding: '60px', backgroundColor: 'white', borderRadius: '16px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
                    No Bank of Ghana ESG data has been logged for {selectedYear} yet. Once portfolio screening, headcount, and transaction data are recorded, this dashboard will populate automatically.
                </div>
            ) : (
                <>
                    {/* Quick Insights Cards Summary Block */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                        <div style={cardSummaryStyle}>
                            <span style={{ fontSize: '24px' }}>🛡️</span>
                            <div>
                                <div style={cardLabelStyle}>Avg Portfolio E&S Screening</div>
                                <div style={cardValueStyle}>{avgScreeningRate !== null ? `${avgScreeningRate}%` : '—'}</div>
                            </div>
                        </div>
                        <div style={cardSummaryStyle}>
                            <span style={{ fontSize: '24px' }}>📱</span>
                            <div>
                                <div style={cardLabelStyle}>Tech inclusion volume</div>
                                <div style={cardValueStyle}>{totalTransactionsK !== null ? `${totalTransactionsK.toLocaleString()}k trans` : '—'}</div>
                            </div>
                        </div>
                        <div style={cardSummaryStyle}>
                            <span style={{ fontSize: '24px' }}>⚖️</span>
                            <div>
                                <div style={cardLabelStyle}>Female Leadership Ratio</div>
                                <div style={cardValueStyle}>{femaleLeadershipRatio !== null ? `${femaleLeadershipRatio}%` : '—'}</div>
                            </div>
                        </div>
                    </div>

                    {/* Core Analytics Grid Layout */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '32px' }}>

                        {/* Chart 1: Portfolio E&S Risk Screening Cover (Principle 1) */}
                        <div style={chartCardStyle}>
                            <h3 style={chartHeaderStyle}>Principle 1: Portfolio E&S Screening in Mandatory Sectors (GHC)</h3>
                            {portfolioScreeningData.length === 0 ? (
                                <div style={emptyChartStyle}>No portfolio screening data logged for {selectedYear}.</div>
                            ) : (
                                <div style={{ width: '100%', height: '300px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={portfolioScreeningData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="sector" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} />
                                            <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                                            <Tooltip />
                                            <Legend />
                                            <Bar dataKey="Total Loans" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="E&S Screened" fill="#10b981" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>

                        {/* Chart 2: Financial Inclusion Growth Trends (Principle 5) */}
                        <div style={chartCardStyle}>
                            <h3 style={chartHeaderStyle}>Principle 5: Financial Inclusion & Digital Penetration Reach</h3>
                            {inclusionGrowthData.length === 0 ? (
                                <div style={emptyChartStyle}>No financial inclusion data logged for {selectedYear}.</div>
                            ) : (
                                <div style={{ width: '100%', height: '300px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={inclusionGrowthData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} />
                                            <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} />
                                            <Tooltip />
                                            <Legend />
                                            <Line type="monotone" dataKey="Basic Accounts Opened" stroke="#2563eb" strokeWidth={3} activeDot={{ r: 8 }} />
                                            <Line type="monotone" dataKey="Mobile Money Trans (k)" stroke="#7c3aed" strokeWidth={3} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>

                        {/* Chart 3: Gender Equality Balance Sheet (Principle 4) */}
                        <div style={chartCardStyle}>
                            <h3 style={chartHeaderStyle}>Principle 4: Gender Equality Metrics Across Bank Structure</h3>
                            {genderEqualityData.length === 0 ? (
                                <div style={emptyChartStyle}>No headcount data logged for {selectedYear}.</div>
                            ) : (
                                <div style={{ width: '100%', height: '300px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={genderEqualityData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} />
                                            <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} />
                                            <Tooltip />
                                            <Legend />
                                            <Bar dataKey="Male" stackId="a" fill="#3b82f6" />
                                            <Bar dataKey="Female" stackId="a" fill="#ec4899" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>

                        {/* Chart 4: Overall Framework Principle Maturity */}
                        <div style={chartCardStyle}>
                            <h3 style={chartHeaderStyle}>General Principle Implementation Maturity Index</h3>
                            {principleMaturityData.length === 0 ? (
                                <div style={emptyChartStyle}>No principle maturity scores logged for {selectedYear}.</div>
                            ) : (
                                <div style={{ width: '100%', height: '300px', display: 'flex', justifyContent: 'center' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={principleMaturityData}>
                                            <PolarGrid stroke="#e2e8f0" />
                                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }} />
                                            <PolarRadiusAxis angle={30} domain={[0, 100]} />
                                            <Radar name="Current Maturity" dataKey="score" stroke="#4f46e5" fill="#6366f1" fillOpacity={0.2} />
                                            <Tooltip />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>

                    </div>
                </>
            )}
        </div>
    );
}

// --- Component In-Line Styles ---
const chartCardStyle = {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
};

const chartHeaderStyle = {
    fontSize: '15px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 20px 0',
    letterSpacing: '-0.01em'
};

const emptyChartStyle = {
    padding: '60px 0',
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: '13px'
};

const cardSummaryStyle = {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '16px 20px',
    border: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
};

const cardLabelStyle = {
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
};

const cardValueStyle = {
    fontSize: '20px',
    fontWeight: '800',
    color: '#0f172a',
    marginTop: '2px'
};

export default BankingAnalytics;
