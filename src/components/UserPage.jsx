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
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, inputValue: '' });
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const navigate = useNavigate();

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Lock scroll on mobile
  useEffect(() => {
    if (isMobile) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalBodyHeight = document.body.style.height;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      const originalHtmlHeight = document.documentElement.style.height;
      
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100dvh';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.height = '100dvh';
      
      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.body.style.height = originalBodyHeight;
        document.body.style.position = '';
        document.body.style.width = '';
        document.documentElement.style.overflow = originalHtmlOverflow;
        document.documentElement.style.height = originalHtmlHeight;
      };
    }
  }, [isMobile]);

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

  const handleSaveName = async () => {
    if (!nameInput.trim() || !userData?.id || savingName) return;
    
    setSavingName(true);
    try {
      await supabase
        .from('users')
        .update({ name: nameInput.trim() })
        .eq('id', userData.id);
      
      localStorage.setItem('gradex_user_name', nameInput.trim());
      setUserData(prev => ({ ...prev, name: nameInput.trim() }));
      setEditingName(false);
    } catch (err) {
      console.error('Error saving name:', err);
    } finally {
      setSavingName(false);
    }
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
      // Delete all user data immediately - await each to ensure completion
      await supabase.from('daily_attendance').delete().eq('user_id', userId);
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
      padding: isMobile ? '16px' : '20px',
      paddingBottom: isMobile ? `calc(20px + env(safe-area-inset-bottom, 0px))` : '20px',
      height: isMobile ? 'calc(100dvh - 50px - 70px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))' : 'auto',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      overflow: 'hidden'
    }}>
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: isMobile ? '24px 20px' : '40px',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: isMobile ? '12px' : '20px',
        }}>
          {/* Avatar */}
          <div style={{
            width: isMobile ? '70px' : '100px',
            height: isMobile ? '70px' : '100px',
            borderRadius: '50%',
            background: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: isMobile ? '28px' : '40px',
            fontWeight: 600,
            color: 'var(--bg-primary)',
          }}>
            {(userData.name || userData.username || 'U').charAt(0).toUpperCase()}
          </div>

          {/* Name & Username */}
          <div style={{ textAlign: 'center', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '4px' }}>
              {editingName ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', maxWidth: '300px' }}>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName();
                      if (e.key === 'Escape') {
                        setEditingName(false);
                        setNameInput(userData.name || userData.username);
                      }
                    }}
                    autoFocus
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      fontSize: isMobile ? '22px' : '28px',
                      fontWeight: 600,
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      outline: 'none',
                      textAlign: 'center'
                    }}
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={savingName || !nameInput.trim()}
                    style={{
                      padding: '8px',
                      border: 'none',
                      background: '#4ade80',
                      color: '#000',
                      borderRadius: '6px',
                      cursor: savingName || !nameInput.trim() ? 'not-allowed' : 'pointer',
                      opacity: savingName || !nameInput.trim() ? 0.5 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                  </button>
                  <button
                    onClick={() => {
                      setEditingName(false);
                      setNameInput(userData.name || userData.username);
                    }}
                    style={{
                      padding: '8px',
                      border: '1px solid var(--border-color)',
                      background: 'transparent',
                      color: 'var(--text-secondary)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ) : (
                <>
            <h1 style={{
                    fontSize: isMobile ? '22px' : '28px',
                    fontWeight: 600,
                    margin: 0,
              color: 'var(--text-primary)',
            }}>
                    {userData.name || userData.username}
            </h1>
                  <button
                    onClick={() => {
                      setNameInput(userData.name || userData.username);
                      setEditingName(true);
                    }}
                    style={{
                      padding: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'transparent',
                      color: 'var(--text-secondary)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--hover-bg)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                    title="Edit Name"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                </>
              )}
            </div>
            <p style={{
              fontSize: isMobile ? '12px' : '14px',
              color: 'var(--text-secondary)',
              margin: 0,
            }}>
              @{userData.username}
            </p>
          </div>

          {/* Account Info */}
          <div style={{
            width: '100%',
            padding: isMobile ? '12px' : '16px',
            background: 'var(--hover-bg)',
            borderRadius: '8px',
          }}>
            <div style={{
              fontSize: '11px',
                color: 'var(--text-tertiary)',
                textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '6px'
              }}>
              Account Type
              </div>
              <div style={{
              fontSize: isMobile ? '12px' : '14px',
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
                marginTop: '8px',
              padding: isMobile ? '10px 20px' : '12px 24px',
              fontSize: isMobile ? '13px' : '14px',
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
              padding: isMobile ? '10px 20px' : '12px 24px',
              fontSize: isMobile ? '13px' : '14px',
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
