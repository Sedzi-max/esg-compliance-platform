import { useNavigate } from 'react-router-dom';
import myLogo from '../assets/logo.png'; // Your ESG Radar logo

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', color: '#212529', background: '#f8f9fa', minHeight: '100vh' }}>
      
      {/* --- NAVIGATION BAR --- */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 50px', background: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <img src={myLogo} alt="ESG Radar" style={{ height: '40px' }} />
          <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#198754' }}>ESG Radar</span>
        </div>
        <div>
          <button 
            onClick={() => navigate('/login')}
            style={{ background: 'transparent', border: 'none', color: '#495057', fontWeight: 'bold', marginRight: '20px', cursor: 'pointer' }}
          >
            Client Login
          </button>
          <button 
            onClick={() => navigate('/login')}
            style={{ background: '#0d6efd', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Request Access
          </button>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <header style={{ textAlign: 'center', padding: '100px 20px 40px 20px', background: 'linear-gradient(135deg, #e8f5e9 0%, #f8f9fa 100%)' }}>
        <span style={{ background: '#d1e7dd', color: '#0f5132', padding: '6px 12px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', display: 'inline-block', marginBottom: '20px' }}>
          GSE Compliance Ready
        </span>
        <h1 style={{ fontSize: '3.5rem', fontWeight: '800', color: '#212529', marginBottom: '20px', maxWidth: '850px', margin: '0 auto', lineHeight: '1.2' }}>
          Automate Your <span style={{ color: '#198754' }}>ESG Reporting</span> & Carbon Accounting.
        </h1>
        <p style={{ fontSize: '1.2rem', color: '#6c757d', maxWidth: '700px', margin: '20px auto 40px auto', lineHeight: '1.6' }}>
          Replace fragmented spreadsheets with a secure, unified digital ledger. Instantly calculate Scope 1-3 emissions, map Double Materiality, and provide auditors with a verified chain of evidence.
        </p>
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginBottom: '20px' }}>
          <button 
            onClick={() => navigate('/login')}
            style={{ background: '#198754', color: 'white', border: 'none', padding: '15px 30px', fontSize: '1.1rem', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(25, 135, 84, 0.2)' }}
          >
            Onboard Your Organization
          </button>
        </div>
      </header>

      {/* --- INTERACTIVE DASHBOARD PREVIEW --- */}
      <section style={{ padding: '0 20px 80px 20px', background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: '1000px', background: 'white', borderRadius: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', border: '1px solid #dee2e6', overflow: 'hidden' }}>
          
          {/* Browser Window Header */}
          <div style={{ background: '#e9ecef', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #dee2e6' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff5f56' }}></div>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ffbd2e' }}></div>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#27c93f' }}></div>
            <div style={{ background: 'white', margin: '0 auto', padding: '4px 40px', borderRadius: '4px', fontSize: '0.75rem', color: '#6c757d', fontFamily: 'monospace', width: '300px', textAlign: 'center', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)' }}>
              app.esgradar.com/dashboard
            </div>
          </div>

          {/* Mock App Interface Layout */}
          <div style={{ display: 'flex', height: '480px', background: '#f8f9fa' }}>
            
            {/* Mock Sidebar */}
            <div style={{ width: '180px', background: '#212529', padding: '20px 15px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ height: '15px', background: '#495057', borderRadius: '4px', width: '70%', marginBottom: '15px' }}></div>
              <div style={{ height: '12px', background: '#198754', borderRadius: '4px', width: '90%' }}></div>
              <div style={{ height: '12px', background: '#495057', borderRadius: '4px', width: '80%' }}></div>
              <div style={{ height: '12px', background: '#495057', borderRadius: '4px', width: '85%' }}></div>
              <div style={{ height: '12px', background: '#495057', borderRadius: '4px', width: '60%', marginTop: '20px' }}></div>
              <div style={{ height: '12px', background: '#495057', borderRadius: '4px', width: '75%' }}></div>
            </div>

            {/* Mock Content Workspace */}
            <div style={{ flex: 1, padding: '30px', display: 'flex', flexDirection: 'column', gap: '25px', overflow: 'hidden', position: 'relative' }}>
              
              {/* Header Blocks */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '40%' }}>
                  <div style={{ height: '20px', background: '#212529', borderRadius: '4px' }}></div>
                  <div style={{ height: '12px', background: '#adb5bd', borderRadius: '4px', width: '60%' }}></div>
                </div>
                <div style={{ height: '30px', background: '#e3f2fd', borderRadius: '4px', width: '120px' }}></div>
              </div>

              {/* Main Content Row: Trajectory Chart Mockup & Stats */}
              <div style={{ display: 'flex', gap: '20px', flex: 1 }}>
                
                {/* Visual Chart Card */}
                <div style={{ flex: 2, background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #dee2e6', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ height: '12px', background: '#ced4da', borderRadius: '4px', width: '40%' }}></div>
                  
                  {/* Stylized SVG Chart lines to look realistic */}
                  <svg viewBox="0 0 100 40" style={{ width: '100%', height: '140px', overflow: 'visible' }}>
                    {/* Target Trajectory Line (Dotted Green) */}
                    <path d="M 0 35 Q 30 25, 60 15 T 100 5" fill="none" stroke="#198754" strokeWidth="1" strokeDasharray="2" />
                    {/* Actual Progress Line (Solid Blue) */}
                    <path d="M 0 35 Q 25 32, 50 22 T 75 14" fill="none" stroke="#0d6efd" strokeWidth="1.5" />
                    {/* Current Progress Node */}
                    <circle cx="75" cy="14" r="2" fill="#0d6efd" />
                  </svg>

                  <div style={{ display: 'flex', gap: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#198754' }}></div>
                      <div style={{ fontSize: '0.65rem', color: '#6c757d' }}>Net-Zero Path</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0d6efd' }}></div>
                      <div style={{ fontSize: '0.65rem', color: '#6c757d' }}>Actual Verified $CO_2e$</div>
                    </div>
                  </div>
                </div>

                {/* KPI Sidebar Cards */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #dee2e6', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ height: '10px', background: '#ced4da', borderRadius: '4px', width: '50%' }}></div>
                    <div style={{ height: '22px', background: '#212529', borderRadius: '4px', width: '80%' }}></div>
                  </div>
                  <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #dee2e6', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ height: '10px', background: '#ced4da', borderRadius: '4px', width: '60%' }}></div>
                    <div style={{ height: '22px', background: '#198754', borderRadius: '4px', width: '40%' }}></div>
                  </div>
                </div>

              </div>

              {/* OVERLAY: Clean Blur Effect to tease the platform premium feel */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '140px', background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.95))', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ background: '#212529', color: 'white', padding: '10px 20px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', cursor: 'pointer' }} onClick={() => navigate('/login')}>
                  🔒 Click to Preview Audit Log Directory
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* --- UPDATED FEATURE GRID (6 Enterprise Capabilities) --- */}
      <section style={{ padding: '80px 50px', background: 'white' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h2 style={{ fontSize: '2.5rem', color: '#212529', marginBottom: '10px', fontWeight: '800' }}>Built for the Modern Audit</h2>
          <p style={{ color: '#6c757d', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>Engineered to handle the complexities of corporate sustainability mandates.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px', maxWidth: '1200px', margin: '0 auto' }}>
          
          {/* Feature 1 */}
          <div style={{ padding: '30px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
            <div style={{ fontSize: '2rem', marginBottom: '15px' }}>☁️</div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '10px' }}>Automated Carbon Engine</h3>
            <p style={{ color: '#6c757d', lineHeight: '1.5', margin: 0 }}>Input raw data (fuel, kWh, flight miles) and our GHG Protocol engine instantly calculates standardized Scope 1, 2, and 3 CO2e metrics.</p>
          </div>

          {/* Feature 2 */}
          <div style={{ padding: '30px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
            <div style={{ fontSize: '2rem', marginBottom: '15px' }}>📊</div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '10px' }}>Double Materiality Matrix</h3>
            <p style={{ color: '#6c757d', lineHeight: '1.5', margin: 0 }}>Deploy sector-specific starter kits to instantly map your operational risks against stakeholder importance and financial business impact.</p>
          </div>

          {/* Feature 3 */}
          <div style={{ padding: '30px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
            <div style={{ fontSize: '2rem', marginBottom: '15px' }}>📎</div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '10px' }}>External Assurance Workflows</h3>
            <p style={{ color: '#6c757d', lineHeight: '1.5', margin: 0 }}>Ensure 100% audit readiness. Our platform mandates physical evidence uploads backed by a strict Admin Approval queue.</p>
          </div>

          {/* Feature 4 */}
          <div style={{ padding: '30px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
            <div style={{ fontSize: '2rem', marginBottom: '15px' }}>⚡</div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '10px' }}>Smart Bulk Ingestion</h3>
            <p style={{ color: '#6c757d', lineHeight: '1.5', margin: 0 }}>Upload years of legacy spreadsheet data using our fuzzy-matching CSV unpacker to populate your corporate ledger in seconds.</p>
          </div>

          {/* Feature 5 */}
          <div style={{ padding: '30px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
            <div style={{ fontSize: '2rem', marginBottom: '15px' }}>🌍</div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '10px' }}>UN SDG Alignment</h3>
            <p style={{ color: '#6c757d', lineHeight: '1.5', margin: 0 }}>Automatically map your localized operations directly to global UN Sustainable Development Goals for international investor reporting.</p>
          </div>

          {/* Feature 6 */}
          <div style={{ padding: '30px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
            <div style={{ fontSize: '2rem', marginBottom: '15px' }}>🏢</div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '10px' }}>Multi-Tenant Architecture</h3>
            <p style={{ color: '#6c757d', lineHeight: '1.5', margin: 0 }}>Bank-grade database separation ensures subsidiary and aggregate data remains completely secure and distinct under one umbrella.</p>
          </div>

        </div>
      </section>

      {/* --- CALL TO ACTION --- */}
      <section style={{ background: '#198754', color: 'white', textAlign: 'center', padding: '80px 20px' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: '800', margin: '0 0 20px 0' }}>Ready to digitize your compliance?</h2>
        <p style={{ fontSize: '1.2rem', opacity: '0.9', marginBottom: '40px', maxWidth: '600px', margin: '0 auto 40px auto' }}>
          Join leading corporations standardizing their environmental and social reporting on ESG Radar.
        </p>
        <button 
          onClick={() => navigate('/register')}
          style={{ border: 'none', cursor: 'pointer', background: 'white', color: '#198754', fontWeight: 'bold', padding: '15px 40px', borderRadius: '6px', fontSize: '1.1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
        >
          Create Corporate Account
        </button>
      </section>

      {/* --- FOOTER --- */}
      <footer style={{ background: '#212529', color: '#adb5bd', padding: '40px 50px', textAlign: 'center' }}>
        <p style={{ margin: 0, fontWeight: 'bold' }}>&copy; {new Date().getFullYear()} Route Radar Limited. All rights reserved.</p>
        <p style={{ margin: '10px 0 0 0', fontSize: '0.85rem' }}>Built for Global and Regional Stock Exchange Compliance.</p>
      </footer>

    </div>
  );
}

export default LandingPage;