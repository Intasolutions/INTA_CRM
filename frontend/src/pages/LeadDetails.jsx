import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, Mail, Phone, Building, Calendar, 
  Clock, Plus, MessageSquare, PhoneCall, MailCheck, 
  CheckCircle2, AlertCircle, MoreVertical, Database, 
  FileText, Trash2, Edit3, UserCheck, Search, Filter, MessageCircle,
  TrendingUp, Paperclip, Download, X, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../api/client';

const LeadDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lead, setLead] = useState(null);
  const [activities, setActivities] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [activityType, setActivityType] = useState('call');
  const [showOptions, setShowOptions] = useState(false);
  const [stages, setStages] = useState([]);
  const [updatingStage, setUpdatingStage] = useState(false);
  const [dealValue, setDealValue] = useState('');
  const [isEditingDealValue, setIsEditingDealValue] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('activity'); // 'activity' or 'audit'
  const [uploading, setUploading] = useState(false);
  
  // Reminder State
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderNote, setReminderNote] = useState('');
  const [reminderDate, setReminderDate] = useState('');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [leadRes, actRes, remRes, stageRes, auditRes, docRes] = await Promise.all([
        api.get(`leads/${id}/`),
        api.get(`activities/?lead=${id}`),
        api.get(`reminders/?lead=${id}`),
        api.get('stages/'),
        api.get(`leads/${id}/audit_logs/`),
        api.get(`documents/?lead=${id}`)
      ]);
      setLead(leadRes.data);
      setAuditLogs(auditRes.data);
      setActivities(actRes.data.filter(a => a.lead == id));
      setReminders(remRes.data.filter(r => r.lead == id));
      setStages(stageRes.data);
      setDocuments(docRes.data);
      setDealValue(leadRes.data.deal_value || '0.00');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLeadStage = async (stageId) => {
    setUpdatingStage(true);
    try {
      await api.patch(`leads/${id}/`, { stage: stageId });
      setShowOptions(false);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingStage(false);
    }
  };

  const handleUpdateDealValue = async () => {
    try {
      await api.patch(`leads/${id}/`, { deal_value: dealValue });
      setIsEditingDealValue(false);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const openWhatsApp = async () => {
    const phone = lead.phone?.replace(/\D/g, '');
    if (!phone) return;
    
    // Log Activity
    try {
      await api.post('activities/', {
        lead: id,
        activity_type: 'call',
        note: `Sent a WhatsApp message to ${lead.name}.`
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }

    const text = encodeURIComponent(`Hello ${lead.name}, this is ${user?.username} from INTA CRM. I wanted to follow up with you regarding our recent discussion.`);
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  const handleVoIPCall = async () => {
    const phone = lead.phone?.replace(/\D/g, '');
    if (!phone) return;
    
    // Mock VoIP call notification
    const callingToast = toast.loading(`Initiating VoIP call...`, { 
      style: { background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' } 
    });
    
    // Log Activity
    try {
      await api.post('activities/', {
        lead: id,
        activity_type: 'call',
        note: `Direct VoIP Call initiated to ${lead.name}.`
      });
      
      setTimeout(() => {
        toast.dismiss(callingToast);
        toast.success(`Voice connection established with ${lead.name}`, { icon: '📞' });
        fetchData();
      }, 2000);
      
    } catch (err) {
      console.error(err);
      toast.error('Could not initiate VoIP call.');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('lead', id);
    formData.append('file_name', file.name);
    formData.append('file_size', file.size);

    setUploading(true);
    try {
      await api.post('documents/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (window.confirm('Delete this document?')) {
      try {
        await api.delete(`documents/${docId}/`);
        fetchData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handlePostActivity = async (e) => {
    e.preventDefault();
    if (!note) return;
    try {
      await api.post('activities/', {
        lead: id,
        activity_type: activityType,
        note: note
      });
      setNote('');
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleScheduleReminder = async (e) => {
    e.preventDefault();
    if (!reminderNote || !reminderDate) return;
    try {
      await api.post('reminders/', {
        lead: id,
        note: reminderNote,
        scheduled_at: new Date(reminderDate).toISOString()
      });
      setShowReminderModal(false);
      setReminderNote('');
      setReminderDate('');
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleReminderStatus = async (reminderId, newStatus) => {
    try {
      await api.patch(`reminders/${reminderId}/`, { status: newStatus });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteLead = async () => {
    if (window.confirm("Are you sure you want to delete this lead? This action cannot be undone.")) {
      try {
        await api.delete(`leads/${id}/`);
        navigate('/leads');
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '12px', fontSize: '18px', color: 'var(--brand-blue)' }}><div className="loading-spinner"></div>Loading Lead Details...</div>;
  if (!lead) return <div style={{ padding: '40px', textAlign: 'center' }}><AlertCircle size={48} color="var(--danger)" style={{ marginBottom: '16px', display: 'block', margin: '0 auto' }} /> <h2>Lead not found.</h2> <button onClick={() => navigate('/leads')} className="btn-secondary" style={{ marginTop: '20px' }}>Go back</button></div>;

  return (
    <div className="page-container" style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <div className="page-header-responsive" style={{ marginBottom: '32px' }}>
        <button 
          onClick={() => navigate('/leads')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', padding: '8px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: '600', border: '1px solid var(--border-color)', transition: 'all 0.2s' }}
        >
          <ArrowLeft size={16} /> Back to Leads
        </button>
        
        <div style={{ display: 'flex', gap: '12px', position: 'relative' }}>
          <button 
            className="btn-secondary" 
            onClick={() => setShowOptions(!showOptions)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '12px' }}
          >
            <MoreVertical size={18} /> Options
          </button>
          
          <AnimatePresence>
            {showOptions && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                style={{ 
                  position: 'absolute', 
                  top: '100%', 
                  right: 0, 
                  marginTop: '8px', 
                  background: 'var(--bg-secondary)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '12px', 
                  width: '180px', 
                  boxShadow: '0 10px 30px rgba(0,0,0,0.1)', 
                  zIndex: 100, 
                  overflow: 'hidden' 
                }}
              >
                <div style={{ padding: '8px' }}>
                  <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />
                  <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', padding: '8px 12px', textTransform: 'uppercase', margin: 0 }}>Change Stage</p>
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {stages.map(s => (
                      <button 
                        key={s.id}
                        onClick={() => handleUpdateLeadStage(s.id)}
                        disabled={updatingStage || lead.stage === s.id}
                        style={{ 
                          width: '100%', 
                          textAlign: 'left', 
                          padding: '8px 12px', 
                          background: lead.stage === s.id ? 'var(--bg-tertiary)' : 'none', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '10px', 
                          fontSize: '13px', 
                          color: lead.stage === s.id ? 'var(--brand-blue)' : 'var(--text-primary)',
                          fontWeight: lead.stage === s.id ? '700' : '400',
                          border: 'none',
                          cursor: (updatingStage || lead.stage === s.id) ? 'default' : 'pointer',
                          opacity: updatingStage ? 0.7 : 1
                        }}
                      >
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color || 'var(--brand-blue)' }} />
                        {s.name}
                      </button>
                    ))}
                  </div>
                  <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />
                  <button style={{ width: '100%', border: 'none', textAlign: 'left', padding: '10px 12px', borderRadius: '8px', background: 'none', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                    <Edit3 size={16} /> Edit Details
                  </button>
                  <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />
                  <button 
                    onClick={handleDeleteLead}
                    style={{ width: '100%', border: 'none', textAlign: 'left', padding: '10px 12px', borderRadius: '8px', background: 'none', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'var(--danger)', cursor: 'pointer' }}
                  >
                    <Trash2 size={16} /> Delete Lead
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="lead-details-grid">
        {/* Left Column: Profile */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lead-side-col"
          style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
        >
          <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(to bottom, var(--brand-blue), var(--accent-secondary))', height: '100px', position: 'relative' }}>
              <div style={{ 
                position: 'absolute', 
                bottom: '-40px', 
                left: '24px',
                width: '80px', 
                height: '80px', 
                borderRadius: '50%', 
                background: 'white', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: '32px', 
                fontWeight: '700', 
                color: 'var(--brand-blue)',
                boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                border: '4px solid white'
              }}>
                {lead?.name?.[0]?.toUpperCase() || 'L'}
              </div>
            </div>
            
            <div style={{ padding: '60px 24px 24px' }}>
              <h1 style={{ fontSize: '22px', marginBottom: '4px' }}>{lead.name}</h1>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
                <span style={{ 
                  fontSize: '11px', 
                  fontWeight: '700', 
                  padding: '4px 10px', 
                  borderRadius: '12px', 
                  background: 'rgba(59, 130, 246, 0.1)', 
                  color: 'var(--brand-blue)',
                  letterSpacing: '0.02em'
                }}>
                  {lead.stage_name || 'New Lead'}
                </span>
                <span style={{ 
                  fontSize: '11px', 
                  fontWeight: '700', 
                  padding: '4px 10px', 
                  borderRadius: '12px', 
                  background: lead.lead_score >= 70 ? 'rgba(34, 197, 94, 0.1)' : lead.lead_score >= 40 ? 'rgba(234, 179, 8, 0.1)' : 'rgba(107, 114, 128, 0.1)', 
                  color: lead.lead_score >= 70 ? '#22c55e' : lead.lead_score >= 40 ? '#eab308' : '#6b7280',
                  letterSpacing: '0.02em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  Score: {lead.lead_score || 0}
                </span>
                <span style={{ 
                  fontSize: '11px', 
                  fontWeight: '700', 
                  padding: '4px 10px', 
                  borderRadius: '12px', 
                  background: 'var(--bg-tertiary)', 
                  color: 'var(--text-secondary)'
                }}>
                  {lead.campaign_name || 'Direct Lead'}
                </span>
              </div>

              {lead.ai_status_summary && (
                <div style={{ 
                  margin: '0 0 24px 0', 
                  padding: '16px', 
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(139, 92, 246, 0.08))', 
                  borderRadius: '16px', 
                  border: '1px solid rgba(59, 130, 246, 0.15)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Sparkles size={14} color="var(--brand-blue)" />
                    <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--brand-blue)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Intelligence Digest</span>
                  </div>
                  <p style={{ fontSize: '14px', margin: 0, lineHeight: '1.6', color: 'var(--text-primary)', fontWeight: '500' }}>{lead.ai_status_summary}</p>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
                <h3 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px', letterSpacing: '0.05em' }}>About</h3>
                
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                    <Mail size={16} />
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Email Address</p>
                    <p style={{ fontSize: '14px', fontWeight: '500' }}>{lead.email || '—'}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                    <Phone size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Phone Number</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <p style={{ fontSize: '14px', fontWeight: '500' }}>{lead.phone || '—'}</p>
                      {lead.phone && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            onClick={handleVoIPCall}
                            style={{ background: 'none', border: 'none', color: 'var(--brand-blue)', cursor: 'pointer', padding: '4px', display: 'flex' }}
                            title="Call via VoIP"
                          >
                            <PhoneCall size={16} />
                          </button>
                          <button 
                            onClick={openWhatsApp}
                            style={{ background: 'none', border: 'none', color: '#25D366', cursor: 'pointer', padding: '4px', display: 'flex' }}
                            title="Send WhatsApp Message"
                          >
                            <MessageCircle size={16} fill="#25D366" color="white" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                    <Building size={16} />
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Company</p>
                    <p style={{ fontSize: '14px', fontWeight: '500' }}>{lead.company || '—'}</p>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                    <Calendar size={16} />
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Creation Date</p>
                    <p style={{ fontSize: '14px', fontWeight: '500' }}>{new Date(lead.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-blue)' }}>
                    <TrendingUp size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Deal Value (INR)</p>
                    {isEditingDealValue ? (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <input 
                          type="number" 
                          value={dealValue}
                          onChange={e => setDealValue(e.target.value)}
                          className="glass-input"
                          style={{ padding: '4px 8px', fontSize: '13px', width: '100px' }}
                          autoFocus
                        />
                        <button onClick={handleUpdateDealValue} className="btn-primary" style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '4px' }}>Save</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <p style={{ fontSize: '16px', fontWeight: '700', color: 'var(--brand-blue)' }}>₹{parseFloat(lead.deal_value || 0).toLocaleString('en-IN')}</p>
                        <button onClick={() => setIsEditingDealValue(true)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                          <Edit3 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '20px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={16} color="var(--brand-blue)" /> Custom Information
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {lead.custom_values?.length > 0 ? (
                lead.custom_values.map(val => (
                  <div key={val.id}>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{val.field_label}</p>
                    <p style={{ fontSize: '14px', fontWeight: '500' }}>{val.value}</p>
                  </div>
                ))
              ) : (
                <div style={{ padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '8px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  No custom fields defined.
                </div>
              )}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Paperclip size={16} color="var(--brand-blue)" /> Documents
              </h3>
              <label style={{ cursor: 'pointer', color: 'var(--brand-blue)', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Plus size={14} /> Upload
                <input type="file" hidden onChange={handleFileUpload} disabled={uploading} />
              </label>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {documents.length > 0 ? (
                documents.map(doc => (
                  <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-blue)' }}>
                      <FileText size={16} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: '600', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.file_name}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{(doc.file_size / 1024).toFixed(1)} KB</p>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <a href={doc.file} target="_blank" rel="noreferrer" style={{ color: 'var(--text-secondary)', padding: '4px' }}>
                        <Download size={14} />
                      </a>
                      <button onClick={() => handleDeleteDocument(doc.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', padding: '4px', cursor: 'pointer' }}>
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '8px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  No documents uploaded.
                </div>
              )}
            </div>
          </div>
        </motion.div>    
        {/* Activity Timeline Column */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lead-main-col"
          style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
        >
          <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} color="var(--brand-blue)" /> Activity Composer
              </h3>
            </div>
            
            <form onSubmit={handlePostActivity}>
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
                {[
                  { id: 'call', icon: PhoneCall, label: 'Call' },
                  { id: 'email', icon: MailCheck, label: 'Email' },
                  { id: 'meeting', icon: Calendar, label: 'Meeting' },
                  { id: 'task', icon: CheckCircle2, label: 'Note' }
                ].map(type => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setActivityType(type.id)}
                    style={{
                      flex: 1,
                      padding: '16px 8px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      background: activityType === type.id ? 'rgba(30, 58, 138, 0.03)' : 'transparent',
                      border: 'none',
                      borderBottom: `2px solid ${activityType === type.id ? 'var(--brand-blue)' : 'transparent'}`,
                      color: activityType === type.id ? 'var(--brand-blue)' : 'var(--text-secondary)',
                      fontWeight: activityType === type.id ? '700' : '500',
                      transition: 'all 0.2s',
                    }}
                  >
                    <type.icon size={16} />
                    <span style={{ fontSize: '12px' }}>{type.label}</span>
                  </button>
                ))}
              </div>
              
              <div style={{ padding: '24px' }}>
                <textarea 
                  className="glass-input" 
                  placeholder={
                    activityType === 'call' ? 'What was discussed on the call?' :
                    activityType === 'email' ? 'Draft your email notes here...' :
                    activityType === 'meeting' ? 'What are the meeting outcomes?' : 'Type your internal notes...'
                  }
                  style={{ minHeight: '140px', marginBottom: '16px', resize: 'vertical', border: '1px solid var(--border-color)', fontSize: '15px' }}
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handlePostActivity(e);
                    }
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Press <kbd style={{ background: 'var(--bg-tertiary)', padding: '2px 4px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>Enter</kbd> to save</span>
                  <button type="submit" className="btn-primary" style={{ padding: '10px 32px', borderRadius: '24px' }}>
                    Save Activity
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Clock size={18} color="var(--text-secondary)" /> {activeTab === 'activity' ? 'Interaction History' : 'Audit Trail'}
              </h3>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => setActiveTab('activity')}
                  style={{ 
                    padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                    background: activeTab === 'activity' ? 'var(--brand-blue)' : 'var(--bg-tertiary)',
                    color: activeTab === 'activity' ? 'white' : 'var(--text-secondary)',
                    border: 'none', cursor: 'pointer', textTransform: 'uppercase'
                  }}
                >
                  Interactions
                </button>
                <button 
                  onClick={() => setActiveTab('audit')}
                  style={{ 
                    padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                    background: activeTab === 'audit' ? 'var(--brand-blue)' : 'var(--bg-tertiary)',
                    color: activeTab === 'audit' ? 'white' : 'var(--text-secondary)',
                    border: 'none', cursor: 'pointer', textTransform: 'uppercase'
                  }}
                >
                  Audit
                </button>
                <button 
                  onClick={() => setActiveTab('calls')}
                  style={{ 
                    padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                    background: activeTab === 'calls' ? 'var(--brand-blue)' : 'var(--bg-tertiary)',
                    color: activeTab === 'calls' ? 'white' : 'var(--text-secondary)',
                    border: 'none', cursor: 'pointer', textTransform: 'uppercase'
                  }}
                >
                  Calls
                </button>
              </div>
            </div>
            
            <div style={{ position: 'relative', paddingLeft: '32px' }}>
              <div style={{ position: 'absolute', top: '16px', bottom: '16px', left: '11px', width: '2px', background: 'var(--border-color)', zIndex: 0 }} />
              
              <AnimatePresence mode="wait">
                {activeTab === 'activity' ? (
                  <motion.div key="interactions" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                    {activities.length === 0 ? (
                      <div className="glass-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                        No interactions recorded yet.
                      </div>
                    ) : (
                      activities.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).map((act) => (
                        <div key={act.id} style={{ position: 'relative', zIndex: 1, marginBottom: '24px' }}>
                          <div style={{ position: 'absolute', left: '-32px', top: '12px', width: '24px', height: '24px', borderRadius: '50%', background: 'white', border: '2px solid var(--brand-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-blue)', boxShadow: '0 0 0 4px var(--bg-primary)' }}>
                            {act.activity_type === 'call' && <PhoneCall size={12} />}
                            {act.activity_type === 'email' && <MailCheck size={12} />}
                            {act.activity_type === 'meeting' && <Calendar size={12} />}
                            {act.activity_type === 'task' && <CheckCircle2 size={12} />}
                          </div>
                          <div className="glass-card" style={{ padding: '20px', marginLeft: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--brand-blue)' }}>{act.activity_type.toUpperCase()} Logged</span>
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{new Date(act.timestamp).toLocaleString()}</span>
                            </div>
                            <p style={{ fontSize: '14px', margin: 0 }}>{act.note}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </motion.div>
                ) : activeTab === 'audit' ? (
                  <motion.div key="audit" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                    {auditLogs.length === 0 ? (
                      <div className="glass-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                        No audit history available.
                      </div>
                    ) : (
                      auditLogs.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).map((log) => (
                        <div key={log.id} style={{ position: 'relative', zIndex: 1, marginBottom: '24px' }}>
                          <div style={{ position: 'absolute', left: '-32px', top: '12px', width: '24px', height: '24px', borderRadius: '50%', background: 'white', border: '2px solid #ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', boxShadow: '0 0 0 4px var(--bg-primary)' }}>
                            <Edit3 size={12} />
                          </div>
                          <div className="glass-card" style={{ padding: '20px', marginLeft: '12px', borderLeft: '4px solid #ef4444' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                              <span style={{ fontWeight: '700', fontSize: '13px', color: '#ef4444' }}>{log.action}</span>
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{new Date(log.timestamp).toLocaleString()}</span>
                            </div>
                            <p style={{ fontSize: '13px', margin: 0 }}>
                              <span style={{ color: 'var(--text-secondary)' }}>From </span>
                              <span style={{ fontWeight: '600' }}>{log.old_value}</span>
                              <span style={{ color: 'var(--text-secondary)' }}> to </span>
                              <span style={{ fontWeight: '600', color: 'var(--brand-blue)' }}>{log.new_value}</span>
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </motion.div>
                ) : (
                  <motion.div key="calls" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                    {(!lead.call_records || lead.call_records.length === 0) ? (
                      <div className="glass-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                        No VoIP call recordings available.
                      </div>
                    ) : (
                      lead.call_records.map((call) => (
                        <div key={call.id} style={{ position: 'relative', zIndex: 1, marginBottom: '24px' }}>
                          <div style={{ position: 'absolute', left: '-32px', top: '12px', width: '24px', height: '24px', borderRadius: '50%', background: 'white', border: '2px solid #25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#25D366', boxShadow: '0 0 0 4px var(--bg-primary)' }}>
                            <PhoneCall size={12} />
                          </div>
                          <div className="glass-card" style={{ padding: '20px', marginLeft: '12px', borderLeft: '4px solid #25D366' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <span style={{ fontWeight: '700', fontSize: '14px', color: '#166534' }}>VoIP Call ({call.duration}s)</span>
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{new Date(call.timestamp).toLocaleString()}</span>
                            </div>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>{call.summary || 'No summary generated.'}</p>
                            {call.recording_url && (
                              <audio controls src={call.recording_url} style={{ width: '100%', height: '32px' }}>
                                Your browser does not support the audio element.
                              </audio>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
        {/* Right Sidebar Column */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lead-side-col"
          style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
        >
          <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} color="var(--brand-blue)" /> Upcoming Actions
              </h3>
            </div>
            
            <div style={{ padding: '24px' }}>
              <button 
                className="btn-primary" 
                onClick={() => setShowReminderModal(true)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', marginBottom: '24px', padding: '12px 16px', borderRadius: '12px', background: 'var(--brand-blue)', color: 'white' }}
              >
                <Plus size={16} /> Schedule Task
              </button>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <AnimatePresence>
                  {reminders.length === 0 ? (
                    <motion.div 
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      style={{ padding: '32px 20px', background: 'var(--bg-tertiary)', borderRadius: '12px', textAlign: 'center' }}
                    >
                      <AlertCircle size={24} style={{ color: 'var(--text-secondary)', margin: '0 auto 12px', opacity: 0.5 }} />
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>No reminders scheduled.</p>
                      <button onClick={() => setShowReminderModal(true)} style={{ background: 'none', color: 'var(--brand-blue)', fontSize: '12px', fontWeight: '700', marginTop: '12px' }}>Click to add one</button>
                    </motion.div>
                  ) : (
                    reminders.sort((a,b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)).map(rem => (
                      <motion.div 
                        key={rem.id} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{ padding: '16px', borderLeft: `4px solid ${rem.status === 'pending' ? 'var(--brand-blue)' : '#22c55e'}`, background: 'var(--bg-tertiary)', borderRadius: '0 8px 8px 0', opacity: rem.status === 'completed' ? 0.6 : 1, transition: 'all 0.3s' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button 
                              onClick={() => handleToggleReminderStatus(rem.id, rem.status)}
                              style={{ 
                                background: 'none', 
                                border: 'none', 
                                padding: 0, 
                                cursor: 'pointer', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                color: rem.status === 'pending' ? 'var(--text-secondary)' : '#22c55e'
                              }}
                            >
                              <CheckCircle2 size={16} fill={rem.status === 'completed' ? 'currentColor' : 'none'} color={rem.status === 'completed' ? '#fff' : 'currentColor'} />
                            </button>
                            <select 
                              value={rem.status}
                              onChange={(e) => handleToggleReminderStatus(rem.id, e.target.value)}
                              style={{ 
                                border: 'none', 
                                background: rem.status === 'completed' ? 'rgba(34, 197, 94, 0.1)' : rem.status === 'missed' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)', 
                                fontSize: '11px', 
                                fontWeight: '800', 
                                cursor: 'pointer', 
                                color: rem.status === 'completed' ? '#22c55e' : rem.status === 'missed' ? '#ef4444' : 'var(--brand-blue)', 
                                padding: '4px 8px', 
                                borderRadius: '6px',
                                outline: 'none',
                                textTransform: 'uppercase'
                              }}
                            >
                              <option value="pending">Pending</option>
                              <option value="completed">Completed</option>
                              <option value="missed">Missed</option>
                              <option value="snoozed">Snoozed</option>
                            </select>
                            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginLeft: '4px' }}>
                              Task
                            </span>
                          </div>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '12px', lineHeight: '1.4', textDecoration: rem.status === 'completed' ? 'line-through' : 'none', paddingLeft: '24px' }}>{rem.note}</p>
                        <div style={{ fontSize: '11px', fontWeight: '600', color: rem.status === 'completed' ? 'var(--text-secondary)' : 'var(--brand-blue)', display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '24px' }}>
                          <Calendar size={12} /> {new Date(rem.scheduled_at).toLocaleDateString()} at {new Date(rem.scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Reminder Modal */}
      <AnimatePresence>
        {showReminderModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReminderModal(false)}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)' }} 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="glass-card" 
              style={{ width: '420px', padding: '32px', position: 'relative', zIndex: 1001, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}
            >
              <h3 style={{ fontSize: '20px', marginBottom: '8px', fontWeight: '700' }}>Schedule Follow-up</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>Set a reminder to keep this lead moving through your pipeline.</p>
              
              <form onSubmit={handleScheduleReminder}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>What needs to be done?</label>
                  <textarea 
                    className="glass-input" 
                    autoFocus
                    required
                    placeholder="E.g., Call to discuss the customized plan..."
                    style={{ minHeight: '100px', resize: 'vertical' }}
                    value={reminderNote}
                    onChange={e => setReminderNote(e.target.value)}
                  />
                </div>
                <div style={{ marginBottom: '32px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>When is it due?</label>
                  <input 
                    type="datetime-local" 
                    className="glass-input" 
                    required
                    value={reminderDate}
                    onChange={e => setReminderDate(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button type="button" onClick={() => setShowReminderModal(false)} className="btn-secondary" style={{ padding: '10px 20px', borderRadius: '8px' }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" style={{ padding: '10px 24px', borderRadius: '8px' }}>
                    Schedule Task
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LeadDetails;
