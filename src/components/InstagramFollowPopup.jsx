import React, { useState, useEffect } from 'react';

export default function InstagramFollowPopup() {
  const [showPopup, setShowPopup] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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
    // Check if user has seen the popup recently (only show once per week)
    const popupData = localStorage.getItem('gradex-instagram-popup-seen');
    
    let shouldShow = false;
    
    if (!popupData) {
      // Never seen before - show it
      shouldShow = true;
    } else {
      try {
        // Parse stored data (timestamp)
        const lastSeen = parseInt(popupData, 10);
        const now = Date.now();
        const oneWeek = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
        
        // Only show if it's been more than a week since last seen
        if (isNaN(lastSeen) || (now - lastSeen) > oneWeek) {
          shouldShow = true;
        }
      } catch (e) {
        // If parsing fails, show it (reset)
        shouldShow = true;
      }
    }
    
    if (shouldShow) {
      // Show popup after a longer delay (5 seconds) to be less intrusive
      const timer = setTimeout(() => {
        setShowPopup(true);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setShowPopup(false);
    // Store timestamp instead of just 'true' - allows time-based re-showing
    localStorage.setItem('gradex-instagram-popup-seen', Date.now().toString());
  };

  const handleFollow = () => {
    window.open('https://www.instagram.com/gradex.bond?igsh=ZWFoYTgyMG43ZWkz&utm_source=qr', '_blank', 'noopener,noreferrer');
    // Store timestamp - won't show again for 7 days
    localStorage.setItem('gradex-instagram-popup-seen', Date.now().toString());
    setShowPopup(false);
  };

  if (!showPopup) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(4px)',
          zIndex: 9998,
          animation: 'fadeIn 0.3s ease-in-out',
        }}
        onClick={handleClose}
      />
      
      {/* Popup */}
      <div
        style={{
          position: 'fixed',
          top: isMobile ? '10%' : '50%',
          left: '50%',
          transform: isMobile ? 'translate(-50%, 0)' : 'translate(-50%, -50%)',
          background: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: isMobile ? '12px' : '16px',
          padding: isMobile ? '16px' : '24px',
          maxWidth: isMobile ? 'calc(100vw - 32px)' : '400px',
          maxHeight: isMobile ? 'calc(100vh - 100px)' : 'auto',
          width: isMobile ? 'calc(100% - 32px)' : '90%',
          zIndex: 9999,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          animation: 'slideUp 0.3s ease-out',
          textAlign: 'center',
          overflowY: isMobile ? 'auto' : 'visible',
          marginBottom: isMobile ? '80px' : 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translate(-50%, ${isMobile ? '-20%' : '-40%'});
            }
            to {
              opacity: 1;
              transform: translate(-50%, ${isMobile ? '0' : '-50%'});
            }
          }
        `}</style>

        {/* Close button */}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'var(--card-bg)',
            border: '2px solid var(--border-color)',
            fontSize: '20px',
            fontWeight: 'bold',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            padding: '8px',
            lineHeight: 1,
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            zIndex: 1,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--hover-bg)';
            e.currentTarget.style.borderColor = 'var(--text-primary)';
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--card-bg)';
            e.currentTarget.style.borderColor = 'var(--border-color)';
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
          }}
        >
          &times;
        </button>

        {/* Instagram Logo */}
        <div style={{ 
          marginBottom: '16px', 
          display: 'flex', 
          justifyContent: 'center',
        }}>
          <img
            src="/HD-wallpaper-instagram-black-logo.jpg"
            alt="Instagram"
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '12px',
              objectFit: 'cover',
              filter: 'grayscale(100%) contrast(1.2)',
            }}
          />
        </div>

        {/* Title */}
        <h3 style={{
          margin: '0 0 8px 0',
          fontSize: isMobile ? '18px' : '20px',
          fontWeight: 600,
          color: 'var(--text-primary)',
        }}>
          Follow Us on Instagram
        </h3>

        {/* Description */}
        <p style={{
          margin: '0 0 20px 0',
          fontSize: isMobile ? '13px' : '14px',
          color: 'var(--text-secondary)',
          lineHeight: '1.5',
        }}>
          Stay updated with the latest features, tips, and updates from GradeX!
        </p>

        {/* Button */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
        }}>
          <button
            onClick={handleFollow}
            style={{
              padding: isMobile ? '14px 20px' : '12px 24px',
              fontSize: isMobile ? '14px' : '15px',
              fontWeight: 600,
              border: '1px solid var(--border-color)',
              background: 'linear-gradient(135deg, #000000 0%, #333333 50%, #000000 100%)',
              color: '#fff',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              width: '100%',
              maxWidth: isMobile ? '100%' : '280px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
              e.currentTarget.style.background = 'linear-gradient(135deg, #1a1a1a 0%, #4a4a4a 50%, #1a1a1a 100%)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.background = 'linear-gradient(135deg, #000000 0%, #333333 50%, #000000 100%)';
            }}
          >
            Follow @gradex.bond
          </button>
        </div>
      </div>
    </>
  );
}

