import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Bell } from 'lucide-react';
import api from '../api/client';
import { useNavigate } from 'react-router-dom';

const NotificationManager = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    // Track notified reminders to avoid spam
    const notifiedSet = new Set();
    
    const checkReminders = async () => {
      try {
        const res = await api.get('reminders/?no_pagination=true');
        const now = new Date();
        
        // Handle both simple array and paginated results
        const remindersArr = Array.isArray(res.data) ? res.data : (res.data.results || []);
        
        remindersArr.forEach(rem => {
          if (rem.status === 'pending') {
            const scheduledTime = new Date(rem.scheduled_at);
            
            // If reminder is due or up to 60 mins past due, and we haven't notified yet.
            const timeDiff = now - scheduledTime;
            
            // Pop if due within last 60 minutes AND not yet popped this session
            // Also pop if it's due in the next 10 seconds to be proactive
            if (timeDiff >= -10000 && timeDiff <= 60 * 60 * 1000 && !notifiedSet.has(rem.id)) {
              notifiedSet.add(rem.id);
              
              toast.custom((t) => (
                <div 
                  className="glass-card" 
                  style={{ 
                    padding: '16px', 
                    display: 'flex', 
                    gap: '12px', 
                    alignItems: 'flex-start',
                    cursor: 'pointer',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                    borderLeft: '4px solid var(--brand-blue)'
                  }}
                  onClick={() => {
                    toast.dismiss(t.id);
                    navigate(`/leads/${rem.lead}`);
                  }}
                >
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-blue)' }}>
                    <Bell size={16} />
                  </div>
                  <div>
                    <h4 style={{ fontWeight: '700', fontSize: '14px', marginBottom: '4px' }}>Reminder Due!</h4>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{rem.note || 'You have a scheduled task.'}</p>
                    <p style={{ fontSize: '11px', color: 'var(--brand-blue)', marginTop: '8px', fontWeight: 'bold' }}>Click to view Lead</p>
                  </div>
                </div>
              ), { duration: 15000 });
            }
          }
        });
      } catch (err) {
        console.error('Failed to check reminders', err);
      }
    };

    checkReminders(); // Initial check
    const interval = setInterval(checkReminders, 1000); // Check every 1 second

    return () => clearInterval(interval);
  }, [user, navigate]);

  return null;
};

export default NotificationManager;
