import { useState, useEffect } from 'react';
import axios from 'axios';

function Organizations() {
  const [organizations, setOrganizations] = useState([]);
  const [error, setError] = useState(null);
  
  // State for the new organization form
  const [formData, setFormData] = useState({
    name: '',
    unit_type: 'Facility',
    jurisdiction: ''
  });

  // Fetch data on load
  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = () => {
    axios.get('/api/organizations')
      .then(response => setOrganizations(response.data))
      .catch(err => {
        console.error("Connection error:", err);
        setError("Could not connect to backend.");
      });
  };

  // Handle form input changes
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Submit new organization
  const handleSubmit = (e) => {
    e.preventDefault();
    axios.post('/api/organizations', formData)
      .then(response => {
        // Clear the form and refresh the list
        setFormData({ name: '', unit_type: 'Facility', jurisdiction: '' });
        fetchOrganizations(); 
      })
      .catch(err => {
        console.error("Error creating org:", err);
        alert("Failed to create organization.");
      });
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px', fontFamily: 'system-ui, sans-serif' }}>
      <h1>ESG Compliance Platform</h1>
      
      {/* --- ADD ORGANIZATION FORM --- */}
      <div style={{ background: '#e3f2fd', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
        <h2 style={{ marginTop: 0 }}>Add New Organization</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input 
            type="text" 
            name="name" 
            placeholder="Organization Name" 
            value={formData.name} 
            onChange={handleChange} 
            required 
            style={{ padding: '8px', flex: 1 }}
          />
          <select 
            name="unit_type" 
            value={formData.unit_type} 
            onChange={handleChange}
            style={{ padding: '8px' }}
          >
            <option value="HQ">HQ</option>
            <option value="Facility">Facility</option>
            <option value="Supplier">Supplier</option>
          </select>
          <input 
            type="text" 
            name="jurisdiction" 
            placeholder="Jurisdiction (e.g., Ghana)" 
            value={formData.jurisdiction} 
            onChange={handleChange} 
            required 
            style={{ padding: '8px', flex: 1 }}
          />
          <button type="submit" style={{ padding: '8px 16px', background: '#0d6efd', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Save
          </button>
        </form>
      </div>

      {/* --- ORGANIZATION LIST --- */}
      <h2>Connected Organizations</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      
      <div style={{ display: 'grid', gap: '10px' }}>
        {organizations.map((org) => (
          <div key={org.unit_id} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
            <h3 style={{ margin: '0 0 5px 0' }}>{org.name}</h3>
            <p style={{ margin: 0, color: '#555' }}>Type: {org.unit_type} | Jurisdiction: {org.jurisdiction}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Organizations;