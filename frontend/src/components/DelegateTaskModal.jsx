import React, { useState } from 'react';
import axios from 'axios';

function DelegateTaskModal({ isOpen, onClose, defaultTaskName, defaultFacility }) {
  const [isSending, setIsSending] = useState(false);
  const [formData, setFormData] = useState({
    assignee_email: '',
    task_name: defaultTaskName || '',
    facility_name: defaultFacility || '',
    due_date: '',
    custom_message: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDispatchEmail = async (e) => {
    e.preventDefault();
    setIsSending(true);

    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/notify/delegate', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert("📧 Official notification dispatched successfully!");
      onClose(); // Close modal on success
      
    } catch (error) {
      console.error("Dispatch error:", error);
      alert(error.response?.data?.error || "Failed to route email. Check server logs.");
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
      <div style={{ background: '#ffffff', width: '100%', maxWidth: '500px', borderRadius: '8px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
        
        {/* Modal Header */}
        <div style={{ background: '#1e293b', color: 'white', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📤</span> Delegate Compliance Task
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleDispatchEmail} style={{ padding: '24px' }}>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>Assignee Email</label>
            <input 
              type="email" 
              name="assignee_email" 
              placeholder="manager@facility.com" 
              value={formData.assignee_email} 
              onChange={handleInputChange} 
              required 
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} 
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>Requirement / Task Name</label>
            <input 
              type="text" 
              name="task_name" 
              value={formData.task_name} 
              onChange={handleInputChange} 
              required 
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', outline: 'none' }} 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>Facility Context</label>
              <input 
                type="text" 
                name="facility_name" 
                value={formData.facility_name} 
                onChange={handleInputChange} 
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>Due Date</label>
              <input 
                type="date" 
                name="due_date" 
                value={formData.due_date} 
                onChange={handleInputChange} 
                required
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} 
              />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>Custom Note (Optional)</label>
            <textarea 
              name="custom_message" 
              placeholder="Add specific instructions for the assignee..." 
              value={formData.custom_message} 
              onChange={handleInputChange} 
              rows="3" 
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical', outline: 'none' }} 
            />
          </div>

          {/* Modal Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
            <button 
              type="button" 
              onClick={onClose} 
              style={{ padding: '10px 20px', background: 'transparent', color: '#64748b', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSending} 
              style={{ padding: '10px 24px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: isSending ? 'wait' : 'pointer', fontWeight: 'bold', transition: 'background 0.2s' }}
            >
              {isSending ? 'Routing...' : 'Dispatch Alert'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

export default DelegateTaskModal;