import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreHorizontal, User, Mail, Plus, List as ListIcon, Trello } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../api/client';
import LeadModal from '../components/LeadModal';
import { useAuth } from '../context/AuthContext';

const Pipeline = () => {
  const [stages, setStages] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ count: 0, current: 1 });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      const [stagesRes, leadsRes] = await Promise.all([
        api.get('stages/'),
        api.get(`leads/?page=${page}`)
      ]);
      
      const stagesData = Array.isArray(stagesRes.data) ? stagesRes.data : [];
      const leadsData = leadsRes.data?.results || [];
      const totalCount = leadsRes.data?.count || 0;

      setStages(stagesData.sort((a,b) => (a.order || 0) - (b.order || 0)));
      setLeads(Array.isArray(leadsData) ? leadsData : []);
      setPagination({ count: totalCount, current: page });
    } catch (err) {
      console.error('Pipeline fetch error:', err);
      toast.error('Failed to load pipeline data');
    } finally {
      setLoading(false);
    }
  };

  const onDragOver = (e) => {
    e.preventDefault();
  };

  const onDragStart = (e, leadId) => {
    if (isMobile) return; // Disable drag and drop on mobile as it's a list view
    e.dataTransfer.setData("leadId", leadId);
  };

  const onDrop = async (e, stageId) => {
    const leadId = e.dataTransfer.getData("leadId");
    try {
      setLeads(prev => prev.map(l => l.id == leadId ? { ...l, stage: stageId } : l));
      await api.patch(`leads/${leadId}/`, { stage: stageId });
      fetchData(pagination.current);
    } catch (err) {
      console.error(err);
      fetchData(pagination.current);
    }
  };

  if (loading) return <div className="page-container">Loading Pipeline...</div>;

  return (
    <div className="page-container" style={{ 
      height: 'calc(100vh - 40px)', // Fits perfectly within main area
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden', 
      paddingBottom: 0 // Allow board to touch the bottom
    }}>
      <header className="page-header-responsive" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '24px 0', gap: '20px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '24px' : '28px', marginBottom: '4px' }}>CRM Pipeline</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{isMobile ? 'Vertical List View' : 'Kanban Board View (Drag & Drop)'}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', width: isMobile ? '100%' : 'auto' }}>
          <Link to="/leads" className="btn-secondary" style={{ flex: isMobile ? 1 : 'none', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '13px' }}>
            <ListIcon size={16} /> Table
          </Link>
          {(user?.role === 'admin' || user?.permissions?.leads?.create) && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="btn-primary" 
              style={{ flex: isMobile ? 1 : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '13px' }}
            >
              <Plus size={18} /> Add Lead
            </button>
          )}
        </div>
      </header>

      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        gap: '24px', 
        overflowX: isMobile ? 'hidden' : 'auto', 
        overflowY: isMobile ? 'auto' : 'hidden',
        paddingBottom: '16px',
        alignItems: 'stretch',
        scrollSnapType: isMobile ? 'none' : 'x mandatory',
        WebkitOverflowScrolling: 'touch',
        minHeight: 0 // Crucial for nested flex scrolling
      }}>
        {stages.map(stage => {
          const stageLeads = leads.filter(l => l.stage == stage.id);
          return (
            <div 
              key={stage.id} 
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, stage.id)}
              style={{ 
                minWidth: isMobile ? '100%' : '350px',
                maxWidth: isMobile ? '100%' : '350px',
                flexBasis: isMobile ? 'auto' : '350px',
                background: '#f1f5f9', 
                borderRadius: '16px', 
                display: 'flex', 
                flexDirection: 'column',
                height: isMobile ? 'auto' : '100%', // Take full height of scroll container
                border: '1px solid var(--border-color)',
                flexShrink: 0,
                marginBottom: isMobile ? '24px' : '0',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                overflow: 'hidden' // Keep the column itself clean
              }}
            >
              <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `3px solid ${stage.color}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stage.name}</span>
                  <span style={{ fontSize: '11px', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', padding: '2px 6px', borderRadius: '10px' }}>
                    {stageLeads.length}
                  </span>
                </div>
                <MoreHorizontal size={18} style={{ color: 'var(--text-secondary)', cursor: 'pointer' }} />
              </div>

              <div style={{ 
                padding: '16px', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '12px',
                overflowY: 'auto', // THIS IS THE KEY VERTICAL SCROLL
                flex: 1,
                minHeight: 0, // Force the scroll
                scrollbarWidth: 'thin',
                background: '#f8fafc'
              }}>
                <AnimatePresence>
                  {stageLeads.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '10px', color: 'var(--text-secondary)', fontSize: '12px', fontStyle: 'italic' }}>
                      No active leads
                    </div>
                  ) : (
                    stageLeads.map(lead => (
                      <motion.div
                        layout
                        key={lead.id}
                        draggable={!isMobile}
                        onDragStart={(e) => onDragStart(e, lead.id)}
                        whileHover={{ scale: 1.01 }}
                        className="glass-card"
                        style={{ padding: '12px', cursor: isMobile ? 'default' : 'grab', marginBottom: '0', background: 'white' }}
                      >
                        <Link to={`/leads/${lead.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontWeight: '600', fontSize: '14px' }}>{lead.name}</span>
                            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--brand-blue)' }}>₹{(parseFloat(lead.deal_value) || 0).toLocaleString('en-IN')}</span>
                          </div>
                          {lead.email && !isMobile && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '8px' }}>
                              <Mail size={12} /> {lead.email}
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '8px' }}>
                            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Updated: {new Date(lead.updated_at).toLocaleDateString()}</span>
                            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 'bold' }}>
                              {lead?.name?.[0]?.toUpperCase()}
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
        <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
          {pagination.count} total leads
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            disabled={pagination.current === 1}
            onClick={() => fetchData(pagination.current - 1)}
            className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }}
          >
            Prev
          </button>
          <button 
            disabled={pagination.current * 10 >= pagination.count}
            onClick={() => fetchData(pagination.current + 1)}
            className="btn-primary" style={{ padding: '4px 12px', fontSize: '12px' }}
          >
            Next
          </button>
        </div>
      </div>

      <LeadModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onRefresh={() => fetchData(pagination.current)} 
      />
    </div>
  );
};

export default Pipeline;
