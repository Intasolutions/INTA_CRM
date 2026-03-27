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

  const fetchData = async () => {
    setLoading(true);
    try {
      // For the Pipeline view, we fetch ALL leads (no_pagination) to show the full board
      const [stagesRes, leadsRes] = await Promise.all([
        api.get('stages/'),
        api.get('leads/?no_pagination=true')
      ]);
      
      const stagesData = Array.isArray(stagesRes.data) ? stagesRes.data : [];
      const leadsData = Array.isArray(leadsRes.data) ? leadsRes.data : leadsRes.data?.results || [];
      const totalCount = Array.isArray(leadsRes.data) ? leadsRes.data.length : (leadsRes.data?.count || 0);

      setStages(stagesData.sort((a,b) => (a.order || 0) - (b.order || 0)));
      setLeads(leadsData);
      setPagination({ count: totalCount, current: 1 });
    } catch (err) {
      console.error('Pipeline fetch error:', err);
      toast.error('Failed to load pipeline data');
    } finally {
      setLoading(false);
    }
  };

  // Horizontal Scroll Handler for Dragging
  const boardRef = React.useRef(null);
  const scrollInterval = React.useRef(null);

  const handleDragOverScroll = (e) => {
    onDragOver(e);
    
    if (!boardRef.current) return;
    
    const { clientX } = e;
    const { left, right, width } = boardRef.current.getBoundingClientRect();
    const scrollThreshold = 100; // Pixels from edge to start scrolling
    
    clearInterval(scrollInterval.current);
    
    if (clientX < left + scrollThreshold) {
      scrollInterval.current = setInterval(() => {
        boardRef.current.scrollLeft -= 10;
      }, 10);
    } else if (clientX > right - scrollThreshold) {
      scrollInterval.current = setInterval(() => {
        boardRef.current.scrollLeft += 10;
      }, 10);
    }
  };

  const stopScroll = () => {
    clearInterval(scrollInterval.current);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const onDragStart = (e, leadId) => {
    if (isMobile) return;
    e.dataTransfer.setData("leadId", leadId.toString()); // Ensure it's a string
    e.dataTransfer.effectAllowed = "move";
  };

  const [draggedOverStage, setDraggedOverStage] = useState(null);

  const onDragEnter = (e, stageId) => {
    e.preventDefault();
    setDraggedOverStage(stageId);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    // Only clear if we're actually leaving the column, not just moving between children
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setDraggedOverStage(null);
  };

  const onDrop = async (e, stageId) => {
    e.preventDefault();
    stopScroll();
    setDraggedOverStage(null);
    const leadId = e.dataTransfer.getData("leadId");
    if (!leadId) return;

    try {
      // Optimistic UI Update
      setLeads(prev => prev.map(l => l.id == leadId ? { ...l, stage: stageId } : l));
      
      const res = await api.patch(`leads/${leadId}/`, { stage: stageId });
      toast.success(`Moved to ${stages.find(s => s.id === stageId)?.name}`);
      fetchData();
    } catch (err) {
      console.error('Move failed:', err);
      toast.error('Failed to move lead');
      fetchData();
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

      <div 
        ref={boardRef}
        onDragLeave={stopScroll}
        onDrop={stopScroll}
        style={{ 
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
          minHeight: 0 
        }}>
        {stages.map(stage => {
          const stageLeads = leads.filter(l => l.stage == stage.id);
          return (
            <div 
              key={stage.id} 
              onDragOver={handleDragOverScroll}
              onDragEnter={(e) => onDragEnter(e, stage.id)}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, stage.id)}
              style={{ 
                minWidth: isMobile ? '100%' : '350px',
                maxWidth: isMobile ? '100%' : '350px',
                flexBasis: isMobile ? 'auto' : '350px',
                background: draggedOverStage === stage.id ? '#eef2ff' : '#f1f5f9', 
                borderRadius: '16px', 
                display: 'flex', 
                flexDirection: 'column',
                height: isMobile ? 'auto' : '100%', 
                border: draggedOverStage === stage.id ? '2px dashed var(--brand-blue)' : '1px solid var(--border-color)',
                flexShrink: 0,
                marginBottom: isMobile ? '24px' : '0',
                boxShadow: draggedOverStage === stage.id ? '0 10px 15px -3px rgba(30, 58, 138, 0.1)' : '0 4px 6px -1px rgba(0,0,0,0.05)',
                overflow: 'hidden',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `3px solid ${stage.color}`, background: draggedOverStage === stage.id ? 'rgba(30, 58, 138, 0.05)' : 'transparent' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: draggedOverStage === stage.id ? 'var(--brand-blue)' : 'inherit' }}>{stage.name}</span>
                  <span style={{ fontSize: '11px', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', padding: '2px 6px', borderRadius: '10px' }}>
                    {stageLeads.length}
                  </span>
                </div>
                <MoreHorizontal size={18} style={{ color: 'var(--text-secondary)', cursor: 'pointer' }} />
              </div>

              <div 
                onDragOver={onDragOver} // Ensure the list area itself is a drop target
                onDrop={(e) => onDrop(e, stage.id)}
                style={{ 
                  padding: '16px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '12px',
                  overflowY: 'auto', 
                  flex: 1,
                  minHeight: 0, 
                  scrollbarWidth: 'thin',
                  background: draggedOverStage === stage.id ? 'rgba(30, 58, 138, 0.02)' : '#f8fafc'
                }}>
                <AnimatePresence>
                  {stageLeads.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-secondary)', fontSize: '12px', fontStyle: 'italic' }}>
                      No active leads in this stage
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
          Showing all {pagination.count} leads in the pipeline view.
        </p>
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
