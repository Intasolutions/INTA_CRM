import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, MoreHorizontal, User, Mail, Phone, Users, Upload, Download, Trash2, AlertCircle, Target } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../api/client';
import LeadModal from '../components/LeadModal';
import { useAuth } from '../context/AuthContext';

import { useNavigate, Link, useSearchParams } from 'react-router-dom';

const Leads = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pagination, setPagination] = useState({ count: 0, current: 1 });
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [isBulkCampaignModalOpen, setIsBulkCampaignModalOpen] = useState(false);
  const [targetCampaignId, setTargetCampaignId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [stages, setStages] = useState([]);
  const [filters, setFilters] = useState({ stage: '', campaign: '' });
  const [isBulkStageModalOpen, setIsBulkStageModalOpen] = useState(false);
  const [targetStageId, setTargetStageId] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  const filteredLeads = leads; 

  const fetchLeads = async (page = 1) => {
    setLoading(true);
    try {
      const campId = searchParams.get('campaign');
      const stageId = searchParams.get('stage');
      
      let url = `leads/?page=${page}`;
      if (campId) url += `&campaign=${campId}`;
      if (stageId) url += `&stage=${stageId}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      
      const res = await api.get(url);
      setLeads(Array.isArray(res.data.results) ? res.data.results : []);
      setPagination({ count: res.data.count || 0, current: page });
    } catch (err) {
      console.error('Fetch leads error:', err);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const res = await api.get('campaigns/');
      setCampaigns(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setCampaigns([]);
    }
  };

  const fetchStages = async () => {
    try {
      const res = await api.get('stages/');
      setStages(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setStages([]);
    }
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    fetchCampaigns();
    fetchStages();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const campId = searchParams.get('campaign') || '';
    const stageId = searchParams.get('stage') || '';
    setFilters({ campaign: campId, stage: stageId });
    if (campId || stageId) setShowFilters(true);
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => fetchLeads(1), searchQuery ? 500 : 0);
    return () => clearTimeout(timer);
  }, [searchParams, searchQuery]);

  const toggleSelectAll = () => {
    if (selectedLeads.length === leads.length) setSelectedLeads([]);
    else setSelectedLeads(leads.map(l => l.id));
  };

  const toggleSelectOne = (id) => {
    if (selectedLeads.includes(id)) setSelectedLeads(selectedLeads.filter(sid => sid !== id));
    else setSelectedLeads([...selectedLeads, id]);
  };

  const handleBulkAssign = async () => {
    if (!targetCampaignId) return;
    try {
      await Promise.all(selectedLeads.map(id => api.patch(`leads/${id}/`, { campaign: targetCampaignId })));
      fetchLeads(pagination.current);
      setSelectedLeads([]);
      setIsBulkCampaignModalOpen(false);
    } catch (err) { console.error(err); }
  };

  const handleBulkStageUpdate = async () => {
    if (!targetStageId) return;
    try {
      await Promise.all(selectedLeads.map(id => api.patch(`leads/${id}/`, { stage: targetStageId })));
      fetchLeads(pagination.current);
      setSelectedLeads([]);
      setIsBulkStageModalOpen(false);
    } catch (err) { console.error(err); }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Delete ${selectedLeads.length} leads?`)) {
      try {
        await Promise.all(selectedLeads.map(id => api.delete(`leads/${id}/`)));
        fetchLeads(pagination.current);
        setSelectedLeads([]);
      } catch (err) { console.error(err); }
    }
  };

  const handleExport = () => window.open(`${api.defaults.baseURL}leads/export_csv/`, '_blank');

  const renderMobileCards = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Loading Leads...</div>
      ) : filteredLeads.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>No leads found</div>
      ) : (
        filteredLeads.map(lead => (
          <div key={lead.id} className="glass-card" style={{ padding: '16px', position: 'relative', border: selectedLeads.includes(lead.id) ? '2px solid var(--brand-blue)' : '1px solid var(--border-color)', background: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input type="checkbox" checked={selectedLeads.includes(lead.id)} onChange={() => toggleSelectOne(lead.id)} />
                <Link to={`/leads/${lead.id}`} style={{ fontWeight: '700', fontSize: '15px', color: 'var(--brand-blue)', textDecoration: 'none' }}>{lead.name}</Link>
              </div>
              <div style={{ padding: '2px 8px', borderRadius: '4px', background: lead.lead_score > 70 ? '#dcfce7' : '#fef9c3', color: lead.lead_score > 70 ? '#166534' : '#854d0e', fontSize: '10px', fontWeight: 'bold' }}>
                {lead.lead_score || 0}%
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', fontSize: '12px' }}>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '9px', textTransform: 'uppercase', marginBottom: '2px' }}>Company</span>
                <span style={{ fontWeight: '600' }}>{lead.company || '-'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '9px', textTransform: 'uppercase', marginBottom: '2px' }}>Deal Value</span>
                <span style={{ fontWeight: '700', color: 'var(--brand-blue)' }}>₹{(parseFloat(lead.deal_value) || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--brand-blue)', background: 'rgba(59, 130, 246, 0.1)', padding: '4px 10px', borderRadius: '20px' }}>
                {lead.stage_name || 'New'}
              </span>
              <div style={{ display: 'flex', gap: '16px' }}>
                {lead.phone && <a href={`tel:${lead.phone}`} style={{ color: 'var(--brand-blue)' }}><Phone size={16} /></a>}
                {lead.email && <a href={`mailto:${lead.email}`} style={{ color: 'var(--brand-blue)' }}><Mail size={16} /></a>}
                <Link to={`/leads/${lead.id}`} style={{ color: 'var(--text-secondary)' }}><MoreHorizontal size={18} /></Link>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="page-container">
      <header className="page-header-responsive" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', gap: '20px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '24px' : '28px', marginBottom: '4px' }}>Lead Management</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Manage all your sales prospects.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', width: isMobile ? '100%' : 'auto' }}>
          {user?.role === 'admin' && !isMobile && (
            <button onClick={() => navigate('/leads/import')} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Upload size={18} /> Import
            </button>
          )}
          {(user?.role === 'admin' || user?.permissions?.leads?.create) && (
            <button onClick={() => setIsModalOpen(true)} className="btn-primary" style={{ flex: isMobile ? 1 : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Plus size={20} /> Create Lead
            </button>
          )}
        </div>
      </header>

      <LeadModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onRefresh={fetchLeads} 
      />

      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: isMobile ? '16px' : '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '16px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              className="glass-input" 
              placeholder="Search leads..." 
              style={{ paddingLeft: '40px', height: '42px', fontSize: '14px' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button 
            className={showFilters ? "btn-primary" : "btn-secondary"} 
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', height: '42px', fontSize: '14px' }} 
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={18} /> {showFilters ? 'Hide' : 'Filters'}
          </button>
        </div>

        {showFilters && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            style={{ 
              padding: isMobile ? '16px' : '24px', 
              display: 'flex', 
              flexDirection: isMobile ? 'column' : 'row',
              gap: '16px', 
              background: 'rgba(30, 58, 138, 0.02)',
              borderBottom: '1px solid var(--border-color)',
              overflow: 'hidden'
            }}
          >
            <div style={{ flex: '1' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--brand-blue)', marginBottom: '8px' }}>STAGE</label>
              <select 
                className="glass-input" 
                style={{ height: '40px', fontSize: '13px', width: '100%' }}
                value={filters.stage}
                onChange={e => {
                  const val = e.target.value;
                  const params = new URLSearchParams(window.location.search);
                  if (val) params.set('stage', val); else params.delete('stage');
                  navigate(`/leads?${params.toString()}`);
                }}
              >
                <option value="">All Stages</option>
                {(stages || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div style={{ flex: '1' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--brand-blue)', marginBottom: '8px' }}>CAMPAIGN</label>
              <select 
                className="glass-input" 
                style={{ height: '40px', fontSize: '13px', width: '100%' }}
                value={filters.campaign}
                onChange={e => {
                  const val = e.target.value;
                  const params = new URLSearchParams(window.location.search);
                  if (val) params.set('campaign', val); else params.delete('campaign');
                  navigate(`/leads?${params.toString()}`);
                }}
              >
                <option value="">All Campaigns</option>
                {(campaigns || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </motion.div>
        )}

        {isMobile ? renderMobileCards() : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input type="checkbox" checked={selectedLeads.length === leads.length && leads.length > 0} onChange={toggleSelectAll} />
                  </th>
                  <th>Lead Name</th>
                  <th>Score</th>
                  <th>Contact</th>
                  <th>Company</th>
                  <th>Deal Value</th>
                  <th>Stage</th>
                  <th>Last Contact</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} style={{ opacity: 0.5 }}>
                      <td colSpan="10">
                        <div className="animate-pulse" style={{ height: '40px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}></div>
                      </td>
                    </tr>
                  ))
                ) : filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan="10" style={{ textAlign: 'center', padding: '60px' }}>
                      <Users size={48} style={{ opacity: 0.1, marginBottom: '16px', display: 'block', margin: '0 auto' }} />
                      <p style={{ color: 'var(--text-secondary)' }}>No leads found matching your search.</p>
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => (
                    <tr key={lead.id} style={{ background: selectedLeads.includes(lead.id) ? 'rgba(30, 58, 138, 0.04)' : 'transparent' }}>
                      <td>
                        <input type="checkbox" checked={selectedLeads.includes(lead.id)} onChange={() => toggleSelectOne(lead.id)} />
                      </td>
                      <td>
                        <Link to={`/leads/${lead.id}`} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '36px', height: '36px', background: 'var(--bg-tertiary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <User size={18} color="var(--brand-blue)" />
                          </div>
                          <span style={{ fontWeight: '600', color: 'var(--brand-blue)' }}>{lead.name}</span>
                        </Link>
                      </td>
                      <td>
                        <div style={{ 
                          width: '40px', 
                          height: '24px', 
                          borderRadius: '4px', 
                          background: lead.lead_score > 70 ? '#dcfce7' : lead.lead_score > 40 ? '#fef9c3' : '#fee2e2',
                          color: lead.lead_score > 70 ? '#166534' : lead.lead_score > 40 ? '#854d0e' : '#991b1b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: '700'
                        }}>
                          {lead.lead_score || 0}%
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '13px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
                            <Mail size={12} /> {lead.email || 'N/A'}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
                            <Phone size={12} /> {lead.phone || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td>{lead.company || '-'}</td>
                      <td style={{ fontWeight: '700', color: 'var(--brand-blue)' }}>
                        ₹{parseFloat(lead.deal_value || 0).toLocaleString('en-IN')}
                      </td>
                      <td>
                        <span style={{ 
                          padding: '4px 12px', 
                          borderRadius: '20px', 
                          fontSize: '12px', 
                          fontWeight: '600',
                          background: 'rgba(59, 130, 246, 0.1)',
                          color: 'var(--brand-blue)',
                          border: '1px solid rgba(59, 130, 246, 0.2)'
                        }}>
                          {lead.stage_name || 'New Lead'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                            {lead.last_contacted_at ? new Date(lead.last_contacted_at).toLocaleDateString() : 'Never'}
                          </span>
                          {(!lead.last_contacted_at || (new Date() - new Date(lead.last_contacted_at)) > 5 * 24 * 60 * 60 * 1000) && !lead.is_final && (
                            <div title="Stale Lead: Not contacted in 5+ days" style={{ color: '#ef4444' }}>
                              <AlertCircle size={14} />
                            </div>
                          )}
                        </div>
                        {lead.last_contacted_by_name && (
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', opacity: 0.7 }}>
                            by {lead.last_contacted_by_name}
                          </div>
                        )}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                        {new Date(lead.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <div style={{ position: 'relative' }}>
                          <button 
                            onClick={() => setActiveDropdown(activeDropdown === lead.id ? null : lead.id)}
                            style={{ color: 'var(--text-secondary)', background: 'none' }}
                          >
                            <MoreHorizontal size={18} />
                          </button>
                          
                          {activeDropdown === lead.id && (
                            <div className="glass-card" style={{ position: 'absolute', right: '100%', top: '0', padding: '8px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '140px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                              <button className="btn-secondary" onClick={() => navigate(`/leads/${lead.id}`)} style={{ padding: '8px', fontSize: '12px', width: '100%', textAlign: 'left', border: 'none', background: 'transparent' }}>
                                View Details
                              </button>
                              <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />
                              <button 
                                className="btn-secondary" 
                                style={{ padding: '8px', fontSize: '12px', width: '100%', textAlign: 'left', border: 'none', background: 'transparent', color: 'var(--danger)' }}
                                onClick={() => {
                                  if(window.confirm('Are you sure you want to delete this lead?')) {
                                    api.delete(`leads/${lead.id}/`).then(() => {
                                      fetchLeads(pagination.current);
                                      setActiveDropdown(null);
                                    });
                                  }
                                }}
                              >
                                Delete Lead
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        <div style={{ padding: '20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)' }}>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
             {pagination.count} leads total
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              disabled={pagination.current === 1}
              onClick={() => fetchLeads(pagination.current - 1)}
              className="btn-secondary" style={{ padding: '6px 12px', fontSize: '13px' }}
            >
              Previous
            </button>
            <button 
              disabled={pagination.current * 10 >= pagination.count}
              onClick={() => fetchLeads(pagination.current + 1)}
              className="btn-primary" style={{ padding: '6px 16px', fontSize: '13px' }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedLeads.length > 0 && (
        <div style={{ 
          position: 'fixed', bottom: isMobile ? '20px' : '40px', left: isMobile ? '10px' : '50%', right: isMobile ? '10px' : 'auto', 
          transform: isMobile ? 'none' : 'translateX(-50%)', 
          background: 'var(--brand-blue)', color: 'white', padding: isMobile ? '12px 16px' : '16px 32px', 
          borderRadius: isMobile ? '12px' : '40px', display: 'flex', flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'center', gap: isMobile ? '12px' : '24px', 
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)', zIndex: 999 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: isMobile ? '100%' : 'auto', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: '600', fontSize: isMobile ? '14px' : '16px' }}>{selectedLeads.length} selected</span>
            <button onClick={() => setSelectedLeads([])} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', border: 'none' }}>Cancel</button>
          </div>
          
           {!isMobile && <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.2)' }} />}
          
          <div style={{ display: 'flex', gap: '8px', width: isMobile ? '100%' : 'auto', overflowX: 'auto', paddingBottom: isMobile ? '4px' : '0' }}>
            <button onClick={() => setIsBulkCampaignModalOpen(true)} style={{ background: 'white', color: 'var(--brand-blue)', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', border: 'none', whiteSpace: 'nowrap' }}>Campaign</button>
            <button onClick={() => setIsBulkStageModalOpen(true)} style={{ background: 'white', color: 'var(--brand-blue)', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', border: 'none', whiteSpace: 'nowrap' }}>Stage</button>
            <button onClick={handleBulkDelete} style={{ background: 'rgba(239, 68, 68, 0.9)', color: 'white', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', border: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}><Trash2 size={14} /> Delete</button>
          </div>
        </div>
      )}

      {/* Bulk Campaign Modal */}
      {isBulkCampaignModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 1001, backdropFilter: 'blur(4px)' }}>
          <div className="glass-card" style={{ width: isMobile ? '100%' : '400px', padding: isMobile ? '24px 20px 40px' : '32px', borderRadius: isMobile ? '24px 24px 0 0' : '16px' }}>
            <h3 style={{ marginBottom: '12px', fontSize: '18px' }}>Move to Campaign</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>Apply to {selectedLeads.length} leads.</p>
            <select className="glass-input" style={{ marginBottom: '20px', fontSize: '14px' }} value={targetCampaignId} onChange={e => setTargetCampaignId(e.target.value)}>
              <option value="">Select a campaign...</option>
              {(campaigns || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setIsBulkCampaignModalOpen(false)}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={handleBulkAssign}>Execute</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Stage Modal */}
      {isBulkStageModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 1001, backdropFilter: 'blur(4px)' }}>
          <div className="glass-card" style={{ width: isMobile ? '100%' : '400px', padding: isMobile ? '24px 20px 40px' : '32px', borderRadius: isMobile ? '24px 24px 0 0' : '16px' }}>
            <h3 style={{ marginBottom: '12px', fontSize: '18px' }}>Update Stage</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>Change status for {selectedLeads.length} leads.</p>
            <select className="glass-input" style={{ marginBottom: '20px', fontSize: '14px' }} value={targetStageId} onChange={e => setTargetStageId(e.target.value)}>
              <option value="">Select a stage...</option>
              {(stages || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setIsBulkStageModalOpen(false)}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={handleBulkStageUpdate}>Update All</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leads;
