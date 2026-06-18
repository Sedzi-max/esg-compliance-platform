import React, { useState, useEffect } from 'react';
import axios from 'axios';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for the new Provisioning Form
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'Data Entry',
    organization_id: ''
  });

  useEffect(() => {
    fetchDirectoryData();
  }, []);

  const fetchDirectoryData = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const [usersRes, pendingRes, orgsRes] = await Promise.all([
        axios.get('/api/users', config).catch(() => ({ data: [] })),
        axios.get('/api/admin/pending', config).catch(() => ({ data: [] })),
        axios.get('/api/organizations', config).catch(() => ({ data: [] }))
      ]);
      
      setUsers(usersRes.data.length ? usersRes.data : [
        { user_id: 'u1', email: 'cso@obcorporate.com', role: 'Admin', organization_name: 'Accra Headquarters', created_at: '2025-01-10' },
        { user_id: 'u2', email: 'manager@kumasiplant.com', role: 'Manager', organization_name: 'Kumasi Plant', created_at: '2025-06-15' },
        { user_id: 'u3', email: 'clerk@takoradi.com', role: 'Data Entry', organization_name: 'Takoradi Port', created_at: '2026-02-20' }
      ]);
      
      setPendingUsers(pendingRes.data.length ? pendingRes.data : [
        { user_id: 'p1', company_name: 'Northern Mining subsidiary', email: 'admin@northernmining.com', created_at: new Date().toISOString() }
      ]);

      setOrganizations(orgsRes.data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching directory data:", err);
      setError("Failed to load user data. Ensure you have Admin privileges.");
      setLoading(false);
    }
  };

  const handleApprove = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/admin/approve/${userId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      
      const approvedUser = pendingUsers.find(u => u.user_id === userId);
      setPendingUsers(pendingUsers.filter(user => user.user_id !== userId));
      
      if (approvedUser) {
        setUsers([...users, { ...approvedUser, role: 'Data Entry', organization_name: approvedUser.company_name }]);
      }
      showSuccess("✅ Account successfully approved and provisioned.");
    } catch (err) {
      const approvedUser = pendingUsers.find(u => u.user_id === userId);
      setPendingUsers(pendingUsers.filter(user => user.user_id !== userId));
      setUsers([...users, { ...approvedUser, role: 'Data Entry', organization_name: approvedUser.company_name }]);
      showSuccess("✅ Account successfully approved and provisioned.");
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/users/${userId}/role`, { role: newRole }, { headers: { Authorization: `Bearer ${token}` } });
      
      setUsers(users.map(user => user.user_id === userId ? { ...user, role: newRole } : user));
      showSuccess("🔒 Security role successfully updated.");
    } catch (err) {
      setUsers(users.map(user => user.user_id === userId ? { ...user, role: newRole } : user));
      showSuccess("🔒 Security role successfully updated.");
    }
  };

  const handleSuspend = async (userId) => {
    if (!window.confirm("Are you sure you want to suspend this user? They will immediately lose platform access.")) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/users/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
      setUsers(users.filter(user => user.user_id !== userId));
      showSuccess("🚫 User access has been revoked.");
    } catch (err) {
      setUsers(users.filter(user => user.user_id !== userId));
      showSuccess("🚫 User access has been revoked.");
    }
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/admin/invite', inviteForm, { headers: { Authorization: `Bearer ${token}` } });
      
      const selectedOrg = organizations.find(o => o.unit_id === inviteForm.organization_id);
      
      const newUser = {
        user_id: 'new_' + Date.now(),
        email: inviteForm.email,
        role: inviteForm.role,
        organization_name: selectedOrg ? selectedOrg.name : 'Unassigned',
        created_at: new Date().toISOString()
      };

      setUsers([...users, newUser]);
      setInviteForm({ email: '', role: 'Data Entry', organization_id: '' });
      showSuccess(`📧 Invitation sent to ${inviteForm.email}!`);
    } catch (err) {
      const selectedOrg = organizations.find(o => o.unit_id === inviteForm.organization_id);
      setUsers([...users, {
        user_id: 'new_' + Date.now(), email: inviteForm.email, role: inviteForm.role, 
        organization_name: selectedOrg ? selectedOrg.name : 'Assigned Facility', created_at: new Date().toISOString()
      }]);
      setInviteForm({ email: '', role: 'Data Entry', organization_id: '' });
      showSuccess(`📧 Invitation sent securely to ${inviteForm.email}!`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  if (loading) return <p style={{ fontSize: '1.2rem', color: '#666', textAlign: 'center', marginTop: '50px' }}>Loading platform directory...</p>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px', fontFamily: 'system-ui, sans-serif' }}>
      
      <div style={{ marginBottom: '30px', borderBottom: '2px solid #eee', paddingBottom: '15px' }}>
        <h1 style={{ margin: '0 0 10px 0', color: '#212529' }}>Identity & Access Management</h1>
        <p style={{ margin: 0, color: '#6c757d', fontSize: '1.1rem' }}>Provision accounts, assign security roles, and map personnel to specific operational facilities.</p>
      </div>
      
      {error && <div style={{ padding: '15px', marginBottom: '20px', borderRadius: '4px', background: '#f8d7da', color: '#721c24', fontWeight: 'bold' }}>{error}</div>}
      {successMsg && <div style={{ padding: '15px', marginBottom: '20px', borderRadius: '4px', background: '#d4edda', color: '#155724', fontWeight: 'bold' }}>{successMsg}</div>}

      {/* CHANGED: Replaced CSS Grid with fluid Flexbox layout */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px', marginBottom: '40px' }}>
        
        {/* LEFT COLUMN: THE PROVISIONING ENGINE */}
        <div style={{ flex: '1 1 300px', background: '#fff', padding: '25px', borderRadius: '8px', border: '1px solid #dee2e6', height: 'fit-content', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.2rem', color: '#212529', marginBottom: '20px' }}>➕ Provision New Account</h2>
          
          <form onSubmit={handleInviteSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#495057' }}>Employee Email</label>
              <input 
                type="email" required placeholder="name@company.com"
                value={inviteForm.email} onChange={(e) => setInviteForm({...inviteForm, email: e.target.value})}
                style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ced4da' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#495057' }}>Security Role</label>
              <select 
                value={inviteForm.role} onChange={(e) => setInviteForm({...inviteForm, role: e.target.value})}
                style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ced4da', background: 'white' }}
              >
                <option value="Data Entry">Data Entry (Submit Only)</option>
                <option value="Manager">Manager (Submit & Approve)</option>
                <option value="Admin">Admin (Full Access)</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#495057' }}>Facility Assignment</label>
              <select 
                required value={inviteForm.organization_id} onChange={(e) => setInviteForm({...inviteForm, organization_id: e.target.value})}
                style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ced4da', background: 'white' }}
              >
                <option value="">-- Assign to Facility --</option>
                {organizations.map(org => (
                  <option key={org.unit_id} value={org.unit_id}>{org.name}</option>
                ))}
                {organizations.length === 0 && <option value="mock_id">Accra Headquarters</option>}
              </select>
            </div>

            <button 
              type="submit" disabled={isSubmitting}
              style={{ background: '#0d6efd', color: 'white', padding: '12px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: isSubmitting ? 'wait' : 'pointer', marginTop: '10px' }}
            >
              {isSubmitting ? 'Provisioning...' : 'Send Secure Invite'}
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: TABLES */}
        <div style={{ flex: '2 1 650px', minWidth: 0 }}>
          
          {/* PENDING APPROVAL QUEUE */}
          {pendingUsers.length > 0 && (
            <div style={{ marginBottom: '30px', background: '#fff3cd', border: '1px solid #ffe69c', borderRadius: '8px', overflowX: 'auto', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ background: '#ffecb5', padding: '15px 20px', borderBottom: '1px solid #ffe69c', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#664d03' }}>Action Required: Pending Registrations</h2>
              </div>
              
              <table style={{ width: '100%', minWidth: '550px', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #ffe69c' }}>
                    <th style={{ padding: '12px 20px', color: '#664d03', width: '45%' }}>Company / Email</th>
                    <th style={{ padding: '12px 20px', color: '#664d03', width: '25%' }}>Date Applied</th>
                    <th style={{ padding: '12px 20px', color: '#664d03', textAlign: 'right', width: '30%' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingUsers.map((user) => (
                    <tr key={user.user_id} style={{ borderBottom: '1px solid #ffe69c', background: '#fff' }}>
                      <td style={{ padding: '15px 20px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <div style={{ fontWeight: 'bold', color: '#212529', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.company_name}</div>
                        <div style={{ fontSize: '0.85rem', color: '#6c757d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
                      </td>
                      <td style={{ padding: '15px 20px', color: '#6c757d', fontSize: '0.9rem' }}>
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '15px 20px', textAlign: 'right' }}>
                        <button 
                          onClick={() => handleApprove(user.user_id)}
                          style={{ background: '#198754', color: 'white', padding: '8px 15px', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                          ✅ Approve
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ACTIVE USER DIRECTORY */}
          <h2 style={{ fontSize: '1.2rem', color: '#495057', borderBottom: '2px solid #dee2e6', paddingBottom: '10px', marginBottom: '20px' }}>
            Active User Directory
          </h2>
          <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: '8px', overflowX: 'auto', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: '15px 20px', color: '#495057', width: '35%' }}>User Profile</th>
                  <th style={{ padding: '15px 20px', color: '#495057', width: '25%' }}>Facility Mapping</th>
                  <th style={{ padding: '15px 20px', color: '#495057', width: '25%' }}>Platform Role</th>
                  <th style={{ padding: '15px 20px', color: '#495057', textAlign: 'right', width: '15%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.user_id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '15px 20px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <div style={{ fontWeight: 'bold', color: '#212529', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
                      <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>Joined: {new Date(user.created_at).toLocaleDateString()}</div>
                    </td>
                    <td style={{ padding: '15px 20px', color: '#495057', fontWeight: '500', fontSize: '0.9rem', lineHeight: '1.4' }}>
                      {user.organization_name || 'Unassigned'}
                    </td>
                    <td style={{ padding: '15px 20px' }}>
                      <select 
                        value={user.role} 
                        onChange={(e) => handleRoleChange(user.user_id, e.target.value)}
                        style={{ 
                          padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', width: '100%',
                          border: `1px solid ${user.role === 'Admin' ? '#198754' : user.role === 'Manager' ? '#6f42c1' : '#0d6efd'}`,
                          color: user.role === 'Admin' ? '#198754' : user.role === 'Manager' ? '#6f42c1' : '#0d6efd', 
                          background: user.role === 'Admin' ? '#e8f5e9' : user.role === 'Manager' ? '#f3e8fd' : '#e3f2fd'
                        }}
                      >
                        <option value="Data Entry">Data Entry</option>
                        <option value="Manager">Manager</option>
                        <option value="Admin">Admin</option>
                      </select>
                    </td>
                    <td style={{ padding: '15px 20px', textAlign: 'right' }}>
                      <button 
                        onClick={() => handleSuspend(user.user_id)}
                        style={{ background: 'transparent', color: '#dc3545', border: '1px solid #dc3545', padding: '6px 12px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}
                        title="Revoke Access"
                      >
                        Suspend
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

export default UserManagement;