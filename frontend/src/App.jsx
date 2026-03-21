import React from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { LayoutDashboard, Users, Settings as SettingsIcon, LogOut, Trello, Database, Megaphone, BarChart3 } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Leads from './pages/Leads';
import Settings from './pages/Settings';
import LeadDetails from './pages/LeadDetails';
import UserManagement from './pages/UserManagement';
import LeadStageSettings from './pages/LeadStageSettings';
import CustomFieldSettings from './pages/CustomFieldSettings';
import WorkflowSettings from './pages/WorkflowSettings';
import Pipeline from './pages/Pipeline';
import ImportLeads from './pages/ImportLeads';
import Integrations from './pages/Integrations';
import Campaigns from './pages/Campaigns';
import Reports from './pages/Reports';
import InternalTasks from './pages/InternalTasks';
import Assets from './pages/Assets';
import { Toaster } from 'react-hot-toast';
import NotificationManager from './components/NotificationManager';

const SidebarLink = ({ to, icon: Icon, label }) => {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
  
  return (
    <Link to={to} style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 16px',
      borderRadius: '12px',
      background: isActive ? 'rgba(30, 58, 138, 0.08)' : 'transparent',
      color: isActive ? 'var(--brand-blue)' : 'var(--text-secondary)',
      marginBottom: '8px'
    }}>
      <Icon size={20} />
      <span style={{ fontWeight: isActive ? '600' : '400' }}>{label}</span>
    </Link>
  );
};

const ProtectedLayout = ({ children }) => {
  const { user, logout, loading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;

  return (
    <div className="app-container">
      <Toaster position="top-right" />
      <NotificationManager />
      
      {/* Mobile Header Toggle */}
      <div style={{ 
        display: 'none', 
        padding: '16px 20px', 
        background: 'var(--bg-secondary)', 
        borderBottom: '1px solid var(--border-color)',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }} className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ padding: '6px', background: 'var(--accent-primary)', borderRadius: '6px' }}>
            <Users size={18} color="white" />
          </div>
          <span style={{ fontSize: '16px', fontWeight: '700' }}>INTA CRM</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          style={{ padding: '8px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}
        >
          <div style={{ width: '20px', height: '2px', background: 'var(--brand-blue)', marginBottom: '4px' }}></div>
          <div style={{ width: '20px', height: '2px', background: 'var(--brand-blue)', marginBottom: '4px' }}></div>
          <div style={{ width: '20px', height: '2px', background: 'var(--brand-blue)' }}></div>
        </button>
      </div>

      <aside style={{ 
        width: '280px', 
        borderRight: '1px solid var(--border-color)', 
        padding: '32px 20px',
        display: isMobileMenuOpen ? 'flex' : 'flex', // Handled by CSS media query
        flexDirection: 'column',
        background: 'var(--bg-secondary)',
        transition: 'all 0.3s ease'
      }} className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="mobile-hide" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '48px', padding: '0 12px' }}>
          <div style={{ padding: '8px', background: 'var(--accent-primary)', borderRadius: '8px' }}>
            <Users size={24} color="white" />
          </div>
          <span style={{ fontSize: '20px', fontWeight: '700' }}>INTA CRM</span>
        </div>

        <nav style={{ flex: 1, padding: '20px 0', borderTop: '1px solid var(--border-color)' }} onClick={() => setIsMobileMenuOpen(false)}>
          <SidebarLink to="/" icon={LayoutDashboard} label="Dashboard" />
          {user?.permissions?.leads?.view !== false && <SidebarLink to="/leads" icon={Users} label="Table View" />}
          {user?.permissions?.pipeline?.view !== false && <SidebarLink to="/pipeline" icon={Trello} label="Sales Pipeline" />}
          {user?.permissions?.reports?.view !== false && <SidebarLink to="/reports" icon={BarChart3} label="Analytics" />}
          {user?.permissions?.campaigns?.view !== false && <SidebarLink to="/campaigns" icon={Megaphone} label="Campaigns" />}
          <SidebarLink to="/tasks" icon={Trello} label="Team Tasks" />
          <SidebarLink to="/inventory" icon={Database} label="Asset Management" />
          {user?.role === 'admin' && <SidebarLink to="/settings" icon={SettingsIcon} label="Settings" />}
        </nav>

        <div style={{ padding: '20px 0', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ width: '40px', height: '40px', background: 'var(--bg-tertiary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'var(--brand-blue)' }}>
              {user.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '14px', fontWeight: '600' }}>{user.username}</p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                {user.role === 'admin' ? 'Super Admin' : user.role === 'manager' ? 'Dept Manager' : 'Sales Agent'}
              </p>
            </div>
          </div>
          <button onClick={logout} style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            color: 'var(--danger)', 
            background: 'none',
            fontSize: '14px',
            fontWeight: '600',
            width: '100%',
            padding: '8px 0'
          }}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>
      <main style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-primary)' }}>
        {children}
      </main>
    </div>
  );
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
      <Route path="/leads" element={<ProtectedLayout><Leads /></ProtectedLayout>} />
      <Route path="/leads/import" element={<ProtectedLayout><ImportLeads /></ProtectedLayout>} />
      <Route path="/leads/:id" element={<ProtectedLayout><LeadDetails /></ProtectedLayout>} />
      <Route path="/pipeline" element={<ProtectedLayout><Pipeline /></ProtectedLayout>} />
      <Route path="/settings" element={<ProtectedLayout><Settings /></ProtectedLayout>} />
      <Route path="/settings/stages" element={<ProtectedLayout><LeadStageSettings /></ProtectedLayout>} />
      <Route path="/settings/users" element={<ProtectedLayout><UserManagement /></ProtectedLayout>} />
      <Route path="/settings/custom-fields" element={<ProtectedLayout><CustomFieldSettings /></ProtectedLayout>} />
      <Route path="/settings/workflows" element={<ProtectedLayout><WorkflowSettings /></ProtectedLayout>} />
      <Route path="/settings/integrations" element={<ProtectedLayout><Integrations /></ProtectedLayout>} />
      <Route path="/campaigns" element={<ProtectedLayout><Campaigns /></ProtectedLayout>} />
      <Route path="/reports" element={<ProtectedLayout><Reports /></ProtectedLayout>} />
      <Route path="/tasks" element={<ProtectedLayout><InternalTasks /></ProtectedLayout>} />
      <Route path="/inventory" element={<ProtectedLayout><Assets /></ProtectedLayout>} />
    </Routes>
  );
}

export default App;
