import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';

function SOPPage() {
    const documentRef = useRef();

    const handleDownloadPdf = useReactToPrint({
        content: () => documentRef.current,
        documentTitle: 'ESG_Platform_SOP',
        pageStyle: `
            @media print {
                body { margin: 0; padding: 20mm; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
                h1 { color: #111827; }
                h3 { color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
            }
        `
    });

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '40px', fontFamily: 'system-ui, sans-serif' }}>
            
            {/* Page Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '32px', margin: '0 0 8px 0', fontWeight: '800', color: '#111827' }}>
                        System Documentation
                    </h1>
                    <p style={{ margin: 0, color: '#4b5563', fontSize: '16px' }}>
                        Download the Standard Operating Procedure (SOP) for team onboarding.
                    </p>
                </div>
                <button 
                    onClick={handleDownloadPdf}
                    style={{ backgroundColor: '#4f46e5', color: 'white', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                >
                    📄 Download PDF
                </button>
            </div>

            {/* The Document Container (This is what gets turned into the PDF) */}
            <div 
                style={{ backgroundColor: 'white', padding: '40px 60px', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}
            >
                <div ref={documentRef} style={{ color: '#374151', lineHeight: '1.6' }}>
                    <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                        <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', color: '#111827' }}>Standard Operating Procedure</h1>
                        <h2 style={{ margin: 0, fontSize: '20px', color: '#6b7280', fontWeight: '500' }}>ESG Platform Operations</h2>
                    </div>

                    <p><strong>Purpose:</strong> To define the standardized workflow for capturing, verifying, and reporting corporate Environmental, Social, and Governance (ESG) data using the proprietary ESG Compliance Platform.</p>
                    <p><strong>Scope:</strong> Covers system initialization, data ingestion, Scope 3 supply chain management, audit verification, and final compliance reporting.</p>
                    
                    <h4 style={{ color: '#111827', marginTop: '24px', marginBottom: '8px' }}>Primary Roles:</h4>
                    <ul style={{ marginTop: '0', paddingLeft: '20px' }}>
                        <li><strong>Executive Admin:</strong> System configuration and boundary setting.</li>
                        <li><strong>Facility Manager:</strong> Primary data entry and evidence upload.</li>
                        <li><strong>Compliance Manager:</strong> Scope 3 dispatch and data approval.</li>
                        <li><strong>Auditor:</strong> Independent verification of claims and evidence.</li>
                    </ul>

                    <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '32px 0' }} />

                    <h3 style={{ color: '#111827', borderBottom: '2px solid #f3f4f6', paddingBottom: '8px' }}>Phase 1: System Initialization & Boundary Setting</h3>
                    <p style={{ fontStyle: 'italic', fontSize: '14px', color: '#6b7280' }}>Completed annually or during major corporate restructuring by the Executive Admin.</p>
                    <ol style={{ paddingLeft: '20px' }}>
                        <li><strong>Define Organizational Boundaries:</strong> Navigate to <code>Admin Settings &gt; Entity Boundaries</code>. Establish the corporate hierarchy by designating the Root Corporate Entity and mapping all subsidiaries, facilities, and regional hubs beneath it.</li>
                        <li><strong>Set Consolidation Approach:</strong> Select the legal accounting rule for the fiscal year (Operational Control, Financial Control, or Equity Share).</li>
                        <li><strong>Configure Equity & Control:</strong> For each child entity, input the specific Equity Share percentage or binary Operational Control status to dictate exactly how emissions will roll up into the final corporate footprint.</li>
                        <li><strong>Establish Materiality:</strong> Navigate to <code>Metrics Config &gt; Materiality</code>. Plot the critical ESG topics on the matrix to lock in the reporting focus for the year.</li>
                    </ol>

                    <h3 style={{ color: '#111827', borderBottom: '2px solid #f3f4f6', paddingBottom: '8px', marginTop: '32px' }}>Phase 2: Data Ingestion</h3>
                    <p style={{ fontStyle: 'italic', fontSize: '14px', color: '#6b7280' }}>Completed monthly or quarterly by Facility Managers.</p>
                    <ol style={{ paddingLeft: '20px' }}>
                        <li><strong>Prepare Bulk Data:</strong> Aggregate utility bills, fuel logs, and social metrics into a standard spreadsheet (Long or Wide format).</li>
                        <li><strong>Execute Bulk Upload:</strong> Navigate to <code>Data Entry &gt; Bulk CSV Upload</code>. The Universal Parser will automatically apply fuzzy-matching to map facilities and bypass blank cells.</li>
                        <li><strong>Log Singular Events:</strong> For ad-hoc data, utilize the manual entry tabs (Env, Social, Gov).</li>
                        <li><strong>Attach Audit Evidence:</strong> For high-risk entries, upload the corresponding PDF invoice. Utilize the Document AI extractor to auto-fill numeric values.</li>
                    </ol>

                    <h3 style={{ color: '#111827', borderBottom: '2px solid #f3f4f6', paddingBottom: '8px', marginTop: '32px' }}>Phase 3: Scope 3 Value Chain Engagement</h3>
                    <p style={{ fontStyle: 'italic', fontSize: '14px', color: '#6b7280' }}>Completed bi-annually by the Compliance Manager.</p>
                    <ol style={{ paddingLeft: '20px' }}>
                        <li><strong>Dispatch Campaigns:</strong> Navigate to <code>Scope 3 Campaigns</code>. Enter the supplier's name, target metric, and deadline.</li>
                        <li><strong>Distribute Secure Portals:</strong> Click the <code>Copy Link</code> action button on the Supplier Leaderboard and securely email the tokenized URL to the vendor.</li>
                        <li><strong>Review Data Quality Tiers:</strong> Upon submission, assess the system-assigned Quality Tier (Tier A: Primary Data, Tier B: Industry Averages, Tier C: Spend-Based).</li>
                    </ol>

                    <h3 style={{ color: '#111827', borderBottom: '2px solid #f3f4f6', paddingBottom: '8px', marginTop: '32px' }}>Phase 4: The Audit & Approval Workflow</h3>
                    <p style={{ fontStyle: 'italic', fontSize: '14px', color: '#6b7280' }}>Completed continuously by Compliance Managers and Auditors.</p>
                    <ol style={{ paddingLeft: '20px' }}>
                        <li><strong>Access the Immutable Ledger:</strong> Navigate to <code>Review Data &gt; Audit Queue</code>. Review all "Pending" data.</li>
                        <li><strong>Verify the Atomic Snapshot:</strong> For GHG entries, audit the underlying mathematics locked to the record (emission factor and methodology version).</li>
                        <li><strong>Execute Status Change:</strong> Approve valid records to route them into the live compliance engine, or Reject records with notes for correction.</li>
                    </ol>

                    <h3 style={{ color: '#111827', borderBottom: '2px solid #f3f4f6', paddingBottom: '8px', marginTop: '32px' }}>Phase 5: Framework Reporting & Gap Analysis</h3>
                    <p style={{ fontStyle: 'italic', fontSize: '14px', color: '#6b7280' }}>Completed at the end of the reporting cycle by Executive Admins.</p>
                    <ol style={{ paddingLeft: '20px' }}>
                        <li><strong>Generate Compliance Reports:</strong> Navigate to <code>Compliance Alignment</code>. Select the target framework (CSRD, ISSB, GRI) and reporting year.</li>
                        <li><strong>Review Fulfillment Scores:</strong> Analyze the automated gap analysis cross-referencing all "Approved" data against disclosure requirements.</li>
                        <li><strong>Export & Disclose:</strong> Export the finalized, audit-grade report for publication.</li>
                    </ol>
                </div>
            </div>
        </div>
    );
}

export default SOPPage;