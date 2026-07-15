import React, { useState, useEffect } from 'react';
import axios from 'axios';

function EvidenceLocker() {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('Pending'); 

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
        
        const [emissionsRes, campaignsRes] = await Promise.all([
            axios.get('/api/emissions', config),
            axios.get('/api/campaigns', config)
        ]);
        
        // Process Internal Data — normalize field names to match what the rest of this component expects
        const internalDocs = emissionsRes.data
            .filter(record => record.evidence_url)
            .map(doc => ({
                ...doc,
                id: doc.observation_id,          // real PK column
                evidence_file_url: doc.evidence_url,
                recorded_date: doc.timestamp,
                source: 'Internal'
            }));

        // Process External Vendor Data (unchanged)
        const externalDocs = campaignsRes.data
            .filter(camp => camp.evidence_url)
            .map(camp => ({
                id: camp.id,
                evidence_file_url: camp.evidence_url,
                organization_name: `Supplier: ${camp.supplier}`, 
                activity_type: camp.metric,
                recorded_date: camp.created_at,
                quality_tier: 'A',
                status: camp.status === 'Completed' ? 'Pending' : camp.status,
                source: 'External'
            }));

        setDocuments([...internalDocs, ...externalDocs]);
    } catch (err) {
        console.error("Failed to load evidence locker:", err);
    } finally {
        setLoading(false);
    }
};

    const handleDocumentVerification = async (id, newStatus, source) => {
        try {
            const token = localStorage.getItem('token');
            
            // Route the API call based on which vault the document came from
            if (source === 'External') {
                await axios.put(`/api/campaigns/${id}/status`, { status: newStatus }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.put(`/api/emissions/${id}/status`, { status: newStatus }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            
            // Update UI instantly
            setDocuments(documents.map(doc => doc.id === id ? { ...doc, status: newStatus } : doc));
        } catch (err) {
            alert("Failed to update document status. Ensure you have the correct permissions.");
        }
    };

    const getFileName = (url) => {
        if (!url) return "Unknown File";
        const parts = url.split('/');
        const rawName = parts[parts.length - 1];
        return rawName.length > 25 ? rawName.substring(0, 22) + '...' : rawName;
    };

    const filteredDocs = documents.filter(doc => doc.status === activeFilter);
    const pendingCount = documents.filter(doc => doc.status === 'Pending').length;

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
                    No {activeFilter.toLowerCase()} documents found in the repository.
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                    {filteredDocs.map((doc) => (
                        <div key={doc.id} style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', transition: 'transform 0.2s, box-shadow 0.2s' }} onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.05)'; }} onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)'; }}>
                            
                            <div style={{ backgroundColor: '#f9fafb', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', borderBottom: '1px solid #e5e7eb', borderTop: doc.status === 'Approved' ? '4px solid #10b981' : doc.status === 'Rejected' ? '4px solid #ef4444' : '4px solid #f59e0b' }}>
                                <span style={{ fontSize: '48px', marginBottom: '12px' }}>
                                    {doc.evidence_file_url.endsWith('.pdf') ? '📄' : '🖼️'}
                                </span>
                                <a 
                                    href={`https://esg-compliance-platform-production.up.railway.app${doc.evidence_file_url}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    style={{ color: '#2563eb', fontWeight: '700', fontSize: '14px', textDecoration: 'none', textAlign: 'center' }}
                                >
                                    {getFileName(doc.evidence_file_url)}
                                </a>
                            </div>

                            <div style={{ padding: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '13px' }}>
                                    <span style={{ color: '#6b7280', fontWeight: '600' }}>Origin:</span>
                                    <span style={{ color: doc.source === 'External' ? '#4f46e5' : '#111827', fontWeight: '700' }}>{doc.organization_name}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '13px' }}>
                                    <span style={{ color: '#6b7280', fontWeight: '600' }}>Associated Metric:</span>
                                    <span style={{ color: '#111827', fontWeight: '700' }}>{doc.activity_type.replace(/_/g, ' ')}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '13px' }}>
                                    <span style={{ color: '#6b7280', fontWeight: '600' }}>Upload Date:</span>
                                    <span style={{ color: '#111827', fontWeight: '700' }}>{new Date(doc.recorded_date).toLocaleDateString()}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span style={{ color: '#6b7280', fontWeight: '600' }}>Doc Quality:</span>
                                    <span style={{ 
                                        backgroundColor: doc.quality_tier === 'A' ? '#d1fae5' : '#fef3c7', 
                                        color: doc.quality_tier === 'A' ? '#065f46' : '#92400e', 
                                        padding: '2px 8px', borderRadius: '4px', fontWeight: '800' 
                                    }}>
                                        Tier {doc.quality_tier}
                                    </span>
                                </div>
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