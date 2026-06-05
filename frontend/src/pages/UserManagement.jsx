import { useState, useEffect } from 'react';
import axios from 'axios';

function UserManagement() {
  // --- STEP 1: State Declarations ---
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- STEP 2: Fetching the Users ---
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/users');
      setUsers(response.data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Failed to load users. Ensure you have Admin privileges.");
      setLoading(false);
    }
  };

  // --- STEP 3: The Role Update Function ---
  const handleRoleChange = async (userId, newRole) => {
    try {
      // Send the update to PostgreSQL
      await axios.put(`/api/users/${userId}/role`, { role: newRole });
      
      // Instantly update the React state so the UI changes immediately
      setUsers(users.map(user => 
        user.user_id === userId ? { ...user, role: newRole } : user
      ));
    } catch (err) {
      console.error("Error updating role:", err);
      alert(err.response?.data?.error || "Failed to update user role.");
    }
  };

  // --- STEP 4: Building the Interface ---
  if (loading) return <p style={{ fontSize: '1.2rem', color: '#666', textAlign: 'center', marginTop: '50px' }}>Loading user directory...</p>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '40px' }}>
      <h1 style={{ marginBottom: '30px', color: '#212529' }}>User Management</h1>
      
      {error && <p style={{ color: '#dc3545', background: '#f8d7da', padding: '10px', borderRadius: '4px' }}>{error}</p>}

      <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
              <th style={{ padding: '15px', color: '#495057' }}>Email Address</th>
              <th style={{ padding: '15px', color: '#495057' }}>Joined Date</th>
              <th style={{ padding: '15px', color: '#495057' }}>Platform Role</th>
              <th style={{ padding: '15px', color: '#495057', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.user_id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '15px', fontWeight: 'bold', color: '#212529' }}>{user.email}</td>
                <td style={{ padding: '15px', color: '#6c757d', fontSize: '0.9rem' }}>
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td style={{ padding: '15px' }}>
                  <span style={{ 
                    background: user.role === 'Admin' ? '#e8f5e9' : '#e3f2fd',
                    color: user.role === 'Admin' ? '#2e7d32' : '#1565c0',
                    padding: '5px 10px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold'
                  }}>
                    {user.role}
                  </span>
                </td>
                <td style={{ padding: '15px', textAlign: 'right' }}>
                  <select 
                    value={user.role} 
                    onChange={(e) => handleRoleChange(user.user_id, e.target.value)}
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    <option value="Data Entry">Data Entry</option>
                    <option value="Admin">Admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default UserManagement;