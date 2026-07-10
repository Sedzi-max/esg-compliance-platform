import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

function BankingAnalytics() {
    const [loading, setLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState('2026');

    // --- MOCK DATA BUILT TO BoG PRINCIPLE REPORTING SPECIFICATIONS ---
    // Principle 1: High-Risk Sector Portfolio Exposure & E&S Screening Rates
    const portfolioScreeningData = [
        { sector: 'Agriculture & Forestry', 'Total Loans': 450, 'E&S Screened': 410 },
        { sector: 'Manufacturing', 'Total Loans': 600, 'E&S Screened': 580 },
        { sector: 'Oil & Gas / Mining', 'Total Loans': 850, 'E&S Screened': 420 }, // High risk, lower screening coverage
        { sector: 'Power & Energy', 'Total Loans': 700, 'E&S Screened': 690 },
        { sector: 'Construction & Real Estate', 'Total Loans': 500, 'E&S Screened': 480 }
    ];

    // Principle 5: Financial Inclusion Growth (Accounts opened vs Tech Platform Mobile Money Transactions)
    const inclusionGrowthData = [
        { month: 'Jan', 'Basic Accounts Opened': 120, 'Mobile Money Trans (k)': 45 },
        { month: 'Feb', 'Basic Accounts Opened': 150, 'Mobile Money Trans (k)': 58 },
        { month: 'Mar', 'Basic Accounts Opened': 220, 'Mobile Money Trans (k)': 85 },
        { month: 'Apr', 'Basic Accounts Opened': 310, 'Mobile Money Trans (k)': 120 },
        { month: 'May', 'Basic Accounts Opened': 430, 'Mobile Money Trans (k)': 190 },
        { month: 'Jun', 'Basic Accounts Opened': 580, 'Mobile Money Trans (k)': 240 }
    ];

    // Principle 4: Gender Equality Balance (FTE Recruitment vs Leadership Roles)
    const genderEqualityData = [
        { name: 'Board of Directors', 'Male': 65, 'Female': 35 },
        { name: 'Senior Leadership', 'Male': 60, 'Female': 40 },
        { name: 'Total Bank FTEs', 'Male': 48, 'Female': 52 }
    ];

    // Principle 2: Overall BoG Principle Maturity Score (Radar Evaluation)
    const principleMaturityData = [
        { subject: 'P1: Portfolio Screening', score: 85, fullMark: 100 },
        { subject: 'P2: Internal Footprint', score: 90, fullMark: 100 },
        { subject: 'P3: Governance & Ethics', score: 95, fullMark: 100 },
        { subject: 'P4: Gender Equality', score: 75, fullMark: 100 },
        { subject: 'P5: Financial Inclusion', score: 80, fullMark: 100 },
        { subject: 'P6: Resource Efficiency', score: 60, fullMark: 100 },
        { subject: 'P7: Transparency & Discl.', score: 70, fullMark: 100 }
    ];

    const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#7c3aed'];

    useEffect(() => {
        // Simulate backend metrics compilation delay
        const timer = setTimeout(() => setLoading(false), 1000);
        return () => clearTimeout(timer);
    }, [selectedYear]);

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

            {/* Quick Insights Cards Summary Block */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                <div style={cardSummaryStyle}>
                    <span style={{ fontSize: '24px' }}>🛡️</span>
                    <div>
                        <div style={cardLabelStyle}>Avg Portfolio E&S Screening</div>
                        <div style={cardValueStyle}>76.4%</div>
                    </div>
                </div>
                <div style={cardSummaryStyle}>
                    <span style={{ fontSize: '24px' }}>📱</span>
                    <div>
                        <div style={cardLabelStyle}>Tech inclusion volume</div>
                        <div style={cardValueStyle}>738k trans</div>
                    </div>
                </div>
                <div style={cardSummaryStyle}>
                    <span style={{ fontSize: '24px' }}>⚖️</span>
                    <div>
                        <div style={cardLabelStyle}>Female Leadership Ratio</div>
                        <div style={cardValueStyle}>40.0%</div>
                    </div>
                </div>
                <div style={cardSummaryStyle}>
                    <span style={{ fontSize: '24px' }}>🏢</span>
                    <div>
                        <div style={cardLabelStyle}>HQ Carbon Footprint Reduction</div>
                        <div style={cardValueStyle}>-18.4%</div>
                    </div>
                </div>
            </div>

            {/* Core Analytics Grid Layout */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '32px' }}>
                
                {/* Chart 1: Portfolio E&S Risk Screening Cover (Principle 1) */}
                <div style={chartCardStyle}>
                    <h3 style={chartHeaderStyle}>Principle 1: Portfolio E&S Screening in Mandatory Sectors (M GHC)</h3>
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
                </div>

                {/* Chart 2: Financial Inclusion Growth Trends (Principle 5) */}
                <div style={chartCardStyle}>
                    <h3 style={chartHeaderStyle}>Principle 5: Financial Inclusion & Digital Penetration Reach</h3>
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
                </div>

                {/* Chart 3: Gender Equality Balance Sheet (Principle 4) */}
                <div style={chartCardStyle}>
                    <h3 style={chartHeaderStyle}>Principle 4: Gender Equality Metrics Across Bank Structure</h3>
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
                </div>

                {/* Chart 4: Overall Framework Principle Maturity (Principle 7 Auditing) */}
                <div style={chartCardStyle}>
                    <h3 style={chartHeaderStyle}>Principle 7: General Principle Implementation Maturity Index</h3>
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
                </div>

            </div>
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