import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ComplianceReadiness() {
    const [readinessData, setReadinessData] = useState([]);
    const [actionItems, setActionItems] = useState([]);
    const [organizations, setOrganizations] = useState([]); 
    const [loading, setLoading] = useState(true);

    // Modal & Assignment State Management
    const [assignModalTask, setAssignModalTask] = useState(null); 
    const [isSending, setIsSending] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    
    // NEW: Tracks which tasks have been assigned { 'IFRS-S2-29c': 'Factory A' }
    const [assignedTasks, setAssignedTasks] = useState({}); 
    // NEW: Controlled form inputs for the modal
    const [selectedFacilityId, setSelectedFacilityId] = useState('');
    const [dueDate, setDueDate] = useState('');

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const currentYear = new Date().getFullYear();

            const [readinessRes, gapRes, orgRes] = await Promise.all([
                axios.get(`/api/reports/readiness?year=${currentYear}`, config).catch(() => ({ data: [] })),
                axios.get(`/api/reports/gap-analysis?framework=ISSB / IFRS S2&year=${currentYear}`, config).catch(() => ({ data: [] })),
                axios.get('/api/organizations', config).catch(() => ({ data: [] }))
            ]);
            
            setOrganizations(orgRes.data);

            const dashboardScores = readinessRes.data.length > 0 ? readinessRes.data : [
                { framework_name: 'CSRD / ESRS', readiness_score: 82, fulfilled_requirements: 41, total_requirements: 50 },
                { framework_name: 'ISSB / IFRS S2', readiness_score: 64, fulfilled_requirements: 16, total_requirements: 25 },
                { framework_name: 'GRI Standard', readiness_score: 95, fulfilled_requirements: 38, total_requirements: 40 }
            ];
            
            setReadinessData(dashboardScores);

            const gaps = gapRes.data.filter(req => !req.is_fulfilled);
            const actionableTasks = gaps.length > 0 ? gaps : [
                { framework_code: 'IFRS-S2-29c', description: 'Scope 3 Value Chain Emissions Data Missing', severity: 'High' },
                { framework_code: 'ESRS-S1', description: 'Own Workforce Gender Diversity Metrics Required', severity: 'Medium' },
                { framework_code: 'GRI-303-3', description: 'Water Withdrawal Data Awaiting Vendor Submission', severity: 'Low' }
            ];

            setActionItems(actionableTasks.slice(0, 4));

        } catch (err) {
            console.error("Failed to load readiness dashboard:", err);
        } finally {
            setLoading(false);
        }
    };

    const openAssignModal = (task) => {
        setAssignModalTask(task);
        setSelectedFacilityId('');
        setDueDate('');
    };

    // UPGRADED: Handles the dispatch and records the facility name
    const handleSendAssignment = (e) => {
        e.preventDefault();
        setIsSending(true);
        
        // Find the actual name of the selected facility
        let facilityName = 'External Vendor';
        if (selectedFacilityId !== 'external_vendor') {
            const org = organizations.find(o => o.unit_id.toString() === selectedFacilityId.toString());
            if (org) facilityName = org.name;
        }

        // Simulate a network request to an email/notification service
        setTimeout(() => {
            setIsSending(false);
            setSuccessMessage('Task dispatched to facility manager successfully!');
            
            // Record the assignment in state so the UI updates
            setAssignedTasks(prev => ({
                ...prev,
                [assignModalTask.framework_code]: facilityName
            }));
            
            // Close modal after showing success message briefly
            setTimeout(() => {
                setAssignModalTask(null);
                setSuccessMessage('');
            }, 2000);
        }, 800);
    };

    return (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', position: 'relative' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
                <div>
                    <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#111827', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🌐 Executive Compliance Readiness
                    </h2>
                    <p style={{ margin: 0, color: '#6b7280', fontSize: '15px', maxWidth: '600px' }}>
                        Real-time audit alignment across global regulatory frameworks. Resolve action items below to close disclosure gaps.
                    </p>
                </div>
                <div style={{ backgroundColor: '#f3f4f6', padding: '8px 16px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '14px', fontWeight: '700', color: '#374151' }}>
                    Fiscal Year: {new Date().getFullYear()}
                </div>
            </div>

            {loading ? (
                <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>Loading executive dashboard...</div>
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
                            Priority Action Items
                        </h3>

                        {actionItems.map((task, idx) => {
                            // Check if this specific task has been assigned
                            const assignedFacility = assignedTasks[task.framework_code];

                            return (
                                <div key={idx} style={{ padding: '16px', borderRadius: '12px', border: '1px solid #e5e7eb', backgroundColor: 'white', borderLeft: `4px solid ${task.severity === 'High' ? '#ef4444' : task.severity === 'Medium' ? '#f59e0b' : '#3b82f6'}`, boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#374151', backgroundColor: '#f3f4f6', padding: '2px 8px', borderRadius: '4px' }}>
                                            {task.framework_code}
                                        </span>
                                    </div>
                                    <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#111827', fontWeight: '600', lineHeight: '1.4' }}>
                                        {task.description}
                                    </p>
                                    
                                    {/* UPGRADED: Dynamic Button / Status Badge */}
                                    {assignedFacility ? (
                                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#059669', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#ecfdf5', padding: '6px 10px', borderRadius: '6px', width: 'fit-content' }}>
                                            ✅ Assigned to: {assignedFacility}
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

            {/* =========================================
                THE ASSIGNMENT MODAL OVERLAY
            ========================================= */}
            {assignModalTask && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(17, 24, 39, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
                    <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '16px', width: '90%', maxWidth: '450px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #e5e7eb' }}>
                        
                        {successMessage ? (
                            <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
                                <h3 style={{ margin: '0 0 8px 0', color: '#065f46', fontSize: '20px' }}>Task Delegated</h3>
                                <p style={{ color: '#047857', margin: 0 }}>{successMessage}</p>
                            </div>
                        ) : (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                    <h3 style={{ margin: 0, fontSize: '18px', color: '#111827' }}>Delegate Compliance Task</h3>
                                    <button onClick={() => setAssignModalTask(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#6b7280' }}>×</button>
                                </div>

                                <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '24px' }}>
                                    <p style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' }}>Missing Requirement:</p>
                                    <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#111827' }}>[{assignModalTask.framework_code}] {assignModalTask.description}</p>
                                </div>

                                <form onSubmit={handleSendAssignment} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Assign to Facility</label>
                                        <select 
                                            required 
                                            value={selectedFacilityId}
                                            onChange={(e) => setSelectedFacilityId(e.target.value)}
                                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none' }}
                                        >
                                            <option value="">Select a facility...</option>
                                            {organizations.map(org => (
                                                <option key={org.unit_id} value={org.unit_id}>{org.name} ({org.jurisdiction})</option>
                                            ))}
                                            <option value="external_vendor">External Supply Chain Vendor</option>
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Due Date</label>
                                        <input 
                                            type="date" 
                                            required 
                                            value={dueDate}
                                            onChange={(e) => setDueDate(e.target.value)}
                                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }} 
                                        />
                                    </div>

                                    <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                                        <button type="button" onClick={() => setAssignModalTask(null)} style={{ flex: 1, padding: '12px', backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                                            Cancel
                                        </button>
                                        <button type="submit" disabled={isSending} style={{ flex: 2, padding: '12px', backgroundColor: '#111827', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: isSending ? 'wait' : 'pointer' }}>
                                            {isSending ? 'Dispatching...' : 'Send Alert Notification'}
                                        </button>
                                    </div>
                                </form>
                            </>
                        )}

                    </div>
                </div>
            )}
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