import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TABS = [
    { key: 'portfolio', label: 'Portfolio Screening (P1)' },
    { key: 'headcount', label: 'Gender Headcount (P4)' },
    { key: 'inclusion', label: 'Financial Inclusion (P5)' },
    { key: 'maturity', label: 'Principle Maturity' },
];

const MONTH_OPTIONS = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
    { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
    { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

const PRINCIPLE_OPTIONS = [
    { code: 'P1', name: 'Portfolio Screening' },
    { code: 'P2', name: 'Internal Footprint' },
    { code: 'P3', name: 'Governance & Ethics' },
    { code: 'P4', name: 'Gender Equality' },
    { code: 'P5', name: 'Financial Inclusion' },
    { code: 'P6', name: 'Resource Efficiency' },
    { code: 'P7', name: 'Transparency & Discl.' },
];

const ENDPOINT_BY_TAB = {
    portfolio: 'portfolio-screening',
    headcount: 'gender-equality',
    inclusion: 'financial-inclusion',
    maturity: 'principle-maturity',
};

function BankingDataEntry() {
    const [activeTab, setActiveTab] = useState('portfolio');
    const [units, setUnits] = useState([]);
    const [year, setYear] = useState('2026');

    const [records, setRecords] = useState([]);
    const [loadingRecords, setLoadingRecords] = useState(true);
    const [loadError, setLoadError] = useState('');

    const [isSaving, setIsSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [formError, setFormError] = useState('');

    const [formData, setFormData] = useState(getDefaultFormData('portfolio'));

    function getDefaultFormData(tab) {
        switch (tab) {
            case 'portfolio':
                return { unit_id: '', sector: '', total_loan_value_ghs: '', es_screened_value_ghs: '' };
            case 'headcount':
                return { unit_id: '', category: '', male_count: '', female_count: '' };
            case 'inclusion':
                return { unit_id: '', period_month: '1', basic_accounts_opened: '', mobile_money_transactions_k: '' };
            case 'maturity':
                return { unit_id: '', principle_code: 'P1', maturity_score: '' };
            default:
                return {};
        }
    }

    // Load org units once, for the unit_id dropdown
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
                // Non-fatal to the page load — surfaced via formError only if the
                // user tries to submit without any units available.
            }
        };
        fetchUnits();
    }, []);

    useEffect(() => {
        setFormData(getDefaultFormData(activeTab));
        setFormError('');
    }, [activeTab]);

    useEffect(() => {
        let isCurrent = true;
        fetchRecords(isCurrent);
        return () => { isCurrent = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, year]);

    const fetchRecords = async (isCurrent = true) => {
        setLoadingRecords(true);
        setLoadError('');
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.get(
                `/api/banking/${ENDPOINT_BY_TAB[activeTab]}/raw?year=${encodeURIComponent(year)}`,
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
            const payload = { ...formData, assessment_year: Number(year) };

            if (activeTab === 'maturity') {
                const selected = PRINCIPLE_OPTIONS.find(p => p.code === formData.principle_code);
                payload.principle_name = selected ? selected.name : formData.principle_code;
            }

            await axios.post(`/api/banking/${ENDPOINT_BY_TAB[activeTab]}`, payload, config);

            setFormData(getDefaultFormData(activeTab));
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
            await axios.delete(`/api/banking/${ENDPOINT_BY_TAB[activeTab]}/${recordId}`, {
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

    const renderFormFields = () => {
        const unitSelect = (
            <div style={fieldStyle}>
                <label style={labelStyle}>Organizational Unit</label>
                <select value={formData.unit_id} onChange={e => handleFormChange('unit_id', e.target.value)} style={inputStyle} required>
                    <option value="">-- Select a unit --</option>
                    {units.map(u => <option key={u.unit_id} value={u.unit_id}>{u.name}</option>)}
                </select>
            </div>
        );

        if (activeTab === 'portfolio') {
            return (
                <>
                    {unitSelect}
                    <div style={fieldStyle}>
                        <label style={labelStyle}>Sector</label>
                        <input type="text" required placeholder="e.g., Oil & Gas / Mining" value={formData.sector} onChange={e => handleFormChange('sector', e.target.value)} style={inputStyle} />
                    </div>
                    <div style={fieldStyle}>
                        <label style={labelStyle}>Total Loan Value (GHS)</label>
                        <input type="number" min="0" step="0.01" required value={formData.total_loan_value_ghs} onChange={e => handleFormChange('total_loan_value_ghs', e.target.value)} style={inputStyle} />
                    </div>
                    <div style={fieldStyle}>
                        <label style={labelStyle}>E&S Screened Value (GHS)</label>
                        <input type="number" min="0" step="0.01" required value={formData.es_screened_value_ghs} onChange={e => handleFormChange('es_screened_value_ghs', e.target.value)} style={inputStyle} />
                    </div>
                </>
            );
        }

        if (activeTab === 'headcount') {
            return (
                <>
                    {unitSelect}
                    <div style={fieldStyle}>
                        <label style={labelStyle}>Category</label>
                        <select value={formData.category} onChange={e => handleFormChange('category', e.target.value)} style={inputStyle} required>
                            <option value="">-- Select --</option>
                            <option value="Board of Directors">Board of Directors</option>
                            <option value="Senior Leadership">Senior Leadership</option>
                            <option value="Total Bank FTEs">Total Bank FTEs</option>
                        </select>
                    </div>
                    <div style={fieldStyle}>
                        <label style={labelStyle}>Male Count</label>
                        <input type="number" min="0" required value={formData.male_count} onChange={e => handleFormChange('male_count', e.target.value)} style={inputStyle} />
                    </div>
                    <div style={fieldStyle}>
                        <label style={labelStyle}>Female Count</label>
                        <input type="number" min="0" required value={formData.female_count} onChange={e => handleFormChange('female_count', e.target.value)} style={inputStyle} />
                    </div>
                </>
            );
        }

        if (activeTab === 'inclusion') {
            return (
                <>
                    {unitSelect}
                    <div style={fieldStyle}>
                        <label style={labelStyle}>Month</label>
                        <select value={formData.period_month} onChange={e => handleFormChange('period_month', e.target.value)} style={inputStyle} required>
                            {MONTH_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                    </div>
                    <div style={fieldStyle}>
                        <label style={labelStyle}>Basic Accounts Opened</label>
                        <input type="number" min="0" required value={formData.basic_accounts_opened} onChange={e => handleFormChange('basic_accounts_opened', e.target.value)} style={inputStyle} />
                    </div>
                    <div style={fieldStyle}>
                        <label style={labelStyle}>Mobile Money Transactions (thousands)</label>
                        <input type="number" min="0" step="0.01" required value={formData.mobile_money_transactions_k} onChange={e => handleFormChange('mobile_money_transactions_k', e.target.value)} style={inputStyle} />
                    </div>
                </>
            );
        }

        if (activeTab === 'maturity') {
            return (
                <>
                    {unitSelect}
                    <div style={fieldStyle}>
                        <label style={labelStyle}>Principle</label>
                        <select value={formData.principle_code} onChange={e => handleFormChange('principle_code', e.target.value)} style={inputStyle} required>
                            {PRINCIPLE_OPTIONS.map(p => <option key={p.code} value={p.code}>{p.code}: {p.name}</option>)}
                        </select>
                    </div>
                    <div style={fieldStyle}>
                        <label style={labelStyle}>Maturity Score (0-100)</label>
                        <input type="number" min="0" max="100" required value={formData.maturity_score} onChange={e => handleFormChange('maturity_score', e.target.value)} style={inputStyle} />
                    </div>
                </>
            );
        }

        return null;
    };

    const renderRecordsTable = () => {
        if (loadingRecords) return <p style={{ color: '#6b7280' }}>Loading records...</p>;
        if (loadError) return null; // banner already shown above
        if (records.length === 0) return <p style={{ color: '#6b7280', fontSize: '14px', textAlign: 'center', padding: '32px 0' }}>No records for {year} yet.</p>;

        let columns = [];
        if (activeTab === 'portfolio') columns = ['unit_name', 'sector', 'total_loan_value_ghs', 'es_screened_value_ghs'];
        if (activeTab === 'headcount') columns = ['unit_name', 'category', 'male_count', 'female_count'];
        if (activeTab === 'inclusion') columns = ['unit_name', 'period_month', 'basic_accounts_opened', 'mobile_money_transactions_k'];
        if (activeTab === 'maturity') columns = ['unit_name', 'principle_code', 'principle_name', 'maturity_score'];

        return (
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                            {columns.map(col => <th key={col} style={thStyle}>{col.replace(/_/g, ' ')}</th>)}
                            <th style={thStyle}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {records.map(rec => (
                            <tr key={rec.record_id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                {columns.map(col => <td key={col} style={{ padding: '12px' }}>{rec[col]}</td>)}
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
        );
    };

    return (
        <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '40px', fontFamily: 'system-ui, sans-serif' }}>

            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 style={{ fontSize: '28px', margin: '0 0 8px 0', fontWeight: '800', color: '#111827' }}>
                        Bank of Ghana Data Entry
                    </h1>
                    <p style={{ margin: 0, color: '#4b5563', fontSize: '15px' }}>
                        Log the source data behind the Banking Analytics dashboard.
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

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '4px', backgroundColor: '#f3f4f6', padding: '4px', borderRadius: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
                {TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        style={{
                            padding: '8px 16px', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer',
                            backgroundColor: activeTab === tab.key ? '#111827' : 'transparent',
                            color: activeTab === tab.key ? 'white' : '#6b7280',
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Form */}
            <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '24px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#111827' }}>Add / Update Record</h3>
                <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                    {renderFormFields()}
                    <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button type="submit" disabled={isSaving} style={{ backgroundColor: '#111827', color: 'white', padding: '10px 24px', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.7 : 1 }}>
                            {isSaving ? 'Saving...' : 'Save Record'}
                        </button>
                        {formError && <span style={{ color: '#991b1b', fontSize: '13px', fontWeight: '600' }}>{formError}</span>}
                    </div>
                </form>
                <p style={{ marginTop: '12px', marginBottom: 0, fontSize: '12px', color: '#9ca3af' }}>
                    Saving with the same unit, year, and category/sector/month as an existing record updates that record instead of creating a duplicate.
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
                {renderRecordsTable()}
            </div>
        </div>
    );
}

const fieldStyle = { display: 'flex', flexDirection: 'column', gap: '6px' };
const labelStyle = { fontSize: '12px', fontWeight: '700', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.03em' };
const inputStyle = { padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' };
const thStyle = { padding: '12px', textAlign: 'left', fontWeight: '700', fontSize: '12px', color: '#6b7280', textTransform: 'capitalize' };

export default BankingDataEntry;