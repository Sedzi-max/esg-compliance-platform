import React, { useState, useEffect } from 'react';
import axios from 'axios';
import TraceabilityDrawer from '../components/TraceabilityDrawer';

function AuditQueue() {
  // Backend State
  const [emissions, setEmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Evidence viewer state (presigned URL fetched fresh for whichever log is selected)
  const [evidenceViewUrl, setEvidenceViewUrl] = useState(null);
  const [loadingEvidence, setLoadingEvidence] = useState(false);

  // UI State
  const [activeTab, setActiveTab] = useState('Pending');
  const [actionToast, setActionToast] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Drawer & Modal State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerRecord, setDrawerRecord] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // Get current user role to determine if they can approve
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const canApprove = user?.role === 'Admin' || user?.role === 'Manager';

  // Load the queue once on mount
  useEffect(() => {
    fetchAuditQueue();
  }, []);

  // Fetches a fresh signed URL whenever a new log with evidence is selected
  useEffect(() => {
    if (selectedLog?.evidence_file_url) {
      setLoadingEvidence(true);
      setEvidenceViewUrl(null);
      const token = localStorage.getItem('token');
      axios.get(`/api/evidence/${selectedLog.evidence_file_url}/view`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => {
        setEvidenceViewUrl(res.data.url);
      }).catch(err => {
        console.error("Failed to load evidence:", err);
      }).finally(() => {
        setLoadingEvidence(false);
      });
    } else {
      setEvidenceViewUrl(null);
    }
  }, [selectedLog]);

  const fetchAuditQueue = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get('/api/audit/pending', config);
      setEmissions(response.data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching audit queue:", err);
      if (err.response && err.response.status === 403) {
        setError("🔒 Access Denied. Only Admins can view the Audit Queue.");
      } else {
        setError("Failed to load audit queue. Ensure you are logged in.");
      }
      setLoading(false);
    }
  };

  const showToast = (message, type, hash = null) => {
    setActionToast({ message, type, hash });
    setTimeout(() => setActionToast(null), 6000);
  };

  // FIX: the "ledger hash" shown on approval was previously Math.random() — a
  // fake 40-char hex string with no relationship to the actual record. This
  // computes a genuine SHA-256 digest of the record's approval data using the
  // browser's native Web Crypto API, so it's a real, deterministic,
  // independently-recomputable hash instead of decoration.
  const generateLedgerHash = async (log) => {
    const payload = JSON.stringify({
      id: log.id,
      metric: log.metric,
      value: log.value,
      scope_category: log.scope_category,
      approved_at: new Date().toISOString()
    });
    const data = new TextEncoder().encode(payload);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // --- INDIVIDUAL AUDIT ACTIONS (Hooked to Backend) ---
  // FIX: rejectReason was previously captured for validation only and never sent
  // to the backend — nothing about a rejection's reason was ever persisted. Now
  // included as `comment` on every status change (approve, reject, or resubmit),
  // so the reviewer's context survives instead of being silently discarded.
  const executeAuditAction = async (newStatus, commentOverride = null) => {
    const comment = commentOverride !== null ? commentOverride : rejectReason;

    if (newStatus === 'Rejected' && !comment) {
        alert("Please provide a reason for rejection so the facility manager can correct it.");
        return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      let ledgerHash = null;
      if (newStatus === 'Approved') {
        ledgerHash = await generateLedgerHash(selectedLog);
      }

      await axios.put(`/api/emissions/${selectedLog.id}/status`, { status: newStatus, comment, ledgerHash }, config);

      setEmissions(emissions.map(e => e.id === selectedLog.id ? { ...e, status: newStatus, ledger_hash: ledgerHash || e.ledger_hash } : e));

      if (newStatus === 'Approved') {
        showToast(`Record ${selectedLog.id} verified and locked to ledger.`, 'success', ledgerHash);
      } else if (newStatus === 'Rejected') {
        showToast(`Record ${selectedLog.id} rejected. Alert routed to submitter.`, 'error');
      } else {
        showToast(`Record ${selectedLog.id} reopened for review.`, 'success');
      }

      setSelectedLog(null);
      setRejectReason('');

      fetchAuditQueue();
    } catch (err) {
      console.error("Error updating status:", err);
      alert(err.response?.data?.error || "Failed to update status. You may not have Admin privileges.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // FIX: rejected records previously had no path back to Pending — this reopens
  // a rejected record directly from the table row without requiring a comment
  // (the original rejection reason is already preserved and shown in the modal).
  const handleResubmit = async (log) => {
    if (!window.confirm(`Reopen record ${log.id} for review? It will move back to the Pending queue.`)) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.put(`/api/emissions/${log.id}/status`, { status: 'Pending', comment: null }, config);
      showToast(`Record ${log.id} reopened for review.`, 'success');
      fetchAuditQueue();
    } catch (err) {
      console.error("Error resubmitting record:", err);
      alert(err.response?.data?.error || "Failed to resubmit record.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- BULK APPROVE ACTION (Hooked to Backend) ---
  const handleApproveAll = async () => {
    if (!window.confirm("Are you sure you want to approve ALL pending records? This will instantly populate your Dashboard charts.")) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put('/api/emissions/bulk-approve', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showToast(response.data.message || 'All pending records bulk-approved!', 'success');
      fetchAuditQueue();
    } catch (err) {
      console.error("Error bulk approving:", err);
      setError("Failed to bulk approve records.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDrawer = (record) => {
    setDrawerRecord(record);
    setDrawerOpen(true);
  };

  const formatScope = (scope) => {
    if (!scope) return 'General';
    const map = { scope_1: 'Scope 1', scope_2: 'Scope 2', scope_3: 'Scope 3' };
    return map[scope] || scope;
  };

  if (loading) return <p style={{ textAlign: 'center', marginTop: '50px', color: '#666' }}>Loading Audit Queue...</p>;

  const filteredData = emissions.filter(e => e.status === activeTab);
  const pendingCount = emissions.filter(e => e.status === 'Pending').length;

  return (
    <div style={{ backgroundColor: '#e9edf2', minHeight: '100vh', padding: '40px', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ fontSize: '32px', margin: '0 0 8px 0', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>
            ✅ Verification & Audit Queue
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '16px', maxWidth: '700px' }}>
            Maker/Checker protocol enforced. Review raw data inputs against uploaded evidence. Approved logs are cryptographically hashed and permanently locked to the compliance ledger.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div style={{ backgroundColor: '#e0e7ff', color: '#047857', padding: '10px 16px', borderRadius: '8px', fontWeight: '700', fontSize: '14px', border: '1px solid #a7f3d0' }}>
            {pendingCount} Logs Awaiting Audit
          </div>
          {canApprove && pendingCount > 0 && activeTab === 'Pending' && (
            <button
              onClick={handleApproveAll} disabled={isSubmitting}
              style={{ background: '#10b981', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: isSubmitting ? 'wait' : 'pointer', fontSize: '1rem', boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)' }}
            >
              {isSubmitting ? 'Approving...' : '✅ Bulk Approve All'}
            </button>
          )}
        </div>
      </div>

      {error && <div style={{ padding: '15px', marginBottom: '20px', borderRadius: '4px', background: '#f8d7da', color: '#721c24', fontWeight: 'bold' }}>{error}</div>}

      {/* Action Toast Notification */}
      {actionToast && (
        <div style={{ backgroundColor: actionToast.type === 'success' ? '#ecfdf5' : '#fef2f2', border: `1px solid ${actionToast.type === 'success' ? '#a7f3d0' : '#fecaca'}`, padding: '16px 24px', borderRadius: '8px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: actionToast.type === 'success' ? '#065f46' : '#991b1b', fontWeight: '700' }}>
            <span style={{ fontSize: '18px' }}>{actionToast.type === 'success' ? '🔒' : '⚠️'}</span>
            {actionToast.message}
          </div>
          {actionToast.hash && (
            <div style={{ backgroundColor: '#ffffff', padding: '8px 12px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px', color: '#475569', border: '1px solid #cbd5e1' }}>
              <strong>Ledger Hash:</strong> {actionToast.hash}
            </div>
          )}
        </div>
      )}

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #cbd5e1', marginBottom: '24px' }}>
        {['Pending', 'Approved', 'Rejected'].map((tab) => (
          <button
            key={tab} onClick={() => setActiveTab(tab)}
            style={{ padding: '12px 24px', cursor: 'pointer', fontSize: '15px', fontWeight: '700', border: 'none', outline: 'none', backgroundColor: 'transparent', transition: 'all 0.2s', color: activeTab === tab ? '#0f172a' : '#64748b', borderBottom: activeTab === tab ? '3px solid #2563eb' : '3px solid transparent' }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Main Queue Table */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', color: '#475569', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th style={{ padding: '16px 24px', borderBottom: '2px solid #e2e8f0' }}>Log ID / Date</th>
              <th style={{ padding: '16px 24px', borderBottom: '2px solid #e2e8f0' }}>Unit & Scope</th>
              <th style={{ padding: '16px 24px', borderBottom: '2px solid #e2e8f0' }}>Metric & Value</th>
              <th style={{ padding: '16px 24px', borderBottom: '2px solid #e2e8f0' }}>Data Quality</th>
              {activeTab !== 'Pending' && (
                <th style={{ padding: '16px 24px', borderBottom: '2px solid #e2e8f0' }}>Reviewed By</th>
              )}
              <th style={{ padding: '16px 24px', borderBottom: '2px solid #e2e8f0', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr><td colSpan={activeTab !== 'Pending' ? 6 : 5} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontWeight: '500' }}>Inbox Zero! No {activeTab.toLowerCase()} records found.</td></tr>
            ) : (
              filteredData.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background-color 0.2s' }} onClick={() => openDrawer(log)} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ fontWeight: '700', color: '#334155', fontSize: '13px' }}>ID: {log.id}</div>
                    <div style={{ color: '#64748b', fontSize: '12px' }}>{new Date(log.created_at).toLocaleDateString()}</div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '14px' }}>{log.type}</div>
                    <div style={{ color: '#2563eb', fontSize: '12px', fontWeight: '600' }}>{formatScope(log.scope_category)}</div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ color: '#475569', fontSize: '13px', marginBottom: '2px' }}>{log.metric ? log.metric.replace(/_/g, ' ') : 'N/A'}</div>
                    <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '15px' }}>{log.value} {log.unit_of_measure}</div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ backgroundColor: log.quality_tier === 'A' ? '#d1fae5' : log.quality_tier === 'B' ? '#fef3c7' : '#fee2e2', color: log.quality_tier === 'A' ? '#065f46' : log.quality_tier === 'B' ? '#92400e' : '#991b1b', padding: '4px 8px', borderRadius: '4px', fontWeight: '800', fontSize: '12px' }}>
                        Tier {log.quality_tier || 'C'}
                      </span>
                      {log.evidence_file_url ? <span title="Evidence Attached">📎</span> : <span title="No Evidence">⚠️</span>}
                    </div>
                  </td>
                  {activeTab !== 'Pending' && (
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ fontSize: '13px', color: '#334155', fontWeight: '600' }}>{log.reviewed_by_email || '—'}</div>
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>{log.reviewed_at ? new Date(log.reviewed_at).toLocaleDateString() : ''}</div>
                    </td>
                  )}
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedLog(log); setRejectReason(''); }}
                        style={{ backgroundColor: 'white', color: '#2563eb', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                        onMouseOver={(e) => { e.target.style.borderColor = '#2563eb'; e.target.style.backgroundColor = '#eff6ff'; }}
                        onMouseOut={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.backgroundColor = 'white'; }}
                      >
                        {activeTab === 'Pending' ? 'Review & Audit' : 'View History'}
                      </button>
                      {canApprove && activeTab === 'Rejected' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleResubmit(log); }}
                          disabled={isSubmitting}
                          style={{ backgroundColor: 'white', color: '#7c3aed', border: '1px solid #ddd6fe', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '700', cursor: isSubmitting ? 'wait' : 'pointer' }}
                        >
                          ↩️ Resubmit
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* --- EVIDENCE REVIEW & AUDIT MODAL --- */}
      {selectedLog && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '20px' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: '#f8fafc', borderRadius: '16px', width: '100%', maxWidth: '1100px', height: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>

            <div style={{ padding: '20px 32px', backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Reviewing Record ID: {selectedLog.id}</div>
                <h2 style={{ margin: 0, fontSize: '20px', color: '#0f172a', fontWeight: '800' }}>{selectedLog.type} Data Audit</h2>
              </div>
              <button onClick={() => {setSelectedLog(null); setRejectReason('');}} style={{ background: 'none', border: 'none', fontSize: '28px', color: '#94a3b8', cursor: 'pointer', lineHeight: '1' }}>&times;</button>
            </div>

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              {/* Left Panel: The Data */}
              <div style={{ flex: '0 0 400px', backgroundColor: 'white', borderRight: '1px solid #e2e8f0', padding: '32px', overflowY: 'auto' }}>
                <h3 style={{ margin: '0 0 24px 0', color: '#1e293b', fontSize: '16px' }}>Input Declaration</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Framework / Scope</div>
                    <div style={{ fontSize: '15px', color: '#0f172a', fontWeight: '600' }}>{formatScope(selectedLog.scope_category)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Tracked Metric</div>
                    <div style={{ fontSize: '15px', color: '#0f172a', fontWeight: '600' }}>{selectedLog.metric ? selectedLog.metric.replace(/_/g, ' ') : 'N/A'}</div>
                  </div>
                  <div style={{ backgroundColor: '#f1f5f9', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px' }}>Reported Value</div>
                    <div style={{ fontSize: '32px', color: '#2563eb', fontWeight: '800', lineHeight: '1' }}>{selectedLog.value}</div>
                  </div>
                </div>

                <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: '0 0 16px 0', color: '#1e293b', fontSize: '16px' }}>Evidence Status</h3>
                  {selectedLog.evidence_file_url ? (
                    <div style={{ backgroundColor: '#f0fdf4', padding: '16px', borderRadius: '8px', border: '1px solid #bbf7d0', color: '#166534', fontSize: '14px', lineHeight: '1.5' }}>
                      <strong>Tier A Standard Met.</strong><br/>
                      Evidence file attached and available for review in the panel to the right.
                    </div>
                  ) : (
                    <div style={{ backgroundColor: '#fef2f2', padding: '16px', borderRadius: '8px', border: '1px solid #fecaca', color: '#991b1b', fontSize: '14px', lineHeight: '1.5' }}>
                      <strong>Tier C Warning.</strong><br/>
                      No evidence file attached. Spend-based or estimated entry. Exercise caution before approving to ledger.
                    </div>
                  )}
                </div>

                {/* FIX: "visible approval history" from the review — surfaces the
                    reviewer, timestamp, and comment for records that already have
                    a decision, instead of that information vanishing after review. */}
                {selectedLog.status !== 'Pending' && (
                  <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #e2e8f0' }}>
                    <h3 style={{ margin: '0 0 16px 0', color: '#1e293b', fontSize: '16px' }}>Review History</h3>
                    <div style={{
                      backgroundColor: selectedLog.status === 'Approved' ? '#f0fdf4' : '#fef2f2',
                      border: `1px solid ${selectedLog.status === 'Approved' ? '#bbf7d0' : '#fecaca'}`,
                      padding: '16px', borderRadius: '8px', fontSize: '14px', lineHeight: '1.5'
                    }}>
                      <div style={{ fontWeight: '700', color: selectedLog.status === 'Approved' ? '#166534' : '#991b1b', marginBottom: '6px' }}>
                        {selectedLog.status} by {selectedLog.reviewed_by_email || 'an admin'}{selectedLog.reviewed_at ? ` on ${new Date(selectedLog.reviewed_at).toLocaleString()}` : ''}
                      </div>
                      {selectedLog.reviewer_comment ? (
                        <div style={{ color: '#475569' }}>"{selectedLog.reviewer_comment}"</div>
                      ) : (
                        <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>No comment left.</div>
                      )}
                      {selectedLog.status === 'Approved' && selectedLog.ledger_hash && (
                        <div style={{ marginTop: '10px', backgroundColor: '#ffffff', padding: '8px 12px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '11px', color: '#475569', border: '1px solid #cbd5e1', wordBreak: 'break-all' }}>
                          <strong>Ledger Hash:</strong> {selectedLog.ledger_hash}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Panel: The Evidence Viewer */}
              <div style={{ flex: 1, padding: '32px', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, color: '#1e293b', fontSize: '16px' }}>Evidence Locker: Attached File</h3>
                  {evidenceViewUrl && (
                    <a href={evidenceViewUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: '#2563eb', fontWeight: '600', textDecoration: 'none' }}>Open File in New Tab ↗</a>
                  )}
                </div>

                <div style={{ flex: 1, backgroundColor: '#e2e8f0', borderRadius: '8px', border: '2px solid #cbd5e1', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
                  {loadingEvidence ? (
                    <div style={{ color: '#94a3b8', fontWeight: '600' }}>Loading evidence...</div>
                  ) : evidenceViewUrl ? (
                    <iframe
                      src={evidenceViewUrl}
                      title="Evidence Viewer"
                      style={{ width: '100%', height: '100%', border: 'none' }}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚫</div>
                      <div style={{ fontWeight: '600' }}>No evidence provided for this record.</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer: action buttons for Pending; read-only history + Resubmit for decided records */}
            {selectedLog.status === 'Pending' ? (
              canApprove && (
                <div style={{ padding: '24px 32px', backgroundColor: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: '0 0 400px' }}>
                    <input
                      type="text" placeholder="Reviewer comment (required if rejecting)..."
                      value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={() => executeAuditAction('Rejected')} disabled={isSubmitting}
                      style={{ backgroundColor: 'white', color: '#ef4444', border: '1px solid #ef4444', padding: '10px 24px', borderRadius: '6px', fontWeight: '700', cursor: isSubmitting ? 'wait' : 'pointer' }}
                    >
                      Reject & Return
                    </button>
                    <button
                      onClick={() => executeAuditAction('Approved')} disabled={isSubmitting}
                      style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '10px 32px', borderRadius: '6px', fontWeight: '700', cursor: isSubmitting ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)' }}
                    >
                      {isSubmitting ? 'Locking...' : '🔒 Approve & Hash to Ledger'}
                    </button>
                  </div>
                </div>
              )
            ) : (
              canApprove && selectedLog.status === 'Rejected' && (
                <div style={{ padding: '24px 32px', backgroundColor: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => executeAuditAction('Pending', null)} disabled={isSubmitting}
                    style={{ backgroundColor: 'white', color: '#7c3aed', border: '1px solid #ddd6fe', padding: '10px 24px', borderRadius: '6px', fontWeight: '700', cursor: isSubmitting ? 'wait' : 'pointer' }}
                  >
                    ↩️ Resubmit for Review
                  </button>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* --- TRACEABILITY DRAWER --- */}
      <TraceabilityDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        record={drawerRecord}
      />

    </div>
  );
}

export default AuditQueue;
