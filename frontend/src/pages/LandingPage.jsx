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
        <h1 style={{ fontSize: '3.5rem', fontWeight: '800', color: '#212529', marginBottom: '20px', maxWidth: '800px', margin: '0 auto', lineHeight: '1.2' }}>
          Transform ESG from a Document into an <span style={{ color: '#198754' }}>Execution Engine.</span>
        </h1>
        <p style={{ fontSize: '1.2rem', color: '#6c757d', maxWidth: '600px', margin: '20px auto 40px auto', lineHeight: '1.6' }}>
          The enterprise-grade platform for BRSR assurance, Net-Zero trajectory mapping, and cross-functional compliance. Secure your data. Prove your impact.
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

      {/* --- NEW SECTION: INTERACTIVE DASHBOARD PREVIEW --- */}
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

      {/* --- FEATURE GRID --- */}
      <section style={{ padding: '80px 50px', background: 'white' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h2 style={{ fontSize: '2.5rem', color: '#212529', marginBottom: '10px' }}>Built for Audit-Ready Compliance</h2>
          <p style={{ color: '#6c757d', fontSize: '1.1rem' }}>Engineered to handle the complexities of modern corporate sustainability.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '40px', maxWidth: '1200px', margin: '0 auto' }}>
          
          {/* Feature 1 */}
          <div style={{ padding: '30px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
            <div style={{ fontSize: '2rem', marginBottom: '15px' }}>🛡️</div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '10px' }}>BRSR & Assurance Readiness</h3>
            <p style={{ color: '#6c757d', lineHeight: '1.5' }}>Centralized logs with strict Role-Based Access Control. Every metric is backed by a human-verified audit trail.</p>
          </div>

          {/* Feature 2 */}
          <div style={{ padding: '30px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
            <div style={{ fontSize: '2rem', marginBottom: '15px' }}>📉</div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '10px' }}>Net-Zero Trajectory Mapping</h3>
            <p style={{ color: '#6c757d', lineHeight: '1.5' }}>Automated carbon conversion engines map your raw operational data directly against your corporate reduction targets.</p>
          </div>

          {/* Feature 3 */}
          <div style={{ padding: '30px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
            <div style={{ fontSize: '2rem', marginBottom: '15px' }}>🏢</div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '10px' }}>Multi-Tenant Isolation</h3>
            <p style={{ color: '#6c757d', lineHeight: '1.5' }}>Bank-grade database separation ensures your subsidiary and aggregate data remains completely secure and distinct.</p>
          </div>

        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer style={{ background: '#212529', color: '#adb5bd', padding: '40px 50px', textAlign: 'center' }}>
        <p style={{ margin: 0 }}>&copy; {new Date().getFullYear()} ESG Radar. Enterprise Compliance Systems.</p>
      </footer>

    </div>
  );
}

export default LandingPage;