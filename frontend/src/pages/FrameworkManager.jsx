import React, { useState, useEffect } from 'react';
import axios from 'axios';

function FrameworkManager() {
    const [mappings, setMappings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    const [formData, setFormData] = useState({
        framework_name: 'CSRD / ESRS',
        framework_code: '',
        description: '',
        activity_type: 'mobile_diesel' // Default starting value
    });

    useEffect(() => {
        fetchMappings();
    }, []);

    const fetchMappings = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/mappings', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMappings(response.data);
        } catch (err) {
            console.error("Failed to load mappings", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateMapping = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/mappings', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // Reset form but keep the framework name
            setFormData({ ...formData, framework_code: '', description: '' });
            fetchMappings();
        } catch (err) {
            alert(err.response?.data?.error || "Failed to create mapping.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this mapping rule? It will immediately affect generated reports.")) return;
        
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/mappings/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchMappings();
        } catch (err) {
            alert("Failed to delete mapping.");
        }
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px', fontFamily: 'system-ui, sans-serif' }}>
            
            <div style={{ marginBottom: '32px', borderBottom: '2px solid #e5e7eb', paddingBottom: '24px' }}>
                <h1 style={{ fontSize: '32px', margin: '0 0 8px 0', fontWeight: '800', color: '#111827', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    ⚙️ Framework Alignment Engine
                </h1>
                <p style={{ margin: 0, color: '#4b5563', fontSize: '16px' }}>
                    Map internal system metrics to external global reporting standards (CSRD, ISSB, GRI).
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '32px' }}>
                
                {/* 1. CREATION FORM */}
                <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '16px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', alignSelf: 'start' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: '0 0 24px 0' }}>Add New Mapping Rule</h2>
                    
                    <form onSubmit={handleCreateMapping} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <label style={labelStyle}>Target Framework</label>
                            <select 
                                value={formData.framework_name} onChange={e => setFormData({...formData, framework_name: e.target.value})}
                                style={inputStyle}
                            >
                                <option value="CSRD / ESRS">CSRD / ESRS (Europe)</option>
                                <option value="ISSB / IFRS S2">ISSB / IFRS S2 (Global)</option>
                                <option value="GRI">GRI Standard</option>
                                <option value="SEC Climate">SEC Climate Rules (US)</option>
                                <option value="GSE_MANDATORY">Ghana Stock Exchange</option>
                            </select>
                        </div>

                        <div>
                            <label style={labelStyle}>Disclosure Code</label>
                            <input 
                                type="text" required placeholder="e.g., E1-6, IFRS-S2-29a"
                                value={formData.framework_code} onChange={e => setFormData({...formData, framework_code: e.target.value})}
                                style={inputStyle}
                            />
                        </div>

                        <div>
                            <label style={labelStyle}>Requirement Description</label>
                            <input 
                                type="text" required placeholder="e.g., Scope 1 Greenhouse Gas Emissions"
                                value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                                style={inputStyle}
                            />
                        </div>

                        <div>
                            <label style={labelStyle}>System Data Source (Internal Metric)</label>
                            <select 
                                value={formData.activity_type} onChange={e => setFormData({...formData, activity_type: e.target.value})}
                                style={inputStyle}
                            >
                                <optgroup label="Scope 1 (Direct)">
                                    <option value="mobile_diesel">Mobile Combustion (Diesel)</option>
                                    <option value="stationary_natural_gas">Stationary Combustion (Natural Gas)</option>
                                </optgroup>
                                <optgroup label="Scope 2 (Indirect)">
                                    <option value="purchased_electricity">Purchased Electricity</option>
                                </optgroup>
                                <optgroup label="Scope 3 (Value Chain)">
                                    <option value="business_travel_flights">Business Travel (Flights)</option>
                                    <option value="waste_landfill">Waste Generated in Operations</option>
                                </optgroup>
                            </select>
                        </div>
                        
                        <button type="submit" disabled={isSaving} style={{ backgroundColor: '#111827', color: 'white', padding: '12px', borderRadius: '8px', fontWeight: '700', border: 'none', cursor: isSaving ? 'wait' : 'pointer', marginTop: '8px', fontSize: '15px', transition: '0.2s' }}>
                            {isSaving ? 'Saving...' : 'Link Metric to Framework'}
                        </button>
                    </form>
                </div>

                {/* 2. ACTIVE MAPPINGS LEDGER */}
                <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '16px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', gridColumn: 'span 2' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: '0 0 24px 0' }}>Active Disclosure Rules</h2>
                    
                    {loading ? <p>Loading system rules...</p> : mappings.length === 0 ? (
                        <p style={{ color: '#6b7280', fontSize: '14px', textAlign: 'center', padding: '40px 0' }}>No framework mappings found. Add one to get started.</p>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                                        <th style={thStyle}>Framework</th>
                                        <th style={thStyle}>Code</th>
                                        <th style={thStyle}>Description</th>
                                        <th style={thStyle}>System Link</th>
                                        <th style={thStyle}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mappings.map((rule) => (
                                        <tr key={rule.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                            <td style={{ padding: '16px', fontWeight: '700', color: '#111827' }}>{rule.framework_name}</td>
                                            <td style={{ padding: '16px', color: '#3b82f6', fontWeight: '600' }}>{rule.framework_code}</td>
                                            <td style={{ padding: '16px', color: '#4b5563' }}>{rule.description}</td>
                                            <td style={{ padding: '16px', color: '#10b981', fontFamily: 'monospace', fontWeight: '600' }}>
                                                {rule.activity_type}
                                            </td>
                                            <td style={{ padding: '16px' }}>
                                                <button onClick={() => handleDelete(rule.id)} style={{ color: '#ef4444', backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                                                    Remove
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}

const labelStyle = { display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' };
const inputStyle = { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#f9fafb', boxSizing: 'border-box', outline: 'none', fontSize: '14px', fontWeight: '500' };
const thStyle = { padding: '16px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '12px', fontWeight: '700' };

export default FrameworkManager;