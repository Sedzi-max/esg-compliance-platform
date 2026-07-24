import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DelegateTaskModal from './DelegateTaskModal';

// FIX: this widget had two serious fake-functionality issues, found while
// investigating "where does the external-vendor notification go":
// 1. handleSendAssignment had no real network call at all — just a
//    setTimeout(..., 800) followed by a hardcoded fake success message.
//    Clicking "Send Alert Notification" never sent anything, for any
//    facility choice, ever.
// 2. The action-items query was hardcoded to "ISSB / IFRS S2", a framework
//    name with zero rows in framework_mappings — so it always fell back to
//    3 fabricated fake gaps (IFRS-S2-29c, ESRS-S1, GRI-303-3) regardless of
//    the account's real data.
// Fixed by: reusing the already-working DelegateTaskModal (real
// /api/notify/delegate call, used successfully by Alignment Matrix) instead
// of a second fake modal, and picking the account's actual lowest-scoring
// real framework to query real gaps from, instead of a dead hardcoded name.
function ComplianceReadiness() {
    const [readinessData, setReadinessData] = useState([]);
    const [selectedFramework, setSelectedFramework] = useState(null);
    const [actionItems, setActionItems] = useState([]);
    const [loading, setLoading] = useState(true);

    // Delegation modal state — now just tracks which gap is being delegated;
    // the actual send/email logic lives entirely in DelegateTaskModal.
    const [delegateModalOpen, setDelegateModalOpen] = useState(false);
    const [delegateTask, setDelegateTask] = useState(null);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const currentYear = new Date().getFullYear();

            const readinessRes = await axios.get(`/api/reports/readiness?year=${currentYear}`, config).catch(() => ({ data: [] }));
            setReadinessData(readinessRes.data);

            if (readinessRes.data.length > 0) {
                // Pick the account's actual lowest-scoring real framework —
                // the genuine highest-priority gap — instead of a hardcoded
                // framework name that never matches anything.
                const lowestScoring = [...readinessRes.data].sort((a, b) => a.readiness_score - b.readiness_score)[0];
                setSelectedFramework(lowestScoring.framework_name);

                const gapRes = await axios.get(
                    `/api/reports/gap-analysis?framework=${encodeURIComponent(lowestScoring.framework_name)}&year=${currentYear}`,
                    config
                ).catch(() => ({ data: [] }));

                const openGaps = gapRes.data.filter(req => !req.is_fulfilled);
                setActionItems(openGaps.slice(0, 4));
            } else {
                setSelectedFramework(null);
                setActionItems([]);
            }

        } catch (err) {
            console.error("Failed to load readiness dashboard:", err);
        } finally {
            setLoading(false);
        }
    };

    const openAssignModal = (task) => {
        setDelegateTask(task);
        setDelegateModalOpen(true);
    };

    return (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', position: 'relative' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
                <div>
                    <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#111827', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🌐 Executive Compliance Readiness
                    </h2>
                    <p style={{ margin: 0, color: '#6b7280', fontSize: '15px', maxWidth: '600px' }}>
                        Real-time audit alignment across your configured regulatory frameworks. Resolve action items below to close disclosure gaps.
                    </p>
                </div>
                <div style={{ backgroundColor: '#f3f4f6', padding: '8px 16px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '14px', fontWeight: '700', color: '#374151' }}>
                    Fiscal Year: {new Date().getFullYear()}
                </div>
            </div>

            {loading ? (
                <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>Loading executive dashboard...</div>
            ) : readinessData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px dashed #d1d5db', color: '#6b7280' }}>
                    No framework data configured for this account yet.
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
                    
                    {/* LEFT SIDE: Progress Rings */}
                    <div style={{ gridColumn: 'span 2', display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center', padding: '24px', backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                        {readinessData.map((data, index) => {
                            const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'];
                            const ringColor = colors[index % colors.length];
                            
                            return (
                                <ProgressRing 
                                    key={index}
                                    score={data.readiness_score} 
                                    color={ringColor} 
                                    title={data.framework_name} 
                                    subtitle={`${data.fulfilled_requirements} of ${data.total_requirements} Met`} 
                                />
                            );
                        })}
                    </div>

                    {/* RIGHT SIDE: Actionable Task List */}
                    <div style={{ gridColumn: 'span 1', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', textTransform: 'uppercase', color: '#9ca3af', fontWeight: '700', letterSpacing: '0.05em' }}>
                            Priority Action Items{selectedFramework ? ` — ${selectedFramework}` : ''}
                        </h3>

                        {actionItems.length === 0 ? (
                            <div style={{ padding: '16px', borderRadius: '12px', border: '1px dashed #a7f3d0', backgroundColor: '#ecfdf5', color: '#065f46', fontSize: '14px', fontWeight: '600' }}>
                                ✅ No open gaps for {selectedFramework || 'your configured framework'} — fully on track.
                            </div>
                        ) : actionItems.map((task, idx) => {
                            const isPendingDelegation = task.delegation_status === 'pending';

                            return (
                                <div key={idx} style={{ padding: '16px', borderRadius: '12px', border: '1px solid #e5e7eb', backgroundColor: 'white', borderLeft: `4px solid ${isPendingDelegation ? '#f59e0b' : '#ef4444'}`, boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#374151', backgroundColor: '#f3f4f6', padding: '2px 8px', borderRadius: '4px' }}>
                                            {task.framework_code}
                                        </span>
                                    </div>
                                    <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#111827', fontWeight: '600', lineHeight: '1.4' }}>
                                        {task.description}
                                    </p>
                                    
                                    {isPendingDelegation ? (
                                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#fef3c7', padding: '6px 10px', borderRadius: '6px', width: 'fit-content' }}>
                                            📤 Delegated to: {task.delegated_to}
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => openAssignModal(task)}
                                            style={{ backgroundColor: 'transparent', color: '#2563eb', border: 'none', padding: 0, fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
                                        >
                                            Assign to Facility →
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* FIX: replaced the fake inline setTimeout modal with the real,
                already-working DelegateTaskModal — this one genuinely calls
                /api/notify/delegate and requires a real assignee email. */}
            <DelegateTaskModal
                isOpen={delegateModalOpen}
                onClose={() => setDelegateModalOpen(false)}
                defaultTaskName={delegateTask ? `[${delegateTask.framework_code}] ${delegateTask.description}` : ''}
                defaultFacility=""
                frameworkCode={delegateTask?.framework_code}
                frameworkName={selectedFramework}
                onSuccess={fetchDashboardData}
            />
        </div>
    );
}

// Helper Component for the beautiful custom SVG Rings
function ProgressRing({ score, color, title, subtitle }) {
    const radius = 60;
    const stroke = 12;
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb', minWidth: '200px' }}>
            <div style={{ position: 'relative', width: radius * 2, height: radius * 2, marginBottom: '16px' }}>
                <svg height={radius * 2} width={radius * 2} style={{ position: 'absolute', top: 0, left: 0 }}>
                    <circle stroke="#e5e7eb" fill="transparent" strokeWidth={stroke} r={normalizedRadius} cx={radius} cy={radius} />
                </svg>
                <svg height={radius * 2} width={radius * 2} style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}>
                    <circle stroke={color} fill="transparent" strokeWidth={stroke} strokeDasharray={circumference + ' ' + circumference} style={{ strokeDashoffset, transition: 'stroke-dashoffset 1s ease-in-out', strokeLinecap: 'round' }} r={normalizedRadius} cx={radius} cy={radius} />
                </svg>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                    <span style={{ fontSize: '28px', fontWeight: '800', color: '#111827', lineHeight: '1' }}>{score}%</span>
                </div>
            </div>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '800', color: '#374151', textAlign: 'center' }}>{title}</h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#6b7280', fontWeight: '600', textAlign: 'center' }}>{subtitle}</p>
        </div>
    );
}

export default ComplianceReadiness;
