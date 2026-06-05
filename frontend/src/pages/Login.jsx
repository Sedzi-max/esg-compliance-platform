import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';

    try {
      const response = await axios.post(`${endpoint}`, { email, password });
      
      // 1. Securely store the JWT token
      localStorage.setItem('token', response.data.token);
      
      // Optional: Store the user data if you want to display their email later
      if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }

      // 2. Force a hard reload to the dashboard so the Axios Interceptor catches the new token
      window.location.href = '/'; 
      
    } catch (err) {
      console.error("Auth Error:", err);
      // Display the exact error message from the Node backend if it exists
      setError(err.response?.data?.error || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa' }}>
      <div style={{ background: 'white', padding: '40px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' }}>
        
        <h1 style={{ marginTop: 0, textAlign: 'center', color: '#212529', marginBottom: '10px' }}>
          ESG Platform
        </h1>
        <h2 style={{ fontSize: '1.2rem', textAlign: 'center', color: '#6c757d', marginBottom: '30px', fontWeight: 'normal' }}>
          {isRegistering ? 'Create an Account' : 'Secure Login'}
        </h2>

        {error && (
          <div style={{ background: '#f8d7da', color: '#dc3545', padding: '10px', borderRadius: '4px', marginBottom: '20px', textAlign: 'center', fontWeight: 'bold' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>Email Address</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ marginTop: '10px', background: '#0d6efd', color: 'white', padding: '12px', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '1rem' }}
          >
            {loading ? 'Processing...' : (isRegistering ? 'Register & Enter' : 'Log In')}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.9rem', color: '#6c757d' }}>
          {isRegistering ? 'Already have an account? ' : 'Need access? '}
          <button 
            onClick={() => { setIsRegistering(!isRegistering); setError(''); }} 
            style={{ background: 'none', border: 'none', color: '#0d6efd', fontWeight: 'bold', cursor: 'pointer', padding: 0 }}
          >
            {isRegistering ? 'Log in here' : 'Register here'}
          </button>
        </p>

      </div>
    </div>
  );
}

export default Login;