import React, { useState, useEffect } from 'react';
import axios from 'axios';

function EntityManagement() {
    const [entities, setEntities] = useState([]);
    const [rawEntities, setRawEntities] = useState([]); // Keeps a flat list for dropdowns
    const [loading, setLoading] = useState(true);
    const [boundary, setBoundary] = useState('Operational Control');

    // UI state for Adding
    const [isAdding, setIsAdding] = useState(false);
    const [newEntity, setNewEntity] = useState({
        name: '', parent_unit_id: '', unit_type: 'Facility', equity_share_percentage: 100, has_operational_control: true
    });

    // --- NEW: UI state for Editing ---
    const [editingEntity, setEditingEntity] = useState(null);

    useEffect(() => {
        fetchEntities();
    }, []);

    const fetchEntities = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/organizations', {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setRawEntities(response.data);
            const tree = buildEntityTree(response.data);
            setEntities(tree);
            setLoading(false);
        } catch (err) {
            console.error("Failed to load entities", err);
            setLoading(false);
        }
    };

    const buildEntityTree = (flatData) => {
        let tree = [];
        let mappedArr = {};

        flatData.forEach(item => {
            mappedArr[item.unit_id] = { ...item, children: [] };
        });

        for (let id in mappedArr) {
            if (mappedArr[id].parent_unit_id) {
                if (mappedArr[mappedArr[id].parent_unit_id]) {
                    mappedArr[mappedArr[id].parent_unit_id].children.push(mappedArr[id]);
                }
            } else {
                tree.push(mappedArr[id]);
            }
        }
        return tree;
    };

    const handleAddEntity = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/organizations', newEntity, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsAdding(false);
            setNewEntity({ name: '', parent_unit_id: '', unit_type: 'Facility', equity_share_percentage: 100, has_operational_control: true });
            fetchEntities();
        } catch (err) {
            alert("Failed to create entity.");
        }
    };

    // --- NEW: Submit the Edits to the Backend ---
    const handleUpdateEntity = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.put(`/api/organizations/${editingEntity.unit_id}`, editingEntity, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEditingEntity(null); // Close the edit panel
            fetchEntities(); // Refresh the tree
        } catch (err) {
            console.error(err);
            alert("Failed to update entity.");
        }
    };

    const TreeNode = ({ node, level = 0 }) => (
        <div style={{ paddingLeft: level === 0 ? '0px' : '32px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: level === 0 ? '#111827' : 'white', color: level === 0 ? 'white' : '#111827', padding: '16px', borderRadius: '8px', border: level === 0 ? 'none' : '1px solid #e5e7eb', boxShadow: level === 0 ? '0 4px 6px rgba(0,0,0,0.1)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '18px' }}>{level === 0 ? '🏢' : level === 1 ? '🏭' : '📍'}</div>
                    <div>
                        <div style={{ fontWeight: '700', fontSize: '15px' }}>{node.name}</div>
                        <div style={{ fontSize: '12px', color: level === 0 ? '#9ca3af' : '#6b7280', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{node.unit_type || 'Facility'}</div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    {boundary === 'Equity Share' && (
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '11px', color: level === 0 ? '#9ca3af' : '#6b7280', textTransform: 'uppercase' }}>Equity</div>
                            <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#10b981' }}>{node.equity_share_percentage || 100}%</div>
                        </div>
                    )}
                    {boundary === 'Operational Control' && (
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '11px', color: level === 0 ? '#9ca3af' : '#6b7280', textTransform: 'uppercase' }}>Control</div>
                            <div style={{ fontWeight: 'bold', fontSize: '14px', color: node.has_operational_control !== false ? '#10b981' : '#f59e0b' }}>
                                {node.has_operational_control !== false ? 'Yes' : 'No'}
                            </div>
                        </div>
                    )}
                    
                    {/* --- NEW: Button triggers the editing state --- */}
                    <button 
                        onClick={() => {
                            setEditingEntity(node);
                            setIsAdding(false); // Close the 'Add' form if it's open
                        }} 
                        style={{ backgroundColor: 'transparent', color: level === 0 ? 'white' : '#4f46e5', border: `1px solid ${level === 0 ? '#374151' : '#c7d2fe'}`, padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}
                    >
                        Edit
                    </button>
                </div>
            </div>

            {node.children && node.children.length > 0 && (
                <div style={{ borderLeft: '2px solid #e5e7eb', marginLeft: '24px', marginTop: '8px', paddingTop: '8px' }}>
                    {node.children.map(child => <TreeNode key={child.unit_id} node={child} level={level + 1} />)}
                </div>
            )}
        </div>
    );

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '40px', fontFamily: 'system-ui, sans-serif' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '32px', margin: '0 0 8px 0', fontWeight: '800', color: '#111827' }}>Organizational Boundaries</h1>
                    <p style={{ margin: 0, color: '#4b5563', fontSize: '16px' }}>Define how your global entities roll up into the corporate ledger.</p>
                </div>
                <button 
                    onClick={() => {
                        setIsAdding(!isAdding);
                        setEditingEntity(null); // Close the 'Edit' form if it's open
                    }} 
                    style={{ backgroundColor: '#10b981', color: 'white', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                >
                    {isAdding ? 'Cancel' : '+ Add Entity'}
                </button>
            </div>

            {/* Consolidation Method Toggle */}
            <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#111827' }}>Consolidation Approach</h3>
                    <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>Determines which facility emissions are included in your final GHG footprint.</p>
                </div>
                <div style={{ display: 'flex', backgroundColor: '#f3f4f6', padding: '4px', borderRadius: '8px' }}>
                    {['Operational Control', 'Financial Control', 'Equity Share'].map(method => (
                        <button 
                            key={method}
                            onClick={() => setBoundary(method)}
                            style={{ 
                                padding: '8px 16px', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s',
                                backgroundColor: boundary === method ? '#111827' : 'transparent',
                                color: boundary === method ? 'white' : '#6b7280',
                                boxShadow: boundary === method ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                            }}
                        >
                            {method}
                        </button>
                    ))}
                </div>
            </div>

            {/* Add Entity Form */}
            {isAdding && (
                <div style={{ backgroundColor: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #cbd5e1', marginBottom: '32px' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>Define New Entity</h3>
                    <form onSubmit={handleAddEntity} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <label style={labelStyle}>Entity/Facility Name</label>
                            <input type="text" required value={newEntity.name} onChange={e => setNewEntity({...newEntity, name: e.target.value})} style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>Parent Company (Rolls up to)</label>
                            <select value={newEntity.parent_unit_id || ''} onChange={e => setNewEntity({...newEntity, parent_unit_id: e.target.value})} style={inputStyle}>
                                <option value="">-- Set as Root Corporate Entity --</option>
                                {rawEntities.map(e => <option key={e.unit_id} value={e.unit_id}>{e.name}</option>)}
                            </select>
                        </div>
                        
                        {boundary === 'Equity Share' && (
                            <div>
                                <label style={labelStyle}>Equity Share (%)</label>
                                <input type="number" max="100" min="0" required value={newEntity.equity_share_percentage} onChange={e => setNewEntity({...newEntity, equity_share_percentage: e.target.value})} style={inputStyle} />
                            </div>
                        )}
                        
                        {(boundary === 'Operational Control' || boundary === 'Financial Control') && (
                            <div>
                                <label style={labelStyle}>Do you have {boundary.toLowerCase()}?</label>
                                <select value={newEntity.has_operational_control} onChange={e => setNewEntity({...newEntity, has_operational_control: e.target.value === 'true'})} style={inputStyle}>
                                    <option value="true">Yes - Claim 100% of emissions</option>
                                    <option value="false">No - Exclude emissions</option>
                                </select>
                            </div>
                        )}
                        
                        <div style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
                            <button type="submit" style={{ backgroundColor: '#111827', color: 'white', padding: '10px 24px', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                                Save Entity Structure
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* --- NEW: Edit Entity Form --- */}
            {editingEntity && (
                <div style={{ backgroundColor: '#eff6ff', padding: '24px', borderRadius: '12px', border: '1px solid #bfdbfe', marginBottom: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', color: '#1e3a8a' }}>Editing: {editingEntity.name}</h3>
                        <button onClick={() => setEditingEntity(null)} style={{ background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer', fontWeight: 'bold' }}>✕ Close</button>
                    </div>
                    <form onSubmit={handleUpdateEntity} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <label style={labelStyle}>Entity/Facility Name</label>
                            <input type="text" required value={editingEntity.name} onChange={e => setEditingEntity({...editingEntity, name: e.target.value})} style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>Parent Company (Rolls up to)</label>
                            <select value={editingEntity.parent_unit_id || ''} onChange={e => setEditingEntity({...editingEntity, parent_unit_id: e.target.value})} style={inputStyle}>
                                <option value="">-- Set as Root Corporate Entity --</option>
                                {/* Prevent an entity from selecting itself as a parent! */}
                                {rawEntities.filter(e => e.unit_id !== editingEntity.unit_id).map(e => (
                                    <option key={e.unit_id} value={e.unit_id}>{e.name}</option>
                                ))}
                            </select>
                        </div>
                        
                        {boundary === 'Equity Share' && (
                            <div>
                                <label style={labelStyle}>Equity Share (%)</label>
                                <input type="number" max="100" min="0" required value={editingEntity.equity_share_percentage || 100} onChange={e => setEditingEntity({...editingEntity, equity_share_percentage: e.target.value})} style={inputStyle} />
                            </div>
                        )}
                        
                        {(boundary === 'Operational Control' || boundary === 'Financial Control') && (
                            <div>
                                <label style={labelStyle}>Do you have {boundary.toLowerCase()}?</label>
                                <select value={editingEntity.has_operational_control} onChange={e => setEditingEntity({...editingEntity, has_operational_control: e.target.value === 'true'})} style={inputStyle}>
                                    <option value="true">Yes - Claim 100% of emissions</option>
                                    <option value="false">No - Exclude emissions</option>
                                </select>
                            </div>
                        )}
                        
                        <div style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
                            <button type="submit" style={{ backgroundColor: '#4f46e5', color: 'white', padding: '10px 24px', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Hierarchical Tree Render */}
            <div>
                <h3 style={{ marginBottom: '16px', color: '#111827', fontSize: '18px' }}>Corporate Structure</h3>
                {loading ? (
                    <div style={{ textAlign: 'center', color: '#6b7280', padding: '40px' }}>Loading hierarchy...</div>
                ) : entities.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#6b7280', padding: '40px', backgroundColor: 'white', borderRadius: '8px', border: '1px dashed #d1d5db' }}>No entities defined yet.</div>
                ) : (
                    entities.map(rootNode => <TreeNode key={rootNode.unit_id} node={rootNode} />)
                )}
            </div>

        </div>
    );
}

const labelStyle = { display: 'block', fontSize: '12px', fontWeight: '700', color: '#4b5563', marginBottom: '6px', textTransform: 'uppercase' };
const inputStyle = { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' };

export default EntityManagement;