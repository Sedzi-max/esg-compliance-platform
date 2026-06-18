import React from 'react';
import { useNavigate } from 'react-router-dom';
import myLogo from '../assets/logo.png'; 

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', color: '#212529', background: '#f8f9fa', minHeight: '100vh' }}>
      
      {/* --- NAVIGATION BAR --- */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 5%', background: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', position: 'sticky', top: 0, zIndex: 1000 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <img src={myLogo} alt="ESG Radar Logo" style={{ height: '40px', objectFit: 'contain' }} />
          <span style={{ fontSize: '1.4rem', fontWeight: '800', color: '#198754', letterSpacing: '-0.5px' }}>ESG Radar</span>
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <button 
            onClick={() => navigate('/login')}
            style={{ background: 'transparent', border: 'none', color: '#495057', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', transition: 'color 0.2s' }}
          >
            Client Login
          </button>
          <button 
            onClick={() => navigate('/login')}
            style={{ background: '#0d6efd', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', boxShadow: '0 4px 6px rgba(13, 110, 253, 0.2)', transition: 'transform 0.2s' }}
          >
            Request Access
          </button>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <header style={{ textAlign: 'center', padding: '100px 5% 60px 5%', background: 'linear-gradient(135deg, #e8f5e9 0%, #f8f9fa 100%)', borderBottom: '1px solid #dee2e6' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <span style={{ background: '#d1e7dd', color: '#0f5132', padding: '6px 16px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', display: 'inline-block', marginBottom: '25px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            GSE Compliance Ready
          </span>
          <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: '900', color: '#212529', marginBottom: '25px', lineHeight: '1.1', letterSpacing: '-1px' }}>
            Automate Your <span style={{ color: '#198754' }}>ESG Reporting</span> & Carbon Accounting.
          </h1>
          <p style={{ fontSize: '1.25rem', color: '#495057', maxWidth: '750px', margin: '0 auto 40px auto', lineHeight: '1.6' }}>
            Replace fragmented spreadsheets with a secure, unified digital ledger. Instantly calculate Scope 1-3 emissions, map Double Materiality, and provide auditors with a verified chain of evidence.
          </p>
          <button 
            onClick={() => navigate('/login')}
            style={{ background: '#198754', color: 'white', border: 'none', padding: '16px 35px', fontSize: '1.1rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 10px rgba(25, 135, 84, 0.25)', transition: 'transform 0.2s' }}
          >
            Onboard Your Organization →
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
            
            {/* Mock Sidebar (Hidden on mobile via media queries in a real app, flex basis here) */}
            <div style={{ flex: '0 0 180px', background: '#212529', padding: '25px 15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ height: '16px', background: '#495057', borderRadius: '4px', width: '70%', marginBottom: '20px' }}></div>
              <div style={{ height: '12px', background: '#198754', borderRadius: '4px', width: '90%' }}></div>
              <div style={{ height: '12px', background: '#495057', borderRadius: '4px', width: '80%' }}></div>
              <div style={{ height: '12px', background: '#495057', borderRadius: '4px', width: '85%' }}></div>
              <div style={{ height: '12px', background: '#495057', borderRadius: '4px', width: '60%', marginTop: '30px' }}></div>
              <div style={{ height: '12px', background: '#495057', borderRadius: '4px', width: '75%' }}></div>
            </div>

            {/* Mock Content Workspace */}
            <div style={{ flex: 1, padding: '30px', display: 'flex', flexDirection: 'column', gap: '25px', overflow: 'hidden', position: 'relative' }}>
              
              {/* Header Blocks */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '40%' }}>
                  <div style={{ height: '24px', background: '#212529', borderRadius: '4px' }}></div>
                  <div style={{ height: '12px', background: '#adb5bd', borderRadius: '4px', width: '60%' }}></div>
                </div>
                <div style={{ height: '36px', background: '#e3f2fd', borderRadius: '6px', width: '130px' }}></div>
              </div>

              {/* Main Content Row: Trajectory Chart Mockup & Stats */}
              <div style={{ display: 'flex', gap: '20px', flex: 1 }}>
                
                {/* Visual Chart Card */}
                <div style={{ flex: 2, background: 'white', padding: '25px', borderRadius: '8px', border: '1px solid #dee2e6', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <div style={{ height: '14px', background: '#ced4da', borderRadius: '4px', width: '40%' }}></div>
                  
                  {/* Stylized SVG Chart lines to look realistic */}
                  <svg viewBox="0 0 100 40" style={{ width: '100%', height: '160px', overflow: 'visible', margin: '15px 0' }}>
                    {/* Target Trajectory Line (Dotted Green) */}
                    <path d="M 0 35 Q 30 25, 60 15 T 100 5" fill="none" stroke="#198754" strokeWidth="1.5" strokeDasharray="3 3" />
                    {/* Actual Progress Line (Solid Blue) */}
                    <path d="M 0 35 Q 25 32, 50 22 T 75 14" fill="none" stroke="#0d6efd" strokeWidth="2" />
                    {/* Current Progress Node */}
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

                {/* KPI Sidebar Cards */}
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

              {/* OVERLAY: Clean Blur Effect to tease the platform premium feel */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '160px', background: 'linear-gradient(to bottom, transparent, rgba(248, 249, 250, 0.95))', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <div 
                  style={{ background: '#212529', color: 'white', padding: '14px 28px', borderRadius: '30px', fontSize: '1rem', fontWeight: 'bold', boxShadow: '0 8px 16px rgba(0,0,0,0.2)', cursor: 'pointer', transition: 'transform 0.2s' }} 
                  onClick={() => navigate('/login')}
                >
                  🔒 Click to Preview Audit Log Directory
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* --- UPDATED FEATURE GRID (6 Enterprise Capabilities) --- */}
      <section style={{ padding: '80px 5%', background: 'white' }}>
        <div style={{ textAlign: 'center', marginBottom: '80px' }}>
          <h2 style={{ fontSize: 'clamp(2rem, 4vw, 2.5rem)', color: '#212529', marginBottom: '15px', fontWeight: '900', letterSpacing: '-0.5px' }}>Built for the Modern Audit</h2>
          <p style={{ color: '#6c757d', fontSize: '1.2rem', maxWidth: '650px', margin: '0 auto', lineHeight: '1.6' }}>Engineered to handle the complexities of corporate sustainability mandates across emerging markets.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px', maxWidth: '1200px', margin: '0 auto' }}>
          
          <div style={{ padding: '40px 30px', background: '#f8f9fa', borderRadius: '12px', border: '1px solid #e9ecef' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '20px' }}>☁️</div>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '15px', color: '#212529' }}>Automated Carbon Engine</h3>
            <p style={{ color: '#6c757d', lineHeight: '1.6', margin: 0, fontSize: '1.05rem' }}>Input raw data (fuel, kWh, flight miles) and our GHG Protocol engine instantly calculates standardized Scope 1, 2, and 3 CO2e metrics.</p>
          </div>

          <div style={{ padding: '40px 30px', background: '#f8f9fa', borderRadius: '12px', border: '1px solid #e9ecef' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '20px' }}>📊</div>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '15px', color: '#212529' }}>Double Materiality Matrix</h3>
            <p style={{ color: '#6c757d', lineHeight: '1.6', margin: 0, fontSize: '1.05rem' }}>Deploy sector-specific starter kits to instantly map your operational risks against stakeholder importance and financial business impact.</p>
          </div>

          <div style={{ padding: '40px 30px', background: '#f8f9fa', borderRadius: '12px', border: '1px solid #e9ecef' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '20px' }}>📎</div>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '15px', color: '#212529' }}>External Assurance Workflows</h3>
            <p style={{ color: '#6c757d', lineHeight: '1.6', margin: 0, fontSize: '1.05rem' }}>Ensure 100% audit readiness. Our platform mandates physical evidence uploads backed by a strict Admin Approval queue.</p>
          </div>

          <div style={{ padding: '40px 30px', background: '#f8f9fa', borderRadius: '12px', border: '1px solid #e9ecef' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '20px' }}>⚡</div>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '15px', color: '#212529' }}>Smart Bulk Ingestion</h3>
            <p style={{ color: '#6c757d', lineHeight: '1.6', margin: 0, fontSize: '1.05rem' }}>Upload years of legacy spreadsheet data using our fuzzy-matching CSV unpacker to populate your corporate ledger in seconds.</p>
          </div>

          <div style={{ padding: '40px 30px', background: '#f8f9fa', borderRadius: '12px', border: '1px solid #e9ecef' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '20px' }}>🌍</div>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '15px', color: '#212529' }}>UN SDG Alignment</h3>
            <p style={{ color: '#6c757d', lineHeight: '1.6', margin: 0, fontSize: '1.05rem' }}>Automatically map your localized operations directly to global UN Sustainable Development Goals for international investor reporting.</p>
          </div>

          <div style={{ padding: '40px 30px', background: '#f8f9fa', borderRadius: '12px', border: '1px solid #e9ecef' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '20px' }}>🏢</div>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '15px', color: '#212529' }}>Multi-Tenant Architecture</h3>
            <p style={{ color: '#6c757d', lineHeight: '1.6', margin: 0, fontSize: '1.05rem' }}>Bank-grade database separation ensures subsidiary and aggregate data remains completely secure and distinct under one umbrella.</p>
          </div>

        </div>
      </section>

      {/* --- CALL TO ACTION --- */}
      <section style={{ background: '#198754', color: 'white', textAlign: 'center', padding: '100px 5%' }}>
        <h2 style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: '900', margin: '0 0 20px 0', letterSpacing: '-0.5px' }}>Ready to digitize your compliance?</h2>
        <p style={{ fontSize: '1.25rem', opacity: '0.9', marginBottom: '40px', maxWidth: '650px', margin: '0 auto 40px auto', lineHeight: '1.6' }}>
          Join leading corporations standardizing their environmental and social reporting on ESG Radar.
        </p>
        <button 
          onClick={() => navigate('/login')}
          style={{ border: 'none', cursor: 'pointer', background: 'white', color: '#198754', fontWeight: 'bold', padding: '16px 45px', borderRadius: '8px', fontSize: '1.15rem', boxShadow: '0 6px 12px rgba(0,0,0,0.15)', transition: 'transform 0.2s' }}
        >
          Create Corporate Account
        </button>
      </section>

      {/* --- FOOTER --- */}
      <footer style={{ background: '#212529', color: '#adb5bd', padding: '60px 5% 40px 5%' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'white' }}>ESG Radar</span>
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