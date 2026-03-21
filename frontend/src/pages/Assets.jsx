import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { 
  Package, Plus, Search, Filter, MoreVertical, 
  User, Calendar, ShieldCheck, Wrench, AlertCircle,
  Hash, DollarSign, MapPin, Edit2, Trash2, ArrowRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const Assets = () => {
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [assetsRes, catsRes, usersRes] = await Promise.all([
        api.get('inventory/assets/'),
        api.get('inventory/categories/'),
        api.get('leads/settings/users/')
      ]);
      setAssets(assetsRes.data);
      setCategories(catsRes.data);
      setUsers(usersRes.data);
    } catch (err) {
      toast.error('Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return '#10b981';
      case 'assigned': return '#3b82f6';
      case 'maintenance': return '#f59e0b';
      case 'lost': return '#ef4444';
      case 'retired': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const stats = {
    total: assets.length,
    assigned: assets.filter(a => a.status === 'assigned').length,
    available: assets.filter(a => a.status === 'available').length,
    maintenance: assets.filter(a => a.status === 'maintenance').length,
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         asset.serial_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || asset.category.toString() === filterCategory;
    const matchesStatus = filterStatus === 'all' || asset.status === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px' }}>Asset Management</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Track and manage company equipment and licenses</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          style={{ 
            background: 'var(--brand-blue)', 
            color: 'white', 
            padding: '12px 24px', 
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '15px',
            fontWeight: '600',
            boxShadow: '0 4px 12px rgba(30, 58, 138, 0.2)'
          }}
        >
          <Plus size={20} /> Add Asset
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        {[
          { label: 'Total Assets', value: stats.total, icon: Package, color: '#3b82f6' },
          { label: 'Assigned', value: stats.assigned, icon: User, color: '#10b981' },
          { label: 'Available', value: stats.available, icon: ShieldCheck, color: '#6366f1' },
          { label: 'In Repair', value: stats.maintenance, icon: Wrench, color: '#f59e0b' },
        ].map((stat, i) => (
          <div key={i} style={{ 
            background: 'var(--bg-secondary)', 
            padding: '24px', 
            borderRadius: '20px', 
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '20px'
          }}>
            <div style={{ 
              width: '56px', 
              height: '56px', 
              borderRadius: '16px', 
              background: `${stat.color}15`, 
              color: stat.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <stat.icon size={28} />
            </div>
            <div>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{stat.label}</p>
              <p style={{ fontSize: '24px', fontWeight: '800' }}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ 
        background: 'var(--bg-secondary)', 
        padding: '20px', 
        borderRadius: '16px', 
        border: '1px solid var(--border-color)',
        marginBottom: '24px',
        display: 'flex',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={18} />
          <input 
            type="text" 
            placeholder="Search by name or serial..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '12px 12px 12px 40px', 
              borderRadius: '10px', 
              background: 'var(--bg-primary)', 
              border: '1px solid var(--border-color)' 
            }}
          />
        </div>
        <select 
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          style={{ padding: '12px', borderRadius: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', minWidth: '160px' }}
        >
          <option value="all">All Categories</option>
          {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
        </select>
        <select 
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: '12px', borderRadius: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', minWidth: '160px' }}
        >
          <option value="all">All Status</option>
          <option value="available">Available</option>
          <option value="assigned">Assigned</option>
          <option value="maintenance">Maintenance</option>
          <option value="retired">Retired</option>
        </select>
      </div>

      {/* Assets Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
        {filteredAssets.map(asset => (
          <div key={asset.id} style={{ 
            background: 'var(--bg-secondary)', 
            borderRadius: '20px', 
            border: '1px solid var(--border-color)',
            overflow: 'hidden',
            transition: 'transform 0.2s',
            cursor: 'pointer'
          }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-blue)' }}>
                  <Package size={24} />
                </div>
                <div>
                  <h3 style={{ fontWeight: '700', fontSize: '16px', marginBottom: '4px' }}>{asset.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <Hash size={12} /> {asset.serial_number}
                  </div>
                </div>
              </div>
              <div style={{ 
                padding: '4px 12px', 
                borderRadius: '20px', 
                fontSize: '11px', 
                fontWeight: '700', 
                textTransform: 'uppercase',
                background: `${getStatusColor(asset.status)}15`,
                color: getStatusColor(asset.status)
              }}>
                {asset.status}
              </div>
            </div>
            
            <div style={{ padding: '20px', background: 'rgba(0,0,0,0.01)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Category</p>
                  <p style={{ fontSize: '14px', fontWeight: '600' }}>{asset.category_name}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Value</p>
                  <p style={{ fontSize: '14px', fontWeight: '600' }}>₹{asset.purchase_cost}</p>
                </div>
              </div>

              {asset.assigned_to_detail ? (
                <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--brand-blue)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                    {asset.assigned_to_detail.username[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Assigned To</p>
                    <p style={{ fontSize: '13px', fontWeight: '600' }}>{asset.assigned_to_detail.username}</p>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '12px', borderRadius: '12px', border: '1px dashed var(--border-color)', textAlign: 'center' }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Unassigned</p>
                </div>
              )}
            </div>

            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
               <button style={{ flex: 1, padding: '8px', borderRadius: '8px', background: 'var(--bg-tertiary)', fontSize: '13px', fontWeight: '600' }}>Details</button>
               {asset.status === 'available' ? (
                 <button style={{ flex: 1, padding: '8px', borderRadius: '8px', background: 'var(--brand-blue)', color: 'white', fontSize: '13px', fontWeight: '600' }}>Assign</button>
               ) : asset.status === 'assigned' ? (
                 <button style={{ flex: 1, padding: '8px', borderRadius: '8px', background: 'var(--danger)15', color: 'var(--danger)', fontSize: '13px', fontWeight: '600' }}>Return</button>
               ) : null}
            </div>
          </div>
        ))}
      </div>

      {loading && (
        <div style={{ padding: '100px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Loading your company assets...
        </div>
      )}

      {assets.length === 0 && !loading && (
        <div style={{ padding: '100px', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '24px', border: '1px dashed var(--border-color)' }}>
          <Package size={48} style={{ color: 'var(--text-secondary)', marginBottom: '16px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>No assets found</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Start by adding your company equipment and licenses.</p>
        </div>
      )}
    </div>
  );
};

export default Assets;
