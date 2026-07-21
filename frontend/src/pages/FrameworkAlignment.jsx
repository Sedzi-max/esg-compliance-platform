import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import DelegateTaskModal from '../components/DelegateTaskModal';

const FrameworkAlignment = () => {
    const navigate = useNavigate();
    const [readinessData, setReadinessData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedYear, setSelectedYear] = useState('2026');

    // Gap Analysis Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeFramework, setActiveFramework] = useState(null);
    const [gapData, setGapData] = useState([]);
    const [loadingGap, setLoadingGap] = useState(false);
    const [gapError, setGapError] = useState(null);

    // Delegation Modal State
    const [isDelegateOpen, setIsDelegateOpen] = useState(false);
    const [selectedGapTask, setSelectedGapTask] = useState('');
    const [selectedGapFrameworkCode, setSelectedGapFrameworkCode] = useState(null);

    // Refs mirror the latest activeFramework/selectedYear so the async
    // callbacks below can check "is this still the request that matters"
    // without becoming stale closures over old state.
    const activeFrameworkRef = React.useRef(activeFramework);
    const selectedYearRef = React.useRef(selectedYear);
    useEffect(() => { activeFrameworkRef.current = activeFramework; }, [activeFramework]);
    useEffect(() => { selectedYearRef.current = selectedYear; }, [selectedYear]);

    // FIX: guard fetchReadiness against stale responses. If the year is
    // switched again before an in-flight request resolves, the older
    // request's result is discarded instead of overwriting the newer one.
    useEffect(() => {
        let isCurrent = true;
        fetchReadiness(isCurrent);
        return () => {
            isCurrent = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedYear]);

    const fetchReadiness = async (isCurrent = true) => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`/api/reports/readiness?year=${selectedYear}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // An empty array is a legitimate result — no approved data yet for this
            // year — not a reason to show fabricated scores. Show it as-is; the
            // empty state below tells the user what that means.
            if (isCurrent) {
                setReadinessData(response.data);
            }
        } catch (err) {
            console.error("Failed to fetch readiness:", err);
            if (isCurrent) {
                setReadinessData([]);
                setError("Failed to load compliance readiness data. Please try again.");
            }
        } finally {
            if (isCurrent) {
                setLoading(false);
            }
        }
    };

    // FIX: only apply a gap-analysis response if the user hasn't since
    // switched to a different framework or year while it was in flight.
    const openGapAnalysis = async (frameworkName) => {
        setActiveFramework(frameworkName);
        setIsModalOpen(true);
        setLoadingGap(true);
        setGapError(null);
        setGapData([]);

        const requestedFramework = frameworkName;
        const requestedYear = selectedYear;

        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`/api/reports/gap-analysis?framework=${encodeURIComponent(frameworkName)}&year=${selectedYear}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (requestedFramework === activeFrameworkRef.current && requestedYear === selectedYearRef.current) {
                setGapData(response.data);
            }
        } catch (err) {
            console.error("Failed to load gap analysis", err);
            if (requestedFramework === activeFrameworkRef.current && requestedYear === selectedYearRef.current) {
                setGapError("Failed to load the gap analysis for this framework. Please try again.");
            }
        } finally {
            if (requestedFramework === activeFrameworkRef.current && requestedYear === selectedYearRef.current) {
                setLoadingGap(false);
            }
        }
    };

    // Re-run the gap analysis for whatever framework is currently open, so a
    // successful delegation is reflected immediately instead of requiring the
    // user to close and reopen the modal.
    const refreshGapAnalysis = () => {
        if (activeFramework) {
            openGapAnalysis(activeFramework);
        }
    };

    const handleOpenDelegate = (gap) => {
        setSelectedGapTask(`Missing Data: ${gap.description}`);
        setSelectedGapFrameworkCode(gap.framework_code);
        setIsDelegateOpen(true);
    };

    const getStatusColor = (score) => {
        if (score === 100) return { bg: '#d1fae5', text: '#065f46', label: 'Audit Ready' };
        if (score >= 70) return { bg: '#fef3c7', text: '#92400e', label: 'On Track' };
        return { bg: '#fee2e2', text: '#991b1b', label: 'High Risk Gap' };
    };

    return (
        <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', padding: '40px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
                <div>
                    <h1 style={{ fontSize: '32px', margin: '0 0 8px 0', fontWeight: '800', color: '#111827', letterSpacing: '-0.02em' }}>
                        Compliance Alignment Matrix
                    </h1>
                    <p style={{ margin: 0, color: '#4b5563', fontSize: '16px', maxWidth: '600px' }}>
                        Track your operational data readiness against global regulatory reporting frameworks.
                    </p>
                </div>

                <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '15px', fontWeight: '600', color: '#111827', outline: 'none', cursor: 'pointer', backgroundColor: 'white', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                >
                    <option value="2026">Fiscal Year 2026</option>
                    <option value="2025">Fiscal Year 2025</option>
                </select>
            </div>

            {error && (
                <div style={{ backgroundColor: '#fef2f2', color: '#991b1b', padding: '16px 20px', borderRadius: '10px', marginBottom: '24px', fontWeight: '600', fontSize: '14px', border: '1px solid #fecaca' }}>
                    ⚠️ {error}
                </div>
            )}

            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280', fontSize: '15px', fontWeight: '500' }}>Aggregating compliance logic...</div>
            ) : readinessData.length === 0 && !error ? (
                <div style={{ textAlign: 'center', padding: '60px', backgroundColor: 'white', borderRadius: '16px', border: '1px dashed #d1d5db', color: '#6b7280' }}>
                    No readiness data available for {selectedYear} yet. Once emissions or metrics are logged and approved, your framework alignment will appear here.
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '24px' }}>
                    {readinessData.map((framework) => {
                        const status = getStatusColor(Number(framework.readiness_score));

                        return (
                            <div key={framework.framework_name} style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', display: 'flex', flexDirection: 'column' }}>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                                    <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: 0, lineHeight: '1.4', maxWidth: '70%' }}>
                                        {framework.framework_name}
                                    </h2>
                                    <span style={{ backgroundColor: status.bg, color: status.text, padding: '6px 12px', borderRadius: '50px', fontSize: '12px', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                                        {status.label}
                                    </span>
                                </div>

                                <div style={{ marginBottom: '32px', flexGrow: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'flex-end' }}>
                                        <span style={{ fontSize: '36px', fontWeight: '800', color: '#111827', lineHeight: '1' }}>
                                            {framework.readiness_score}%
                                        </span>
                                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#6b7280', paddingBottom: '4px' }}>
                                            {framework.fulfilled_requirements} of {framework.total_requirements} Clauses Met
                                        </span>
                                    </div>

                                    <div style={{ width: '100%', height: '10px', backgroundColor: '#f3f4f6', borderRadius: '50px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${framework.readiness_score}%`, backgroundColor: framework.readiness_score === 100 ? '#10b981' : '#111827', borderRadius: '50px', transition: 'width 1s ease-in-out' }} />
                                    </div>
                                </div>

                                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '20px' }}>
                                    <button
                                        onClick={() => openGapAnalysis(framework.framework_name)}
                                        style={{ width: '100%', backgroundColor: 'transparent', border: '1px solid #d1d5db', padding: '10px', borderRadius: '8px', color: '#374151', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: '0.2s' }}
                                        onMouseOver={(e) => e.target.style.backgroundColor = '#f9fafb'}
                                        onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                                    >
                                        Inspect Gap Analysis Matrix →
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Gap Analysis Modal */}
            {isModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(17, 24, 39, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999, padding: '20px' }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '16px', width: '100%', maxWidth: '900px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>

                        <div style={{ padding: '24px 32px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: '12px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Gap Analysis Report</div>
                                <h2 style={{ margin: 0, fontSize: '22px', color: '#111827', fontWeight: '800' }}>{activeFramework}</h2>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '28px', color: '#9ca3af', cursor: 'pointer', lineHeight: '1' }}>&times;</button>
                        </div>

                        <div style={{ overflowY: 'auto', padding: '32px' }}>
                            {loadingGap ? (
                                <div style={{ textAlign: 'center', color: '#6b7280' }}>Analyzing ledger...</div>
                            ) : gapError ? (
                                <div style={{ backgroundColor: '#fef2f2', color: '#991b1b', padding: '16px 20px', borderRadius: '10px', fontWeight: '600', fontSize: '14px', border: '1px solid #fecaca', textAlign: 'center' }}>
                                    ⚠️ {gapError}
                                </div>
                            ) : gapData.length === 0 ? (
                                <div style={{ textAlign: 'center', color: '#6b7280', padding: '20px 0' }}>
                                    No clause-level data available for this framework yet.
                                </div>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#f9fafb', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280' }}>
                                            <th style={thStyle}>Status</th>
                                            <th style={thStyle}>Clause</th>
                                            <th style={thStyle}>Quality Tier</th>
                                            <th style={thStyle}>Action required</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {gapData.map((gap, idx) => {
                                            const isPending = !gap.is_fulfilled && gap.delegation_status === 'pending';
                                            return (
                                                <tr key={gap.framework_code || idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                    <td style={{ padding: '16px' }}>
                                                        {gap.is_fulfilled ? '✅' : isPending ? (
                                                            <span style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: '#fef3c7', color: '#92400e', fontWeight: 'bold', fontSize: '12px', whiteSpace: 'nowrap' }}>
                                                                📤 Pending
                                                            </span>
                                                        ) : '❌'}
                                                    </td>
                                                    <td style={{ padding: '16px' }}>
                                                        <div style={{ fontWeight: '600', fontSize: '14px' }}>{gap.framework_code}</div>
                                                        <div style={{ color: '#6b7280', fontSize: '13px' }}>{gap.description}</div>
                                                        {isPending && (
                                                            <div style={{ color: '#92400e', fontSize: '12px', marginTop: '4px' }}>
                                                                Delegated to {gap.delegated_to}
                                                                {gap.delegation_due_date ? ` · due ${new Date(gap.delegation_due_date).toLocaleDateString('en-GH', { year: 'numeric', month: 'short', day: 'numeric' })}` : ''}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '16px' }}>
                                                        {gap.quality_tier ? (
                                                            <span style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: '#eef2ff', color: '#4f46e5', fontWeight: 'bold', fontSize: '12px' }}>
                                                                Tier {gap.quality_tier}
                                                            </span>
                                                        ) : <span style={{ color: '#9ca3af', fontSize: '13px' }}>N/A</span>}
                                                    </td>
                                                    <td style={{ padding: '16px' }}>
                                                        {!gap.is_fulfilled && (
                                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                                <button onClick={() => navigate('/data-entry')} style={{ color: '#4b5563', border: '1px solid #d1d5db', background: 'white', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                                                                    Self Log
                                                                </button>
                                                                <button onClick={() => handleOpenDelegate(gap)} style={{ color: 'white', border: 'none', background: isPending ? '#d97706' : '#2563eb', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                                                                    {isPending ? 'Remind ↻' : 'Delegate 📤'}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Email Delegation Sub-Modal */}
            <DelegateTaskModal
                isOpen={isDelegateOpen}
                onClose={() => setIsDelegateOpen(false)}
                defaultTaskName={selectedGapTask}
                defaultFacility="Corporate HQ"
                frameworkCode={selectedGapFrameworkCode}
                frameworkName={activeFramework}
                onSuccess={refreshGapAnalysis}
            />

        </div>
    );
};

// --- Reusable Styles ---
const thStyle = { padding: '12px', textAlign: 'left', fontWeight: '700' };

export default FrameworkAlignment;
