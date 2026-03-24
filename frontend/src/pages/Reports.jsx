import React, { useState, useEffect } from 'react';
import { 
  BarChart3, PieChart, TrendingUp, Users, 
  Target, Calendar, ArrowUpRight, ArrowDownRight,
  Filter, Download
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../api/client';

const Reports = () => {
  const [pipelineStats, setPipelineStats] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, campRes] = await Promise.all([
          api.get('leads/pipeline_stats/'),
          api.get('campaigns/')
        ]);
        setPipelineStats(statsRes.data);
        setCampaigns(campRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div style={{ padding: '40px' }}>Loading reports...</div>;

  return (
    <div className="page-container">
      <header className="page-header-responsive" style={{ marginBottom: '40px' }}>
        <div>
          <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>Analytics & Reports</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Performance insights and sales forecasting.</p>
        </div>
        <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Download size={18} /> Export Report
        </button>
      </header>

      <div className="stat-grid" style={{ marginBottom: '40px' }}>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
              <TrendingUp size={24} />
            </div>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ArrowUpRight size={14} /> 12%
            </span>
          </div>
          <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Forecasted Revenue</h4>
          <p style={{ fontSize: '24px', fontWeight: '800' }}>₹{Math.round(pipelineStats?.total_forecasted_revenue || 0).toLocaleString('en-IN')}</p>
        </div>

        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-blue)' }}>
              <Users size={24} />
            </div>
          </div>
          <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Won Deals</h4>
          <p style={{ fontSize: '24px', fontWeight: '800' }}>{pipelineStats?.won_leads_count || 0}</p>
        </div>

        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
              <Target size={24} />
            </div>
          </div>
          <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Active Campaigns</h4>
          <p style={{ fontSize: '24px', fontWeight: '800' }}>{campaigns.filter(c => c.status === 'active').length}</p>
        </div>
      </div>

      <div className="grid-equal">
        <div className="glass-card" style={{ padding: '32px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <BarChart3 size={20} color="var(--brand-blue)" /> Sales Funnel Conversion
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {pipelineStats?.stage_breakdown?.map((stage, idx) => (
              <div key={stage.stage} style={{ position: 'relative' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '16px 20px', 
                  background: 'var(--bg-secondary)', 
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  zIndex: 2,
                  position: 'relative'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: stage.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '800' }}>
                      {idx + 1}
                    </div>
                    <div>
                      <p style={{ fontWeight: '700', fontSize: '14px' }}>{stage.stage}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{stage.count} Leads</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontWeight: '800', fontSize: '15px' }}>₹{stage.value.toLocaleString('en-IN')}</p>
                    <p style={{ fontSize: '11px', color: '#10b981', fontWeight: '700' }}>{stage.probability}% Probability</p>
                  </div>
                </div>
                {idx < (pipelineStats?.stage_breakdown?.length || 0) - 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
                    <div style={{ width: '2px', height: '12px', background: 'var(--border-color)' }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '32px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <PieChart size={20} color="var(--brand-blue)" /> Campaign Performance
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
             {campaigns.length === 0 ? (
               <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px' }}>No campaigns to analyze.</p>
             ) : (
               campaigns.map(camp => (
                 <div key={camp.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontWeight: '600', fontSize: '14px' }}>{camp.name}</span>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{camp.lead_count} leads</span>
                    </div>
                    <div style={{ height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (camp.lead_count / 20) * 100)}%` }}
                        style={{ height: '100%', background: 'var(--brand-blue)', borderRadius: '4px' }}
                      />
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

export default Reports;
