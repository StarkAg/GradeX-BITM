import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import UserSection from './UserSection';

// Hook to detect mobile devices
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

const Icon = ({ children, size = 20 }) => (
  <span style={{ width: `${size}px`, height: `${size}px`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
    {children}
  </span>
);

const icons = {
  home: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
      <polyline points="9 22 9 12 15 12 15 22"></polyline>
    </svg>
  ),
  groupgrid: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"></rect>
      <rect x="14" y="3" width="7" height="7"></rect>
      <rect x="14" y="14" width="7" height="7"></rect>
      <rect x="3" y="14" width="7" height="7"></rect>
    </svg>
  ),
  subdeck: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
    </svg>
  ),
  feedfill: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  ),
  gradex: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
  ),
  timetable: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
  ),
  expenza: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"></line>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
    </svg>
  ),
  attendance: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  ),
  subjects: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      <line x1="8" y1="7" x2="16" y2="7"/>
      <line x1="8" y1="11" x2="16" y2="11"/>
      <line x1="8" y1="15" x2="12" y2="15"/>
    </svg>
  ),
  user: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  ),
  marks: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
  ),
  courses: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
    </svg>
  ),
  calendar: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
  ),
  messmenu: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"></path>
      <path d="M7 2v20"></path>
      <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3v0"></path>
    </svg>
  ),
  faculty: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
  ),
};

export default function Navigation({ onToggle, isCollapsed, navItems, isConnected, onLogout }) {
  const location = useLocation();
  const [isHovered, setIsHovered] = React.useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const isMobile = useIsMobile();

  const isActive = (path) => {
    const currentPath = location.pathname.toLowerCase();
    const itemPath = path.toLowerCase();
    return currentPath === itemPath || currentPath.startsWith(itemPath + '/');
  };

  // When collapsed, show expanded on hover; otherwise use actual state
  // On mobile, always show expanded (but as bottom bar)
  const shouldShowExpanded = isMobile ? true : (isCollapsed ? isHovered : true);
  const sidebarWidth = shouldShowExpanded ? '200px' : '60px';

  // Filter items - main items vs coming soon items
  const mainItems = navItems.filter(item => !item.comingSoon);
  const comingSoonItems = navItems.filter(item => item.comingSoon);

  // Mobile bottom bar layout
  if (isMobile) {
    const bottomBarItems = [...navItems.filter(item => !item.desktopOnly && !item.comingSoon), { id: 'user', label: 'Profile', path: '/user' }];

    return (
      <nav 
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          minHeight: '70px',
          background: 'var(--bg-primary)',
          borderTop: '1px solid var(--border-color)',
          paddingTop: '8px',
          paddingBottom: `max(8px, env(safe-area-inset-bottom, 0px))`,
          paddingLeft: 'env(safe-area-inset-left, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-evenly',
          overflow: 'hidden',
          boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
          margin: 0,
          boxSizing: 'border-box',
        }}
      >
        {bottomBarItems.map((item) => {
          const icon = icons[item.id] || icons.groupgrid;
          return (
            <Link
              key={item.id}
              to={item.path}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '6px 4px',
                borderRadius: '8px',
                textDecoration: 'none',
                color: isActive(item.path) ? 'var(--accent-color)' : 'var(--text-secondary)',
                background: isActive(item.path) ? 'var(--hover-bg)' : 'transparent',
                transition: 'all 0.2s ease',
                flex: 1,
              }}
            >
              <Icon size={20}>
                {icon}
              </Icon>
              <span style={{
                fontSize: '10px',
                fontWeight: isActive(item.path) ? 600 : 400,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '60px',
                textAlign: 'center'
              }}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    );
  }

  // Desktop sidebar layout
  return (
    <>
      <nav 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
        position: 'fixed',
        left: 0,
        top: '60px',
        bottom: 0,
        width: sidebarWidth,
        background: 'var(--bg-primary)',
        borderRight: '1px solid var(--border-color)',
        padding: '20px 0',
        zIndex: 100,
        overflowY: 'auto',
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        transition: 'width 0.3s ease',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        opacity: 1,
        justifyContent: 'space-between'
      }}>
        <style>{`
          nav::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        
        {/* Main Navigation Items */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          padding: shouldShowExpanded ? '0 12px' : '0',
          alignItems: shouldShowExpanded ? 'stretch' : 'center',
          flex: 1
        }}>
          {mainItems.map((item) => {
            const icon = icons[item.id] || icons.groupgrid;
            return (
              <Link
                key={item.id}
                to={item.path}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: shouldShowExpanded ? 'flex-start' : 'center',
              gap: shouldShowExpanded ? '12px' : '0',
              padding: '12px',
              borderRadius: '8px',
              textDecoration: 'none',
              color: isActive(item.path) ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: isActive(item.path) ? 'var(--hover-bg)' : 'transparent',
              transition: 'all 0.2s ease',
              fontSize: '14px',
              fontWeight: isActive(item.path) ? 500 : 400,
              position: 'relative',
              width: shouldShowExpanded ? 'auto' : '100%',
                  whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              if (!isActive(item.path)) {
                e.currentTarget.style.background = 'var(--hover-bg)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive(item.path)) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }
            }}
          >
                <Icon size={20}>{icon}</Icon>
                {shouldShowExpanded && <span>{item.label}</span>}
              </Link>
            );
          })}

          {/* Coming Soon Dropdown - Desktop Only */}
          {!isMobile && comingSoonItems.length > 0 && (
            <div style={{ marginTop: '8px' }}>
            <button
                onClick={() => setShowComingSoon(!showComingSoon)}
              style={{
                display: 'flex',
                alignItems: 'center',
                  justifyContent: shouldShowExpanded ? 'space-between' : 'center',
                gap: shouldShowExpanded ? '12px' : '0',
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                background: 'transparent',
                  color: 'var(--text-tertiary)',
                transition: 'all 0.2s ease',
                fontSize: '14px',
                fontWeight: 400,
                  width: '100%',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--hover-bg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                }}
              >
                {shouldShowExpanded ? (
                  <>
                    <span>Coming Soon</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: showComingSoon ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
                  </>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
              )}
            </button>

              {showComingSoon && shouldShowExpanded && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px', paddingLeft: '8px' }}>
                  {comingSoonItems.map((item) => {
                const icon = icons[item.id] || icons.groupgrid;
                return (
                      <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                      borderRadius: '8px',
                          color: 'var(--text-tertiary)',
                          fontSize: '13px',
                          opacity: 0.7,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <Icon size={18}>{icon}</Icon>
                          <span>{item.label}</span>
                        </div>
                      <span style={{
                        fontSize: '9px',
                        padding: '2px 6px',
                        background: 'var(--hover-bg)',
                        borderRadius: '4px',
                          textTransform: 'uppercase',
                        }}>Soon</span>
                      </div>
                );
              })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Page Link - Bottom of sidebar (only show when NOT logged in) */}
        {!isConnected && (
          <div style={{
            marginTop: 'auto',
            paddingTop: '16px',
            borderTop: '1px solid var(--border-color)',
            padding: shouldShowExpanded ? '16px 12px 0 12px' : '16px 0 0 0',
          }}>
            <Link
              to="/user"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: shouldShowExpanded ? 'flex-start' : 'center',
                gap: shouldShowExpanded ? '12px' : '0',
                padding: '12px',
                borderRadius: '8px',
                textDecoration: 'none',
                color: isActive('/user') ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: isActive('/user') ? 'var(--hover-bg)' : 'transparent',
                transition: 'all 0.2s ease',
                fontSize: '14px',
                fontWeight: isActive('/user') ? 500 : 400,
                position: 'relative',
                width: shouldShowExpanded ? 'auto' : '100%',
              }}
              onMouseEnter={(e) => {
                if (!isActive('/user')) {
                  e.currentTarget.style.background = 'var(--hover-bg)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
                e.currentTarget.removeAttribute('title');
              }}
              onMouseLeave={(e) => {
                if (!isActive('/user')) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
              title=""
            >
              <Icon size={20}>
                {icons.user}
              </Icon>
              {shouldShowExpanded && (
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  whiteSpace: 'nowrap',
                  flex: 1
                }}>
                  Profile
                </span>
              )}
            </Link>
          </div>
        )}

        {/* User Section */}
        {isConnected && (
          <UserSection 
            isCollapsed={!shouldShowExpanded}
            onLogout={onLogout}
          />
        )}
      </nav>
    
      {/* Toggle Button - Positioned on right edge (hidden on mobile) */}
      {!isMobile && (
      <button
        onClick={onToggle}
        style={{
          position: 'fixed',
          left: sidebarWidth,
          top: '50%',
          transform: 'translateY(-50%)',
          width: '20px',
          height: '40px',
          padding: 0,
          border: '1px solid var(--border-color)',
          borderLeft: 'none',
          background: 'var(--card-bg)',
          borderTopRightRadius: '6px',
          borderBottomRightRadius: '6px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s ease',
          color: 'var(--text-primary)',
          zIndex: 101,
          boxShadow: '2px 0 4px rgba(0,0,0,0.1)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-hover)';
          e.currentTarget.style.background = 'var(--hover-bg)';
          e.currentTarget.style.width = '24px';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-color)';
          e.currentTarget.style.background = 'var(--card-bg)';
          e.currentTarget.style.width = '20px';
        }}
        title={isCollapsed ? 'Expand sidebar permanently' : 'Collapse sidebar'}
      >
        <svg 
          width="12" 
          height="12" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          style={{
            transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease'
          }}
        >
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
      )}
    </>
  );
}

