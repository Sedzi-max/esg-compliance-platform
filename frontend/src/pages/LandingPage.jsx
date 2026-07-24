import React from 'react';
import { useNavigate } from 'react-router-dom';
import myLogo from '../assets/logo.png'; 

// FIX: several claims on this page described frameworks/features that
// aren't actually functional in the product (CSRD/ISSB/GRI have zero seeded
// clauses; "SOC 2 Architecture" implies an audit that hasn't happened;
// "toggle industry levers" forecaster wasn't confirmed to exist). Replaced
// with what's genuinely built and working: GSE-aligned multi-year disclosure
// reports, the real materiality matrix, the maker-checker audit trail with a
// real SHA-256 ledger hash, and named sector frameworks (Bank of Ghana, NIC,
// Ghana Green Finance Taxonomy) instead of global standards with no real
// backing yet. Also applies the same Sora/Inter typography used elsewhere
// this session for consistency across the product.
//
// REQUIRES: the same Google Fonts <link> tags already added to
// frontend/index.html (Inter + Sora) — already deployed as of this session.

const FONT_HEADING = "'Sora', system-ui, sans-serif";
const FONT_BODY = "'Inter', system-ui, sans-serif";

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ fontFamily: FONT_BODY, color: '#212529', background: '#f8f9fa', minHeight: '100vh' }}>
      
      {/* --- NAVIGATION BAR --- */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 5%', background: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', position: 'sticky', top: 0, zIndex: 1000 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <img src={myLogo} alt="ESG Radar Logo" style={{ height: '40px', objectFit: 'contain' }} />
          <span style={{ fontFamily: FONT_HEADING, fontSize: '1.4rem', fontWeight: '800', color: '#198754', letterSpacing: '-0.5px' }}>ESG Radar</span>
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <button 
            onClick={() => navigate('/login')}
            style={{ fontFamily: FONT_HEADING, background: 'transparent', border: 'none', color: '#495057', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', transition: 'color 0.2s' }}
          >
            Client Login
          </button>
          <button 
            onClick={() => navigate('/login')}
            style={{ fontFamily: FONT_HEADING, background: '#0d6efd', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', boxShadow: '0 4px 6px rgba(13, 110, 253, 0.2)', transition: 'transform 0.2s' }}
          >
            Request Access
          </button>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <header style={{ textAlign: 'center', padding: '100px 5% 60px 5%', background: 'linear-gradient(135deg, #e8f5e9 0%, #f8f9fa 100%)', borderBottom: '1px solid #dee2e6' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <span style={{ fontFamily: FONT_HEADING, background: '#d1e7dd', color: '#0f5132', padding: '6px 16px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', display: 'inline-block', marginBottom: '25px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            GSE, Bank of Ghana & NIC Alignment — Live
          </span>
          <h1 style={{ fontFamily: FONT_HEADING, fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: '900', color: '#212529', marginBottom: '25px', lineHeight: '1.1', letterSpacing: '-1px' }}>
            The Enterprise Engine for <span style={{ color: '#198754' }}>Defensible</span> ESG Compliance.
          </h1>
          <p style={{ fontSize: '1.25rem', color: '#495057', maxWidth: '750px', margin: '0 auto 40px auto', lineHeight: '1.6' }}>
            Stop wrestling with spreadsheets. Automate your carbon math, seamlessly map data to Ghana's regulatory frameworks, and provide your auditors with immutable, receipt-backed evidence.
          </p>
          <button 
            onClick={() => navigate('/login')}
            style={{ fontFamily: FONT_HEADING, background: '#198754', color: 'white', border: 'none', padding: '16px 35px', fontSize: '1.1rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 10px rgba(25, 135, 84, 0.25)', transition: 'transform 0.2s' }}
          >
            Deploy Your Instance →
          </button>
        </div>
      </header>

      {/* --- INTERACTIVE DASHBOARD PREVIEW --- */}
      <section style={{ padding: '0 5% 80px 5%', background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: '1000px', background: 'white', borderRadius: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', border: '1px solid #dee2e6', overflow: 'hidden', transform: 'translateY(-20px)' }}>
          
          {/* Browser Window Header */}
          <div style={{ background: '#e9ecef', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #dee2e6' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff5f56' }}></div>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ffbd2e' }}></div>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#27c93f' }}></div>
            <div style={{ background: 'white', margin: '0 auto', padding: '6px 40px', borderRadius: '6px', fontSize: '0.8rem', color: '#6c757d', fontFamily: 'monospace', width: 'fit-content', minWidth: '250px', textAlign: 'center', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)' }}>
              app.esgradarcompliance.com/dashboard
            </div>
          </div>

          {/* Mock App Interface Layout */}
          <div style={{ display: 'flex', height: '480px', background: '#f8f9fa' }}>
            
            <div style={{ flex: '0 0 180px', background: '#212529', padding: '25px 15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ height: '16px', background: '#495057', borderRadius: '4px', width: '70%', marginBottom: '20px' }}></div>
              <div style={{ height: '12px', background: '#198754', borderRadius: '4px', width: '90%' }}></div>
              <div style={{ height: '12px', background: '#495057', borderRadius: '4px', width: '80%' }}></div>
              <div style={{ height: '12px', background: '#495057', borderRadius: '4px', width: '85%' }}></div>
              <div style={{ height: '12px', background: '#495057', borderRadius: '4px', width: '60%', marginTop: '30px' }}></div>
              <div style={{ height: '12px', background: '#495057', borderRadius: '4px', width: '75%' }}></div>
            </div>

            <div style={{ flex: 1, padding: '30px', display: 'flex', flexDirection: 'column', gap: '25px', overflow: 'hidden', position: 'relative' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '40%' }}>
                  <div style={{ height: '24px', background: '#212529', borderRadius: '4px' }}></div>
                  <div style={{ height: '12px', background: '#adb5bd', borderRadius: '4px', width: '60%' }}></div>
                </div>
                <div style={{ height: '36px', background: '#e3f2fd', borderRadius: '6px', width: '130px' }}></div>
              </div>

              <div style={{ display: 'flex', gap: '20px', flex: 1 }}>
                
                <div style={{ flex: 2, background: 'white', padding: '25px', borderRadius: '8px', border: '1px solid #dee2e6', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <div style={{ height: '14px', background: '#ced4da', borderRadius: '4px', width: '40%' }}></div>
                  
                  <svg viewBox="0 0 100 40" style={{ width: '100%', height: '160px', overflow: 'visible', margin: '15px 0' }}>
                    <path d="M 0 35 Q 30 25, 60 15 T 100 5" fill="none" stroke="#198754" strokeWidth="1.5" strokeDasharray="3 3" />
                    <path d="M 0 35 Q 25 32, 50 22 T 75 14" fill="none" stroke="#0d6efd" strokeWidth="2" />
                    <circle cx="75" cy="14" r="3" fill="#0d6efd" stroke="white" strokeWidth="1" />
                  </svg>

                  <div style={{ display: 'flex', gap: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#198754' }}></div>
                      <div style={{ fontSize: '0.75rem', color: '#6c757d', fontWeight: 'bold' }}>Net-Zero Path</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#0d6efd' }}></div>
                      <div style={{ fontSize: '0.75rem', color: '#6c757d', fontWeight: 'bold' }}>Actual Verified CO₂e</div>
                    </div>
                  </div>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #dee2e6', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    <div style={{ height: '12px', background: '#ced4da', borderRadius: '4px', width: '50%' }}></div>
                    <div style={{ height: '28px', background: '#212529', borderRadius: '4px', width: '80%' }}></div>
                  </div>
                  <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #dee2e6', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    <div style={{ height: '12px', background: '#ced4da', borderRadius: '4px', width: '60%' }}></div>
                    <div style={{ height: '28px', background: '#198754', borderRadius: '4px', width: '40%' }}></div>
                  </div>
                </div>

              </div>

              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '160px', background: 'linear-gradient(to bottom, transparent, rgba(248, 249, 250, 0.95))', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <div 
                  style={{ fontFamily: FONT_HEADING, background: '#212529', color: 'white', padding: '14px 28px', borderRadius: '30px', fontSize: '1rem', fontWeight: 'bold', boxShadow: '0 8px 16px rgba(0,0,0,0.2)', cursor: 'pointer', transition: 'transform 0.2s' }} 
                  onClick={() => navigate('/login')}
                >
                  🔒 Click to Preview Audit Log Directory
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* --- NEW: HOW IT WORKS --- */}
      <section style={{ padding: '80px 5%', background: '#f8f9fa' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h2 style={{ fontFamily: FONT_HEADING, fontSize: 'clamp(2rem, 4vw, 2.5rem)', color: '#212529', marginBottom: '15px', fontWeight: '900', letterSpacing: '-0.5px' }}>From Raw Data to Signed Disclosure</h2>
          <p style={{ color: '#6c757d', fontSize: '1.2rem', maxWidth: '650px', margin: '0 auto', lineHeight: '1.6' }}>A single, governed pipeline — not a spreadsheet stitched together every quarter.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px', maxWidth: '1100px', margin: '0 auto' }}>
          {[
            { n: '01', title: 'Log Data', body: 'Facilities log emissions, social, governance, and financial metrics — or your suppliers submit directly via a secure portal link.' },
            { n: '02', title: 'Verify & Approve', body: 'A maker-checker workflow requires an explicit reviewer decision on every record, with a mandatory rejection reason and full history.' },
            { n: '03', title: 'Auto-Map to Frameworks', body: 'Approved data is matched against your sector\'s clauses automatically — no manual cross-referencing against a compliance manual.' },
            { n: '04', title: 'Generate Disclosure', body: 'Produce an auditor-ready PDF, formatted to the framework you\'re reporting against, with multi-year comparisons built in.' }
          ].map(step => (
            <div key={step.n} style={{ background: 'white', padding: '32px 24px', borderRadius: '12px', border: '1px solid #e9ecef' }}>
              <div style={{ fontFamily: FONT_HEADING, fontSize: '0.85rem', fontWeight: '800', color: '#198754', marginBottom: '10px', letterSpacing: '0.05em' }}>{step.n}</div>
              <h3 style={{ fontFamily: FONT_HEADING, fontSize: '1.15rem', marginBottom: '10px', color: '#212529' }}>{step.title}</h3>
              <p style={{ color: '#6c757d', lineHeight: '1.6', margin: 0, fontSize: '0.95rem' }}>{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* --- UPDATED FEATURE GRID --- */}
      <section style={{ padding: '80px 5%', background: 'white' }}>
        <div style={{ textAlign: 'center', marginBottom: '80px' }}>
          <h2 style={{ fontFamily: FONT_HEADING, fontSize: 'clamp(2rem, 4vw, 2.5rem)', color: '#212529', marginBottom: '15px', fontWeight: '900', letterSpacing: '-0.5px' }}>Built for the Modern Audit</h2>
          <p style={{ color: '#6c757d', fontSize: '1.2rem', maxWidth: '650px', margin: '0 auto', lineHeight: '1.6' }}>Engineered to turn regulatory reporting burdens into strategic advantages.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px', maxWidth: '1200px', margin: '0 auto' }}>
          
          <div style={{ padding: '40px 30px', background: '#f8f9fa', borderRadius: '12px', border: '1px solid #e9ecef' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '20px' }}>🎯</div>
            <h3 style={{ fontFamily: FONT_HEADING, fontSize: '1.4rem', marginBottom: '15px', color: '#212529' }}>Enter Once, Report Many</h3>
            <p style={{ color: '#6c757d', lineHeight: '1.6', margin: 0, fontSize: '1.05rem' }}>Log a single reusable metric — like electricity or waste — and it automatically closes the matching clause across every framework you report against, including sector-specific and cross-cutting standards simultaneously.</p>
          </div>

          <div style={{ padding: '40px 30px', background: '#f8f9fa', borderRadius: '12px', border: '1px solid #e9ecef' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '20px' }}>🔗</div>
            <h3 style={{ fontFamily: FONT_HEADING, fontSize: '1.4rem', marginBottom: '15px', color: '#212529' }}>Zero-Friction Supplier Portals</h3>
            <p style={{ color: '#6c757d', lineHeight: '1.6', margin: 0, fontSize: '1.05rem' }}>Conquer Scope 3. Generate secure, passwordless magic links that allow your vendors to upload their emissions data directly into your ledger.</p>
          </div>

          <div style={{ padding: '40px 30px', background: '#f8f9fa', borderRadius: '12px', border: '1px solid #e9ecef' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '20px' }}>🗄️</div>
            <h3 style={{ fontFamily: FONT_HEADING, fontSize: '1.4rem', marginBottom: '15px', color: '#212529' }}>Metadata-Rich Evidence Locker</h3>
            <p style={{ color: '#6c757d', lineHeight: '1.6', margin: 0, fontSize: '1.05rem' }}>Auditors don't trust algorithms; they trust receipts. Every document is tagged by type, facility, and reporting period, auto-graded (Tier A-C), and linked straight back to the ledger entry it supports.</p>
          </div>

          <div style={{ padding: '40px 30px', background: '#f8f9fa', borderRadius: '12px', border: '1px solid #e9ecef' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '20px' }}>🔒</div>
            <h3 style={{ fontFamily: FONT_HEADING, fontSize: '1.4rem', marginBottom: '15px', color: '#212529' }}>Governed Maker-Checker Ledger</h3>
            <p style={{ color: '#6c757d', lineHeight: '1.6', margin: 0, fontSize: '1.05rem' }}>Every approval is signed off with a real reviewer, a timestamp, and a cryptographic SHA-256 hash — every rejection requires a documented reason, with a clear resubmission path back to the reviewer.</p>
          </div>

          <div style={{ padding: '40px 30px', background: '#f8f9fa', borderRadius: '12px', border: '1px solid #e9ecef' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '20px' }}>📊</div>
            <h3 style={{ fontFamily: FONT_HEADING, fontSize: '1.4rem', marginBottom: '15px', color: '#212529' }}>Materiality Matrix</h3>
            <p style={{ color: '#6c757d', lineHeight: '1.6', margin: 0, fontSize: '1.05rem' }}>Plot ESG topics by stakeholder importance against business impact on a live quadrant chart, so your reporting focus is prioritized by what actually matters to your business and stakeholders — not a generic checklist.</p>
          </div>

          <div style={{ padding: '40px 30px', background: '#f8f9fa', borderRadius: '12px', border: '1px solid #e9ecef' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '20px' }}>🌍</div>
            <h3 style={{ fontFamily: FONT_HEADING, fontSize: '1.4rem', marginBottom: '15px', color: '#212529' }}>Climate Scenario Analysis</h3>
            <p style={{ color: '#6c757d', lineHeight: '1.6', margin: 0, fontSize: '1.05rem' }}>Model physical and transition climate risks against defined time horizons, log the projected financial impact, and document your mitigation strategy — built to satisfy the NIC's own stress-testing requirement for insurers.</p>
          </div>

        </div>
      </section>

      {/* --- NEW: SECTOR-SPECIFIC COMPLIANCE --- */}
      <section style={{ padding: '80px 5%', background: '#f8f9fa' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h2 style={{ fontFamily: FONT_HEADING, fontSize: 'clamp(2rem, 4vw, 2.5rem)', color: '#212529', marginBottom: '15px', fontWeight: '900', letterSpacing: '-0.5px' }}>Built for Ghana's Regulatory Landscape</h2>
          <p style={{ color: '#6c757d', fontSize: '1.2rem', maxWidth: '700px', margin: '0 auto', lineHeight: '1.6' }}>Not a generic global platform retrofitted for the region — the specific frameworks your regulator actually checks against.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', maxWidth: '1100px', margin: '0 auto', marginBottom: '30px' }}>
          <div style={{ background: 'white', padding: '32px', borderRadius: '12px', border: '1px solid #dee2e6' }}>
            <div style={{ fontSize: '2rem', marginBottom: '14px' }}>🏦</div>
            <h3 style={{ fontFamily: FONT_HEADING, fontSize: '1.2rem', marginBottom: '10px', color: '#212529' }}>Banking</h3>
            <p style={{ color: '#6c757d', lineHeight: '1.6', margin: 0, fontSize: '0.95rem' }}>Aligned to the Bank of Ghana Sustainable Banking Principles, from E&S risk management in lending through financial inclusion metrics.</p>
          </div>
          <div style={{ background: 'white', padding: '32px', borderRadius: '12px', border: '1px solid #dee2e6' }}>
            <div style={{ fontSize: '2rem', marginBottom: '14px' }}>🛡️</div>
            <h3 style={{ fontFamily: FONT_HEADING, fontSize: '1.2rem', marginBottom: '10px', color: '#212529' }}>Insurance</h3>
            <p style={{ color: '#6c757d', lineHeight: '1.6', margin: 0, fontSize: '0.95rem' }}>Structured to the NIC ESG Guidelines' own governance, risk management, and disclosure clauses — not a repurposed banking template.</p>
          </div>
          <div style={{ background: 'white', padding: '32px', borderRadius: '12px', border: '1px solid #dee2e6' }}>
            <div style={{ fontSize: '2rem', marginBottom: '14px' }}>⚡</div>
            <h3 style={{ fontFamily: FONT_HEADING, fontSize: '1.2rem', marginBottom: '10px', color: '#212529' }}>Energy</h3>
            <p style={{ color: '#6c757d', lineHeight: '1.6', margin: 0, fontSize: '0.95rem' }}>Mapped to the Ghana Green Finance Taxonomy's energy sector criteria, from generation mix to grid loss and energy access metrics.</p>
          </div>
        </div>

        <div style={{ maxWidth: '1100px', margin: '0 auto', background: 'white', border: '1px solid #dee2e6', borderRadius: '12px', padding: '32px', display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '2.5rem' }}>📑</div>
          <div style={{ flex: 1, minWidth: '260px' }}>
            <h3 style={{ fontFamily: FONT_HEADING, fontSize: '1.2rem', marginBottom: '8px', color: '#212529' }}>GSE ESG Disclosures Guidance Manual — Purpose-Built Output</h3>
            <p style={{ color: '#6c757d', lineHeight: '1.6', margin: 0, fontSize: '0.95rem' }}>Coexists alongside your sector framework rather than replacing it. Generates a report grouped by the manual's own material topics, with real reported KPI values (not just a fulfilled/missing checkbox) and a three-year trend comparison for every clause.</p>
          </div>
        </div>
      </section>

      {/* --- TRUST BANNER --- */}
      <section style={{ padding: '80px 20px', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ fontFamily: FONT_HEADING, fontSize: '32px', fontWeight: '800', margin: '0 0 24px 0', letterSpacing: '-0.02em', color: '#212529' }}>Ready for Assurance.</h2>
        <p style={{ fontSize: '1.15rem', color: '#6c757d', lineHeight: '1.6', margin: '0 0 32px 0' }}>
          Built on a multi-tenant PostgreSQL architecture with strict Role-Based Access Controls (RBAC). Your data is segregated, encrypted, and mathematically sound.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{ fontFamily: FONT_HEADING, display: 'flex', alignItems: 'center', gap: '8px', color: '#495057', fontWeight: '700', fontSize: '1rem', background: '#f8f9fa', padding: '8px 16px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
            <span style={{ color: '#198754' }}>✓</span> Maker-Checker Governance
          </div>
          <div style={{ fontFamily: FONT_HEADING, display: 'flex', alignItems: 'center', gap: '8px', color: '#495057', fontWeight: '700', fontSize: '1rem', background: '#f8f9fa', padding: '8px 16px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
            <span style={{ color: '#198754' }}>✓</span> GHG Protocol Aligned
          </div>
          <div style={{ fontFamily: FONT_HEADING, display: 'flex', alignItems: 'center', gap: '8px', color: '#495057', fontWeight: '700', fontSize: '1rem', background: '#f8f9fa', padding: '8px 16px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
            <span style={{ color: '#198754' }}>✓</span> Multi-Tenant Security
          </div>
        </div>
      </section>

      {/* --- CALL TO ACTION --- */}
      <section style={{ background: '#198754', color: 'white', textAlign: 'center', padding: '100px 5%' }}>
        <h2 style={{ fontFamily: FONT_HEADING, fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: '900', margin: '0 0 20px 0', letterSpacing: '-0.5px' }}>Ready to digitize your compliance?</h2>
        <p style={{ fontSize: '1.25rem', opacity: '0.9', marginBottom: '40px', maxWidth: '650px', margin: '0 auto 40px auto', lineHeight: '1.6' }}>
          Join leading corporations standardizing their environmental and social reporting on ESG Radar.
        </p>
        <button 
          onClick={() => navigate('/login')}
          style={{ fontFamily: FONT_HEADING, border: 'none', cursor: 'pointer', background: 'white', color: '#198754', fontWeight: 'bold', padding: '16px 45px', borderRadius: '8px', fontSize: '1.15rem', boxShadow: '0 6px 12px rgba(0,0,0,0.15)', transition: 'transform 0.2s' }}
        >
          Create Corporate Account
        </button>
      </section>

      {/* --- FOOTER --- */}
      <footer style={{ background: '#212529', color: '#adb5bd', padding: '60px 5% 40px 5%' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <span style={{ fontFamily: FONT_HEADING, fontSize: '1.4rem', fontWeight: 'bold', color: 'white' }}>ESG Radar</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.95rem' }}>Built for Global and Regional Stock Exchange Compliance.</p>
          <div style={{ width: '100%', height: '1px', background: '#495057', margin: '20px 0' }}></div>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>&copy; {new Date().getFullYear()} Route Radar Limited. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}

export default LandingPage;
