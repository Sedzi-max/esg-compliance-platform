import React, { useState, useEffect } from 'react';
import axios from 'axios';

function SurveyCampaigns() {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Form state for creating a new campaign
    const [isCreating, setIsCreating] = useState(false);
    const [newCampaign, setNewCampaign] = useState({
        supplier_name: '', activity_type: '', deadline: ''
    });

    // State to track which link was just copied
    const [copiedToken, setCopiedToken] = useState(null);

    // Correction request state
    const [requestingCorrection, setRequestingCorrection] = useState(null); // token currently being processed
    const [correctionDeadline, setCorrectionDeadline] = useState('');
    const [correctionModalToken, setCorrectionModalToken] = useState(null); // which row's modal is open
    const [correctionResult, setCorrectionResult] = useState(null); // { token, link } for the newly created campaign

    useEffect(() => {
        fetchCampaigns();
    }, []);

    const fetchCampaigns = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/campaigns', {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // Map backend data and inject our frontend Tier Logic for demonstration
            const enhancedData = response.data.map((camp, index) => {
                let methodology = 'Pending';
                if (camp.status === 'Completed') methodology = index % 2 === 0 ? 'Activity-Based' : 'Spend-Based';
                if (camp.status === 'Under Review') methodology = 'Average-Data';

                return { ...camp, methodology };
            });

            setCampaigns(enhancedData);
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch campaigns", err);
            setError("Failed to load supplier campaigns.");
            setLoading(false);
        }
    };

    const handleCreateCampaign = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            // Generate a secure random token for the vendor portal link
            const vendorToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            
            await axios.post('/api/campaigns', { ...newCampaign, token: vendorToken }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setNewCampaign({ supplier_name: '', activity_type: '', deadline: '' });
            setIsCreating(false);
            fetchCampaigns();
        } catch (err) {
            alert("Failed to dispatch campaign.");
        }
    };

    // Clipboard Copy Function
    const handleCopyLink = (campaignToken) => {
        // Dynamically builds the link using your current domain (localhost or live URL)
        const portalUrl = `${window.location.origin}/supplier-portal/${campaignToken}`;
        
        navigator.clipboard.writeText(portalUrl).then(() => {
            setCopiedToken(campaignToken); // Triggers the "Copied!" UI
            setTimeout(() => setCopiedToken(null), 2000); // Resets back to "Copy Link" after 2 seconds
        }).catch(err => {
            console.error("Failed to copy link: ", err);
            alert("Failed to copy link. Check browser permissions.");
        });
    };

    const openCorrectionModal = (campaignToken) => {
        setCorrectionModalToken(campaignToken);
        setCorrectionDeadline('');
        setCorrectionResult(null);
    };

    const handleRequestCorrection = async (e) => {
        e.preventDefault();
        setRequestingCorrection(correctionModalToken);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(
                `/api/campaigns/${correctionModalToken}/request-correction`,
                { deadline: correctionDeadline || null },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const newToken = response.data.data.token;
            const newLink = `${window.location.origin}/supplier-portal/${newToken}`;

            setCorrectionResult({ token: newToken, link: newLink });
            fetchCampaigns(); // refresh the list so the new Pending campaign shows up
        } catch (err) {
            console.error("Failed to request correction:", err);
            alert(err.response?.data?.error || "Failed to create correction request.");
        } finally {
            setRequestingCorrection(null);
        }
    };

    const handleCopyCorrectionLink = () => {
        if (!correctionResult) return;
        navigator.clipboard.writeText(correctionResult.link).then(() => {
            alert("Correction link copied to clipboard.");
        }).catch(() => {
            alert("Failed to copy link. Check browser permissions.");
        });
    };

    // CORE LOGIC: DATA QUALITY TIERS
    const getQualityMetrics = (methodology) => {
        switch (methodology) {
            case 'Activity-Based':
                return { tier: 'A', color: '#10b981', bg: '#d1fae5', buffer: '±5%', desc: 'Primary Data (e.g., Fuel Receipts)' };
            case 'Average-Data':
                return { tier: 'B', color: '#3b82f6', bg: '#dbeafe', buffer: '±15%', desc: 'Industry Average Estimates' };
            case 'Spend-Based':
                return { tier: 'C', color: '#f59e0b', bg: '#fef3c7', buffer: '±30%', desc: 'Financial Spend Estimates' };
            default:
                return { tier: '-', color: '#6b7280', bg: '#f3f4f6', buffer: 'N/A', desc: 'Awaiting Disclosure' };
        }
    };

    const getStatusStyle = (status) => {
        if (status === 'Completed') return { bg: '#d1e7dd', text: '#0f5132' };
        if (status === 'Under Review') return { bg: '#fff3cd', text: '#856404' };
        // Handle both Active and Pending statuses
        if (status === 'Active' || status === 'Pending') return { bg: '#fef2f2', text: '#991b1b' }; 
        return { bg: '#f3f4f6', text: '#374151' };
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            
            {/* Header Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '32px', margin: '0 0 8px 0', fontWeight: '800', color: '#111827', letterSpacing: '-0.02em' }}>
                        Scope 3 Value Chain
                    </h1>
                    <p style={{ margin: 0, color: '#4b5563', fontSize: '16px' }}>
                        Track supplier disclosures, methodologies, and data reliability tiers.
                    </p>
                </div>
                <button 
                    onClick={() => setIsCreating(!isCreating)}
                    style={{ backgroundColor: '#111827', color: 'white', padding: '12px 24px', borderRadius: '8px', fontWeight: '600', border: 'none', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                >
                    {isCreating ? 'Cancel' : '+ Dispatch New Campaign'}
                </button>
            </div>

            {error && <div style={{ backgroundColor: '#fef2f2', color: '#991b1b', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>{error}</div>}

            {/* Campaign Dispatch Form */}
            {isCreating && (
                <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>Dispatch Vendor Request</h3>
                    <form onSubmit={handleCreateCampaign} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 200px' }}>
                            <label style={labelStyle}>Supplier Name</label>
                            <input type="text" required value={newCampaign.supplier_name} onChange={e => setNewCampaign({...newCampaign, supplier_name: e.target.value})} style={inputStyle} placeholder="e.g., Global Logistics Corp" />
                        </div>
                        <div style={{ flex: '1 1 200px' }}>
                            <label style={labelStyle}>Target Metric</label>
                            <select required value={newCampaign.activity_type} onChange={e => setNewCampaign({...newCampaign, activity_type: e.target.value})} style={inputStyle}>
                                <option value="">Select Metric...</option>
                                {/* Values match the actual metric_definition / CARBON_MULTIPLIERS keys used
                                    by the backend — previously these were mismatched (e.g. "mobile_diesel"
                                    instead of "mobile_diesel_liters"), so campaigns created here could never
                                    be matched to a real metric downstream. Labels/units corrected to match too. */}
                                <option value="mobile_diesel_liters">Logistics: Diesel Fuel (Liters)</option>
                                <option value="travel_flight_short_haul_km">Business Travel: Short-Haul Flights (km)</option>
                                <option value="travel_flight_long_haul_km">Business Travel: Long-Haul Flights (km)</option>
                                <option value="travel_hotel_stay_nights">Business Travel: Hotel Stays (Nights)</option>
                                <option value="electricity_grid_kwh">Facilities: Grid Electricity (kWh)</option>
                                <option value="waste_landfill_kg">Operations: Landfill Waste (kg)</option>
                                <option value="waste_recycled_kg">Operations: Recycled Waste (kg)</option>
                                <option value="paper_consumption_kg">Facilities: Paper Consumption (kg)</option>
                                <option value="water_consumption_liters">Facilities: Water Consumption (Liters)</option>
                            </select>
                        </div>
                        <div style={{ flex: '1 1 200px' }}>
                            <label style={labelStyle}>Disclosure Deadline</label>
                            <input type="date" required value={newCampaign.deadline} onChange={e => setNewCampaign({...newCampaign, deadline: e.target.value})} style={inputStyle} />
                        </div>
                        <button type="submit" style={{ backgroundColor: '#10b981', color: 'white', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer', height: '42px', flex: '0 0 auto' }}>
                            Send Request
                        </button>
                    </form>
                </div>
            )}

            {/* Quality Tier Legend */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '600' }}>DATA QUALITY LEDGER:</div>
                <div style={{ fontSize: '13px', color: '#10b981', fontWeight: '600' }}>Tier A (Primary Data / Receipts)</div>
                <div style={{ fontSize: '13px', color: '#3b82f6', fontWeight: '600' }}>Tier B (Industry Averages)</div>
                <div style={{ fontSize: '13px', color: '#f59e0b', fontWeight: '600' }}>Tier C (Spend-Based Estimates)</div>
            </div>

            {/* Supplier Leaderboard Table */}
            <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflowX: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Loading supply chain data...</div>
                ) : (
                    <table style={{ width: '100%', minWidth: '950px', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                            <tr>
                                <th style={thStyle}>Supplier Name</th>
                                <th style={thStyle}>Activity / Scope</th>
                                <th style={thStyle}>Status</th>
                                <th style={thStyle}>Methodology</th>
                                <th style={thStyle}>Quality Tier</th>
                                <th style={thStyle}>Uncertainty Buffer</th>
                                <th style={thStyle}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {campaigns.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>No supplier campaigns dispatched yet.</td>
                                </tr>
                            ) : (
                                campaigns.map((camp) => {
                                    const quality = getQualityMetrics(camp.methodology);
                                    const statusStyle = getStatusStyle(camp.status);
                                    const isCopied = copiedToken === camp.id; 

                                    return (
                                        <tr key={camp.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                            <td style={tdStyle}>
                                                <div style={{ fontWeight: '600', color: '#111827' }}>{camp.supplier}</div>
                                                <div style={{ fontSize: '12px', color: '#6b7280' }}>Due: {new Date(camp.deadline).toLocaleDateString()}</div>
                                            </td>
                                            <td style={{...tdStyle, color: '#4b5563'}}>{camp.metric.replace(/_/g, ' ')}</td>
                                            <td style={tdStyle}>
                                                <span style={{ backgroundColor: statusStyle.bg, color: statusStyle.text, padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '700' }}>
                                                    {camp.status || 'Pending'}
                                                </span>
                                            </td>
                                            <td style={{...tdStyle, color: '#4b5563', fontSize: '13px'}}>{camp.methodology}</td>
                                            
                                            {/* Quality Tier Pillar */}
                                            <td style={tdStyle}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ backgroundColor: quality.bg, color: quality.color, width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '14px', border: `1px solid ${quality.color}40` }}>
                                                        {quality.tier}
                                                    </div>
                                                </div>
                                            </td>
                                            
                                            {/* Uncertainty Buffer */}
                                            <td style={tdStyle}>
                                                <span style={{ color: quality.color, fontWeight: '700', fontFamily: 'monospace', fontSize: '14px', backgroundColor: '#f9fafb', padding: '4px 8px', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
                                                    {quality.buffer}
                                                </span>
                                            </td>
                                            
                                            {/* Action Column */}
                                            <td style={tdStyle}>
                                                {camp.status === 'Pending' || camp.status === 'Active' ? (
                                                    <button 
                                                        onClick={() => handleCopyLink(camp.id)}
                                                        style={{ 
                                                            backgroundColor: isCopied ? '#10b981' : 'transparent', 
                                                            color: isCopied ? 'white' : '#4f46e5', 
                                                            border: `1px solid ${isCopied ? '#10b981' : '#c7d2fe'}`, 
                                                            padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                    >
                                                        {isCopied ? '✅ Copied!' : '🔗 Copy Link'}
                                                    </button>
                                                ) : camp.status === 'Completed' ? (
                                                    <button 
                                                        onClick={() => openCorrectionModal(camp.id)}
                                                        style={{ backgroundColor: 'transparent', color: '#b45309', border: '1px solid #fcd34d', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                                    >
                                                        ✏️ Request Correction
                                                    </button>
                                                ) : (
                                                    <button style={{ backgroundColor: 'transparent', color: '#6b7280', border: '1px solid #d1d5db', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                                        Audit Data
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ============================================
                CORRECTION REQUEST MODAL
            ============================================ */}
            {correctionModalToken && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(17, 24, 39, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
                    <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '16px', width: '90%', maxWidth: '450px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        
                        {correctionResult ? (
                            <>
                                <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#111827' }}>Correction Request Created</h3>
                                <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '20px' }}>
                                    The original submission has been preserved. Share this new link with the supplier so they can submit the corrected data.
                                </p>
                                <div style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', fontSize: '13px', fontFamily: 'monospace', wordBreak: 'break-all', marginBottom: '16px' }}>
                                    {correctionResult.link}
                                </div>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button onClick={handleCopyCorrectionLink} style={{ flex: 1, padding: '12px', backgroundColor: '#111827', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                                        Copy Link
                                    </button>
                                    <button onClick={() => setCorrectionModalToken(null)} style={{ flex: 1, padding: '12px', backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                                        Done
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#111827' }}>Request a Correction</h3>
                                <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '20px' }}>
                                    This creates a new submission link for the same supplier and metric. The original completed submission stays on record — it will not be changed or removed.
                                </p>
                                <form onSubmit={handleRequestCorrection} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div>
                                        <label style={labelStyle}>New Deadline (optional — defaults to original)</label>
                                        <input
                                            type="date"
                                            value={correctionDeadline}
                                            onChange={(e) => setCorrectionDeadline(e.target.value)}
                                            style={inputStyle}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                        <button type="button" onClick={() => setCorrectionModalToken(null)} style={{ flex: 1, padding: '12px', backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                                            Cancel
                                        </button>
                                        <button type="submit" disabled={requestingCorrection === correctionModalToken} style={{ flex: 1, padding: '12px', backgroundColor: '#111827', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: requestingCorrection === correctionModalToken ? 'wait' : 'pointer' }}>
                                            {requestingCorrection === correctionModalToken ? 'Creating...' : 'Create Correction Link'}
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

// Reusable inline styles
const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' };
const inputStyle = { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box', outline: 'none' };
const thStyle = { padding: '16px 20px', fontSize: '12px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' };
const tdStyle = { padding: '16px 20px', fontSize: '14px', whiteSpace: 'nowrap' };

export default SurveyCampaigns;
