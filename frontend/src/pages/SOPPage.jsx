import React, { useState } from 'react';

function SOPPage() {
    const [activeSection, setActiveSection] = useState('overview');

    const sections = [
        { id: 'overview', title: '1. Platform Overview', icon: '🌍' },
        { id: 'quality-tiers', title: '2. Data Quality & Tiers', icon: '🥇' },
        { id: 'evidence-locker', title: '3. The Evidence Locker', icon: '🗄️' },
        { id: 'audit-queue', title: '4. Audit & Approval Workflow', icon: '✅' },
        { id: 'anomalies', title: '5. Variance & Anomaly Flags', icon: '⚠️' },
        { id: 'materiality', title: '6. Double Materiality Alignment', icon: '🎯' },
        { id: 'delegation', title: '7. Task Delegation Workflow', icon: '📤' }
    ];

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px', fontFamily: 'system-ui, sans-serif' }}>
            
            {/* Header Section */}
            <div style={{ marginBottom: '32px', paddingBottom: '24px', borderBottom: '2px solid #e5e7eb' }}>
                <h1 style={{ fontSize: '32px', margin: '0 0 8px 0', fontWeight: '800', color: '#111827', letterSpacing: '-0.02em' }}>
                    📄 Standard Operating Procedures
                </h1>
                <p style={{ margin: 0, color: '#4b5563', fontSize: '16px' }}>
                    Official guidelines for data ingestion, evidence verification, and framework-specific compliance.
                </p>
            </div>

            <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                
                {/* SOP Navigation Sidebar */}
                <div style={{ flex: '1 1 250px', backgroundColor: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #e5e7eb', position: 'sticky', top: '24px' }}>
                    <h3 style={{ margin: '0 0 16px 8px', fontSize: '12px', textTransform: 'uppercase', color: '#9ca3af', fontWeight: '700', letterSpacing: '0.05em' }}>
                        Chapters
                    </h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {sections.map((sec) => (
                            <li key={sec.id}>
                                <button 
                                    onClick={() => setActiveSection(sec.id)}
                                    style={{
                                        width: '100%', textAlign: 'left', padding: '12px 16px', borderRadius: '8px', border: 'none', outline: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '12px',
                                        backgroundColor: activeSection === sec.id ? '#eff6ff' : 'transparent',
                                        color: activeSection === sec.id ? '#1d4ed8' : '#4b5563'
                                    }}
                                >
                                    <span style={{ fontSize: '16px' }}>{sec.icon}</span> {sec.title}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* SOP Content Area */}
                <div style={{ flex: '3 1 600px', backgroundColor: 'white', padding: '40px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', lineHeight: '1.6', color: '#374151', minHeight: '500px' }}>
                    
                    {activeSection === 'overview' && (
                        <div className="fade-in">
                            <h2 style={contentHeaderStyle}>1. Platform Overview & Scope</h2>
                            <p>This ESG Compliance Platform serves as the central ledger for all corporate sustainability data, including carbon emissions (Scope 1, 2, and 3), social metrics, and governance logs.</p>
                            <p>To ensure audit readiness for frameworks like CSRD and ISSB, all data entered into this platform is subjected to strict role-based access controls (RBAC) and cryptographic verification.</p>
                            <div style={infoBoxStyle}>
                                <strong>System Roles:</strong>
                                <ul style={{ marginTop: '8px', marginBottom: 0 }}>
                                    <li><strong>Facility Managers:</strong> Can ingest raw data and upload receipts, but cannot verify or approve records.</li>
                                    <li><strong>Admins & Managers:</strong> Hold the cryptographic keys to approve records in the Audit Queue and set Net-Zero targets.</li>
                                    <li><strong>External Auditors:</strong> Can view the dashboard and Evidence Locker in read-only mode for assurance reporting.</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {activeSection === 'quality-tiers' && (
                        <div className="fade-in">
                            <h2 style={contentHeaderStyle}>2. Data Quality & Auto-Grading Tiers</h2>
                            <p>Not all carbon data is created equal. When Facility Managers log data via the Data Entry portal, the backend algorithm automatically assigns a <strong>Quality Tier</strong> based on the inputs provided.</p>
                            
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px', marginBottom: '20px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                                        <th style={{ padding: '12px', color: '#111827' }}>Tier</th>
                                        <th style={{ padding: '12px', color: '#111827' }}>Definition</th>
                                        <th style={{ padding: '12px', color: '#111827' }}>Requirement</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                                        <td style={{ padding: '12px' }}><span style={tierBadgeStyle('A', '#d1fae5', '#065f46')}>Tier A</span></td>
                                        <td style={{ padding: '12px', fontWeight: '600' }}>Primary Data</td>
                                        <td style={{ padding: '12px', fontSize: '14px' }}>Requires exact fuel/energy amounts AND a physical PDF receipt attached.</td>
                                    </tr>
                                    <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                                        <td style={{ padding: '12px' }}><span style={tierBadgeStyle('B', '#fef3c7', '#92400e')}>Tier B</span></td>
                                        <td style={{ padding: '12px', fontWeight: '600' }}>Activity-Based</td>
                                        <td style={{ padding: '12px', fontSize: '14px' }}>Requires exact fuel/energy amounts, but lacks physical receipt evidence.</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '12px' }}><span style={tierBadgeStyle('C', '#fee2e2', '#991b1b')}>Tier C</span></td>
                                        <td style={{ padding: '12px', fontWeight: '600' }}>Spend-Based</td>
                                        <td style={{ padding: '12px', fontSize: '14px' }}>Estimated based on financial expenditure (e.g., $5,000 spent on electricity). Lowest accuracy.</td>
                                    </tr>
                                </tbody>
                            </table>
                            <p style={{ fontSize: '14px', color: '#6b7280' }}>* Note: For European CSRD compliance, facilities must strive for <strong>Tier A</strong> data whenever possible.</p>
                        </div>
                    )}

                    {activeSection === 'evidence-locker' && (
                        <div className="fade-in">
                            <h2 style={contentHeaderStyle}>3. The Evidence Locker</h2>
                            <p>The Evidence Locker is the central repository isolating raw documentation from mathematical analytics. When a PDF invoice, utility bill, or image receipt is uploaded during data entry, it is routed here.</p>
                            <h4 style={{ color: '#111827', marginTop: '24px' }}>Verification Protocol:</h4>
                            <ol>
                                <li style={{ marginBottom: '8px' }}>Admins navigate to the Evidence Locker.</li>
                                <li style={{ marginBottom: '8px' }}>Click the document link to open the raw file in a secure viewer.</li>
                                <li style={{ marginBottom: '8px' }}>Cross-reference the <strong>Raw Input</strong> amount logged in the system against the physical numbers on the receipt.</li>
                                <li>If the numbers match and the document is legible, click <strong>Verify Quality</strong>. If the image is blurry or incorrect, click <strong>Reject Image</strong>.</li>
                            </ol>
                        </div>
                    )}

                    {activeSection === 'audit-queue' && (
                        <div className="fade-in">
                            <h2 style={contentHeaderStyle}>4. Audit Queue & Ledger Locks</h2>
                            <p>Data entered by Facility Managers does NOT legally represent the company until it passes through the Audit Queue.</p>
                            <p>Data exists in one of three states:</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
                                <div style={{ padding: '16px', borderLeft: '4px solid #f59e0b', backgroundColor: '#fffbeb', borderRadius: '4px' }}>
                                    <strong>Pending:</strong> Default state. Invisible to Dashboard analytics and compliance matrix.
                                </div>
                                <div style={{ padding: '16px', borderLeft: '4px solid #10b981', backgroundColor: '#ecfdf5', borderRadius: '4px' }}>
                                    <strong>Approved:</strong> Cryptographically locked into the ledger. Populates dashboard charts and affects Net-Zero trajectory.
                                </div>
                                <div style={{ padding: '16px', borderLeft: '4px solid #ef4444', backgroundColor: '#fef2f2', borderRadius: '4px' }}>
                                    <strong>Rejected:</strong> Flagged back to the Facility Manager for correction and re-submission.
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'anomalies' && (
                        <div className="fade-in">
                            <h2 style={contentHeaderStyle}>5. Variance & Anomaly Detection</h2>
                            <p>The platform is equipped with an automated algorithmic intelligence engine that monitors monthly data ingestion for typographical errors or severe operational inefficiencies.</p>
                            <h4 style={{ color: '#111827', marginTop: '24px' }}>How it works:</h4>
                            <p>The system calculates the mathematical <strong>Mean</strong> and <strong>Standard Deviation</strong> of all historical approved data.</p>
                            <p>If a new approved entry causes the current month's emissions to spike beyond a <strong>1.5x Standard Deviation threshold</strong>, the system triggers a Red Warning Flag on the primary dashboard.</p>
                            <div style={infoBoxStyle}>
                                <strong>Action Required upon Anomaly:</strong>
                                <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>If a High Variance Warning appears, the Executive Admin must immediately cross-reference the anomalous month in the Audit Queue against the physical receipt in the Evidence Locker to rule out a "fat-finger" typing error (e.g., logging 50,000 instead of 5,000).</p>
                            </div>
                        </div>
                    )}

                    {activeSection === 'materiality' && (
                        <div className="fade-in">
                            <h2 style={contentHeaderStyle}>6. Double Materiality Alignment</h2>
                            <p>The platform utilizes a dynamic Double Materiality engine. Users must understand that <strong>it is normal and expected for the same organization to generate different materiality matrices</strong> depending on the selected framework (e.g., GSE vs. NIC).</p>
                            
                            <div style={infoBoxStyle}>
                                <strong>Framework Lenses:</strong>
                                <ul style={{ marginTop: '8px', marginBottom: 0 }}>
                                    <li><strong>GSE (Ghana Stock Exchange):</strong> Prioritizes investor-focused metrics like "Board ESG Oversight," "Ethical Conduct," and "Diversity & Inclusion."</li>
                                    <li><strong>NIC (National Insurance Commission):</strong> Prioritizes systemic risk indicators such as "Climate Stress Testing," "Portfolio ESG Screening," and "Sustainable Underwriting Exclusions."</li>
                                </ul>
                            </div>

                            <h4 style={{ color: '#111827', marginTop: '24px' }}>Operating Procedure:</h4>
                            <p>When provisioning a new workspace, always ensure the correct <strong>Starter Kit</strong> is deployed via the Sector Onboarding tool. Submitting an incorrect matrix (e.g., GSE-focused vs. NIC-mandated) during regulatory audit periods may lead to non-compliance flags.</p>
                        </div>
                    )}

                    {activeSection === 'delegation' && (
                        <div className="fade-in">
                            <h2 style={contentHeaderStyle}>7. Task Delegation Workflow</h2>
                            <p>The Gap Analysis Matrix, found inside each framework's Alignment card, lists every clause required for full compliance. For any clause still showing a gap, an Admin has two options: log the data themselves, or delegate the task to the colleague responsible for that data.</p>

                            <h4 style={{ color: '#111827', marginTop: '24px' }}>Clause Status Reference:</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
                                <div style={{ padding: '16px', borderLeft: '4px solid #10b981', backgroundColor: '#ecfdf5', borderRadius: '4px' }}>
                                    <strong>✅ Fulfilled:</strong> Approved data already satisfies this clause. No action needed.
                                </div>
                                <div style={{ padding: '16px', borderLeft: '4px solid #ef4444', backgroundColor: '#fef2f2', borderRadius: '4px' }}>
                                    <strong>❌ Gap:</strong> No approved data exists for this clause yet, and no one has been asked to provide it.
                                </div>
                                <div style={{ padding: '16px', borderLeft: '4px solid #f59e0b', backgroundColor: '#fffbeb', borderRadius: '4px' }}>
                                    <strong>📤 Pending:</strong> The clause is still a gap, but a colleague has been notified by email and is expected to close it. The row shows who it was delegated to and the due date.
                                </div>
                            </div>

                            <h4 style={{ color: '#111827', marginTop: '24px' }}>Delegating a Clause:</h4>
                            <ol>
                                <li style={{ marginBottom: '8px' }}>From the Gap Analysis Matrix, click <strong>Delegate 📤</strong> next to any unresolved clause.</li>
                                <li style={{ marginBottom: '8px' }}>Enter the assignee's email, confirm the task name and facility context, and set a due date.</li>
                                <li style={{ marginBottom: '8px' }}>Click <strong>Dispatch Alert</strong>. The assignee receives an email describing exactly what's needed and by when.</li>
                                <li>The clause immediately switches to the <strong>📤 Pending</strong> state in the matrix, so Admins never lose track of what's been asked of whom.</li>
                            </ol>

                            <h4 style={{ color: '#111827', marginTop: '24px' }}>Sending a Reminder:</h4>
                            <p>A clause already in the <strong>📤 Pending</strong> state shows a <strong>Remind ↻</strong> button instead of Delegate. This re-sends the notification email to the same assignee without creating a duplicate delegation record.</p>

                            <div style={infoBoxStyle}>
                                <strong>Important:</strong>
                                <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>Delegating a task only sends a notification — it does not log any data itself. The clause only moves to ✅ Fulfilled once the assignee's data has actually been entered and approved through the normal Audit Queue process (see Chapter 4).</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Simple Inline CSS for the fade effect */}
            <style>{`
                .fade-in { animation: fadeIn 0.3s ease-in-out; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
}

// Reusable Styles
const contentHeaderStyle = {
    fontSize: '24px',
    fontWeight: '800',
    color: '#111827',
    margin: '0 0 20px 0',
    letterSpacing: '-0.01em'
};

const infoBoxStyle = {
    marginTop: '24px',
    padding: '20px',
    backgroundColor: '#f8fafc',
    border: '1px solid #bfdbfe',
    borderRadius: '8px',
    color: '#1e40af'
};

const tierBadgeStyle = (tier, bg, color) => ({
    backgroundColor: bg,
    color: color,
    padding: '4px 10px',
    borderRadius: '6px',
    fontWeight: '800',
    fontSize: '12px'
});

export default SOPPage;