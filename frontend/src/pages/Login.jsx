import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Eye, EyeOff, ShieldCheck, Users, FileCheck } from 'lucide-react';
// 1. Import the custom hook at the top
import { useAuth } from '../AuthContext';

// FIX: "premium for top companies" polish pass — real typography (Sora for
// headings, Inter for body/data) instead of system-ui, lucide-react icons
// instead of emoji, and one restrained signature touch: a slow radar-sweep
// animation behind the existing decorative circles, tying back to the
// product's own name. Colors are unchanged (still navy #0a192f / green
// #10b981) — this is an execution upgrade, not a rebrand.
//
// REQUIRES: add these two lines inside <head> in public/index.html for the
// fonts to actually load:
// <link rel="preconnect" href="https://fonts.googleapis.com">
// <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@600;700;800&display=swap" rel="stylesheet">
//
// REQUIRES: npm install lucide-react (if not already a dependency)

function Login() {
  const navigate = useNavigate();
  
  // 2. Extract the login function from Context
  const { login } = useAuth();
  
  // Dual-view state management
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  
  const [formData, setFormData] = useState({ email: '', password: '', company_name: '' });
  const [error, setError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setError('');

    // Construct the base API URL from your .env file
    const apiUrl = import.meta.env.VITE_API_URL;

    try {
      if (isRegistering) {
        // --- REGISTRATION FLOW ---
        await axios.post(`${apiUrl}/api/auth/register`, {
          email: formData.email,
          password: formData.password,
          company_name: formData.company_name
        });
        setRegistrationSuccess(true);
      } else {
        // --- LOGIN FLOW ---
        const response = await axios.post(`${apiUrl}/api/auth/login`, {
          email: formData.email,
          password: formData.password
        });
        
        // 3. Use the global login function (pass the user object and the token)
        login(response.data.user, response.data.token);

        navigate('/dashboard');
      }
    } catch (err) {
      console.error("Authentication failed:", err);
      setError(err.response?.data?.error || 'System error. Please verify your connection.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const FONT_HEADING = "'Sora', system-ui, sans-serif";
  const FONT_BODY = "'Inter', system-ui, sans-serif";

  // --- THE SUCCESS SCREEN ---
  if (registrationSuccess) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: FONT_BODY, background: '#f8f9fa' }}>
        <div style={{ background: 'white', padding: '50px', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', maxWidth: '500px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
          <div style={{ width: '64px', height: '64px', margin: '0 auto 20px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: '#ecfdf5' }}>
            <FileCheck size={30} color="#059669" strokeWidth={2} />
          </div>
          <h2 style={{ fontFamily: FONT_HEADING, color: '#0a192f', marginBottom: '15px', fontWeight: '700', fontSize: '1.5rem' }}>Application Received</h2>
          <p style={{ color: '#64748b', lineHeight: '1.6', marginBottom: '35px', fontSize: '1.05rem' }}>
            Thank you for registering <strong>{formData.company_name}</strong>. 
            Your corporate account is currently <strong>pending admin approval</strong> to ensure platform security.
          </p>
          <button 
            onClick={() => {
              setRegistrationSuccess(false);
              setIsRegistering(false);
            }} 
            style={{ fontFamily: FONT_HEADING, background: '#10b981', color: 'white', border: 'none', padding: '14px 24px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', width: '100%', fontSize: '1.05rem' }}
          >
            Return to Login Portal
          </button>
        </div>
      </div>
    );
  }

  // --- THE DUAL-VIEW PORTAL ---
  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: FONT_BODY, background: '#f8f9fa' }}>

      {/* Signature touch: a slow, restrained radar sweep behind the existing
          decorative rings — ties directly to the product name, respects
          prefers-reduced-motion, and is the one deliberate motion moment on
          this screen rather than scattered effects elsewhere. */}
      <style>{`
        @keyframes radarSweep {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .radar-sweep {
          animation: radarSweep 14s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .radar-sweep { animation: none; }
        }
      `}</style>
      
      {/* LEFT SIDE: Classic Corporate Navy Design */}
      <div style={{ flex: 1, background: 'linear-gradient(135deg, #0a192f 0%, #112240 100%)', padding: '60px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-15%', right: '-10%', width: '600px', height: '600px', border: '2px solid rgba(255,255,255,0.03)', borderRadius: '50%' }}></div>
        <div
          className="radar-sweep"
          style={{
            position: 'absolute', top: '-15%', right: '-10%', width: '600px', height: '600px', borderRadius: '50%',
            background: 'conic-gradient(from 0deg, rgba(16,185,129,0.16), transparent 25%, transparent 100%)'
          }}
        ></div>
        <div style={{ position: 'absolute', top: '-5%', right: '-5%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(13,110,253,0.05) 0%, transparent 70%)', borderRadius: '50%' }}></div>
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '50px' }}>
            <span style={{ fontFamily: FONT_HEADING, fontSize: '1.8rem', fontWeight: '800', color: '#10b981', letterSpacing: '-0.5px' }}>ESG Radar</span>
          </div>
          
          <h1 style={{ fontFamily: FONT_HEADING, fontSize: '3.25rem', fontWeight: '800', lineHeight: '1.15', marginBottom: '25px', color: '#ffffff', letterSpacing: '-1px' }}>
            Secure Corporate <br />Compliance Portal.
          </h1>
          <p style={{ fontSize: '1.15rem', color: '#94a3b8', lineHeight: '1.6', maxWidth: '480px', margin: 0 }}>
            Access your cryptographically secured ledger, approve value chain data, and generate auditor-ready disclosures.
          </p>
        </div>

        <div style={{ position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '30px' }}>
          <div style={{ fontSize: '0.9rem', color: '#94a3b8', display: 'flex', gap: '28px', fontWeight: '500' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><ShieldCheck size={16} color="#10b981" strokeWidth={2} /> Bank-Grade Encryption</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Users size={16} color="#10b981" strokeWidth={2} /> Role-Based Access Control</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FileCheck size={16} color="#10b981" strokeWidth={2} /> Audit Trailed</span>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Authentication Form */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
        <div style={{ width: '100%', maxWidth: '420px', background: 'white', padding: '50px', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
          
          <h2 style={{ fontFamily: FONT_HEADING, fontSize: '1.85rem', color: '#0a192f', margin: '0 0 10px 0', fontWeight: '800', letterSpacing: '-0.5px' }}>
            {isRegistering ? 'Register Entity' : 'Executive Login'}
          </h2>
          <p style={{ color: '#64748b', marginBottom: '35px', fontSize: '1rem' }}>
            {isRegistering ? 'Apply for network access.' : 'Enter credentials to access the secure environment.'}
          </p>

          {error && (
            <div style={{ padding: '14px 15px', marginBottom: '25px', background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', borderRadius: '6px', fontSize: '0.95rem', fontWeight: '600' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            
            {isRegistering && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontWeight: '700', fontSize: '0.8rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Company Name</label>
                <input 
                  type="text" 
                  name="company_name" 
                  value={formData.company_name} 
                  onChange={handleChange} 
                  required 
                  placeholder="Acme Corp"
                  style={{ fontFamily: FONT_BODY, padding: '14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1rem', background: '#f8fafc', color: '#0f172a', outline: 'none' }}
                />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontWeight: '700', fontSize: '0.8rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Corporate Email</label>
              <input 
                type="email" 
                name="email" 
                value={formData.email} 
                onChange={handleChange} 
                required 
                placeholder="cso@corporate.com"
                style={{ fontFamily: FONT_BODY, padding: '14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1rem', background: '#f8fafc', color: '#0f172a', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontWeight: '700', fontSize: '0.8rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Password</label>
                {!isRegistering && <span style={{ fontSize: '0.85rem', color: '#3b82f6', cursor: 'pointer', fontWeight: '600' }}>Forgot Protocol?</span>}
              </div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  name="password" 
                  value={formData.password} 
                  onChange={handleChange} 
                  required 
                  placeholder="••••••••••••"
                  style={{ fontFamily: FONT_BODY, padding: '14px', paddingRight: '48px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1rem', background: '#f8fafc', color: '#0f172a', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{ position: 'absolute', right: '14px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, color: '#64748b', display: 'flex' }}
                >
                  {showPassword ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isAuthenticating}
              style={{ fontFamily: FONT_HEADING, background: '#10b981', color: 'white', padding: '16px', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: isAuthenticating ? 'wait' : 'pointer', fontSize: '1.05rem', marginTop: '15px' }}
            >
              {isAuthenticating ? 'Processing...' : (isRegistering ? 'Submit Application' : 'Initialize Secure Session')}
            </button>
          </form>

          <div style={{ marginTop: '35px', textAlign: 'center', fontSize: '0.95rem', color: '#64748b' }}>
            {isRegistering ? 'Already provisioned?' : 'System requires a provisioned account.'} <br />
            <button 
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
              }}
              style={{ fontFamily: FONT_HEADING, background: 'none', border: 'none', color: '#3b82f6', fontWeight: '700', cursor: 'pointer', marginTop: '8px', fontSize: '0.95rem' }}
            >
              {isRegistering ? 'Return to Login' : 'Request Admin Access'}
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}

export default Login;
