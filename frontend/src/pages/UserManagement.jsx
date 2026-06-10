import { useState, useEffect } from 'react';
import axios from 'axios';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]); // <-- NEW STATE FOR QUEUE
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch both active users and the pending queue simultaneously
      const [usersRes, pendingRes] = await Promise.all([
        axios.get('/api/users'),
        axios.get('/api/admin/pending')
      ]);
      
      setUsers(usersRes.data);
      setPendingUsers(pendingRes.data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching directory data:", err);
      setError("Failed to load user data. Ensure you have Admin privileges.");
      setLoading(false);
    }
  };

  // --- THE NEW APPROVAL FUNCTION ---
  const handleApprove = async (userId) => {
    try {
      await axios.put(`/api/admin/approve/${userId}`);
      
      // Remove the user from the pending queue UI instantly
      setPendingUsers(pendingUsers.filter(user => user.user_id !== userId));
      
      // Refresh the main directory to show them as an active user
      fetchData(); 
    } catch (err) {
      console.error("Error approving user:", err);
      alert("Failed to approve the account.");
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await axios.put(`/api/users/${userId}/role`, { role: newRole });
      setUsers(users.map(user => 
        user.user_id === userId ? { ...user, role: newRole } : user
      ));
    } catch (err) {
      console.error("Error updating role:", err);
      alert(err.response?.data?.error || "Failed to update user role.");
    }
  };

  if (loading) return <p style={{ fontSize: '1.2rem', color: '#666', textAlign: 'center', marginTop: '50px' }}>Loading platform directory...</p>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '40px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ margin: 0, color: '#212529' }}>Platform Management</h1>
      </div>
      
      {error && <p style={{ color: '#dc3545', background: '#f8d7da', padding: '10px', borderRadius: '4px' }}>{error}</p>}

      {/* ========================================== */}
      {/* PENDING APPROVAL QUEUE (Only shows if there are pending accounts) */}
      {/* ========================================== */}
      {pendingUsers.length > 0 && (
        <div style={{ marginBottom: '40px', background: '#fff3cd', border: '1px solid #ffe69c', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <div style={{ background: '#ffecb5', padding: '15px 20px', borderBottom: '1px solid #ffe69c', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.2rem' }}>⚠️</span>
            <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#664d03' }}>Action Required: Pending Corporate Registrations</h2>
          </div>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #ffe69c' }}>
                <th style={{ padding: '15px', color: '#664d03' }}>Company Name</th>
                <th style={{ padding: '15px', color: '#664d03' }}>Admin Email</th>
                <th style={{ padding: '15px', color: '#664d03' }}>Date Applied</th>
                <th style={{ padding: '15px', color: '#664d03', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingUsers.map((user) => (
                <tr key={user.user_id} style={{ borderBottom: '1px solid #ffe69c', background: '#fff' }}>
                  <td style={{ padding: '15px', fontWeight: 'bold', color: '#212529' }}>{user.company_name}</td>
                  <td style={{ padding: '15px', color: '#495057' }}>{user.email}</td>
                  <td style={{ padding: '15px', color: '#6c757d', fontSize: '0.9rem' }}>
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '15px', textAlign: 'right' }}>
                    <button 
                      onClick={() => handleApprove(user.user_id)}
                      style={{ background: '#198754', color: 'white', padding: '8px 15px', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      ✅ Approve Access
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ========================================== */}
      {/* EXISTING ACTIVE USER DIRECTORY */}
      {/* ========================================== */}
      <h2 style={{ fontSize: '1.2rem', color: '#495057', borderBottom: '2px solid #dee2e6', paddingBottom: '10px', marginBottom: '20px' }}>
        Active User Directory
      </h2>
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
                    padding: '5px 10px', 
                    borderRadius: '20px', 
                    fontWeight: 'bold', 
                    fontSize: '0.85rem',
                    color: user.role === 'Admin' ? '#198754' : user.role === 'Manager' ? '#6f42c1' : '#0d6efd', 
                    background: user.role === 'Admin' ? '#e8f5e9' : user.role === 'Manager' ? '#f3e8fd' : '#e3f2fd'
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
                    <option value="Manager">Manager</option>
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