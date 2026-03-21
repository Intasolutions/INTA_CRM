import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Users, Target, TrendingUp, Clock, Plus, BarChart3, CheckCircle2, Sparkles, Zap, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/client';

const StatCard = ({ icon: Icon, title, value, color }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="glass-card" 
    style={{ display: 'flex', alignItems: 'center', gap: '20px' }}
  >
    <div style={{ 
      width: '56px', 
      height: '56px', 
      borderRadius: '12px', 
      background: `rgba(${color}, 0.1)`, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      color: `rgb(${color})`
    }}>
      <Icon size={24} />
    </div>
    <div>
      <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{title}</h3>
      <p style={{ fontSize: '24px', fontWeight: '700' }}>{value}</p>
    </div>
  </motion.div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [stages, setStages] = useState([]);
  const [users, setUsers] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [pipelineStats, setPipelineStats] = useState(null);
  const [briefing, setBriefing] = useState(null);
  const [briefingLoading, setBriefingLoading] = useState(true);
  const [stats, setStats] = useState({
    totalLeads: 0,
    activePiepline: 0,
    pipelineValue: 0,
    winRate: '0%',
    pendingFollowups: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const results = await Promise.allSettled([
          api.get('leads/?no_pagination=true'),
          api.get('reminders/'),
          api.get('stages/'),
          api.get('users/'),
          api.get('leads/pipeline_stats/'),
          api.get('internal-tasks/daily_briefing/')
        ]);
        
        const [leadsRes, followupsRes, stagesRes, usersRes, pipelineRes, briefingRes] = results;

        if (pipelineRes.status === 'fulfilled') setPipelineStats(pipelineRes.value.data);
        if (briefingRes.status === 'fulfilled') {
          setBriefing(briefingRes.value.data);
          setBriefingLoading(false);
        } else {
          setBriefingLoading(false);
          console.error("Briefing failed:", briefingRes.reason);
        }

        if (leadsRes.status === 'fulfilled') {
          const leadsData = leadsRes.value.data;
          const active = leadsData.filter(l => !l.is_final).length;
          const won = leadsData.filter(l => l.stage_name === 'Closed Won').length;
          const pipelineValue = leadsData.reduce((sum, l) => sum + parseFloat(l.deal_value || 0), 0);
          
          setLeads(leadsData);
          setStats(prev => ({
            ...prev,
            totalLeads: leadsData.length,
            activePiepline: active,
            pipelineValue: pipelineValue,
            winRate: leadsData.length > 0 ? `${Math.round((won / leadsData.length) * 100)}%` : '0%'
          }));
        }

        if (followupsRes.status === 'fulfilled') {
          const followupsData = followupsRes.value.data;
          setReminders(followupsData);
          setStats(prev => ({
            ...prev,
            pendingFollowups: followupsData.filter(r => r.status === 'pending').length
          }));
        }

        if (stagesRes.status === 'fulfilled') {
          setStages(stagesRes.value.data.sort((a,b) => a.order - b.order));
        }

        if (usersRes.status === 'fulfilled') {
          setUsers(usersRes.value.data);
        }
      } catch (err) {
        console.error("Global dashboard fetch error:", err);
      }
    };
    fetchStats();
  }, []);

  const handleToggleReminderStatus = async (reminderId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
      await api.patch(`reminders/${reminderId}/`, { status: newStatus });
      // Refresh reminders
      const res = await api.get('reminders/');
      setReminders(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const calculateWidth = (val, total) => {
    if (!total || total === 0) return '0%';
    const pct = (val / total) * 100;
    return `${Math.min(100, Math.max(0, pct))}%`;
  };

  return (
    <div className="page-container">
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px', gap: '20px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Welcome back, {user?.username}!</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Here's what's happening with your sales pipeline today.</p>
        </div>
        {user?.permissions?.leads?.create && (
          <button 
            className="btn-primary" 
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={() => navigate('/leads')}
          >
            <Plus size={20} /> New Lead
          </button>
        )}
      </header>

      <AnimatePresence>
        {briefing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card"
            style={{ 
              marginBottom: '40px', 
              padding: '24px 32px', 
              background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.03) 0%, rgba(139, 92, 246, 0.03) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Ambient Background Glow */}
            <div style={{ position: 'absolute', top: '-50%', right: '-10%', width: '300px', height: '300px', background: 'rgba(139, 92, 246, 0.1)', filter: 'blur(60px)', borderRadius: '50%', zIndex: 0 }}></div>
            
            <div style={{ 
              width: '52px', 
              height: '52px', 
              borderRadius: '16px', 
              background: 'var(--brand-blue)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 8px 16px rgba(30, 58, 138, 0.25)',
              zIndex: 1,
              flexShrink: 0
            }}>
              <Sparkles size={24} />
            </div>
            
            <div style={{ flex: 1, zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--brand-blue)', textTransform: 'uppercase', letterSpacing: '1px' }}>AI Strategic Briefing</span>
                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--border-color)' }}></div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Updated {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p style={{ fontSize: '15px', lineHeight: '1.6', color: 'var(--text-primary)', fontWeight: '500' }}>
                {briefing.briefing.split('**').map((part, i) => i % 2 === 1 ? <strong key={i} style={{ color: 'var(--brand-blue)', fontWeight: '700' }}>{part}</strong> : part)}
              </p>
            </div>
            
            <button 
              onClick={() => navigate('/tasks')}
              style={{ 
                zIndex: 1,
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                padding: '12px 20px', 
                background: 'white', 
                border: '1px solid var(--border-color)', 
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
              }}
              onMouseEnter={(e) => { 
                e.currentTarget.style.background = 'var(--bg-tertiary)'; 
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
              }}
              onMouseLeave={(e) => { 
                e.currentTarget.style.background = 'white'; 
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
              }}
            >
              Action Center <ArrowRight size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="dashboard-grid">
        <div className="glass-card" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Pipeline Forecast</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Projected revenue based on deal probability</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Weighted Total</p>
              <p style={{ fontSize: '24px', fontWeight: '800', color: '#10b981' }}>₹{Math.round(pipelineStats?.total_forecasted_revenue || 0).toLocaleString('en-IN')}</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {pipelineStats?.stage_breakdown?.map((stage) => (
              <div key={stage.stage}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                  <span style={{ fontWeight: '600' }}>{stage.stage} <span style={{ color: 'var(--text-secondary)', fontWeight: '400' }}>({stage.count} leads)</span></span>
                  <span style={{ fontWeight: '700' }}>₹{stage.value.toLocaleString('en-IN')} <span style={{ fontSize: '11px', color: '#10b981' }}>({stage.probability}% prob.)</span></span>
                </div>
                <div style={{ height: '12px', background: 'var(--bg-tertiary)', borderRadius: '6px', overflow: 'hidden' }}>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: calculateWidth(stage.value, stats.pipelineValue) }}
                    style={{ height: '100%', background: stage.color || 'var(--brand-blue)', borderRadius: '6px' }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '32px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '24px' }}>Leads by Source</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {pipelineStats?.source_breakdown?.map((source) => (
              <div key={source.lead_source} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700' }}>
                  {source.count}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '14px', fontWeight: '600' }}>{source.lead_source || 'Direct'}</p>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>₹{source.value?.toLocaleString('en-IN') || 0} Total Value</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: '40px' }}>
        <StatCard icon={Users} title="Total Leads" value={stats.totalLeads} color="59, 130, 246" />
        <StatCard icon={TrendingUp} title="Pipeline Value" value={`₹${stats.pipelineValue.toLocaleString('en-IN')}`} color="139, 92, 246" />
        <StatCard icon={Target} title="Win Rate" value={stats.winRate} color="16, 185, 129" />
        <StatCard icon={Clock} title="Due Follow-ups" value={stats.pendingFollowups} color="245, 158, 11" />
      </div>

      <div className="dashboard-grid">
        <div className="glass-card" style={{ minHeight: '400px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '20px' }}>Lead Conversion Funnel</h2>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Live Data</div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px 0' }}>
            {/* Dynamic Funnel based on actual leads per stage */}
            {leads.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '60px' }}>
                <BarChart3 size={48} style={{ opacity: 0.1, marginBottom: '16px', display: 'block', margin: '0 auto' }} />
                No lead data available for funnel.
              </div>
            ) : (
                stages.slice(0, 5).map((stage, i) => {
                  const count = leads.filter(l => l.stage === stage.id).length;
                  const percentage = Math.round((count / leads.length) * 100) || 0;
                  const width = `${Math.max(15, percentage)}%`; // Min width for visibility
                  
                  return (
                    <div key={stage.id} style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                      <div style={{ width: '120px', fontSize: '13px', textAlign: 'right', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {stage.name}
                      </div>
                      <div style={{ flex: 1, position: 'relative' }}>
                        <motion.div 
                          initial={{ width: 0 }} 
                          animate={{ width: width }} 
                          style={{ height: '32px', background: stage.color || '#3b82f6', borderRadius: '4px', opacity: 0.8, display: 'flex', alignItems: 'center', padding: '0 12px', color: 'white', fontSize: '12px', fontWeight: 'bold' }}>
                          {count}
                        </motion.div>
                      </div>
                      <div style={{ width: '60px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {percentage}%
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* Right Column (Stacked) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="glass-card">
            <h2 style={{ fontSize: '20px', marginBottom: '24px' }}>Team Performance</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {users.length === 0 ? (
                 <p style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center' }}>No team data found.</p>
              ) : (
              users
                .filter(u => {
                  if (user?.role === 'admin' || user?.role === 'manager') return true;
                  return u.id === user?.id; // Agents only see their own performance here
                })
                .slice(0, 5).map(u => {
                const userLeads = leads.filter(l => l.assigned_to === u.id);
                const wonLeads = userLeads.filter(l => l.is_final && l.stage_name?.toLowerCase()?.includes('won')).length;
                const rate = userLeads.length > 0 ? Math.round((wonLeads / userLeads.length) * 100) : 0;
                
                return (
                  <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: 'var(--brand-blue)' }}>
                        {u.username?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600' }}>{u.username} {u.id === user?.id && '(You)'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{userLeads.length} Leads</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--success)' }}>{rate}%</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Win Rate</div>
                    </div>
                  </div>
                );
              })
              )}
            </div>
          </div>

          <div className="glass-card">
            <h2 style={{ fontSize: '20px', marginBottom: '24px' }}>Upcoming Reminders</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {reminders.filter(r => r.status === 'pending').length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center' }}>No pending tasks or follow-ups.</p>
              ) : (
                reminders.filter(r => r.status === 'pending').map(rem => (
                  <div key={rem.id} style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', position: 'relative' }}>
                    <button 
                      onClick={() => handleToggleReminderStatus(rem.id, rem.status)}
                      style={{ 
                        width: '36px', 
                        height: '36px', 
                        borderRadius: '50%', 
                        background: 'var(--bg-tertiary)', 
                        color: 'var(--text-secondary)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--success)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                    >
                      <CheckCircle2 size={16} />
                    </button>
                    <div 
                      onClick={() => navigate(`/leads/${rem.lead}`)}
                      style={{ cursor: 'pointer', flex: 1 }}
                    >
                      <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>{rem.note || 'Unnamed Task'}</h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>Due:</span> {new Date(rem.scheduled_at).toLocaleDateString()} at {new Date(rem.scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
