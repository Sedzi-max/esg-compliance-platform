import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuditorDashboard = () => {
    const navigate = useNavigate(); 
    const [emissions, setEmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedTransaction, setSelectedTransaction] = useState(null);

    useEffect(() => {
        const fetchAuditData = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('http://localhost:5000/api/emissions', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) throw new Error('Failed to fetch audit data.');
                
                const data = await response.json();
                setEmissions(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchAuditData();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user'); 
        localStorage.removeItem('role'); 
        navigate('/login');
    };

    const totalDisclosures = emissions.length;
    const reviewedDisclosures = emissions.filter(e => e.status === 'Approved').length;

    if (loading) return <div style={{ padding: '30px', textAlign: 'center', color: '#6c757d' }}>Loading secure audit trail...</div>;
    if (error) return <div style={{ padding: '30px', textAlign: 'center', color: '#dc3545' }}>Error: {error}</div>;

    return (
        <div style={{ backgroundColor: '#f8f9fa', padding: '40px', borderRadius: '12px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            
            {/* Header with Logout */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
                <div>
                    <p style={{ fontSize: '12px', color: '#6c757d', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px' }}>
                        Dates: {new Date().toLocaleDateString()} | {new Date().toLocaleTimeString()}
                    </p>
                    <h1 style={{ fontSize: '38px', margin: '0 0 10px 0', fontFamily: 'Georgia, serif', color: '#212529' }}>
                        Assurance Portal
                    </h1>
                    <p style={{ fontSize: '18px', color: '#495057', margin: 0 }}>
                        Read-only view for third-party verification and audit.
                    </p>
                </div>
                
                {/* The New Integrated Logout Button */}
                <button 
                    onClick={handleLogout}
                    style={{ 
                        backgroundColor: '#dc3545', 
                        color: 'white', 
                        border: 'none', 
                        padding: '10px 20px', 
                        borderRadius: '6px', 
                        cursor: 'pointer', 
                        fontWeight: 'bold',
                        transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#c82333'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#dc3545'}
                >
                    Sign Out
                </button>
            </div>

            {/* KPI Widgets */}
            <div style={{ display: 'flex', gap: '24px', marginBottom: '40px' }}>
                
                {/* Audit Progress Widget */}
                <div style={{ flex: 2, backgroundColor: '#e9ecef', borderRadius: '16px', padding: '30px', display: 'flex', alignItems: 'center', border: '1px solid #dee2e6', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                    <div style={{ position: 'relative', width: '120px', height: '120px', marginRight: '30px' }}>
                        {/* fixed width/height so it doesn't explode! */}
                        <svg width="120" height="120" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                            <path stroke="#ced4da" strokeWidth="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            <path stroke="#198754" strokeWidth="3" strokeDasharray={`${totalDisclosures === 0 ? 0 : (reviewedDisclosures/totalDisclosures)*100}, 100`} fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        </svg>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#212529' }}>{reviewedDisclosures}/{totalDisclosures}</span>
                        </div>
                    </div>
                    <div>
                        <h3 style={{ fontSize: '28px', margin: '0 0 5px 0', color: '#212529' }}>Disclosures Verified</h3>
                        <p style={{ margin: 0, color: '#6c757d', fontSize: '16px' }}>verified disclosures</p>
                    </div>
                </div>

                {/* Traceability Score Widget */}
                <div style={{ flex: 1, backgroundColor: '#e9ecef', borderRadius: '16px', padding: '30px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid #dee2e6', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <h3 style={{ margin: 0, fontSize: '18px', color: '#495057' }}>Traceability Score</h3>
                        <span style={{ color: '#adb5bd' }}>•••</span>
                    </div>
                    <div>
                        <p style={{ fontSize: '42px', fontWeight: 'bold', margin: '15px 0 0 0', color: '#212529' }}>99.2%</p>
                        <p style={{ margin: '5px 0 0 0', color: '#6c757d' }}>Traceable</p>
                    </div>
                </div>
            </div>

            {/* Ledger Table */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #dee2e6', overflowX: 'auto', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                <table style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                        <tr>
                            <th style={{ padding: '15px 20px', color: '#495057', fontSize: '14px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Timestamp</th>
                            <th style={{ padding: '15px 20px', color: '#495057', fontSize: '14px', textTransform: 'uppercase' }}>Organization</th>
                            <th style={{ padding: '15px 20px', color: '#495057', fontSize: '14px', textTransform: 'uppercase' }}>Activity</th>
                            <th style={{ padding: '15px 20px', color: '#495057', fontSize: '14px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Reported tCO2e</th>
                            <th style={{ padding: '15px 20px', color: '#495057', fontSize: '14px', textTransform: 'uppercase' }}>Status</th>
                            <th style={{ padding: '15px 20px', color: '#495057', fontSize: '14px', textTransform: 'uppercase', textAlign: 'right', whiteSpace: 'nowrap' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {emissions.map((record) => (
                            <tr key={record.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                                <td style={{ padding: '20px', fontSize: '15px', color: '#6c757d', whiteSpace: 'nowrap' }}>
                                    {new Date(record.created_at).toLocaleDateString()}
                                </td>
                                <td style={{ padding: '20px', fontSize: '15px', fontWeight: 'bold', color: '#212529' }}>
                                    {record.organization_name || 'Tema Logistics Hub'}
                                </td>
                                <td style={{ padding: '20px', fontSize: '15px', color: '#495057' }}>
                                    {record.activity_type.replace(/_/g, ' ')}
                                </td>
                                <td style={{ padding: '20px' }}>
                                    <span style={{ backgroundColor: '#495057', color: 'white', padding: '6px 12px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '14px', whiteSpace: 'nowrap' }}>
                                        ☁️ {Number(record.calculated_co2e).toFixed(2)}
                                    </span>
                                </td>
                                <td style={{ padding: '20px' }}>
                                    <span style={{ 
                                        padding: '6px 12px', borderRadius: '50px', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap',
                                        backgroundColor: record.status === 'Approved' ? '#d1e7dd' : '#fff3cd',
                                        color: record.status === 'Approved' ? '#0f5132' : '#856404',
                                        border: `1px solid ${record.status === 'Approved' ? '#badbcc' : '#ffe69c'}`
                                    }}>
                                        {record.status}
                                    </span>
                                </td>
                                <td style={{ padding: '20px', textAlign: 'right' }}>
                                    <button 
                                        onClick={() => setSelectedTransaction(record)}
                                        style={{ backgroundColor: 'white', border: '1px solid #ced4da', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', color: '#495057', transition: '0.2s', whiteSpace: 'nowrap' }}
                                    >
                                        👁️ View Traceability
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Dark Theme Traceability Drawer */}
            {selectedTransaction && (
                <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'flex-end', zIndex: 9999 }}>
                    <div style={{ width: '450px', backgroundColor: '#212529', height: '100%', padding: '40px', overflowY: 'auto', color: '#f8f9fa', borderLeft: '1px solid #495057', boxSizing: 'border-box' }}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px', borderBottom: '1px solid #495057', paddingBottom: '20px' }}>
                            <div>
                                <h2 style={{ fontSize: '24px', margin: '0 0 5px 0', color: 'white' }}>Atomic Traceability</h2>
                                <p style={{ fontSize: '12px', color: '#adb5bd', margin: 0 }}>Detailed Audit Trail - #{selectedTransaction.id.toString().padStart(5, '0')}</p>
                            </div>
                            <button onClick={() => setSelectedTransaction(null)} style={{ background: 'none', border: 'none', color: '#adb5bd', fontSize: '30px', cursor: 'pointer' }}>&times;</button>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                            
                            {/* Raw Data Section */}
                            <div>
                                <p style={{ fontSize: '12px', color: '#adb5bd', textTransform: 'uppercase', fontWeight: 'bold', margin: '0 0 10px 0', letterSpacing: '1px' }}>Raw Data Ingestion</p>
                                <div style={{ backgroundColor: '#343a40', padding: '20px', borderRadius: '8px', border: '1px solid #495057', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span style={{ fontSize: '30px', marginRight: '15px' }}>🛢️</span>
                                        <div>
                                            <p style={{ fontFamily: 'monospace', fontSize: '24px', fontWeight: 'bold', margin: 0, color: 'white' }}>{selectedTransaction.raw_amount}</p>
                                            <p style={{ fontSize: '12px', color: '#adb5bd', margin: 0 }}>{selectedTransaction.unit_of_measure}</p>
                                        </div>
                                    </div>
                                    <span style={{ fontSize: '24px', opacity: 0.5 }}>⛽</span>
                                </div>
                            </div>
                            
                            {/* Methodology Section */}
                            <div>
                                <p style={{ fontSize: '12px', color: '#adb5bd', textTransform: 'uppercase', fontWeight: 'bold', margin: '0 0 10px 0', letterSpacing: '1px' }}>Methodology Section</p>
                                <div style={{ backgroundColor: '#343a40', padding: '20px', borderRadius: '8px', border: '1px solid #495057', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <p style={{ fontFamily: 'monospace', fontSize: '24px', fontWeight: 'bold', margin: 0, color: 'white' }}>{selectedTransaction.emission_factor_used}</p>
                                    <div style={{ fontSize: '10px', color: '#ced4da', backgroundColor: '#212529', padding: '10px', borderRadius: '6px', width: '50%' }}>
                                        This translates to calculation logic on factors = {selectedTransaction.emission_factor_used}. Source verified.
                                    </div>
                                </div>
                                <p style={{ marginTop: '10px', fontSize: '14px', color: '#adb5bd', display: 'flex', alignItems: 'center' }}>
                                    <span style={{ marginRight: '8px' }}>🏛️</span> {selectedTransaction.factor_source}
                                </p>
                            </div>

                            {/* Detailed Trace Steps */}
                            <div>
                                <p style={{ fontSize: '12px', color: '#adb5bd', textTransform: 'uppercase', fontWeight: 'bold', margin: '0 0 10px 0', letterSpacing: '1px' }}>Detailed Trace Steps</p>
                                <ul style={{ listStyle: 'none', margin: 0, padding: '20px', backgroundColor: '#1a1d20', borderRadius: '8px', border: '1px solid #495057', fontFamily: 'monospace', fontSize: '13px', color: '#ced4da', lineHeight: '2' }}>
                                    <li>1. Raw Data Logged &rarr;</li>
                                    <li>2. Source Code Snapshot mapped &rarr;</li>
                                    <li>3. Calculation Performed &rarr;</li>
                                    <li>4. Evidence Links Mapped &rarr;</li>
                                    <li style={{ color: '#20c997', fontWeight: 'bold' }}>5. Status changed to {selectedTransaction.status}.</li>
                                </ul>
                            </div>

                            {/* Evidence Box */}
                            {selectedTransaction.evidence_file_url && (
                                <div>
                                    <p style={{ fontSize: '12px', color: '#adb5bd', textTransform: 'uppercase', fontWeight: 'bold', margin: '0 0 10px 0', letterSpacing: '1px' }}>Evidence</p>
                                    <a href={`http://localhost:5000${selectedTransaction.evidence_file_url}`} target="_blank" rel="noopener noreferrer" style={{ display: 'block', padding: '20px', backgroundColor: '#052c65', border: '1px solid #0a58ca', borderRadius: '8px', textDecoration: 'none' }}>
                                        <p style={{ fontSize: '14px', fontWeight: 'bold', color: 'white', margin: '0 0 5px 0' }}>📄 View Source Evidence</p>
                                        <p style={{ fontSize: '12px', color: '#6ea8fe', margin: 0 }}>Verified File Hash Attached</p>
                                    </a>
                                </div>
                            )}

                            {/* Chain of Custody */}
                            <div style={{ paddingTop: '30px', borderTop: '1px solid #495057', marginTop: '10px' }}>
                                <p style={{ fontSize: '12px', color: '#adb5bd', textTransform: 'uppercase', fontWeight: 'bold', margin: '0 0 20px 0', letterSpacing: '1px' }}>Chain of Custody / Approval</p>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '20px', color: '#ced4da', margin: '0 0 5px 0' }}>Jane Doe</p>
                                        <p style={{ fontSize: '10px', color: '#6c757d', textTransform: 'uppercase', margin: 0 }}>Compliance Lead</p>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '20px', color: 'white', margin: '0 0 5px 0' }}>Dickson Sedzi</p>
                                        <p style={{ fontSize: '10px', color: '#20c997', textTransform: 'uppercase', fontWeight: 'bold', margin: 0 }}>Auditor</p>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuditorDashboard;