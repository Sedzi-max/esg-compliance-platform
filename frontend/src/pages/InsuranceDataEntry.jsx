import React, { useState, useEffect } from 'react';
import axios from 'axios';

function InsuranceDataEntry() {
    const [units, setUnits] = useState([]);
    const [year, setYear] = useState('2026');

    const [records, setRecords] = useState([]);
    const [loadingRecords, setLoadingRecords] = useState(true);
    const [loadError, setLoadError] = useState('');

    const [isSaving, setIsSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [formError, setFormError] = useState('');

    const [formData, setFormData] = useState({
        unit_id: '',
        has_esg_committee: 'false',
        board_oversight_score: '',
        nic_stress_test_submitted: 'false',
        customer_complaints_received: '',
        customer_complaints_resolved: '',
        high_risk_clients_screened: '',
        high_risk_clients_total: '',
    });

    useEffect(() => {
        const fetchUnits = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get('/api/organizations', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setUnits(response.data);
            } catch (err) {
                console.error('Failed to load organization units:', err);
            }
        };
        fetchUnits();
    }, []);

    useEffect(() => {
        let isCurrent = true;
        fetchRecords(isCurrent);
        return () => { isCurrent = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [year]);

    const fetchRecords = async (isCurrent = true) => {
        setLoadingRecords(true);
        setLoadError('');
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.get(
                `/api/insurance/governance/raw?year=${encodeURIComponent(year)}`,
                config
            );
            if (isCurrent) setRecords(response.data);
        } catch (err) {
            console.error('Failed to load records:', err);
            if (isCurrent) {
                setRecords([]);
                setLoadError('Failed to load existing records. Please try again.');
            }
        } finally {
            if (isCurrent) setLoadingRecords(false);
        }
    };

    const handleFormChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const resetForm = () => {
        setFormData({
            unit_id: '', has_esg_committee: 'false', board_oversight_score: '',
            nic_stress_test_submitted: 'false', customer_complaints_received: '',
            customer_complaints_resolved: '', high_risk_clients_screened: '', high_risk_clients_total: '',
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSaving) return;
        setFormError('');

        if (!formData.unit_id) {
            setFormError('Please select an organizational unit.');
            return;
        }

        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const payload = {
                ...formData,
                assessment_year: Number(year),
                has_esg_committee: formData.has_esg_committee === 'true',
                nic_stress_test_submitted: formData.nic_stress_test_submitted === 'true',
            };

            await axios.post('/api/insurance/governance', payload, config);

            resetForm();
            await fetchRecords(true);
        } catch (err) {
            console.error('Failed to save record:', err);
            setFormError(err.response?.data?.error || 'Failed to save record. Please check the values and try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (recordId) => {
        if (deletingId === recordId) return;
        if (!window.confirm('Delete this record? This will affect the dashboard immediately.')) return;

        setDeletingId(recordId);
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/insurance/governance/${recordId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            await fetchRecords(true);
        } catch (err) {
            console.error('Failed to delete record:', err);
            alert('Failed to delete record.');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '40px', fontFamily: 'system-ui, sans-serif' }}>

            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 style={{ fontSize: '28px', margin: '0 0 8px 0', fontWeight: '800', color: '#111827' }}>
                        🛡️ NIC Insurance Governance Data Entry
                    </h1>
                    <p style={{ margin: 0, color: '#4b5563', fontSize: '15px' }}>
                        Log the governance data behind the Insurance ESG Analytics dashboard.
                    </p>
                </div>
                <div style={fieldStyle}>
                    <label style={labelStyle}>Assessment Year</label>
                    <select value={year} onChange={e => setYear(e.target.value)} style={inputStyle}>
                        <option value="2024">2024</option>
                        <option value="2025">2025</option>
                        <option value="2026">2026</option>
                    </select>
                </div>
            </div>

            <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontSize: '13px' }}>
                This form covers ESG governance metrics (§7.1, §7.4, §8.5.2/3 of the NIC Guidelines). Environmental/emissions, scenario analysis detail, and materiality assessment data entry are not yet built — those dashboard sections will remain empty until added.
            </div>

            {/* Form */}
            <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '24px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#111827' }}>Add / Update Record</h3>
                <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                    <div style={fieldStyle}>
                        <label style={labelStyle}>Organizational Unit</label>
                        <select value={formData.unit_id} onChange={e => handleFormChange('unit_id', e.target.value)} style={inputStyle} required>
                            <option value="">-- Select a unit --</option>
                            {units.map(u => <option key={u.unit_id} value={u.unit_id}>{u.name}</option>)}
                        </select>
                    </div>

                    <div style={fieldStyle}>
                        <label style={labelStyle}>Has ESG Committee?</label>
                        <select value={formData.has_esg_committee} onChange={e => handleFormChange('has_esg_committee', e.target.value)} style={inputStyle}>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                        </select>
                    </div>

                    <div style={fieldStyle}>
                        <label style={labelStyle}>Board Oversight Score (0-100)</label>
                        <input type="number" min="0" max="100" step="0.1" value={formData.board_oversight_score} onChange={e => handleFormChange('board_oversight_score', e.target.value)} style={inputStyle} />
                    </div>

                    <div style={fieldStyle}>
                        <label style={labelStyle}>NIC Stress Test Submitted?</label>
                        <select value={formData.nic_stress_test_submitted} onChange={e => handleFormChange('nic_stress_test_submitted', e.target.value)} style={inputStyle}>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                        </select>
                    </div>

                    <div style={fieldStyle}>
                        <label style={labelStyle}>Customer Complaints Received</label>
                        <input type="number" min="0" value={formData.customer_complaints_received} onChange={e => handleFormChange('customer_complaints_received', e.target.value)} style={inputStyle} />
                    </div>

                    <div style={fieldStyle}>
                        <label style={labelStyle}>Customer Complaints Resolved</label>
                        <input type="number" min="0" value={formData.customer_complaints_resolved} onChange={e => handleFormChange('customer_complaints_resolved', e.target.value)} style={inputStyle} />
                    </div>

                    <div style={fieldStyle}>
                        <label style={labelStyle}>High-Risk Clients Screened</label>
                        <input type="number" min="0" value={formData.high_risk_clients_screened} onChange={e => handleFormChange('high_risk_clients_screened', e.target.value)} style={inputStyle} />
                    </div>

                    <div style={fieldStyle}>
                        <label style={labelStyle}>High-Risk Clients (Total)</label>
                        <input type="number" min="0" value={formData.high_risk_clients_total} onChange={e => handleFormChange('high_risk_clients_total', e.target.value)} style={inputStyle} />
                    </div>

                    <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button type="submit" disabled={isSaving} style={{ backgroundColor: '#111827', color: 'white', padding: '10px 24px', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.7 : 1 }}>
                            {isSaving ? 'Saving...' : 'Save Record'}
                        </button>
                        {formError && <span style={{ color: '#991b1b', fontSize: '13px', fontWeight: '600' }}>{formError}</span>}
                    </div>
                </form>
                <p style={{ marginTop: '12px', marginBottom: 0, fontSize: '12px', color: '#9ca3af' }}>
                    Saving with the same unit and year as an existing record updates that record instead of creating a duplicate.
                </p>
            </div>

            {/* Existing records */}
            <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#111827' }}>Existing Records for {year}</h3>
                    {loadError && (
                        <button onClick={() => fetchRecords(true)} style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                            Retry
                        </button>
                    )}
                </div>
                {loadError && (
                    <div style={{ backgroundColor: '#fef2f2', color: '#991b1b', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', border: '1px solid #fecaca' }}>
                        ⚠️ {loadError}
                    </div>
                )}
                {loadingRecords ? (
                    <p style={{ color: '#6b7280' }}>Loading records...</p>
                ) : loadError ? null : records.length === 0 ? (
                    <p style={{ color: '#6b7280', fontSize: '14px', textAlign: 'center', padding: '32px 0' }}>No records for {year} yet.</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                                    <th style={thStyle}>Unit</th>
                                    <th style={thStyle}>ESG Committee</th>
                                    <th style={thStyle}>Board Oversight</th>
                                    <th style={thStyle}>Stress Test Submitted</th>
                                    <th style={thStyle}>Complaints (Recv/Resolved)</th>
                                    <th style={thStyle}>High-Risk (Screened/Total)</th>
                                    <th style={thStyle}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map(rec => (
                                    <tr key={rec.record_id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                        <td style={{ padding: '12px' }}>{rec.unit_name}</td>
                                        <td style={{ padding: '12px' }}>{rec.has_esg_committee ? 'Yes' : 'No'}</td>
                                        <td style={{ padding: '12px' }}>{rec.board_oversight_score ?? '—'}</td>
                                        <td style={{ padding: '12px' }}>{rec.nic_stress_test_submitted ? 'Yes' : 'No'}</td>
                                        <td style={{ padding: '12px' }}>{rec.customer_complaints_received ?? '—'} / {rec.customer_complaints_resolved ?? '—'}</td>
                                        <td style={{ padding: '12px' }}>{rec.high_risk_clients_screened ?? '—'} / {rec.high_risk_clients_total ?? '—'}</td>
                                        <td style={{ padding: '12px' }}>
                                            <button
                                                onClick={() => handleDelete(rec.record_id)}
                                                disabled={deletingId === rec.record_id}
                                                style={{ color: '#ef4444', backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: deletingId === rec.record_id ? 'not-allowed' : 'pointer', opacity: deletingId === rec.record_id ? 0.6 : 1 }}
                                            >
                                                {deletingId === rec.record_id ? 'Removing...' : 'Remove'}
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
    );
}

const fieldStyle = { display: 'flex', flexDirection: 'column', gap: '6px' };
const labelStyle = { fontSize: '12px', fontWeight: '700', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.03em' };
const inputStyle = { padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' };
const thStyle = { padding: '12px', textAlign: 'left', fontWeight: '700', fontSize: '12px', color: '#6b7280', textTransform: 'capitalize' };

export default InsuranceDataEntry;
