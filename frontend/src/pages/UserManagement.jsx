import React, { useState, useEffect } from 'react';
import axios from 'axios';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Tracks which role each pending row's dropdown currently has selected,
  // keyed by user_id, so Approve sends a real, admin-chosen role instead
  // of silently assuming one.
  const [pendingSectorSelections, setPendingSectorSelections] = useState({});
  const userStr = localStorage.getItem('user');
  const currentUserRole = userStr ? JSON.parse(userStr).role : null;
  const isSuperAdmin = currentUserRole === 'Super Admin';

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    password: '',
    role: 'auditor'
  });

  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchDirectoryData();
  }, []);

  const fetchDirectoryData = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const [usersRes, pendingRes, orgsRes] = await Promise.all([
  axios.get(`${apiUrl}/api/users`, config).catch(() => ({ data: [] })),
  isSuperAdmin
    ? axios.get(`${apiUrl}/api/admin/pending`, config).catch(() => ({ data: [] }))
    : Promise.resolve({ data: [] }),
  axios.get(`${apiUrl}/api/organizations`, config).catch(() => ({ data: [] }))
]);

      setUsers(usersRes.data);
      setPendingUsers(pendingRes.data);
      setOrganizations(orgsRes.data);
      setLoading(false);

    } catch (err) {
      console.error("Error fetching directory data:", err);
      setError("Failed to load user data. Ensure you have Admin privileges.");
      setLoading(false);
    }
  };

  const handleApprove = async (userId) => {
    const chosenRole = pendingRoleSelections[userId] || 'Data Entry';
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${apiUrl}/api/admin/approve/${userId}`,
        { role: chosenRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const approvedUser = pendingUsers.find(u => u.user_id === userId);
      setPendingUsers(pendingUsers.filter(user => user.user_id !== userId));

      if (approvedUser) {
        // Reflect the role the backend actually confirmed, not an assumption
        setUsers([...users, { ...approvedUser, role: response.data.user?.role || chosenRole, organization_name: approvedUser.company_name }]);
      }
      showSuccess(`✅ Account approved as ${chosenRole}.`);
    } catch (err) {
      console.error("Approval Error:", err);
      setError(err.response?.data?.error || "Failed to approve account. Check server connection.");
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${apiUrl}/api/users/${userId}/role`, { role: newRole }, { headers: { Authorization: `Bearer ${token}` } });

      setUsers(users.map(user => user.user_id === userId ? { ...user, role: newRole } : user));
      showSuccess("🔒 Security role successfully updated.");
    } catch (err) {
      console.error("Role Update Error:", err);
      setError("Failed to update security role.");
    }
  };

  const handleSuspend = async (userId) => {
    if (!window.confirm("Are you sure you want to suspend this user? They will immediately lose platform access.")) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${apiUrl}/api/users/${userId}`, { headers: { Authorization: `Bearer ${token}` } });

      setUsers(users.filter(user => user.user_id !== userId));
      showSuccess("🚫 User access has been revoked.");
    } catch (err) {
      console.error("Suspension Error:", err);
      setError("Failed to suspend user.");
    }
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${apiUrl}/api/users`, inviteForm, { headers: { Authorization: `Bearer ${token}` } });

      const newUser = {
        user_id: response.data.user_id,
        email: inviteForm.email,
        role: inviteForm.role,
        organization_name: 'HQ / Global',
        created_at: new Date().toISOString()
      };

      setUsers([newUser, ...users]);
      setInviteForm({ email: '', password: '', role: 'auditor' });
      setIsModalOpen(false);
      showSuccess(`📧 Provisioned! ${inviteForm.email} can now log in.`);
    } catch (err) {
      console.error("Provisioning Error:", err);
      setError("Failed to provision new account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  if (loading) return <p style={{ fontSize: '1.2rem', color: '#6b7280', textAlign: 'center', marginTop: '50px' }}>Loading platform directory...</p>;

  return (
    <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', padding: '40px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', margin: '0 0 8px 0', fontWeight: '800', color: '#111827', letterSpacing: '-0.02em' }}>
            Team & Access
          </h1>
          <p style={{ margin: 0, color: '#4b5563', fontSize: '16px' }}>
            Provision accounts, assign security roles, and manage third-party auditor access.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          style={{ backgroundColor: '#111827', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
        >
          <span style={{ fontSize: '18px' }}>+</span> Provision Account
        </button>
      </div>

      {error && <div style={{ padding: '16px', marginBottom: '24px', borderRadius: '8px', background: '#fee2e2', border: '1px solid #f87171', color: '#991b1b', fontWeight: '600' }}>{error}</div>}
      {successMsg && <div style={{ padding: '16px', marginBottom: '24px', borderRadius: '8px', background: '#ecfdf5', border: '1px solid #6ee7b7', color: '#065f46', fontWeight: '600' }}>{successMsg}</div>}

      {/* PENDING APPROVAL QUEUE */}
      {pendingUsers.length > 0 && (
        <div style={{ marginBottom: '40px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #fde68a', overflowX: 'auto', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ background: '#fffbeb', padding: '20px', borderBottom: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <h2 style={{ margin: 0, fontSize: '16px', color: '#92400e', fontWeight: '700' }}>Action Required: Pending Registrations</h2>
          </div>

          <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr>
                <th style={{...thStyle, color: '#92400e'}}>Company / Email</th>
                <th style={{...thStyle, color: '#92400e'}}>Date Applied</th>
                <th style={{...thStyle, color: '#92400e', textAlign: 'right'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingUsers.map((user) => (
                <tr key={user.user_id} style={{ borderBottom: '1px solid #fde68a' }}>
                  <td style={{ padding: '20px' }}>
                    <div style={{ fontWeight: '700', color: '#111827', fontSize: '15px' }}>{user.company_name}</div>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>{user.email}</div>
                  </td>
                  <td style={{ padding: '20px', color: '#4b5563', fontSize: '14px', fontWeight: '500' }}>
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '20px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <select
                        value={pendingRoleSelections[user.user_id] || 'Data Entry'}
                        onChange={(e) => setPendingRoleSelections({ ...pendingRoleSelections, [user.user_id]: e.target.value })}
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontWeight: '600', fontSize: '13px' }}
                      >
                        <option value="Data Entry">Data Entry</option>
                        <option value="Manager">Manager</option>
                        <option value="Admin">Admin</option>
                        <option value="auditor">Auditor</option>
                      </select>
                      <button
                        onClick={() => handleApprove(user.user_id)}
                        style={{ background: '#10b981', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                      >
                        ✅ Approve
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ACTIVE USER DIRECTORY */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflowX: 'auto', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
            <tr>
              <th style={thStyle}>User Profile</th>
              <th style={thStyle}>Facility Mapping</th>
              <th style={thStyle}>Platform Role</th>
              <th style={{...thStyle, textAlign: 'right'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.user_id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '20px' }}>
                  <div style={{ fontWeight: '700', color: '#111827', fontSize: '15px' }}>{user.email}</div>
                  <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Joined: {new Date(user.created_at).toLocaleDateString()}</div>
                </td>
                <td style={{ padding: '20px', color: '#4b5563', fontWeight: '500', fontSize: '14px' }}>
                  {user.organization_name || 'Global HQ'}
                </td>
                <td style={{ padding: '20px' }}>
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.user_id, e.target.value)}
                    style={{
                      padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '13px', width: '160px', outline: 'none',
                      border: `1px solid ${user.role === 'Admin' ? '#fca5a5' : user.role === 'Manager' ? '#c4b5fd' : user.role === 'auditor' ? '#6ee7b7' : '#93c5fd'}`,
                      color: user.role === 'Admin' ? '#991b1b' : user.role === 'Manager' ? '#5b21b6' : user.role === 'auditor' ? '#065f46' : '#1e40af',
                      background: user.role === 'Admin' ? '#fef2f2' : user.role === 'Manager' ? '#f5f3ff' : user.role === 'auditor' ? '#ecfdf5' : '#eff6ff'
                    }}
                  >
                    <option value="Data Entry">Data Entry</option>
                    <option value="Manager">Manager</option>
                    <option value="Admin">Admin</option>
                    <option value="auditor">Auditor (Read-Only)</option>
                  </select>
                </td>
                <td style={{ padding: '20px', textAlign: 'right' }}>
                  <button
                    onClick={() => handleSuspend(user.user_id)}
                    style={{ background: 'transparent', color: '#dc2626', border: '1px solid #fca5a5', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: '0.2s' }}
                    onMouseOver={(e) => { e.target.style.background = '#fef2f2'; }}
                    onMouseOut={(e) => { e.target.style.background = 'transparent'; }}
                  >
                    Suspend
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>No users found in directory.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Invite User Modal Overlay */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(17, 24, 39, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999 }}>
          <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '16px', width: '100%', maxWidth: '450px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '22px', color: '#111827', fontWeight: '800' }}>Provision Account</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '28px', color: '#9ca3af', cursor: 'pointer', lineHeight: '1' }}>&times;</button>
            </div>

            <form onSubmit={handleInviteSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={labelStyle}>User Email</label>
                <input
                  type="email" required placeholder="auditor@kpmg.com"
                  value={inviteForm.email} onChange={(e) => setInviteForm({...inviteForm, email: e.target.value})}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Temporary Password</label>
                <input
                  type="text" required placeholder="Provide securely to user"
                  value={inviteForm.password} onChange={(e) => setInviteForm({...inviteForm, password: e.target.value})}
                  style={inputStyle}
                />
                <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#6b7280' }}>User will log in using this password.</p>
              </div>

              <div>
                <label style={labelStyle}>Platform Security Role</label>
                <select
                  value={inviteForm.role} onChange={(e) => setInviteForm({...inviteForm, role: e.target.value})}
                  style={inputStyle}
                >
                  <option value="Data Entry">Data Entry (Submit Only)</option>
                  <option value="Manager">Manager (Submit & Approve)</option>
                  <option value="Admin">Admin (Full System Access)</option>
                  <option value="auditor">Auditor (Strict Read-Only Ledger)</option>
                </select>
              </div>

              <div style={{ marginTop: '12px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '12px 20px', border: '1px solid #d1d5db', backgroundColor: 'white', color: '#374151', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                <button type="submit" disabled={isSubmitting} style={{ padding: '12px 20px', border: 'none', backgroundColor: '#111827', color: 'white', borderRadius: '8px', cursor: isSubmitting ? 'wait' : 'pointer', fontWeight: '600' }}>
                  {isSubmitting ? 'Provisioning...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// Reusable Styles
const thStyle = { padding: '16px 20px', color: '#6b7280', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' };
const labelStyle = { display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '700', color: '#374151' };
const inputStyle = { width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '15px', backgroundColor: '#f9fafb', boxSizing: 'border-box', outline: 'none' };

export default UserManagement;
