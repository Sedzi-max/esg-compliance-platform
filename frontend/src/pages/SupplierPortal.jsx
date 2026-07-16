import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

function SupplierPortal() {
  const { token } = useParams();

  // State Matrix
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Form Submission State
  const [amount, setAmount] = useState('');
  const [evidenceFile, setEvidenceFile] = useState(null);

  useEffect(() => {
    fetchCampaignDetails();
  }, [token]);

  const fetchCampaignDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      // Endpoint retrieves metadata based on the campaign token string.
      // No fallback/mock data here — if this fails, the supplier needs to see
      // a real error, not a fabricated campaign that could mislead them into
      // submitting data against the wrong (or no) request.
      const response = await axios.get(`/api/public/campaigns/${token}`);
      setCampaign(response.data);
    } catch (err) {
      console.error("Failed to load campaign:", err);
      setError("This secure compliance link has expired or is invalid.");
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const submitData = new FormData();
      submitData.append('campaign_token', token);
      submitData.append('raw_amount', amount);
      if (evidenceFile) submitData.append('evidence_file', evidenceFile);

      // Post anonymously to the public ingestion endpoint
      await axios.post('/api/public/supplier-submit', submitData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSuccess(true);
    } catch (err) {
      // A failed submission must show as failed — silently reporting
      // success here would let a supplier believe their disclosure was
      // recorded when it never reached the database.
      console.error("Submission failed:", err);
      setSubmitError(
        err.response?.data?.error || "Something went wrong while submitting your data. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6', fontFamily: 'system-ui, sans-serif' }}>
        <p style={{ color: '#6b7280', fontSize: '16px', fontWeight: '500' }}>Authenticating secure link...</p>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6', fontFamily: 'system-ui, sans-serif', padding: '20px' }}>
        <div style={{ maxWidth: '500px', width: '100%', padding: '32px', textAlign: 'center', backgroundColor: '#fef2f2', borderRadius: '12px', border: '1px solid #fecaca', color: '#991b1b', fontWeight: '600', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            ⚠️ {error}
        </div>
    </div>
  );

  // Guards against re-submission if the supplier reopens a link they've
  // already completed — the backend only supports UPDATE (not append/versioning),
  // so a second submit would silently overwrite the first one's data.
  const alreadySubmitted = campaign?.status === 'Completed';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      <div style={{ maxWidth: '550px', width: '100%', backgroundColor: 'white', padding: '48px', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', border: '1px solid #e5e7eb' }}>
        
        {/* Header Branding */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'inline-block', backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '6px 16px', borderRadius: '50px', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '20px' }}>
            External Assurance Portal
          </div>
          <h1 style={{ fontSize: '28px', color: '#111827', margin: '0 0 8px 0', fontWeight: '800', letterSpacing: '-0.02em' }}>
            Value Chain Disclosures
          </h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '15px' }}>
            Secure data request originated by <strong style={{ color: '#374151' }}>{campaign.company_name}</strong>
          </p>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: '64px', marginBottom: '24px', lineHeight: '1' }}>✅</div>
            <h2 style={{ color: '#065f46', margin: '0 0 12px 0', fontSize: '24px', fontWeight: '700' }}>Submission Received</h2>
            <p style={{ color: '#4b5563', lineHeight: '1.6', margin: 0, fontSize: '15px' }}>
              Thank you. Your accounting data and accompanying assurance documents have been cryptographically sealed and transmitted directly to the compliance audit queue.
            </p>
          </div>
        ) : alreadySubmitted ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: '64px', marginBottom: '24px', lineHeight: '1' }}>📄</div>
            <h2 style={{ color: '#374151', margin: '0 0 12px 0', fontSize: '22px', fontWeight: '700' }}>Already Submitted</h2>
            <p style={{ color: '#6b7280', lineHeight: '1.6', margin: 0, fontSize: '15px' }}>
              A response for this request has already been received. If you need to correct or update your submission, please contact <strong style={{ color: '#374151' }}>{campaign.company_name}</strong> directly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Context Box */}
            <div style={{ backgroundColor: '#f9fafb', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                    <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assigned Supplier</p>
                    <p style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#111827' }}>{campaign.supplier_name}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deadline</p>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#dc2626' }}>{new Date(campaign.deadline).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
                  <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Requested Log Metric</p>
                  <p style={{ margin: 0, fontSize: '15px', color: '#4b5563', fontWeight: '600', fontFamily: 'monospace' }}>
                    {campaign.activity_type.replace(/_/g, ' ').toUpperCase()}
                  </p>
              </div>
            </div>

            {submitError && (
              <div style={{ backgroundColor: '#fef2f2', color: '#991b1b', padding: '14px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', border: '1px solid #fecaca' }}>
                ⚠️ {submitError}
              </div>
            )}

            {/* Ingestion Value */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={labelStyle}>Total Measured Amount for Period</label>
              <input 
                type="number" min="0" step="any" required placeholder="e.g., 4500.50"
                value={amount} onChange={(e) => setAmount(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Document Verification Requirement */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={labelStyle}>Upload Verification Statement / Invoice</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="file" required accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setEvidenceFile(e.target.files[0])}
                  style={{...inputStyle, padding: '10px', fontSize: '14px', cursor: 'pointer'}}
                />
              </div>
              <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '12px', lineHeight: '1.5' }}>
                * Source evidence validation is required to comply with global ESG auditing frameworks. Acceptable formats: PDF, JPG, PNG.
              </p>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" disabled={isSubmitting}
              style={{ 
                  backgroundColor: '#111827', 
                  color: 'white', 
                  padding: '16px', 
                  border: 'none', 
                  borderRadius: '8px', 
                  fontWeight: '700', 
                  fontSize: '16px', 
                  cursor: isSubmitting ? 'wait' : 'pointer', 
                  width: '100%', 
                  marginTop: '8px', 
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => !isSubmitting && (e.currentTarget.style.backgroundColor = '#1f2937')}
              onMouseOut={(e) => !isSubmitting && (e.currentTarget.style.backgroundColor = '#111827')}
            >
              {isSubmitting ? '⏳ Transmitting Secure Data...' : '🔒 Verify & Submit Data'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}

// Reusable Styles
const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '700', color: '#374151' };
const inputStyle = { width: '100%', padding: '14px 16px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '15px', backgroundColor: '#f9fafb', boxSizing: 'border-box', outline: 'none', color: '#111827', fontWeight: '500' };

export default SupplierPortal;
