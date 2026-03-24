import React, { useState, useEffect } from 'react';
import { Play, Plus, Zap, Trash2, Edit3, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import api from '../api/client';
import { toast } from 'react-hot-toast';

const WorkflowSettings = () => {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  const [stages, setStages] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const [formData, setFormData] = useState({
    name: '',
    trigger_type: 'stage_change',
    trigger_value: '',
    action_type: 'update_stage',
    action_data: {},
    is_active: true
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    fetchWorkflows();
    fetchStages();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchWorkflows = async () => {
    try {
      const res = await api.get('workflows/');
      setWorkflows(res.data);
    } catch (err) {
      toast.error('Failed to fetch workflows');
    } finally {
      setLoading(false);
    }
  };

  const fetchStages = async () => {
    try {
      const res = await api.get('stages/');
      setStages(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingWorkflow) {
        await api.put(`workflows/${editingWorkflow.id}/`, formData);
        toast.success('Workflow updated');
      } else {
        await api.post('workflows/', formData);
        toast.success('Workflow created');
      }
      setIsModalOpen(false);
      fetchWorkflows();
      resetForm();
    } catch (err) {
      toast.error('Error saving workflow');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      trigger_type: 'stage_change',
      trigger_value: '',
      action_type: 'update_stage',
      action_data: {},
      is_active: true
    });
    setEditingWorkflow(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this workflow?')) {
      try {
        await api.delete(`workflows/${id}/`);
        toast.success('Workflow deleted');
        fetchWorkflows();
      } catch (err) {
        toast.error('Error deleting workflow');
      }
    }
  };

  const toggleStatus = async (workflow) => {
    try {
      await api.patch(`workflows/${workflow.id}/`, { is_active: !workflow.is_active });
      fetchWorkflows();
    } catch (err) {
      toast.error('Error updating status');
    }
  };

  const renderWorkflowCards = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {workflows.map(wf => (
        <div key={wf.id} className="glass-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={18} color="var(--brand-blue)" />
              <span style={{ fontWeight: '700', fontSize: '15px' }}>{wf.name}</span>
            </div>
            <button 
              onClick={() => toggleStatus(wf)}
              style={{ 
                padding: '4px 10px', 
                borderRadius: '12px', 
                fontSize: '11px', 
                fontWeight: '800',
                background: wf.is_active ? '#dcfce7' : '#f3f4f6',
                color: wf.is_active ? '#166534' : '#6b7280',
                border: 'none'
              }}
            >
              {wf.is_active ? 'ACTIVE' : 'PAUSED'}
            </button>
          </div>
          
          <div style={{ display: 'flex', gap: '20px', marginBottom: '16px', background: 'rgba(30, 58, 138, 0.03)', padding: '10px', borderRadius: '8px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Trigger</div>
              <div style={{ fontSize: '12px', fontWeight: '500' }}>
                 {wf.trigger_type === 'stage_change' ? 'Stage Change' : wf.trigger_type === 'lead_created' ? 'Lead Created' : 'Inactivity'}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Action</div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--brand-blue)' }}>
                 {wf.action_type === 'update_stage' ? 'Update Stage' : wf.action_type === 'create_task' ? 'Create Task' : 'Send Alert'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => { setEditingWorkflow(wf); setFormData(wf); setIsModalOpen(true); }} className="btn-secondary" style={{ flex: 1, padding: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><Edit3 size={14} /> Edit</button>
            <button onClick={() => handleDelete(wf.id)} className="btn-secondary" style={{ color: 'var(--danger)', padding: '8px' }}><Trash2 size={16} /></button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="page-container">
      <header style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', marginBottom: '32px', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '24px' : '28px', marginBottom: '4px' }}>Sales Automation</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Automate repetitive tasks with workflow rules.</p>
        </div>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="btn-primary" 
          style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
        >
          <Plus size={20} /> New Workflow
        </button>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading Automations...</div>
      ) : workflows.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '60px' }}>
          <Zap size={48} style={{ opacity: 0.1, marginBottom: '16px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>No workflows defined yet.</p>
        </div>
      ) : isMobile ? renderWorkflowCards() : (
        <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Workflow Name</th>
                <th>Trigger</th>
                <th>Action</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {workflows.map(wf => (
                <tr key={wf.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Zap size={18} color="var(--brand-blue)" />
                      <span style={{ fontWeight: '600' }}>{wf.name}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '13px' }}>
                      {wf.trigger_type === 'stage_change' ? 'On Stage Change' : wf.trigger_type === 'lead_created' ? 'Lead Created' : 'Inactivity'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '13px', color: 'var(--brand-blue)', fontWeight: '500' }}>
                      {wf.action_type === 'update_stage' ? 'Update Stage' : wf.action_type === 'create_task' ? 'Create Task' : 'Send Alert'}
                    </span>
                  </td>
                  <td>
                    <button 
                      onClick={() => toggleStatus(wf)}
                      style={{ 
                        padding: '4px 12px', 
                        borderRadius: '20px', 
                        fontSize: '12px', 
                        fontWeight: '600',
                        background: wf.is_active ? '#dcfce7' : '#f3f4f6',
                        color: wf.is_active ? '#166534' : '#6b7280',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      {wf.is_active ? 'Active' : 'Paused'}
                    </button>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button onClick={() => { setEditingWorkflow(wf); setFormData(wf); setIsModalOpen(true); }} style={{ padding: '6px', background: 'none', color: 'var(--text-secondary)' }}><Edit3 size={16} /></button>
                      <button onClick={() => handleDelete(wf.id)} style={{ padding: '6px', background: 'none', color: 'var(--danger)' }}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div style={{ 
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', 
          display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', 
          justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' 
        }}>
          <div className="glass-card" style={{ 
            width: isMobile ? '100%' : '500px', 
            padding: isMobile ? '24px 20px 40px' : '32px',
            borderRadius: isMobile ? '24px 24px 0 0' : '16px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px' }}>{editingWorkflow ? 'Edit Workflow' : 'New Workflow'}</h2>
                <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)' }}><Trash2 size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '800', color: 'var(--brand-blue)' }}>WORKFLOW NAME</label>
                <input 
                  type="text" 
                  className="glass-input" 
                  required 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Auto-follow up on New Lead"
                />
              </div>

              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '20px', marginBottom: '20px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '800', color: 'var(--brand-blue)' }}>TRIGGER</label>
                  <select 
                    className="glass-input"
                    value={formData.trigger_type}
                    onChange={e => setFormData({...formData, trigger_type: e.target.value})}
                  >
                    <option value="lead_created">Lead Created</option>
                    <option value="stage_change">Stage Changed</option>
                  </select>
                </div>
                {formData.trigger_type === 'stage_change' && (
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '800', color: 'var(--brand-blue)' }}>TO STAGE</label>
                    <select 
                      className="glass-input"
                      value={formData.trigger_value}
                      onChange={e => setFormData({...formData, trigger_value: e.target.value})}
                    >
                      <option value="">Any Stage</option>
                      {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '24px', padding: '16px', background: 'rgba(30, 58, 138, 0.03)', borderRadius: '12px', border: '1px solid rgba(30, 58, 138, 0.1)' }}>
                <label style={{ display: 'block', marginBottom: '12px', fontSize: '13px', fontWeight: '800', color: 'var(--brand-blue)' }}>AUTOMATED ACTION</label>
                <select 
                  className="glass-input"
                  style={{ marginBottom: '16px' }}
                  value={formData.action_type}
                  onChange={e => setFormData({...formData, action_type: e.target.value})}
                >
                  <option value="update_stage">Update Stage</option>
                  <option value="create_task">Create Task/Reminder</option>
                </select>

                {formData.action_type === 'update_stage' && (
                  <select 
                    className="glass-input"
                    value={formData.action_data.stage_id || ''}
                    onChange={e => setFormData({...formData, action_data: { ...formData.action_data, stage_id: e.target.value }})}
                  >
                    <option value="">Select Target Stage</option>
                    {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                )}

                {formData.action_type === 'create_task' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input 
                      type="text" 
                      className="glass-input" 
                      placeholder="Task Note"
                      value={formData.action_data.note || ''}
                      onChange={e => setFormData({...formData, action_data: { ...formData.action_data, note: e.target.value }})}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Delay:</span>
                        <input 
                        type="number" 
                        className="glass-input" 
                        style={{ width: '80px' }}
                        placeholder="Delay (h)"
                        value={formData.action_data.delay_hours || ''}
                        onChange={e => setFormData({...formData, action_data: { ...formData.action_data, delay_hours: parseInt(e.target.value) }})}
                        />
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>hours</span>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Save Rule</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowSettings;
