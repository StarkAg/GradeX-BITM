import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';


// Extract Google Drive file ID from URL
function extractDriveFileId(url) {
  if (!url) return null;
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

function isGoogleDriveUrl(url) {
  return url && url.includes('drive.google.com');
}

function getDriveDownloadUrl(url) {
  const fileId = extractDriveFileId(url);
  if (!fileId) return null;
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

function parseCSVLine(line) {
  let cleanedLine = line.trim();
  if (cleanedLine.startsWith('"') && cleanedLine.endsWith('"')) {
    cleanedLine = cleanedLine.slice(1, -1);
  }
  
  const result = [];
  let current = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < cleanedLine.length) {
    const char = cleanedLine[i];
    const nextChar = cleanedLine[i + 1];
    const nextNextChar = cleanedLine[i + 2];
    
    if (char === '"') {
      if (nextChar === '"' && (nextNextChar === ',' || nextNextChar === undefined || i === cleanedLine.length - 2)) {
        if (!inQuotes && (i === 0 || cleanedLine[i - 1] === ',')) {
          inQuotes = true;
          i += 2;
          continue;
        } else if (inQuotes && (nextNextChar === ',' || nextNextChar === undefined)) {
          inQuotes = false;
          i += 2;
          continue;
        } else {
          current += '"';
          i += 2;
          continue;
        }
      } else if (inQuotes && (nextChar === ',' || nextChar === undefined)) {
        inQuotes = false;
        i++;
        continue;
      } else if (!inQuotes && (i === 0 || cleanedLine[i - 1] === ',')) {
        inQuotes = true;
        i++;
        continue;
      } else {
        current += char;
        i++;
        continue;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
      i++;
    } else {
      current += char;
      i++;
    }
  }
  
  result.push(current.trim());
  return result;
}

function parseResources(resourceStr) {
  if (!resourceStr || resourceStr.trim() === '') return [];
  
  let cleaned = resourceStr.trim();
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1);
  }
  
  // Handle case where the field is just a URL without name|url format
  if (cleaned.includes('http') && !cleaned.includes('|') && !cleaned.includes(',')) {
    return [{
      name: 'Resource',
      url: cleaned.trim()
    }];
  }
  
  // Simple split by comma - resources are separated by commas
  // Each resource is in format "Name|URL"
  return cleaned.split(',').map(item => {
    const trimmed = item.trim();
    if (!trimmed) return null;
    
    const parts = trimmed.split('|');
    if (parts.length >= 2) {
      let name = parts[0].trim();
      // Remove quotes from name
      while ((name.startsWith('"') && name.endsWith('"')) || (name.startsWith('"') && !name.endsWith('"'))) {
        if (name.startsWith('"')) name = name.slice(1);
        if (name.endsWith('"')) name = name.slice(0, -1);
      }
      name = name.trim();
      
      const url = parts[1].trim();
      if (name && url) {
        return {
          name: name,
          url: url
        };
      }
    } else if (trimmed.includes('http')) {
      // Just a URL without name
      return {
        name: 'Resource',
        url: trimmed.trim()
      };
    }
    return null;
  }).filter(Boolean).filter(resource => {
    // Filter out unitwise MCQ documents
    const nameLower = resource.name.toLowerCase();
    return !nameLower.includes('unitwise') && !nameLower.includes('mcq') && !nameLower.includes('mcqs');
  });
}

function parsePlaylistLinks(playlistStr) {
  if (!playlistStr || playlistStr.trim() === '') return [];
  
  let cleaned = playlistStr.trim();
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1);
  }
  
  return cleaned.split(',').map(item => {
    const trimmed = item.trim();
    const parts = trimmed.split('|');
    if (parts.length >= 2) {
      let name = parts[0].trim();
      while ((name.startsWith('"') && name.endsWith('"')) || (name.startsWith('"') && !name.endsWith('"'))) {
        if (name.startsWith('"')) name = name.slice(1);
        if (name.endsWith('"')) name = name.slice(0, -1);
      }
      name = name.trim();
      return {
        name: name,
        url: parts[1].trim()
      };
    }
    return null;
  }).filter(Boolean);
}

// Resource Card Component with Iron Man HUD style
function ResourceCard({ resource, type, onDownload }) {
  const [isHovered, setIsHovered] = useState(false);
  const downloadUrl = isGoogleDriveUrl(resource.url)
    ? getDriveDownloadUrl(resource.url)
    : resource.url;
  const openUrl = resource.url;

  return (
    <a
      href={openUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="hud-resource-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <div className="hud-resource-card-inner">
        <div className="hud-resource-card-header">
          <div className="hud-resource-icon"></div>
          <div className="hud-resource-name">{resource.name}</div>
        </div>
        <a
          href={downloadUrl}
          download
          className="hud-download-btn-corner"
          title="Download"
          onClick={(e) => {
            if (onDownload) onDownload(e);
            e.stopPropagation();
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </a>
      </div>
      <div className="hud-resource-card-glow" style={{ opacity: isHovered ? 1 : 0 }}></div>
    </a>
  );
}


export default function SubDeck() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState(1);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTrending, setShowTrending] = useState(false);
  const broadcastChannelRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile once at the top-level to keep hooks order stable
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const loadCSV = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching CSV from /thedeck/Resources.csv');
      const response = await fetch('/thedeck/Resources.csv?' + Date.now());
      if (!response.ok) {
        throw new Error(`Failed to load resources: ${response.status} ${response.statusText}`);
      }
      const text = await response.text();
      console.log('CSV loaded, length:', text.length, 'characters');
      
      const allLines = text.split('\n');
      console.log('Total lines in CSV:', allLines.length);
      const lines = allLines.filter(line => line.trim() && !line.startsWith('"semester,subject'));
      console.log('Lines after filtering header:', lines.length);
      const parsedSubjects = [];
      
      lines.forEach((line, index) => {
        if (!line.trim()) return;
        
        try {
          const fields = parseCSVLine(line);
          // Require at least semester and subject name (minimum 2 fields)
          if (fields.length < 2) {
            if (index < 3) {
              console.warn('Line', index, 'has insufficient fields:', fields.length);
            }
            return;
          }
          
          let semesterStr = fields[0].trim();
          let subjectName = fields[1].trim();
          const pptsStr = fields[2] || '';
          const pyqsStr = fields[3] || '';
          const syllabusStr = fields[4] || '';
          let channelName = fields[5] || '';
          const playlistStr = fields[6] || '';
          
          if (semesterStr.startsWith('"') && semesterStr.endsWith('"')) {
            semesterStr = semesterStr.slice(1, -1);
          }
          if (subjectName.startsWith('"') && subjectName.endsWith('"')) {
            subjectName = subjectName.slice(1, -1);
          }
          if (channelName.startsWith('"') && channelName.endsWith('"')) {
            channelName = channelName.slice(1, -1);
          }
          
          const semesterMatch = semesterStr.match(/Semester\s+(\d+)/i);
          const semester = semesterMatch ? parseInt(semesterMatch[1]) : null;
          
          if (!semester || !subjectName) {
            if (index < 3) {
              console.warn('Line', index, 'Invalid semester or subject:', semesterStr, '|', subjectName);
            }
            return;
          }
          
          if (index < 3) {
            console.log('Successfully parsed:', semester, subjectName);
          }
          
          const ppts = parseResources(pptsStr);
          const pyqs = parseResources(pyqsStr);
          let syllabus = parseResources(syllabusStr);
          // Filter out date-patterned items from syllabus (they should be in PYQ field)
          // Pattern: YYYY_MONTH or YYYY-MONTH (e.g., 2025_MAY, 2024_NOV)
          syllabus = syllabus.filter(item => {
            const name = item.name.trim();
            // Check if it matches date pattern (4 digits, underscore/dash, 3-4 letter month)
            const datePattern = /^\d{4}[_-][A-Z]{3,4}$/i;
            return !datePattern.test(name);
          });
          
          // Separate Important Topics from syllabus
          const importantTopics = syllabus.filter(item => 
            item.name.toLowerCase().includes('important topics')
          );
          syllabus = syllabus.filter(item => 
            !item.name.toLowerCase().includes('important topics')
          );
          
          const videos = parsePlaylistLinks(playlistStr);
          
          parsedSubjects.push({
            id: index + 1,
            name: subjectName,
            semester,
            ppts,
            pyqs,
            syllabus,
            importantTopics,
            videos,
            channelName: channelName.trim(),
            hasSyllabus: syllabus.length > 0,
            hasImportantTopics: importantTopics.length > 0,
            hasPPTs: ppts.length > 0,
            hasPYQ: pyqs.length > 0,
            hasVideos: videos.length > 0,
          });
        } catch (err) {
          console.warn('Error parsing line:', line.substring(0, 50), err);
        }
      });
      
      console.log('Loaded subjects:', parsedSubjects.length);
      console.log('Subjects by semester:', parsedSubjects.reduce((acc, s) => {
        acc[s.semester] = (acc[s.semester] || 0) + 1;
        return acc;
      }, {}));
      
      setSubjects(parsedSubjects);
      setLoading(false);
    } catch (err) {
      console.error('Error loading CSV:', err);
      setError(err.message);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const channel = new BroadcastChannel('subdeck-csv-refresh');
    broadcastChannelRef.current = channel;

    channel.onmessage = (event) => {
      if (event.data && event.data.type === 'refresh-csv') {
        console.log('[SubDeck] Received CSV refresh signal, reloading...');
        loadCSV();
      }
    };

    loadCSV();

    return () => {
      if (channel) {
        channel.close();
      }
    };
  }, [loadCSV]);

  const filteredSubjects = useMemo(() => {
    // If trending is active, show FLA subjects
    if (showTrending) {
      return subjects.filter(subject => 
        subject.name.toLowerCase().includes('formal language and automata') ||
        subject.name.toLowerCase().includes('fla')
      );
    }
    
    // If there's a search query, search across all semesters
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return subjects.filter(subject => 
        subject.name.toLowerCase().includes(query)
      );
    }
    
    // Otherwise, filter by selected semester
    return subjects.filter(subject => subject.semester === selectedSemester);
  }, [subjects, selectedSemester, searchQuery, showTrending]);


  useEffect(() => {
    if (!selectedSubject && filteredSubjects.length > 0) {
      setSelectedSubject(filteredSubjects[0]);
    }
  }, [filteredSubjects, selectedSubject]);

  useEffect(() => {
    setSelectedSubject(null);
  }, [selectedSemester, searchQuery, showTrending]);
  
  const handleTrendingClick = useCallback(() => {
    setShowTrending(!showTrending);
    setSelectedSemester(1); // Reset semester when toggling trending
  }, [showTrending]);

  const handleSubjectClick = useCallback((subject) => {
    setSelectedSubject(subject);
  }, []);

  const availableSemesters = useMemo(() => {
    const semesters = new Set(subjects.map(s => s.semester));
    return Array.from(semesters).sort();
  }, [subjects]);

  useEffect(() => {
    if (subjects.length > 0 && availableSemesters.length > 0) {
      const currentSemesterSubjects = subjects.filter(s => s.semester === selectedSemester);
      if (currentSemesterSubjects.length === 0) {
        setSelectedSemester(availableSemesters[0]);
      }
    }
  }, [subjects, availableSemesters, selectedSemester]);


  if (loading) {
    return (
      <section className="hud-deck">
        <div className="hud-loading">
          <div className="hud-loading-spinner"></div>
          <p>INITIALIZING RESOURCE DATABASE...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="hud-deck">
        <div className="hud-error">
          <div className="hud-error-icon">⚠</div>
          <p className="hud-error-title">SYSTEM ERROR</p>
          <p className="hud-error-message">{error}</p>
          <button className="hud-retry-btn" onClick={() => window.location.reload()}>
            RETRY CONNECTION
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      className="hud-deck"
      style={{
        minHeight: isMobile ? 'calc(100vh - 50px)' : 'calc(100vh - 60px)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}
    >
        {/* HUD Header */}
        <div className="hud-header">
          <div className="hud-header-left">
            <div className="hud-title-section">
              <h1 className="hud-title">SUBDECK</h1>
              <div className="hud-subtitle">RESOURCE MANAGEMENT SYSTEM</div>
              <div className="hud-status">
                <span className="hud-status-dot"></span>
                <span>ONLINE</span>
                <span className="hud-status-count">{filteredSubjects.length} MODULES LOADED</span>
              </div>
            </div>
          </div>
          <div className="hud-header-right">
            <div className="hud-semester-selector">
              {/* FLA trending button hidden - no longer needed */}
              {availableSemesters.map(sem => (
                <button
                  key={sem}
                  className={`hud-semester-btn ${selectedSemester === sem && !showTrending ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedSemester(sem);
                    setShowTrending(false);
                  }}
                >
                  <span className="hud-semester-label">S{sem}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* HUD Search */}
        <div className="hud-search-container">
          <div className="hud-search-box">
            <svg className="hud-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input
              type="text"
              className="hud-search-input"
              placeholder="SEARCH MODULES..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="hud-search-clear" onClick={() => setSearchQuery('')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* HUD Content Grid */}
        <div className="hud-content-grid">
          {/* Subject List Panel */}
          <div className="hud-subjects-panel">
            <div className="hud-panel-header">
              <span>MODULE INDEX</span>
              <span className="hud-panel-count">{filteredSubjects.length}</span>
            </div>
            <div className="hud-subjects-list">
              {filteredSubjects.length === 0 ? (
                <div className="hud-empty-state">
                  <div className="hud-empty-icon"></div>
                  <p>NO MODULES FOUND</p>
                </div>
              ) : (
                filteredSubjects.map((subject) => (
                  <button
                    key={subject.id}
                    className={`hud-subject-module ${selectedSubject?.id === subject.id ? 'active' : ''}`}
                    onClick={() => handleSubjectClick(subject)}
                  >
                    <div className="hud-module-indicator"></div>
                    <div className="hud-module-content">
                      <div className="hud-module-name">{subject.name}</div>
                      <div className="hud-module-badges">
                        {subject.hasPPTs && <span className="hud-badge">PPT</span>}
                        {subject.hasPYQ && <span className="hud-badge">PYQ</span>}
                        {subject.hasVideos && <span className="hud-badge">VID</span>}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Resource Details Panel */}
          <div className="hud-resources-panel">
            {selectedSubject ? (
              <>
                <div className="hud-panel-header">
                  <span>RESOURCE DEPLOYMENT</span>
                  <span className="hud-module-id">MODULE #{selectedSubject.id}</span>
                </div>
                <div className="hud-resources-content">
                  <div className="hud-module-title-wrapper">
                    <div className="hud-module-title">{selectedSubject.name}</div>
                    {selectedSubject.hasSyllabus && selectedSubject.syllabus.length > 0 && (
                      <div className="hud-syllabus-button-group">
                        {selectedSubject.syllabus.map((syl, idx) => {
                          const downloadUrl = isGoogleDriveUrl(syl.url)
                            ? getDriveDownloadUrl(syl.url)
                            : syl.url;
                          return (
                            <button
                              key={idx}
                              className="hud-syllabus-btn"
                              onClick={() => {
                                window.open(syl.url, '_blank');
                              }}
                            >
                              <span>SYLLABUS</span>
                              {downloadUrl && (
                                <a
                                  href={downloadUrl}
                                  download
                                  className="hud-syllabus-download"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="7 10 12 15 17 10"></polyline>
                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                  </svg>
                                </a>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {selectedSubject.hasPPTs && selectedSubject.ppts.length > 0 && (
                    <div className="hud-resource-section">
                      <div className="hud-section-header">
                        <span className="hud-section-title">PRESENTATIONS & NOTES</span>
                        <span className="hud-section-count">{selectedSubject.ppts.length}</span>
                      </div>
                      <div className="hud-resource-grid">
                        {selectedSubject.ppts.map((ppt, idx) => (
                          <ResourceCard
                            key={idx}
                            resource={ppt}
                            type="ppt"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedSubject.hasPYQ && selectedSubject.pyqs.length > 0 && (
                    <div className="hud-resource-section">
                      <div className="hud-section-header">
                        <span className="hud-section-title">PREVIOUS YEAR QUESTIONS</span>
                        <span className="hud-section-count">{selectedSubject.pyqs.length}</span>
                      </div>
                      <div className="hud-resource-grid">
                        {selectedSubject.pyqs.map((pyq, idx) => (
                          <ResourceCard
                            key={idx}
                            resource={pyq}
                            type="pyq"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedSubject.hasImportantTopics && selectedSubject.importantTopics.length > 0 && (
                    <div className="hud-resource-section">
                      <div className="hud-section-header">
                        <span className="hud-section-title">IMPORTANT TOPICS</span>
                        <span className="hud-section-count">{selectedSubject.importantTopics.length}</span>
                      </div>
                      <div className="hud-resource-grid">
                        {selectedSubject.importantTopics.map((topic, idx) => (
                          <ResourceCard
                            key={idx}
                            resource={topic}
                            type="topic"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedSubject.hasVideos && selectedSubject.videos.length > 0 && (
                    <div className="hud-resource-section">
                      <div className="hud-section-header">
                        <span className="hud-section-title">VIDEO LECTURES</span>
                        <span className="hud-section-count">{selectedSubject.videos.length}</span>
                        {selectedSubject.channelName && (
                          <span className="hud-channel-name">by {selectedSubject.channelName}</span>
                        )}
                      </div>
                      <div className="hud-resource-grid">
                        {selectedSubject.videos.map((video, idx) => (
                          <a
                            key={idx}
                            href={video.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hud-resource-card hud-video-card"
                          >
                            <div className="hud-resource-card-inner">
                              <div className="hud-resource-card-header">
                                <div className="hud-resource-icon"></div>
                                <div className="hud-resource-name">{video.name}</div>
                              </div>
                              <div className="hud-video-icon-corner">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                  <polyline points="15 3 21 3 21 9"></polyline>
                                  <line x1="10" y1="14" x2="21" y2="3"></line>
                                </svg>
                              </div>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {!selectedSubject.hasPPTs && !selectedSubject.hasPYQ && !selectedSubject.hasImportantTopics && !selectedSubject.hasVideos && (
                    <div className="hud-empty-resources">
                      <div className="hud-empty-icon"></div>
                      <p>NO RESOURCES AVAILABLE</p>
                      <p className="hud-empty-subtext">Contribute materials to help others</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="hud-empty-resources">
                <div className="hud-empty-icon"></div>
                <p>SELECT A MODULE TO VIEW RESOURCES</p>
              </div>
            )}
          </div>
        </div>
      </section>
  );
}