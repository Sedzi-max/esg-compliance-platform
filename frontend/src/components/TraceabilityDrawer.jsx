import React from 'react';

function TraceabilityDrawer({ isOpen, onClose, record }) {
  if (!isOpen || !record) return null;

  // NEW: Helper function to handle all three status states dynamically
  const getStatusDisplay = (status) => {
    if (status === 'Approved') return { bg: '#ecfdf5', color: '#059669', label: '✓ SEALED & APPROVED' };
    if (status === 'Rejected') return { bg: '#fef2f2', color: '#e11d48', label: '❌ REJECTED & RETURNED' };
    return { bg: '#fffbeb', color: '#d97706', label: '⏳ PENDING REVIEW' };
  };

  const statusDisplay = getStatusDisplay(record.status);

  return (
    <>
      {/* Dark Overlay Background */}
      <div 
        onClick={onClose}
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 999 }}
      />

      {/* The Sliding Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: '450px',
        background: '#ffffff', zIndex: 1000, boxShadow: '-10px 0 30px rgba(0,0,0,0.1)',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.3s ease-in-out',
        display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif'
      }}>
        
        {/* Drawer Header */}
        <div style={{ padding: '25px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <div>
            <h3 style={{ margin: '0 0 5px 0', color: '#0f172a', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🛡️ Audit Traceability
            </h3>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Transaction ID: {record.id || record.observation_id || 'SYS-GEN-XX'}
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>×</button>
        </div>

        {/* Drawer Scrollable Content */}
        <div style={{ padding: '25px', flex: 1, overflowY: 'auto' }}>
          
          {/* Status Badge - NOW DYNAMIC */}
          <div style={{ marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold', color: '#475569', fontSize: '0.9rem' }}>Ledger Status:</span>
            <span style={{ 
              background: statusDisplay.bg, 
              color: statusDisplay.color, 
              padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' 
            }}>
              {statusDisplay.label}
            </span>
          </div>

          <hr style={{ border: 'none', borderTop: '1px dashed #cbd5e1', marginBottom: '25px' }} />

          {/* Core Data Block */}
          <div style={{ marginBottom: '25px' }}>
            <h4 style={{ margin: '0 0 15px 0', color: '#0f172a', fontSize: '1rem', textTransform: 'uppercase' }}>1. Primary Observation</h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div>
                <p style={{ margin: '0 0 5px 0', fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold' }}>Facility / Node</p>
                <p style={{ margin: 0, color: '#0f172a', fontWeight: '600' }}>{record.organization_name}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 5px 0', fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold' }}>Recorded Date</p>
                <p style={{ margin: 0, color: '#0f172a', fontWeight: '600', fontFamily: 'monospace' }}>
                  {new Date(record.recorded_date || record.timestamp || record.created_at).toLocaleString()}
                </p>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <p style={{ margin: '0 0 5px 0', fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold' }}>Activity Type</p>
                <p style={{ margin: 0, color: '#0f172a', fontWeight: '600' }}>{record.activity_type || record.metric_name}</p>
              </div>
            </div>
          </div>

          {/* The Atomic Checkout Data */}
          <div style={{ marginBottom: '25px' }}>
            <h4 style={{ margin: '0 0 15px 0', color: '#0f172a', fontSize: '1rem', textTransform: 'uppercase' }}>2. Mathematical Transformation</h4>
            
            <div style={{ background: '#0f172a', padding: '20px', borderRadius: '8px', color: '#e2e8f0', fontFamily: 'monospace', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ color: '#94a3b8' }}>Raw Input:</span>
                <span style={{ color: '#fff' }}>{record.raw_amount || record.numeric_value} {record.unit_of_measure}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ color: '#94a3b8' }}>Multiplier (Frozen):</span>
                <span style={{ color: '#38bdf8' }}>
                  {record.calculated_co2e && record.raw_amount 
                    ? `× ${(Number(record.calculated_co2e) / Number(record.raw_amount)).toFixed(2)}` 
                    : 'N/A'}
                </span>
              </div>
              <div style={{ borderTop: '1px solid #334155', margin: '10px 0' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.1rem' }}>
                <span style={{ color: '#10b981' }}>Total CO2e:</span>
                <span style={{ color: '#10b981' }}>{Number(record.calculated_co2e).toLocaleString()} kg</span>
              </div>
            </div>
          </div>

          {/* Methodology & Evidence Link */}
          <div>
            <h4 style={{ margin: '0 0 15px 0', color: '#0f172a', fontSize: '1rem', textTransform: 'uppercase' }}>3. Defensibility File</h4>
            
            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '15px' }}>
              <p style={{ margin: '0 0 5px 0', fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold' }}>Methodology Engine</p>
              <p style={{ margin: 0, color: '#0f172a', fontWeight: '600' }}>
                {record.factor_source || 'Standard Calculation'} ({record.methodology_version || 'v1.0'})
              </p>
            </div>

            {record.evidence_file_url ? (
              <a 
                href={`https://esg-compliance-platform-production.up.railway.app${record.evidence_file_url}`} 
                target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#f1f5f9', color: '#0369a1', padding: '15px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', border: '1px solid #bae6fd', transition: 'background 0.2s' }}
              >
                📄 Inspect Original Evidence Source
              </a>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#fff1f2', color: '#be123c', padding: '15px', borderRadius: '8px', fontWeight: 'bold', border: '1px solid #fecdd3' }}>
                ⚠️ No Primary Evidence Attached
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}

export default TraceabilityDrawer;