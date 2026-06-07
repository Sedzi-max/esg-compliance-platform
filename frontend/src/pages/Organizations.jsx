import { useState, useEffect } from 'react';
import axios from 'axios';

function Organizations() {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', type: '' });
  
  const [formData, setFormData] = useState({
    name: '',
    unit_type: 'Facility',
    jurisdiction: ''
  });

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/organizations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrganizations(res.data);
    } catch (err) {
      console.error("Failed to load organizations");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback({ message: '', type: '' });

    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/organizations', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Flash success message
      setFeedback({ message: 'Organization successfully added!', type: 'success' });
      
      // Clear the form
      setFormData({ name: '', unit_type: 'Facility', jurisdiction: '' });
      
      // Refresh the list
      fetchOrganizations();

      // Clear the success message after 3 seconds
      setTimeout(() => setFeedback({ message: '', type: '' }), 3000);
    } catch (err) {
      setFeedback({ message: 'Failed to add organization. Please try again.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <p style={{ textAlign: 'center', marginTop: '50px' }}>Loading organizations...</p>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '30px' }}>Manage Organizations</h1>

      {feedback.message && (
        <div style={{ 
          padding: '15px', 
          marginBottom: '20px', 
          borderRadius: '4px', 
          background: feedback.type === 'success' ? '#d1e7dd' : '#f8d7da',
          color: feedback.type === 'success' ? '#0f5132' : '#842029',
          fontWeight: 'bold'
        }}>
          {feedback.message}
        </div>
      )}

      {/* NEW ORGANIZATION FORM */}
      <div style={{ background: '#f8f9fa', padding: '25px', borderRadius: '8px', border: '1px solid #dee2e6', marginBottom: '40px' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.2rem', color: '#495057' }}>Add New Organization</h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Organization Name</label>
            <input 
              type="text" 
              name="name" 
              value={formData.name} 
              onChange={handleChange} 
              required 
              placeholder="e.g. Tema Plant"
              style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} 
            />
          </div>

          <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Facility Type</label>
            <select 
              name="unit_type" 
              value={formData.unit_type} 
              onChange={handleChange} 
              style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="HQ">Headquarters (HQ)</option>
              <option value="Facility">Facility</option>
              <option value="Retail">Retail Store</option>
              <option value="Fleet">Vehicle Fleet</option>
            </select>
          </div>

          <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Jurisdiction</label>
            <input 
              type="text" 
              name="jurisdiction" 
              value={formData.jurisdiction} 
              onChange={handleChange} 
              required 
              placeholder="e.g. Ghana"
              style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} 
            />
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            style={{ 
              padding: '10px 20px', 
              background: isSubmitting ? '#6c757d' : '#0d6efd', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              fontWeight: 'bold', 
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              height: '42px'
            }}
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </form>
      </div>

      {/* CONNECTED ORGANIZATIONS LIST */}
      <h2 style={{ fontSize: '1.2rem', color: '#495057', borderBottom: '2px solid #dee2e6', paddingBottom: '10px' }}>
        Connected Organizations
      </h2>
      
      {organizations.length === 0 ? (
        <p style={{ color: '#666' }}>No organizations found for your company.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
          {organizations.map(org => (
            <div key={org.unit_id} style={{ background: '#fff', border: '1px solid #dee2e6', padding: '15px 20px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div>
                <h3 style={{ margin: '0 0 5px 0', color: '#212529' }}>{org.name}</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#6c757d' }}>
                  Type: {org.unit_type} | Jurisdiction: {org.jurisdiction}
                </p>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#adb5bd' }}>
                ID: {org.unit_id}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Organizations;