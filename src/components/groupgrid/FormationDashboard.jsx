import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../../lib/supabase';
import CreateGroupModal from './CreateGroupModal';
import * as XLSX from 'xlsx';

export default function FormationDashboard({ formation, groups, onClose }) {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [currentFormation, setCurrentFormation] = useState(formation);
  const [currentGroups, setCurrentGroups] = useState(groups);
  const [shareCopied, setShareCopied] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [totalStudents, setTotalStudents] = useState(0);
  const [maxGroups, setMaxGroups] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Detect mobile devices
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  // Fetch total students count for the section
  useEffect(() => {
    const fetchStudentCount = async () => {
      if (!currentFormation?.section_name) return;

      try {
        const response = await fetch(`/api/groupgrid?action=get-students&section_name=${encodeURIComponent(currentFormation.section_name)}`);
        const data = await response.json();
        
        if (data.status === 'ok') {
          const count = data.students?.length || 0;
          setTotalStudents(count);
          // Calculate max groups: ceil(total_students / members_per_team)
          // This allows the last group to have fewer members if needed
          const membersPerTeam = currentFormation.members_per_team || 3;
          const max = Math.ceil(count / membersPerTeam);
          setMaxGroups(max);
        }
      } catch (error) {
        console.error('Failed to fetch student count:', error);
      }
    };

    fetchStudentCount();
  }, [currentFormation]);

    const handleJoin = async () => {
    if (currentFormation.status !== 'open') {
      setJoinError('This formation is closed');
      return;
    }

    try {
      setJoining(true);
      setJoinError('');

      const response = await fetch('/api/groupgrid?action=join-formation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formation_id: currentFormation.id,
          user_id: currentUser?.id || null // Optional - will generate anonymous ID if null
        })
      });

      const data = await response.json();

      if (data.status === 'ok') {
        // Refresh formation data
        const refreshResponse = await fetch(`/api/groupgrid?action=get-formation-by-code&code=${currentFormation.formation_code}`);
        const refreshData = await refreshResponse.json();
        
        if (refreshData.status === 'ok') {
          setCurrentFormation(refreshData.formation);
          setCurrentGroups(refreshData.groups);
          setJoinError('');
        } else {
          setJoinError('Joined successfully, but failed to refresh. Please refresh the page.');
        }
      } else {
        setJoinError(data.error || 'Failed to join formation');
      }
    } catch (error) {
      console.error('Failed to join formation:', error);
      setJoinError('Failed to join. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  const isUserInFormation = () => {
    if (!currentUser) return false;
    return currentGroups.some(group => 
      group.members?.some(member => member.user_id === currentUser.id)
    );
  };

  const getUserGroup = () => {
    if (!currentUser) return null;
    return currentGroups.find(group => 
      group.members?.some(member => member.user_id === currentUser.id)
    );
  };

  const userGroup = getUserGroup();
  const userInFormation = isUserInFormation();

  const getShareUrl = () => {
    const code = currentFormation.formation_code;
    return `${window.location.origin}/groupgrid/${code}`;
  };

  const handleDownload = () => {
    try {
      // Sort groups by group_number (separate field, not extracted from title)
      const sortedGroups = [...currentGroups].sort((a, b) => {
        const aNum = a.group_number ?? Infinity;
        const bNum = b.group_number ?? Infinity;
        return aNum - bNum;
      });
      
      // Prepare Excel data (array of arrays)
      const excelData = [];
      
      // Add header row
      excelData.push(['Group Number', 'Group Title', 'Registration Number', 'Student Name']);
      
      // Add data rows
      sortedGroups.forEach((group) => {
        // Use group_number and title separately (not extracted from title)
        const groupNum = group.group_number ? `Group ${group.group_number}` : '';
        const groupTitle = group.title || ''; // Title is already just the custom part
        
        if (group.student_members && group.student_members.length > 0) {
          group.student_members.forEach((member) => {
            excelData.push([
              groupNum || '',
              groupTitle || '',
              member.registration_number || '',
              member.name || ''
            ]);
          });
        } else {
          // If no student members, still add a row for the group
          excelData.push([groupNum || '', groupTitle || '', '', '']);
        }
      });
      
      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(excelData);
      
      // Set column widths for better readability
      ws['!cols'] = [
        { wch: 12 }, // Group Number
        { wch: 30 }, // Group Title
        { wch: 20 }, // Registration Number
        { wch: 40 }  // Student Name
      ];
      
      // Apply styling to all cells
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      for (let row = range.s.r; row <= range.e.r; row++) {
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          if (!ws[cellAddress]) continue;
          
          const isHeaderRow = row === range.s.r;
          
          // Base style with borders
          const cellStyle = {
            alignment: {
              horizontal: 'center',
              vertical: 'center'
            },
            border: {
              top: { style: 'thin', color: { rgb: '000000' } },
              bottom: { style: 'thin', color: { rgb: '000000' } },
              left: { style: 'thin', color: { rgb: '000000' } },
              right: { style: 'thin', color: { rgb: '000000' } }
            }
          };
          
          // Header row styling: dark gray background, white text, bold
          if (isHeaderRow) {
            cellStyle.fill = {
              fgColor: { rgb: '404040' } // Dark gray background
            };
            cellStyle.font = {
              bold: true,
              color: { rgb: 'FFFFFF' } // White text
            };
          } else {
            // Data row styling: white background, black text
            cellStyle.fill = {
              fgColor: { rgb: 'FFFFFF' } // White background
            };
            cellStyle.font = {
              color: { rgb: '000000' } // Black text
            };
          }
          
          ws[cellAddress].s = cellStyle;
        }
      }
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Groups');
      
      // Generate filename
      const sectionName = (currentFormation.section_name || 'Section').replace(/[^a-z0-9]/gi, '_');
      const subjectName = (currentFormation.subject_name || 'Subject').replace(/[^a-z0-9]/gi, '_');
      const filename = `Formation_${sectionName}_${subjectName}_${currentFormation.formation_code}.xlsx`;
      
      // Write file and trigger download
      XLSX.writeFile(wb, filename);
    } catch (error) {
      console.error('Failed to download Excel:', error);
      alert('Failed to download formation data. Please try again.');
    }
  };

  const handleDeleteGroup = async () => {
    if (deleteConfirmText !== 'DELETE') {
      return; // Cannot delete without typing DELETE
    }

    if (!groupToDelete) return;

    try {
      setDeleting(true);
      
      const response = await fetch('/api/groupgrid?action=delete-group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: groupToDelete.id })
      });

      const data = await response.json();

      if (data.status === 'ok') {
        // Refresh formation data
        const refreshResponse = await fetch(`/api/groupgrid?action=get-formation-by-code&code=${currentFormation.formation_code}`);
        const refreshData = await refreshResponse.json();
        
        if (refreshData.status === 'ok') {
          setCurrentFormation(refreshData.formation);
          setCurrentGroups(refreshData.groups);
        }
        
        setShowDeleteModal(false);
        setGroupToDelete(null);
        setDeleteConfirmText('');
      } else {
        alert(data.error || 'Failed to delete group');
      }
    } catch (error) {
      console.error('Failed to delete group:', error);
      alert('Failed to delete group. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = getShareUrl();
    const shareText = `Join my group formation: ${currentFormation.section_name || 'Section'} - ${currentFormation.subject_name || 'Subject'}\nCode: ${currentFormation.formation_code}\n${shareUrl}`;

    // Check if Web Share API is available (mobile devices)
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'GroupGrid Formation',
          text: shareText,
          url: shareUrl
        });
        return;
      } catch (error) {
        // User cancelled or error occurred, fall back to clipboard
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      }
    }

    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      } catch (err) {
        console.error('Fallback copy failed:', err);
        alert('Failed to copy link. Please copy manually: ' + shareUrl);
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <>
      <style>{`
        /* Disable all hover effects in Groups section - Maximum specificity */
        .groupgrid-shell .groups-section,
        .groupgrid-shell .groups-section *,
        .groupgrid-shell .groups-section *::before,
        .groupgrid-shell .groups-section *::after {
          transition: none !important;
          -webkit-transition: none !important;
          -moz-transition: none !important;
          -o-transition: none !important;
          animation: none !important;
        }
        .groupgrid-shell .groups-section .groupgrid-button:hover:not(:disabled),
        .groupgrid-shell .groups-section .groupgrid-button:focus:not(:disabled),
        .groupgrid-shell .groups-section .groupgrid-button:focus-visible:not(:disabled),
        .groupgrid-shell .groups-section .groupgrid-button:active:not(:disabled) {
          background: #fff !important;
          color: #000 !important;
          transform: none !important;
          box-shadow: none !important;
          border-color: var(--border-color) !important;
          opacity: 1 !important;
          transition: none !important;
          filter: none !important;
        }
        .groupgrid-shell .groups-section button:hover,
        .groupgrid-shell .groups-section button:focus,
        .groupgrid-shell .groups-section button:active,
        .groupgrid-shell .groups-section button:focus-visible {
          background: #fff !important;
          color: #000 !important;
          opacity: 1 !important;
          transform: none !important;
          box-shadow: none !important;
          transition: none !important;
          filter: none !important;
        }
        .groupgrid-shell .groups-section > div > div:hover,
        .groupgrid-shell .groups-section > div > div:focus,
        .groupgrid-shell .groups-section > div > div:active,
        .groupgrid-shell .groups-section div[style*="border"]:hover,
        .groupgrid-shell .groups-section div[style*="border"]:focus,
        .groupgrid-shell .groups-section div[style*="border"]:active,
        .groupgrid-shell .groups-section div:hover {
          background: inherit !important;
          transform: none !important;
          box-shadow: none !important;
          border-color: var(--border-color) !important;
          transition: none !important;
          filter: none !important;
        }
      `}</style>
      <div className="groupgrid-shell" style={{ 
        position: 'relative', 
        maxWidth: '100%', 
        margin: 0, 
        padding: isMobile ? '10px' : 'clamp(12px, 3vw, 24px)'
      }}>
        <div className="groupgrid-hero" style={{ position: 'relative' }}>
        <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between', 
          alignItems: isMobile ? 'stretch' : 'center', 
          width: '100%', 
          gap: isMobile ? '12px' : '20px', 
          paddingLeft: isMobile ? '0' : '16px' 
        }}>
          <div style={{ 
            textAlign: 'left',
            paddingLeft: isMobile ? '0' : '20px',
            flex: 1,
          }}>
            <h2 style={{ 
              margin: '0 0 8px 0',
              fontSize: isMobile ? '18px' : undefined,
              lineHeight: isMobile ? '1.3' : undefined,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                onClick={onClose}
                style={{
                  cursor: 'pointer',
                  opacity: 0.5,
                  transition: 'opacity 0.2s ease',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.5'}
              >
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              {currentFormation.section_name || 'Section'} - {currentFormation.subject_name || 'Subject'}
            </h2>
            <h3 className="groupgrid-hero-subtitle" style={{ 
              textAlign: 'left', 
              margin: '0 0 12px 0',
              fontSize: isMobile ? '13px' : undefined,
            }}>
              Formation Code: {currentFormation.formation_code}
            </h3>
            <div style={{ 
              display: 'flex', 
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '8px' : '24px', 
              fontSize: isMobile ? '12px' : '14px',
              color: 'var(--text-secondary)',
              flexWrap: 'wrap'
            }}>
              <div>
                <strong>Members per Team:</strong> {currentFormation.members_per_team}
              </div>
              <div>
                <strong>Status:</strong>
                <span style={{ 
                  color: currentFormation.status === 'open' ? '#22c55e' : '#ef4444',
                  marginLeft: '8px',
                  fontWeight: 'bold'
                }}>
                  {currentFormation.status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
          <div style={{
            display: 'flex',
            gap: isMobile ? '8px' : '10px',
            flexDirection: isMobile ? 'column' : 'row',
            width: isMobile ? '100%' : 'auto',
          }}>
            <button
              className="groupgrid-button"
              onClick={handleDownload}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                background: 'var(--card-bg)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                flexShrink: 0,
                width: isMobile ? '100%' : 'auto',
                padding: isMobile ? '10px 14px' : '10px 14px',
                fontSize: isMobile ? '13px' : '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--hover-bg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--card-bg)';
              }}
            >
              <svg width={isMobile ? '14' : '16'} height={isMobile ? '14' : '16'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Download Excel
            </button>
            <button
              className="groupgrid-button"
              onClick={handleShare}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: shareCopied ? '#22c55e' : 'var(--accent-color)',
                color: '#fff',
                border: 'none',
                flexShrink: 0,
                width: isMobile ? '100%' : 'auto',
                padding: isMobile ? '10px 14px' : undefined,
                fontSize: isMobile ? '13px' : undefined,
              }}
            >
              <svg width={isMobile ? '14' : '16'} height={isMobile ? '14' : '16'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {shareCopied ? (
                  <polyline points="20 6 9 17 4 12"></polyline>
                ) : (
                  <>
                    <circle cx="18" cy="5" r="3"></circle>
                    <circle cx="6" cy="12" r="3"></circle>
                    <circle cx="18" cy="19" r="3"></circle>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                  </>
                )}
              </svg>
              {shareCopied ? 'Copied!' : 'Share'}
            </button>
          </div>
        </div>
      </div>

      {currentFormation.status === 'closed' && !userInFormation && (
        <div className="groupgrid-card" style={{ marginTop: isMobile ? '12px' : '20px' }}>
          <div style={{ padding: isMobile ? '12px' : '20px' }}>
            <div style={{
              padding: isMobile ? '10px' : '12px',
              background: 'var(--hover-bg)',
              borderRadius: '8px',
              color: 'var(--text-secondary)',
              fontSize: isMobile ? '12px' : undefined,
            }}>
              This formation is closed. No new members can join.
            </div>
          </div>
        </div>
      )}

      {(() => {
        // Find duplicate student names across all groups
        // Use a Set to track which (name, groupId) pairs we've seen to avoid counting same student twice in same group
        const nameToGroups = new Map(); // name -> array of {groupId, groupNumber, groupTitle}
        const seenInGroup = new Set(); // Set of "name|groupId" to track duplicates within same group
        
        currentGroups.forEach(group => {
          if (group.student_members) {
            group.student_members.forEach(member => {
              const name = member.name?.trim();
              if (name) {
                const key = `${name}|${group.id}`;
                // Only process each name once per group (avoid counting same student twice in same group)
                if (!seenInGroup.has(key)) {
                  seenInGroup.add(key);
                  
                if (!nameToGroups.has(name)) {
                  nameToGroups.set(name, []);
                }
                const existing = nameToGroups.get(name);
                  // Only add this group once per name
                if (!existing.find(g => g.groupId === group.id)) {
                  existing.push({
                    groupId: group.id,
                      groupNumber: group.group_number,
                      groupTitle: group.title
                  });
                  }
                }
              }
            });
          }
        });
        
        // Find names that appear in multiple groups
        const duplicateNames = Array.from(nameToGroups.entries())
          .filter(([name, groups]) => groups.length > 1);
        
        return duplicateNames.length > 0 ? (
          <div className="groupgrid-card" style={{ marginTop: isMobile ? '12px' : '20px' }}>
            <div className="groupgrid-card-header" style={{ marginBottom: isMobile ? '10px' : '12px' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: isMobile ? '6px' : '8px',
                color: '#f87171',
                fontWeight: '600',
                fontSize: isMobile ? '11px' : '13px',
                letterSpacing: '0.05em',
                textTransform: 'uppercase'
              }}>
                <svg width={isMobile ? '14' : '16'} height={isMobile ? '14' : '16'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                Duplicate Names Found
              </div>
            </div>
            <div style={{ padding: isMobile ? '0 12px 12px 12px' : '0 20px 20px 20px' }}>
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: isMobile ? '6px' : '4px'
              }}>
                {duplicateNames.map(([name, groups]) => (
                  <div key={name} style={{
                    padding: isMobile ? '8px 10px' : '10px 14px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    borderRadius: '8px',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    fontSize: isMobile ? '11px' : '13px',
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    alignItems: isMobile ? 'flex-start' : 'center',
                    gap: isMobile ? '4px' : '8px',
                    flexWrap: 'wrap'
                  }}>
                    <span style={{ 
                      fontWeight: '600', 
                      color: '#f87171',
                      fontSize: isMobile ? '11px' : undefined,
                    }}>
                      {name}
                    </span>
                    <span style={{ 
                      color: 'var(--text-secondary)', 
                      fontSize: isMobile ? '10px' : '12px'
                    }}>
                      appears in: {groups.map(g => {
                        // Use group_number if available, otherwise use title, otherwise fallback
                        if (g.groupNumber !== null && g.groupNumber !== undefined) {
                          return `Group ${g.groupNumber}`;
                        } else if (g.groupTitle) {
                          return g.groupTitle;
                        } else {
                          return `Group (ID: ${g.groupId.slice(0, 8)}...)`;
                        }
                      }).join(', ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null;
      })()}

      <div className="groupgrid-card groups-section" style={{ marginTop: isMobile ? '12px' : '20px' }}>
        <div className="groupgrid-card-header" style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between', 
          alignItems: isMobile ? 'stretch' : 'center',
          gap: isMobile ? '12px' : undefined,
        }}>
          <div>
            <h4 style={{ fontSize: isMobile ? '16px' : undefined, margin: 0 }}>
              Groups ({currentGroups.length}{maxGroups > 0 ? ` / ${maxGroups}` : ''})
            </h4>
            {maxGroups > 0 && (
              <div style={{ 
                fontSize: isMobile ? '10px' : '12px', 
                color: 'var(--text-secondary)', 
                marginTop: '4px',
                lineHeight: isMobile ? '1.3' : undefined,
              }}>
                Max groups: {maxGroups} (based on {totalStudents} students ÷ {currentFormation.members_per_team} per team)
              </div>
            )}
          </div>
          <button
            className="groupgrid-button"
            onClick={() => {
              if (maxGroups > 0 && currentGroups.length >= maxGroups) {
                alert(`Maximum ${maxGroups} groups allowed. You have ${totalStudents} students and ${currentFormation.members_per_team} members per team.`);
                return;
              }
              setShowCreateGroupModal(true);
            }}
            disabled={maxGroups > 0 && currentGroups.length >= maxGroups}
            style={{
              fontSize: isMobile ? '12px' : '14px',
              padding: isMobile ? '10px 14px' : '8px 16px',
              opacity: (maxGroups > 0 && currentGroups.length >= maxGroups) ? 0.5 : 1,
              cursor: (maxGroups > 0 && currentGroups.length >= maxGroups) ? 'not-allowed' : 'pointer',
              background: '#fff',
              color: '#000',
              transform: 'none',
              boxShadow: 'none',
              border: '1px solid var(--border-color)',
              width: isMobile ? '100%' : 'auto',
            }}
          >
            + Create a new Group
          </button>
        </div>
        <div style={{ padding: isMobile ? '12px' : '20px' }}>
          {currentGroups.length === 0 ? (
            <p style={{ 
              color: 'var(--text-secondary)',
              fontSize: isMobile ? '12px' : undefined,
            }}>
              No groups formed yet.
            </p>
          ) : (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
              gap: isMobile ? '12px' : '16px'
            }}>
              {[...currentGroups].sort((a, b) => {
                  // Sort by group_number (separate field, not extracted from title)
                  const aNum = a.group_number ?? Infinity;
                  const bNum = b.group_number ?? Infinity;
                  return aNum - bNum;
                }).map((group, index) => {
                  // Display: "Group {number}" or "Group {number} - {title}"
                  const groupNumber = group.group_number;
                  const customTitle = group.title;
                  const displayTitle = groupNumber 
                    ? (customTitle ? `Group ${groupNumber} - ${customTitle}` : `Group ${groupNumber}`)
                    : (customTitle || `Group ${index + 1}`);
                  
                  return (
                    <div
                      key={group.id}
                      style={{
                        padding: isMobile ? '12px' : '14px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        background: userGroup?.id === group.id ? 'var(--hover-bg)' : 'var(--bg-primary)',
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative'
                      }}
                    >
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: isMobile ? 'column' : 'row',
                      justifyContent: 'space-between', 
                      alignItems: isMobile ? 'flex-start' : 'center', 
                      marginBottom: isMobile ? '12px' : '10px',
                      gap: isMobile ? '8px' : undefined,
                    }}>
                      <strong style={{ 
                        fontSize: isMobile ? '14px' : '15px', 
                        color: 'var(--text-primary)',
                        lineHeight: isMobile ? '1.3' : undefined,
                      }}>
                        {displayTitle}
                      </strong>
                      <div style={{ 
                        display: 'flex', 
                        gap: isMobile ? '8px' : '6px', 
                        alignItems: 'center',
                        width: isMobile ? '100%' : 'auto',
                      }}>
                        <span style={{ 
                          fontSize: isMobile ? '11px' : '12px', 
                          background: group.member_count >= currentFormation.members_per_team ? '#ef4444' : '#22c55e',
                          color: '#fff',
                          padding: isMobile ? '6px 10px' : '4px 8px',
                          borderRadius: '4px',
                          fontWeight: 'bold',
                          flexShrink: 0,
                        }}>
                          {group.member_count}/{currentFormation.members_per_team}
                        </span>
                        <button
                          onClick={() => {
                            setEditingGroup(group);
                            setShowCreateGroupModal(true);
                          }}
                          style={{
                            background: 'var(--accent-color)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            padding: isMobile ? '6px 10px' : '4px 8px',
                            fontSize: isMobile ? '11px' : '11px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: isMobile ? '4px' : '4px',
                            flex: isMobile ? 1 : 'none',
                            justifyContent: isMobile ? 'center' : undefined,
                          }}
                          title="Edit group"
                        >
                          <svg width={isMobile ? '14' : '12'} height={isMobile ? '14' : '12'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setGroupToDelete(group);
                            setShowDeleteModal(true);
                            setDeleteConfirmText('');
                          }}
                          style={{
                            background: 'transparent',
                            color: 'var(--text-secondary)',
                            border: 'none',
                            borderRadius: '4px',
                            padding: isMobile ? '6px' : '4px 6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: 0.5,
                            transition: 'opacity 0.2s, color 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = '1';
                            e.currentTarget.style.color = '#ef4444';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = '0.5';
                            e.currentTarget.style.color = 'var(--text-secondary)';
                          }}
                          title="Delete group"
                        >
                          <svg width={isMobile ? '16' : '14'} height={isMobile ? '16' : '14'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                          </svg>
                        </button>
                      </div>
                    </div>
                    {(group.student_members && group.student_members.length > 0) && (
                      <div style={{ 
                        fontSize: isMobile ? '12px' : '13px', 
                        color: 'var(--text-primary)', 
                        marginTop: isMobile ? '8px' : '4px', 
                        flex: 1 
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '6px' : '4px' }}>
                          {group.student_members.map((member, idx) => {
                            // Check if the CURRENT member is "Harsh Agarwal" (case-insensitive)
                            const isHarshAgarwal = member.name && member.name.toLowerCase().includes('harsh agarwal');
                            const borderColor = isHarshAgarwal ? '#998100' : 'var(--border-color)';
                            
                            return (
                            <div key={member.id || idx} style={{ 
                              padding: isMobile ? '8px 10px' : '6px 8px', 
                              background: 'var(--hover-bg)', 
                              borderRadius: '6px',
                              fontSize: isMobile ? '11px' : '12px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '3px',
                              border: `1px solid ${borderColor}`
                            }}>
                              <span style={{ 
                                fontWeight: '700', 
                                color: 'var(--text-primary)', 
                                fontSize: isMobile ? '12px' : '13px',
                                wordBreak: 'break-word',
                              }}>
                                {member.registration_number}
                              </span>
                              <span style={{ 
                                color: 'var(--text-secondary)', 
                                fontSize: isMobile ? '10px' : '11px',
                                wordBreak: 'break-word',
                                lineHeight: isMobile ? '1.4' : undefined,
                              }}>
                                {member.name || 'N/A'}
                              </span>
                            </div>
                          );
                          })}
                        </div>
                      </div>
                    )}
                    {group.members && group.members.length > 0 && group.student_members?.length === 0 && (
                      <div style={{ 
                        fontSize: isMobile ? '12px' : '13px', 
                        color: 'var(--text-secondary)', 
                        marginTop: '4px' 
                      }}>
                        Members: {group.members.length}
                      </div>
                    )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {showCreateGroupModal && (
        <CreateGroupModal
          formation={currentFormation}
          editingGroup={editingGroup}
          existingGroupsCount={currentGroups.length}
          existingGroupNumbers={currentGroups.map(group => group.group_number).filter(num => num !== null && num !== undefined)}
          onClose={() => {
            setShowCreateGroupModal(false);
            setEditingGroup(null);
          }}
          onSuccess={async () => {
            // Refresh formation data after creating/editing group
            try {
              const refreshResponse = await fetch(`/api/groupgrid?action=get-formation-by-code&code=${currentFormation.formation_code}`);
              const refreshData = await refreshResponse.json();
              
              if (refreshData.status === 'ok') {
                setCurrentFormation(refreshData.formation);
                setCurrentGroups(refreshData.groups);
              }
            } catch (error) {
              console.error('Failed to refresh formation:', error);
            }
            setEditingGroup(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && groupToDelete && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(5px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: isMobile ? 'flex-start' : 'center',
            justifyContent: 'center',
            padding: isMobile ? '10px 8px 80px 8px' : '20px',
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
          onClick={() => {
            if (!deleting) {
              setShowDeleteModal(false);
              setGroupToDelete(null);
              setDeleteConfirmText('');
            }
          }}
        >
          <div
            className="groupgrid-card"
            style={{
              maxWidth: isMobile ? '100%' : '500px',
              width: '100%',
              maxHeight: isMobile ? 'calc(100vh - 60px)' : 'auto',
              marginTop: isMobile ? '0' : 0,
              marginBottom: isMobile ? '10px' : 0,
              overflowY: 'auto',
              overflowX: 'hidden',
              position: 'relative',
              padding: isMobile ? '16px' : '24px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => {
                if (!deleting) {
                  setShowDeleteModal(false);
                  setGroupToDelete(null);
                  setDeleteConfirmText('');
                }
              }}
              disabled={deleting}
              style={{
                position: 'absolute',
                top: isMobile ? '12px' : '16px',
                right: isMobile ? '12px' : '16px',
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '50%',
                width: isMobile ? '28px' : '32px',
                height: isMobile ? '28px' : '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isMobile ? '20px' : '24px',
                color: 'var(--text-secondary)',
                cursor: deleting ? 'not-allowed' : 'pointer',
                padding: '0',
                lineHeight: 1,
                zIndex: 10,
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                opacity: deleting ? 0.5 : 1,
              }}
            >
              &times;
            </button>

            <div className="groupgrid-card-header" style={{ 
              marginBottom: isMobile ? '16px' : '20px',
              paddingRight: isMobile ? '36px' : '40px',
            }}>
              <h4 style={{ fontSize: isMobile ? '18px' : '20px', margin: 0, color: '#ef4444' }}>
                Delete Group
              </h4>
            </div>

            <div style={{ marginBottom: isMobile ? '20px' : '24px' }}>
              <p style={{ 
                fontSize: isMobile ? '14px' : '15px', 
                color: 'var(--text-primary)',
                marginBottom: '16px',
                lineHeight: '1.5'
              }}>
                Are you sure you want to delete this group? This action cannot be undone.
              </p>
              <p style={{ 
                fontSize: isMobile ? '13px' : '14px', 
                color: 'var(--text-secondary)',
                marginBottom: '20px',
                fontWeight: '600'
              }}>
                Type <strong style={{ color: '#ef4444' }}>DELETE</strong> to confirm:
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => {
                  // Prevent paste by only allowing typing
                  if (e.nativeEvent.inputType === 'insertFromPaste') {
                    e.preventDefault();
                    return;
                  }
                  setDeleteConfirmText(e.target.value);
                }}
                onPaste={(e) => {
                  e.preventDefault(); // Block paste
                }}
                placeholder="Type DELETE here"
                autoFocus
                disabled={deleting}
                style={{
                  width: '100%',
                  padding: isMobile ? '12px' : '14px',
                  fontSize: isMobile ? '16px' : '16px',
                  border: `2px solid ${deleteConfirmText === 'DELETE' ? '#22c55e' : (deleteConfirmText ? '#ef4444' : 'var(--border-color)')}`,
                  borderRadius: '8px',
                  background: 'var(--card-bg)',
                  color: 'var(--text-primary)',
                  fontFamily: 'monospace',
                  fontWeight: '600',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  opacity: deleting ? 0.6 : 1,
                }}
              />
            </div>

            <div style={{ 
              display: 'flex', 
              gap: '12px',
              flexDirection: isMobile ? 'column' : 'row',
            }}>
              <button
                onClick={() => {
                  if (!deleting) {
                    setShowDeleteModal(false);
                    setGroupToDelete(null);
                    setDeleteConfirmText('');
                  }
                }}
                disabled={deleting}
                className="groupgrid-secondary"
                style={{
                  flex: isMobile ? 1 : 'none',
                  padding: isMobile ? '12px' : undefined,
                  opacity: deleting ? 0.5 : 1,
                  cursor: deleting ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteGroup}
                disabled={deleting || deleteConfirmText !== 'DELETE'}
                style={{
                  background: deleteConfirmText === 'DELETE' ? '#ef4444' : '#999',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: isMobile ? '12px 20px' : '10px 20px',
                  fontSize: isMobile ? '14px' : '15px',
                  fontWeight: '600',
                  cursor: (deleting || deleteConfirmText !== 'DELETE') ? 'not-allowed' : 'pointer',
                  flex: isMobile ? 1 : 'none',
                  transition: 'background 0.2s',
                  opacity: deleting ? 0.6 : 1,
                }}
              >
                {deleting ? 'Deleting...' : 'Delete Group'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}

