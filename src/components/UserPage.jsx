import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ConfirmModal from './ConfirmModal';

/**
 * UserPage - Profile page for logged-in users
 */

export default function UserPage() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ subjects: 0, totalClasses: 0 });
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, inputValue: '' });
  const navigate = useNavigate();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const userId = localStorage.getItem('gradex_user_id');
    const username = localStorage.getItem('gradex_username');
    const name = localStorage.getItem('gradex_user_name');

    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      // Get user data
      const { data: user } = await supabase
        .from('users')
        .select('id, username, name, created_at')
        .eq('id', userId)
        .maybeSingle();

      if (user) {
        setUserData({
          id: user.id,
          username: user.username || username,
          name: user.name || name || username
        });
      }

      // Get stats
      const { data: subjects } = await supabase
        .from('subjects')
        .select('id')
        .eq('user_id', userId);

      const { data: attendance } = await supabase
        .from('manual_attendance')
        .select('classes_conducted')
        .eq('user_id', userId);

      const totalClasses = attendance?.reduce((sum, a) => sum + (a.classes_conducted || 0), 0) || 0;

      setStats({
        subjects: subjects?.length || 0,
        totalClasses
      });
    } catch (err) {
      console.error('Error loading user:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('gradex_user_id');
    localStorage.removeItem('gradex_username');
    localStorage.removeItem('gradex_user_name');
    localStorage.removeItem('gradex_user_email');
    localStorage.removeItem('gradex-attendance');
    localStorage.removeItem('gradex-courses');
    localStorage.removeItem('gradex_subjects');
    localStorage.removeItem('gradex_timetable');
    
    window.dispatchEvent(new Event('storage'));
    window.location.reload();
  };

  const handleDeleteAccount = () => {
    setDeleteConfirm({ open: true, inputValue: '' });
  };

  const confirmDeleteAccount = async () => {
    const userId = localStorage.getItem('gradex_user_id');
    if (!userId) return;

    setDeleting(true);
    setDeleteConfirm({ open: false, inputValue: '' });
    try {
      await supabase.from('manual_attendance').delete().eq('user_id', userId);
      await supabase.from('user_subjects').delete().eq('user_id', userId);
      await supabase.from('users').delete().eq('id', userId);
      localStorage.clear();
      window.location.reload();
    } catch (err) {
      console.error('Error deleting account:', err);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 'calc(100vh - 200px)',
        padding: '40px',
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid var(--border-color)',
          borderTopColor: 'var(--text-primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!userData) {
    return (
      <div style={{
        maxWidth: '400px',
        margin: '40px auto',
        padding: '40px',
        textAlign: 'center',
        background: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px'
      }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
          Please sign in to view your profile
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: 500,
            border: 'none',
            background: 'var(--text-primary)',
            color: 'var(--bg-primary)',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '600px',
      margin: '0 auto',
      padding: '20px',
    }}>
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '40px',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
        }}>
          {/* Avatar */}
          <div style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '40px',
            fontWeight: 600,
            color: 'var(--bg-primary)',
          }}>
            {(userData.name || userData.username || 'U').charAt(0).toUpperCase()}
          </div>

          {/* Name & Username */}
          <div style={{ textAlign: 'center' }}>
            <h1 style={{
              fontSize: '28px',
              fontWeight: 600,
              margin: '0 0 4px 0',
              color: 'var(--text-primary)',
            }}>
              {userData.name || userData.username}
            </h1>
            <p style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              margin: 0,
            }}>
              @{userData.username}
            </p>
          </div>

          {/* Stats */}
          <div style={{
            width: '100%',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
            marginTop: '8px'
          }}>
            <div style={{
              padding: '20px',
              background: 'var(--hover-bg)',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '28px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                lineHeight: 1
              }}>
                {stats.subjects}
              </div>
              <div style={{
                fontSize: '11px',
                color: 'var(--text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginTop: '6px'
              }}>
                Subjects
              </div>
            </div>
            <div style={{
              padding: '20px',
              background: 'var(--hover-bg)',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '28px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                lineHeight: 1
              }}>
                {stats.totalClasses}
              </div>
              <div style={{
                fontSize: '11px',
                color: 'var(--text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginTop: '6px'
              }}>
                Classes Tracked
              </div>
            </div>
          </div>

          {/* Account Info */}
          <div style={{
            width: '100%',
            padding: '16px',
            background: 'var(--hover-bg)',
            borderRadius: '8px',
            marginTop: '8px'
          }}>
            <div style={{
              fontSize: '11px',
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '8px'
            }}>
              Account Type
            </div>
            <div style={{
              fontSize: '14px',
              color: 'var(--text-primary)',
              fontWeight: 500
            }}>
              Self-Managed • Cloud Sync Enabled
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            style={{
              marginTop: '12px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: 500,
              border: '1px solid var(--border-color)',
              background: 'transparent',
              color: 'var(--text-primary)',
              borderRadius: '8px',
              cursor: 'pointer',
              width: '100%',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            Sign Out
          </button>

          {/* Delete Account Button */}
          <button
            onClick={handleDeleteAccount}
            disabled={deleting}
            style={{
              marginTop: '8px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: 500,
              border: '1px solid #f87171',
              background: 'transparent',
              color: '#f87171',
              borderRadius: '8px',
              cursor: deleting ? 'wait' : 'pointer',
              width: '100%',
              transition: 'all 0.2s ease',
              opacity: deleting ? 0.6 : 1
            }}
            onMouseEnter={(e) => { if (!deleting) e.currentTarget.style.background = 'rgba(248, 113, 113, 0.1)'; }}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            {deleting ? 'Deleting...' : 'Delete Account'}
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={deleteConfirm.open}
        title="Delete Account"
        message="This will permanently delete all your data including subjects, attendance records, and timetable. This action cannot be undone."
        confirmText="Delete Account"
        isDanger={true}
        requireInput="DELETE"
        inputValue={deleteConfirm.inputValue}
        onInputChange={(val) => setDeleteConfirm(prev => ({ ...prev, inputValue: val }))}
        onConfirm={confirmDeleteAccount}
        onCancel={() => setDeleteConfirm({ open: false, inputValue: '' })}
      />
    </div>
  );
}
