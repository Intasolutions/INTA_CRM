import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Users, Target, TrendingUp, Clock, Plus, BarChart3, CheckCircle2, Sparkles, Zap, ArrowRight, PieChart as PieChartIcon, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area
} from 'recharts';
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
          setStages(stagesRes.value.data.sort((a, b) => a.order - b.order));
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

  // Process data for charts
  const trendData = useMemo(() => {
    if (!leads.length) return [];

    // Group leads by month
    const groups = leads.reduce((acc, lead) => {
      const date = new Date(lead.created_at);
      const month = date.toLocaleString('default', { month: 'short' });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});

    // Last 6 months order (approximate)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      last6Months.push(months[(currentMonth - i + 12) % 12]);
    }

    return last6Months.map(m => ({
      name: m,
      leads: groups[m] || 0
    }));
  }, [leads]);

  const pieData = useMemo(() => {
    if (!pipelineStats?.source_breakdown) return [];
    return pipelineStats.source_breakdown.map(s => ({
      name: s.lead_source || 'Unknown',
      value: s.count
    }));
  }, [pipelineStats]);

  const COLORS = ['#1e3a8a', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const handleToggleReminderStatus = async (reminderId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
      await api.patch(`reminders/${reminderId}/`, { status: newStatus });
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
            className="glass-card mobile-stack"
            style={{
              marginBottom: isMobile ? '24px' : '40px',
              padding: isMobile ? '20px' : '24px 32px',
              background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.03) 0%, rgba(139, 92, 246, 0.03) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.15)',
              display: 'flex',
              alignItems: isMobile ? 'stretch' : 'center',
              gap: isMobile ? '16px' : '24px',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
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
              className="btn-secondary mobile-full"
              style={{
                zIndex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
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

      <div className="stat-grid" style={{ marginBottom: '40px' }}>
        <StatCard icon={Users} title="Total Leads" value={stats.totalLeads} color="59, 130, 246" />
        <StatCard icon={TrendingUp} title="Pipeline Value" value={`₹${stats.pipelineValue.toLocaleString('en-IN')}`} color="139, 92, 246" />
        <StatCard icon={Target} title="Win Rate" value={stats.winRate} color="16, 185, 129" />
        <StatCard icon={Clock} title="Due Follow-ups" value={stats.pendingFollowups} color="245, 158, 11" />
      </div>

      {/* New Visual Intelligence Grid */}
      <div className="dashboard-grid" style={{ marginBottom: '40px' }}>
        <div className="glass-card" style={{ padding: '32px', minHeight: '400px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Inbound Lead Flow</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>New leads over the last 6 months</p>
            </div>
            <Activity size={20} color="var(--brand-blue)" />
          </div>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--brand-blue)" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="var(--brand-blue)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '12px' }}
                  itemStyle={{ fontWeight: 'bold', color: 'var(--brand-blue)' }}
                />
                <Area type="monotone" dataKey="leads" stroke="var(--brand-blue)" strokeWidth={3} fillOpacity={1} fill="url(#colorLeads)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Source Distribution</h3>
            <PieChartIcon size={20} color="var(--brand-blue)" />
          </div>
          <div style={{ width: '100%', height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {pieData.slice(0, 4).map((entry, index) => (
              <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS[index % COLORS.length] }}></div>
                <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="dashboard-grid" style={{ marginBottom: '40px' }}>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Win Rate Leaderboard</h3>
            <Target size={20} color="var(--success)" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {users.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center' }}>No team data found.</p>
            ) : (
              users
                .filter(u => {
                  if (user?.role === 'admin' || user?.role === 'manager') return true;
                  return u.id === user?.id;
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
                          <div style={{ fontSize: '14px', fontWeight: '600' }}>{u.username}</div>
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
      </div>

      <div className="dashboard-grid">
        <div className="glass-card" style={{ minHeight: '400px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '20px' }}>Lead Conversion Funnel</h2>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Live Analytics</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px 0' }}>
            {leads.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '60px' }}>
                <BarChart3 size={48} style={{ opacity: 0.1, marginBottom: '16px', display: 'block', margin: '0 auto' }} />
                No lead data available for funnel.
              </div>
            ) : (
              stages.slice(0, 6).map((stage, i) => {
                const count = leads.filter(l => l.stage === stage.id).length;
                const percentage = Math.round((count / leads.length) * 100) || 0;
                const width = `${Math.max(15, percentage)}%`;

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

        <div className="glass-card" style={{ height: 'fit-content' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '24px' }}>Upcoming Reminders</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {reminders.filter(r => r.status === 'pending').length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center' }}>No pending tasks or follow-ups.</p>
            ) : (
              reminders.filter(r => r.status === 'pending').slice(0, 5).map(rem => (
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
                      <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>Due:</span> {new Date(rem.scheduled_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
