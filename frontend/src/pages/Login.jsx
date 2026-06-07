import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import myLogo from '../assets/logo.png';

function Login() {
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', company_name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';

    try {
      const response = await axios.post(endpoint, formData);
      
      // Save token and user data to local storage
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      // Send them to the dashboard!
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8f9fa', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      
      <div style={{ background: 'white', padding: '40px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          {/* BRANDING: Logo inserted here */}
          <img 
            src={myLogo} 
            alt="ESG Platform Logo" 
            style={{ height: '60px', width: 'auto', marginBottom: '15px', borderRadius: '4px' }} 
          />
          <h1 style={{ color: '#212529', margin: '0 0 10px 0' }}>ESG Platform</h1>
          <p style={{ color: '#6c757d', margin: 0 }}>
            {isRegistering ? 'Create your corporate workspace' : 'Log in to your workspace'}
          </p>
        </div>

        {error && <div style={{ background: '#f8d7da', color: '#dc3545', padding: '10px', borderRadius: '4px', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          {isRegistering && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#495057' }}>Company / Organization Name</label>
              <input 
                type="text" 
                name="company_name" 
                required={isRegistering}
                value={formData.company_name} 
                onChange={handleChange} 
                placeholder="e.g. Acme Logistics Corp"
                style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ced4da' }} 
              />
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#495057' }}>Email Address</label>
            <input 
              type="email" 
              name="email" 
              required 
              value={formData.email} 
              onChange={handleChange} 
              placeholder="name@company.com"
              style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ced4da' }} 
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#495057' }}>Password</label>
            <input 
              type="password" 
              name="password" 
              required 
              value={formData.password} 
              onChange={handleChange} 
              placeholder="••••••••"
              style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ced4da' }} 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ marginTop: '10px', background: '#0d6efd', color: 'white', padding: '12px', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Processing...' : (isRegistering ? 'Create Workspace' : 'Sign In')}
          </button>
        </form>

        <div style={{ marginTop: '25px', textAlign: 'center', borderTop: '1px solid #dee2e6', paddingTop: '15px' }}>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#6c757d' }}>
            {isRegistering ? "Already have an account? " : "Don't have an account? "}
            <button 
              onClick={() => { setIsRegistering(!isRegistering); setError(''); }} 
              style={{ background: 'none', border: 'none', color: '#0d6efd', fontWeight: 'bold', cursor: 'pointer', padding: 0 }}
            >
              {isRegistering ? "Log in here" : "Register a new company"}
            </button>
          </p>
        </div>

      </div>
    </div>
  );
}

export default Login;