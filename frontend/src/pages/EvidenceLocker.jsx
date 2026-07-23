import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function EvidenceLocker() {
    const navigate = useNavigate();
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('Pending'); 
    const [viewingKey, setViewingKey] = useState(null); // tracks which doc's link is being fetched

    // FIX: Evidence Locker review gaps — metadata tagging (document type, facility,
    // reporting period) and search/filter tools were entirely absent. These four
    // filters sit alongside the existing status tabs rather than replacing them.
    const [docTypeFilter, setDocTypeFilter] = useState('All');
    const [facilityFilter, setFacilityFilter] = useState('All');
    const [yearFilter, setYearFilter] = useState('All');
    const [metricSearch, setMetricSearch] = useState('');

    // Role verification
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const canVerify = user?.role === 'Admin' || user?.role === 'Manager';

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            // FIX: this previously only pulled GHG emissions and external supplier
            // campaigns — any evidence attached to a general E/S/G/F metric
            // (logged via the non-GHG DataEntry forms) never appeared here at all.
            // Adding /api/observations closes that coverage gap.
            const [emissionsRes, campaignsRes, observationsRes] = await Promise.all([
                axios.get('/api/emissions', config).catch(err => { console.error("Emissions fetch failed:", err); return { data: [] }; }),
                axios.get('/api/campaigns', config).catch(err => { console.error("Campaigns fetch failed:", err); return { data: [] }; }),
                axios.get('/api/observations', config).catch(err => { console.error("Observations fetch failed:", err); return { data: [] }; })
            ]);

            // Process Internal Data (GHG / Carbon Tracker) — normalize field names to
            // match what the rest of this component expects
            const internalDocs = emissionsRes.data
                .filter(record => record.evidence_url)
                .map(doc => ({
                    ...doc,
                    id: doc.observation_id,          // real PK column
                    evidence_file_url: doc.evidence_url, // this is now an R2 object key, not a path
                    recorded_date: doc.timestamp,
                    document_type: doc.document_type || 'Uncategorized',
                    status: doc.status || 'Pending',
                    source: 'Internal'
                }));

            // Process General Pillar Data (Social / Governance / Financial / General
            // Environmental metrics logged outside the Carbon Tracker)
            const generalDocs = observationsRes.data
                .filter(record => record.evidence_url)
                .map(doc => ({
                    ...doc,
                    id: doc.observation_id,
                    evidence_file_url: doc.evidence_url,
                    activity_type: doc.metric_name,
                    recorded_date: doc.timestamp,
                    document_type: doc.document_type || 'Uncategorized',
                    quality_tier: doc.quality_tier || 'C',
                    status: doc.status || 'Pending',
                    source: 'Internal'
                }));

            // Process External Vendor Data
            const externalDocs = campaignsRes.data
                .filter(camp => camp.evidence_url)
                .map(camp => ({
                    id: camp.id,
                    evidence_file_url: camp.evidence_url, // also an R2 object key
                    organization_name: `Supplier: ${camp.supplier}`, 
                    activity_type: camp.metric,
                    recorded_date: camp.created_at,
                    quality_tier: 'A',
                    document_type: 'Supplier Submission',
                    status: camp.status === 'Completed' ? 'Pending' : camp.status,
                    source: 'External'
                }));

            setDocuments([...internalDocs, ...generalDocs, ...externalDocs]);
        } catch (err) {
            console.error("Failed to load evidence locker:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDocumentVerification = async (id, newStatus, source) => {
        try {
            const token = localStorage.getItem('token');
            
            if (source === 'External') {
                await axios.put(`/api/campaigns/${id}/status`, { status: newStatus }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.put(`/api/emissions/${id}/status`, { status: newStatus }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            
            setDocuments(documents.map(doc => doc.id === id ? { ...doc, status: newStatus } : doc));
        } catch (err) {
            alert("Failed to update document status. Ensure you have the correct permissions.");
        }
    };

    // Fetches a fresh, temporary signed URL from the backend and opens it,
    // instead of linking directly to the (now private) R2 object.
    const handleViewEvidence = async (key) => {
        setViewingKey(key);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/evidence/${key}/view`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            window.open(res.data.url, '_blank');
        } catch (err) {
            console.error("Failed to load evidence file:", err);
            alert("Failed to load evidence file. It may have been removed or the link expired.");
        } finally {
            setViewingKey(null);
        }
    };

    // FIX: "direct linkage to specific metrics/facilities" from the review — routes
    // to the page that actually shows the individual record (Audit Queue for
    // internal entries, the Campaigns page for supplier submissions), rather than
    // leaving the metric/facility as inert text with nowhere to go.
    const handleViewInLedger = (doc) => {
        navigate(doc.source === 'External' ? '/campaigns' : '/audit-queue');
    };

    const getFileName = (url) => {
        if (!url) return "Unknown File";
        const parts = url.split('/');
        const rawName = parts[parts.length - 1];
        return rawName.length > 25 ? rawName.substring(0, 22) + '...' : rawName;
    };

    // Derived filter option lists — built from whatever's actually in the loaded
    // documents, so the dropdowns never show options with zero matching results.
    const documentTypeOptions = ['All', ...new Set(documents.map(d => d.document_type).filter(Boolean))].sort((a, b) => a === 'All' ? -1 : b === 'All' ? 1 : a.localeCompare(b));
    const facilityOptions = ['All', ...new Set(documents.map(d => d.organization_name).filter(Boolean))].sort((a, b) => a === 'All' ? -1 : b === 'All' ? 1 : a.localeCompare(b));
    const yearOptions = ['All', ...new Set(documents.filter(d => d.recorded_date).map(d => new Date(d.recorded_date).getFullYear().toString()))].sort((a, b) => a === 'All' ? -1 : b === 'All' ? 1 : b.localeCompare(a));

    const filteredDocs = documents.filter(doc => {
        if (doc.status !== activeFilter) return false;
        if (docTypeFilter !== 'All' && doc.document_type !== docTypeFilter) return false;
        if (facilityFilter !== 'All' && doc.organization_name !== facilityFilter) return false;
        if (yearFilter !== 'All' && (!doc.recorded_date || new Date(doc.recorded_date).getFullYear().toString() !== yearFilter)) return false;
        if (metricSearch && !(doc.activity_type || '').toLowerCase().includes(metricSearch.toLowerCase())) return false;
        return true;
    });
    const pendingCount = documents.filter(doc => doc.status === 'Pending').length;

    const selectStyle = { padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', color: '#111827', background: 'white' };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px', fontFamily: 'system-ui, sans-serif' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '32px', margin: '0 0 8px 0', fontWeight: '800', color: '#111827', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        🗄️ Evidence Locker
                    </h1>
                    <p style={{ margin: 0, color: '#4b5563', fontSize: '16px' }}>
                        Central repository for all raw invoices, utility bills, and supplier receipts.
                    </p>
                </div>
            </div>

            {/* Search & filter bar */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px', padding: '16px', background: 'white', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' }}>Document Type</label>
                    <select value={docTypeFilter} onChange={(e) => setDocTypeFilter(e.target.value)} style={selectStyle}>
                        {documentTypeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' }}>Facility</label>
                    <select value={facilityFilter} onChange={(e) => setFacilityFilter(e.target.value)} style={selectStyle}>
                        {facilityOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' }}>Reporting Year</label>
                    <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} style={selectStyle}>
                        {yearOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '180px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' }}>Search Metric</label>
                    <input
                        type="text"
                        value={metricSearch}
                        onChange={(e) => setMetricSearch(e.target.value)}
                        placeholder="e.g. electricity, waste..."
                        style={{ ...selectStyle, width: '100%', boxSizing: 'border-box' }}
                    />
                </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e5e7eb', marginBottom: '32px' }}>
                {['Pending', 'Approved', 'Rejected'].map((tab) => (
                    <button 
                        key={tab} 
                        onClick={() => setActiveFilter(tab)} 
                        style={{
                            padding: '12px 24px', cursor: 'pointer', fontSize: '15px', fontWeight: '700', border: 'none', outline: 'none', backgroundColor: 'transparent', transition: 'all 0.2s',
                            color: activeFilter === tab ? '#111827' : '#6b7280',
                            borderBottom: activeFilter === tab ? '3px solid #3b82f6' : '3px solid transparent'
                        }}
                    >
                        {tab === 'Pending' ? 'Awaiting Verification' : `${tab} Documents`}
                        {tab === 'Pending' && pendingCount > 0 && (
                            <span style={{ marginLeft: '8px', backgroundColor: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>
                                {pendingCount}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280', fontSize: '16px', fontWeight: '500' }}>Accessing secure locker...</div>
            ) : filteredDocs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', backgroundColor: 'white', borderRadius: '12px', border: '1px dashed #d1d5db', color: '#6b7280' }}>
                    No {activeFilter.toLowerCase()} documents match the current filters.
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                    {filteredDocs.map((doc) => (
                        <div key={doc.id} style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', transition: 'transform 0.2s, box-shadow 0.2s' }} onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.05)'; }} onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)'; }}>
                            
                            <div style={{ backgroundColor: '#f9fafb', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', borderBottom: '1px solid #e5e7eb', borderTop: doc.status === 'Approved' ? '4px solid #10b981' : doc.status === 'Rejected' ? '4px solid #ef4444' : '4px solid #f59e0b' }}>
                                <span style={{ fontSize: '48px', marginBottom: '12px' }}>
                                    {doc.evidence_file_url.endsWith('.pdf') ? '📄' : '🖼️'}
                                </span>
                                <button
                                    onClick={() => handleViewEvidence(doc.evidence_file_url)}
                                    disabled={viewingKey === doc.evidence_file_url}
                                    style={{
                                        color: '#2563eb', fontWeight: '700', fontSize: '14px', textDecoration: 'none',
                                        textAlign: 'center', background: 'none', border: 'none',
                                        cursor: viewingKey === doc.evidence_file_url ? 'wait' : 'pointer', padding: 0
                                    }}
                                >
                                    {viewingKey === doc.evidence_file_url ? 'Loading...' : getFileName(doc.evidence_file_url)}
                                </button>
                                <span style={{ marginTop: '10px', fontSize: '11px', fontWeight: '700', color: '#4338ca', background: '#eef2ff', padding: '3px 10px', borderRadius: '12px' }}>
                                    {doc.document_type}
                                </span>
                            </div>

                            <div style={{ padding: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '13px' }}>
                                    <span style={{ color: '#6b7280', fontWeight: '600' }}>Facility:</span>
                                    <span style={{ color: doc.source === 'External' ? '#4f46e5' : '#111827', fontWeight: '700' }}>{doc.organization_name}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '13px' }}>
                                    <span style={{ color: '#6b7280', fontWeight: '600' }}>Associated Metric:</span>
                                    <span style={{ color: '#111827', fontWeight: '700' }}>{(doc.activity_type || '').replace(/_/g, ' ')}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '13px' }}>
                                    <span style={{ color: '#6b7280', fontWeight: '600' }}>Reporting Period:</span>
                                    <span style={{ color: '#111827', fontWeight: '700' }}>{doc.recorded_date ? new Date(doc.recorded_date).getFullYear() : '—'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '13px' }}>
                                    <span style={{ color: '#6b7280', fontWeight: '600' }}>Upload Date:</span>
                                    <span style={{ color: '#111827', fontWeight: '700' }}>{doc.recorded_date ? new Date(doc.recorded_date).toLocaleDateString() : '—'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '13px' }}>
                                    <span style={{ color: '#6b7280', fontWeight: '600' }}>Doc Quality:</span>
                                    <span style={{ 
                                        backgroundColor: doc.quality_tier === 'A' ? '#d1fae5' : '#fef3c7', 
                                        color: doc.quality_tier === 'A' ? '#065f46' : '#92400e', 
                                        padding: '2px 8px', borderRadius: '4px', fontWeight: '800' 
                                    }}>
                                        Tier {doc.quality_tier}
                                    </span>
                                </div>
                                <button
                                    onClick={() => handleViewInLedger(doc)}
                                    style={{ width: '100%', background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', padding: '8px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                                >
                                    View in Ledger →
                                </button>
                            </div>

                            {canVerify && activeFilter === 'Pending' && (
                                <div style={{ padding: '16px 20px', backgroundColor: '#f9fafb', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '8px' }}>
                                    <button 
                                        onClick={() => handleDocumentVerification(doc.id, 'Approved', doc.source)}
                                        style={{ flex: 1, backgroundColor: 'white', color: '#059669', border: '1px solid #10b981', padding: '8px', borderRadius: '6px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: '0.2s' }}
                                        onMouseOver={e => e.target.style.backgroundColor = '#ecfdf5'} onMouseOut={e => e.target.style.backgroundColor = 'white'}
                                    >
                                        Verify Quality
                                    </button>
                                    <button 
                                        onClick={() => handleDocumentVerification(doc.id, 'Rejected', doc.source)}
                                        style={{ flex: 1, backgroundColor: 'white', color: '#dc2626', border: '1px solid #ef4444', padding: '8px', borderRadius: '6px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: '0.2s' }}
                                        onMouseOver={e => e.target.style.backgroundColor = '#fef2f2'} onMouseOut={e => e.target.style.backgroundColor = 'white'}
                                    >
                                        Reject
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default EvidenceLocker;
