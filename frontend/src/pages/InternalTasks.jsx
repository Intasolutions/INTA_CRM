import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Calendar,
  User,
  Tag,
  ChevronDown,
  LayoutGrid,
  List as ListIcon,
  Flag,
  FileText,
  X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const InternalTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('board');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState({ status: '', category: '', priority: '' });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assigned_to: '',
    priority: 'medium',
    category: 'admin',
    due_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const categories = [
    { value: 'finance', label: 'Finance', color: '#10b981' },
    { value: 'hr', label: 'HR', color: '#ec4899' },
    { value: 'ops', label: 'Operations', color: '#3b82f6' },
    { value: 'it', label: 'IT', color: '#6366f1' },
    { value: 'marketing', label: 'Marketing', color: '#f59e0b' },
    { value: 'legal', label: 'Legal', color: '#ef4444' },
    { value: 'admin', label: 'General Admin', color: '#6b7280' },
  ];

  const priorities = [
    { value: 'low', label: 'Low', color: '#10b981' },
    { value: 'medium', label: 'Medium', color: '#3b82f6' },
    { value: 'high', label: 'High', color: '#f59e0b' },
    { value: 'critical', label: 'Critical', color: '#ef4444' },
  ];

  const statuses = [
    { value: 'pending', label: 'Pending', icon: Clock, color: '#64748b' },
    { value: 'ongoing', label: 'Ongoing', icon: AlertCircle, color: '#3b82f6' },
    { value: 'completed', label: 'Completed', icon: CheckCircle2, color: '#10b981' },
    { value: 'overdue', label: 'Overdue', icon: Flag, color: '#ef4444' },
  ];

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.status) params.append('status', filter.status);
      if (filter.priority) params.append('priority', filter.priority);
      if (filter.category) params.append('category', filter.category);
      
      const response = await api.get(`internal-tasks/?${params.toString()}`);
      const data = Array.isArray(response.data) ? response.data : (response.data.results || []);
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('users/');
      setUsers(Array.isArray(response.data) ? response.data : (response.data.results || []));
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchUsers();
  }, [filter]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await api.post('internal-tasks/', newTask);
      toast.success('Task created successfully');
      setIsModalOpen(false);
      setNewTask({
        title: '', description: '', assigned_to: '', priority: 'medium', category: 'admin',
        due_date: new Date().toISOString().split('T')[0]
      });
      fetchTasks();
    } catch (error) {
      toast.error('Failed to create task');
    }
  };

  const updateStatus = async (taskId, newStatus) => {
    try {
      await api.patch(`internal-tasks/${taskId}/`, { status: newStatus });
      toast.success('Status updated');
      fetchTasks();
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(prev => ({ ...prev, status: newStatus }));
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleDragStart = (e, taskId) => {
    if (isMobile) return;
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDrop = async (e, targetStatus) => {
    if (isMobile) return;
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) updateStatus(taskId, targetStatus);
  };

  const handleSaveNotes = async (taskId, notes) => {
    try {
      await api.patch(`internal-tasks/${taskId}/`, { notes });
      toast.success('Notes saved');
      fetchTasks();
      setIsDetailModalOpen(false);
    } catch (err) {
      toast.error('Failed to save notes');
    }
  };

  const renderStatusBoard = () => (
    <div style={{ 
      display: 'flex', 
      flexDirection: isMobile ? 'column' : 'row',
      gap: '24px', 
      overflowX: isMobile ? 'hidden' : 'auto', 
      padding: '10px 0' 
    }}>
      {statuses.map(s => (
        <div 
          key={s.value} 
          onDragOver={e => e.preventDefault()}
          onDrop={e => handleDrop(e, s.value)}
          style={{ 
            background: 'var(--bg-secondary)', 
            borderRadius: '16px', 
            padding: '20px', 
            width: isMobile ? '100%' : '320px', 
            minHeight: isMobile ? 'auto' : '600px', 
            border: '1px solid var(--border-color)',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <s.icon size={18} color={s.color} />
              <h3 style={{ fontSize: '15px', fontWeight: '700' }}>{s.label}</h3>
              <span style={{ fontSize: '11px', padding: '2px 8px', background: 'var(--bg-tertiary)', borderRadius: '12px' }}>
                {tasks.filter(t => (t.status || 'pending') === s.value).length}
              </span>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {tasks.filter(t => (t.status || 'pending') === s.value).map(task => {
              const categoryData = categories.find(c => c.value === task.category) || categories[categories.length - 1];
              const priorityData = priorities.find(p => p.value === task.priority) || priorities[0];
              return (
                <motion.div
                  key={task.id}
                  layoutId={isMobile ? undefined : `task-${task.id}`}
                  draggable={!isMobile}
                  onDragStart={e => handleDragStart(e, task.id)}
                  onClick={() => { setSelectedTask(task); setIsDetailModalOpen(true); }}
                  style={{ 
                    padding: '16px', background: 'white', borderRadius: '14px', border: '1px solid var(--border-color)', 
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)', cursor: isMobile ? 'pointer' : 'grab'
                  }}
                  whileHover={{ y: -4, boxShadow: '0 12px 24px rgba(0,0,0,0.06)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', padding: '2px 6px', borderRadius: '4px', background: `${categoryData.color}12`, color: categoryData.color }}>
                      {categoryData.label}
                    </span>
                    <Flag size={14} color={priorityData.color} fill={priorityData.color} />
                  </div>
                  <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '6px' }}>{task.title}</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {task.description || 'No description'}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      <Clock size={12} /> {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}
                    </div>
                    <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: 'var(--brand-blue)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold' }}>
                      {task.assigned_to_name ? task.assigned_to_name.charAt(0).toUpperCase() : '?'}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ padding: isMobile ? '20px' : '40px', maxWidth: '1600px', margin: '0 auto' }}>
      <div style={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between', 
        alignItems: isMobile ? 'flex-start' : 'center', 
        marginBottom: '40px',
        gap: '20px'
      }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '28px' : '32px', fontWeight: '800', color: 'var(--brand-blue)' }}>Team Operations</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Manage internal tasks and responsibilities.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)} 
          style={{ 
            width: isMobile ? '100%' : 'auto',
            padding: '12px 24px', 
            background: 'var(--accent-primary)', 
            color: 'white', 
            borderRadius: '12px', 
            fontWeight: '600', 
            border: 'none', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <Plus size={20} /> New Task
        </button>
      </div>

      <div style={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between', 
        alignItems: isMobile ? 'stretch' : 'center', 
        marginBottom: '24px', 
        background: 'var(--bg-secondary)', 
        padding: '16px', 
        borderRadius: '16px',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <select value={filter.category} onChange={e => setFilter({ ...filter, category: e.target.value })} style={{ border: '1px solid var(--border-color)', padding: '6px 12px', borderRadius: '8px', background: 'white', fontWeight: '600', fontSize: '13px' }}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select value={filter.priority} onChange={e => setFilter({ ...filter, priority: e.target.value })} style={{ border: '1px solid var(--border-color)', padding: '6px 12px', borderRadius: '8px', background: 'white', fontWeight: '600', fontSize: '13px' }}>
            <option value="">All Priorities</option>
            {priorities.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        {!isMobile && (
          <div style={{ display: 'flex', background: 'var(--bg-tertiary)', padding: '4px', borderRadius: '8px' }}>
            <button onClick={() => setView('board')} style={{ padding: '6px 12px', borderRadius: '6px', background: view === 'board' ? 'white' : 'transparent', border: 'none', cursor: 'pointer', fontSize: '13px' }}>Board</button>
            <button onClick={() => setView('list')} style={{ padding: '6px 12px', borderRadius: '6px', background: view === 'list' ? 'white' : 'transparent', border: 'none', cursor: 'pointer', fontSize: '13px' }}>List</button>
          </div>
        )}
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: '100px' }}>Loading tasks...</div> : renderStatusBoard()}

      <AnimatePresence>
        {isModalOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '20px' }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} style={{ background: 'white', width: '100%', maxWidth: '500px', borderRadius: '24px', padding: isMobile ? '24px' : '32px', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '800' }}>New Operation Task</h2>
                <X size={20} style={{ cursor: 'pointer' }} onClick={() => setIsModalOpen(false)} />
              </div>
              <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-tertiary)' }}>TASK TITLE</label>
                  <input type="text" placeholder="e.g. Monthly Finance Audit" required value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '14px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-tertiary)' }}>DESCRIPTION</label>
                  <textarea placeholder="Add details..." value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', minHeight: '100px', fontSize: '14px' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-tertiary)' }}>ASSIGNEE</label>
                    <select value={newTask.assigned_to} onChange={e => setNewTask({ ...newTask, assigned_to: e.target.value })} required style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '14px' }}>
                      <option value="">Select User</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                    </select>
                  </div>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-tertiary)' }}>DUE DATE</label>
                    <input type="date" value={newTask.due_date} onChange={e => setNewTask({ ...newTask, due_date: e.target.value })} style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '14px' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                  <button type="submit" style={{ flex: 1, padding: '14px', background: 'var(--brand-blue)', color: 'white', borderRadius: '12px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Create Task</button>
                  <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '14px', background: 'var(--bg-tertiary)', borderRadius: '12px', border: 'none', cursor: 'pointer' }}>Cancel</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isDetailModalOpen && selectedTask && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '20px' }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} style={{ background: 'white', width: '100%', maxWidth: '800px', borderRadius: '24px', padding: isMobile ? '24px' : '40px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
              <button onClick={() => setIsDetailModalOpen(false)} style={{ position: 'absolute', top: isMobile ? '16px' : '24px', right: isMobile ? '16px' : '24px', border: 'none', background: 'none', cursor: 'pointer' }}><X size={20} /></button>
              <h2 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: '800', marginBottom: '24px', paddingRight: '40px' }}>{selectedTask.title}</h2>
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '32px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-tertiary)' }}>DESCRIPTION</label>
                  <p style={{ marginBottom: '24px', color: 'var(--text-secondary)', fontSize: '14px', whiteSpace: 'pre-wrap' }}>{selectedTask.description || 'No description provided'}</p>
                  
                  <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-tertiary)' }}>INTERNAL NOTES</label>
                  <textarea 
                    id="task-notes-edit" 
                    defaultValue={selectedTask.notes || ''} 
                    placeholder="Add progress notes..."
                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', minHeight: '120px', marginBottom: '16px', fontSize: '14px' }} 
                  />
                  <button onClick={() => handleSaveNotes(selectedTask.id, document.getElementById('task-notes-edit').value)} style={{ width: '100%', padding: '14px', background: 'var(--brand-blue)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Update Task Notes</button>
                </div>
                <div style={{ width: isMobile ? '100%' : '250px' }}>
                  <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                      <small style={{ color: 'var(--text-tertiary)', fontWeight: '800', display: 'block', marginBottom: '8px' }}>STATUS</small>
                      <select value={selectedTask.status} onChange={e => updateStatus(selectedTask.id, e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'white', fontWeight: '600' }}>
                        {statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <small style={{ color: 'var(--text-tertiary)', fontWeight: '800', display: 'block', marginBottom: '8px' }}>ASSIGNEE</small>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--brand-blue)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                          {selectedTask.assigned_to_name ? selectedTask.assigned_to_name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <span style={{ fontWeight: '700', fontSize: '14px' }}>{selectedTask.assigned_to_name}</span>
                      </div>
                    </div>
                    <div>
                      <small style={{ color: 'var(--text-tertiary)', fontWeight: '800', display: 'block', marginBottom: '8px' }}>DUE DATE</small>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', fontSize: '14px' }}>
                        <Calendar size={16} style={{ color: 'var(--text-secondary)' }} />
                        {selectedTask.due_date ? new Date(selectedTask.due_date).toLocaleDateString() : 'No date'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InternalTasks;
