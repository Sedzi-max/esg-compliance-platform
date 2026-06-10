import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import myLogo from '../assets/logo.png'; // Assuming you have your logo here

function Login() {
  const navigate = useNavigate();
  
  // Toggles between Login and Register views
  const [isRegistering, setIsRegistering] = useState(false);
  
  // The new state to handle the Pending Approval screen
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  const [formData, setFormData] = useState({
    company_name: '',
    email: '',
    password: ''
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegistering) {
        // --- THE NEW REGISTRATION FLOW ---
        // We do not expect a token here anymore, just a success message.
        await axios.post('/api/auth/register', {
          company_name: formData.company_name,
          email: formData.email,
          password: formData.password
        });
        
        // Trigger the success UI instead of logging them in
        setRegistrationSuccess(true);
      } else {
        // --- THE LOGIN FLOW ---
        const response = await axios.post('/api/auth/login', {
          email: formData.email,
          password: formData.password
        });

        // If successful, save the token and the user payload
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Push them directly into the secure platform
        navigate('/dashboard');
      }
    } catch (err) {
      console.error("Auth Error:", err);
      // Display the specific 403 Forbidden error if they are still pending
      setError(err.response?.data?.error || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // --- UI: THE SUCCESS SCREEN ---
  if (registrationSuccess) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f8f9fa' }}>
        <div style={{ background: '#fff', padding: '40px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxWidth: '500px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '20px' }}>⏳</div>
          <h2 style={{ color: '#212529', marginBottom: '15px' }}>Application Received</h2>
          <p style={{ color: '#495057', lineHeight: '1.6', marginBottom: '30px' }}>
            Thank you for registering <strong>{formData.company_name}</strong>. 
            Your corporate account is currently <strong>pending admin approval</strong> to ensure platform security. 
            You will be notified once your workspace is unlocked.
          </p>
          <button 
            onClick={() => {
              setRegistrationSuccess(false);
              setIsRegistering(false);
            }} 
            style={{ background: '#0d6efd', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  // --- UI: THE STANDARD AUTH FORMS ---
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f8f9fa' }}>
      <div style={{ background: '#fff', padding: '40px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxWidth: '400px', width: '100%' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <img src={myLogo} alt="ESG Platform" style={{ height: '50px', marginBottom: '15px' }} />
          <h2 style={{ margin: 0, color: '#212529' }}>
            {isRegistering ? 'Register Organization' : 'Platform Login'}
          </h2>
        </div>

        {error && (
          <div style={{ background: '#f8d7da', color: '#dc3545', padding: '12px', borderRadius: '4px', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {isRegistering && (
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.85rem' }}>Company Name</label>
              <input 
                type="text" 
                name="company_name" 
                value={formData.company_name} 
                onChange={handleInputChange} 
                required 
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.85rem' }}>Corporate Email</label>
            <input 
              type="email" 
              name="email" 
              value={formData.email} 
              onChange={handleInputChange} 
              required 
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.85rem' }}>Password</label>
            <input 
              type="password" 
              name="password" 
              value={formData.password} 
              onChange={handleInputChange} 
              required 
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              background: '#198754', 
              color: 'white', 
              border: 'none', 
              padding: '12px', 
              borderRadius: '4px', 
              fontWeight: 'bold', 
              cursor: loading ? 'wait' : 'pointer',
              marginTop: '10px'
            }}
          >
            {loading ? 'Processing...' : (isRegistering ? 'Submit Application' : 'Secure Login')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#6c757d' }}>
            {isRegistering ? 'Already have an account?' : 'Need to onboard your company?'}
          </p>
          <button 
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError('');
            }}
            style={{ background: 'none', border: 'none', color: '#0d6efd', fontWeight: 'bold', cursor: 'pointer', marginTop: '5px', textDecoration: 'underline' }}
          >
            {isRegistering ? 'Log in here' : 'Apply for access'}
          </button>
        </div>

      </div>
    </div>
  );
}

export default Login;