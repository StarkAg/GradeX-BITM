import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import ConfirmModal from './ConfirmModal';

export default function UserSection({ isCollapsed, onLogout }) {
  const [userData, setUserData] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, inputValue: '' });
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    loadUserData();
    
    const handleStorageChange = () => {
        loadUserData();
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
      const handleEscape = (e) => {
        if (e.key === 'Escape') setShowModal(false);
      };
      window.addEventListener('keydown', handleEscape);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleEscape);
      };
    }
  }, [showModal]);

  function loadUserData() {
      const userId = localStorage.getItem('gradex_user_id');
    const username = localStorage.getItem('gradex_username');
    const name = localStorage.getItem('gradex_user_name');

    if (userId && username) {
      setUserData({
        id: userId,
        name: name || username,
        username: username
      });
    }
  }

  const handleSaveName = async () => {
    const userId = localStorage.getItem('gradex_user_id');
    if (!nameInput.trim() || !userId || savingName) return;
    
    setSavingName(true);
    try {
      await supabase
        .from('users')
        .update({ name: nameInput.trim() })
        .eq('id', userId);
      
      localStorage.setItem('gradex_user_name', nameInput.trim());
      setUserData(prev => ({ ...prev, name: nameInput.trim() }));
      setEditingName(false);
      window.dispatchEvent(new Event('storage'));
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
    setShowModal(false);
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

  if (!userData) return null;

  const userInitial = userData.name.charAt(0).toUpperCase();
  
  const formatDisplayName = (fullName) => {
    if (!fullName) return 'User';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}`;
  };
  
  const userDisplayName = formatDisplayName(userData.name);

  return (
    <>
      <div style={{
        padding: '8px',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: isCollapsed ? 'center' : 'flex-start',
        alignItems: 'center',
      }}>
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: isCollapsed ? '0' : '10px',
            padding: isCollapsed ? '8px' : '8px 12px',
            borderRadius: '8px',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            width: isCollapsed ? 'auto' : '100%',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          title={isCollapsed ? userData.name : 'View Profile'}
        >
          <div style={{
            width: isCollapsed ? '36px' : '32px',
            height: isCollapsed ? '36px' : '32px',
            borderRadius: '50%',
            background: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--bg-primary)',
            fontSize: isCollapsed ? '16px' : '14px',
            fontWeight: 600,
            flexShrink: 0,
          }}>
            {userInitial}
          </div>
          {!isCollapsed && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              minWidth: 0,
              flex: 1,
            }}>
              <span style={{
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {userDisplayName}
              </span>
                <span style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                @{userData.username}
                </span>
            </div>
          )}
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: 'var(--card-bg)',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              width: '90%',
              maxWidth: '400px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              padding: '24px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <h2 style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--bg-primary)',
                  fontSize: '18px',
                  fontWeight: 600,
                }}>
                  {userInitial}
                </div>
                Profile
              </h2>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Name */}
              <div>
                  <span style={{
                  fontSize: '11px',
                    color: 'var(--text-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontWeight: 600,
                  display: 'block',
                  marginBottom: '6px'
                  }}>
                    Name
                  </span>
                  {editingName ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="text"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveName();
                          if (e.key === 'Escape') {
                            setEditingName(false);
                            setNameInput(userData.name);
                          }
                        }}
                        autoFocus
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          fontSize: '16px',
                          fontWeight: 500,
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          background: 'var(--bg-primary)',
                          color: 'var(--text-primary)',
                          outline: 'none'
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
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                      </button>
                      <button
                        onClick={() => {
                          setEditingName(false);
                          setNameInput(userData.name);
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
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '16px',
                    color: 'var(--text-primary)',
                    fontWeight: 500,
                        flex: 1
                  }}>
                    {userData.name}
                  </span>
                      <button
                        onClick={() => {
                          setNameInput(userData.name);
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
                </div>
              )}
                </div>

              {/* Username */}
              <div>
                  <span style={{
                  fontSize: '11px',
                    color: 'var(--text-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontWeight: 600,
                  display: 'block',
                  marginBottom: '6px'
                }}>
                  Username
                  </span>
                  <span style={{
                    fontSize: '16px',
                    color: 'var(--text-primary)',
                    fontWeight: 500,
                  }}>
                  @{userData.username}
                  </span>
                </div>

              {/* Sign Out */}
              <button
                onClick={() => {
                  setShowModal(false);
                  onLogout();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: 600,
                  marginTop: '8px',
                  width: '100%',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                Sign Out
              </button>

              {/* Delete Account */}
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '14px',
                  borderRadius: '8px',
                  border: '1px solid #f87171',
                  background: 'transparent',
                  color: '#f87171',
                  cursor: deleting ? 'wait' : 'pointer',
                  fontSize: '15px',
                  fontWeight: 600,
                  width: '100%',
                  transition: 'all 0.2s ease',
                  opacity: deleting ? 0.6 : 1
                }}
                onMouseEnter={(e) => { if (!deleting) e.currentTarget.style.background = 'rgba(248, 113, 113, 0.1)'; }}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                {deleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}

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
    </>
  );
}
