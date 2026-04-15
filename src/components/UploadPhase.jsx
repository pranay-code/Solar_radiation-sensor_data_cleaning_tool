import React, { useState, useRef, useCallback } from 'react';
import Papa from 'papaparse';
import { UploadCloud, CheckCircle2 } from 'lucide-react';
import useAppStore, { PHASES } from '../store/useAppStore';

const UploadPhase = () => {
  const [isParsing, setIsParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [stats, setStats] = useState(null);
  const fileInputRef = useRef(null);
  const initDataStore = useAppStore(state => state.initData);
  const setPhase = useAppStore(state => state.setPhase);

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsParsing(true);
    setParseProgress(0);

    // Accumulators — populated incrementally in chunk callback
    let headers = null;
    let timeCol = null;
    let sensors = null;
    const missingCounts = {};
    const allRows = [];
    let firstRow = null;
    const fileSizeEstimate = file.size;
    let bytesProcessed = 0;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      // worker: false  — intentionally removed.
      // With worker:true PapaParse must structured-clone the entire parsed
      // dataset back to the main thread, which for 200K+ rows is slower
      // than synchronous parsing.  The chunk callback below keeps the
      // browser responsive without that serialisation overhead.
      chunk: (results, parser) => {
        const chunk = results.data;
        if (!chunk.length) return;

        // Initialise metadata on first chunk
        if (!headers) {
          headers = results.meta.fields;
          const lower = headers.map(h => h.toLowerCase());
          const tIdx = lower.findIndex(h => h.includes('time') || h.includes('date'));
          timeCol = tIdx !== -1 ? headers[tIdx] : headers[0];
          sensors = headers.filter(h => h !== timeCol);
          sensors.forEach(s => (missingCounts[s] = 0));
        }

        if (!firstRow) firstRow = chunk[0];

        // Missing-value tally — done here so we avoid a second O(n*m) pass
        for (let i = 0; i < chunk.length; i++) {
          const row = chunk[i];
          allRows.push(row);
          for (let j = 0; j < sensors.length; j++) {
            const v = row[sensors[j]];
            if (v === null || v === undefined || v === '') missingCounts[sensors[j]]++;
          }
        }

        // Rough progress based on accumulated row count vs file size heuristic
        bytesProcessed += chunk.length * 50; // ~50 bytes/row estimate
        setParseProgress(Math.min(95, Math.round((bytesProcessed / fileSizeEstimate) * 100)));
      },
      complete: () => {
        if (!headers || !allRows.length) {
          setIsParsing(false);
          return;
        }
        const lastRow = allRows[allRows.length - 1];
        setParseProgress(100);
        setStats({
          rowCount: allRows.length,
          sensors: sensors.length,
          timeCol,
          start: firstRow[timeCol],
          end: lastRow[timeCol],
          missingStats: missingCounts,
          rawHeaders: headers,
          rawData: allRows
        });
        setIsParsing(false);
      },
      error: (error) => {
        console.error('CSV parse error:', error);
        setIsParsing(false);
        alert('Error parsing the file. Please check the console.');
      }
    });
  }, []);

  const proceedWith = (phase) => {
    if (!stats) return;
    initDataStore(stats.rawData, stats.rawHeaders);
    setPhase(phase);
  };

  return (
    <div style={{ flex: 1, display: 'flex', padding: '2rem', gap: '1.5rem' }}>
      {/* Left: Main content */}
      <div style={{ flex: 3, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ margin: '0 0 0.5rem 0' }}>GII Data Cleaning Tool</h1>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Upload your multivariate sensor time-series data to begin. This tool helps identify anomalous sensor readings, visualize relationships with scatter plots, and clean time-series data with interpolation and sequential checks.</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button className="btn btn-outline" onClick={() => window.location.reload()}>Start Over</button>
              <button className="btn btn-primary" onClick={() => { if (stats) proceedWith(PHASES.SCATTER); else alert('Upload a file first'); }}>Upload & Preview</button>
            </div>
          </div>
        </div>

        {!stats && !isParsing && (
          <div 
            style={{ 
              border: '2px dashed var(--border-color)', 
              borderRadius: '12px', 
              padding: '4rem 2rem', 
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
              background: 'linear-gradient(180deg, rgba(24,119,242,0.02), transparent)'
            }}
            onClick={() => fileInputRef.current.click()}
            onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
            onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
          >
            <UploadCloud size={56} style={{ color: 'var(--accent-primary)', marginBottom: '1rem' }} />
            <h3>Click or Drag CSV/Excel file</h3>
            <p style={{ marginTop: '0.5rem' }}>Supports up to 200,000+ data points instantly</p>
            <input 
              type="file" 
              accept=".csv" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileUpload} 
            />
          </div>
        )}

        {isParsing && (
          <div style={{ textAlign: 'center', padding: '4rem 0' }} className="animate-fade-in">
            <div style={{ 
              width: '40px', height: '40px', 
              border: '4px solid var(--border-color)', 
              borderTopColor: 'var(--accent-primary)', 
              borderRadius: '50%', margin: '0 auto 1rem',
              animation: 'spin 1s linear infinite'
            }} />
            <h3 style={{ animation: 'pulse 2s infinite', marginBottom: '1rem' }}>Parsing CSV...</h3>
            {/* Progress bar */}
            <div style={{ width: '260px', margin: '0 auto', background: 'var(--border-color)', borderRadius: '999px', height: '6px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${parseProgress}%`,
                background: 'linear-gradient(90deg, var(--accent-primary), #10b981)',
                borderRadius: '999px',
                transition: 'width 0.3s ease'
              }} />
            </div>
            <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{parseProgress}% — computing statistics...</p>
            <style>{`
              @keyframes spin { 100% { transform: rotate(360deg); } }
              @keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }
            `}</style>
          </div>
        )}

        {stats && !isParsing && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--accent-success)' }}>
              <CheckCircle2 size={24} />
              <h2>Pre-Flight Dashboard</h2>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
               <div className="glass" style={{ padding: '1rem', borderRadius: '8px' }}>
                 <p style={{ fontSize: '0.85rem' }}>Total Rows Found</p>
                 <h3 style={{ color: 'var(--text-primary)' }}>{stats.rowCount.toLocaleString()}</h3>
               </div>
               <div className="glass" style={{ padding: '1rem', borderRadius: '8px' }}>
                 <p style={{ fontSize: '0.85rem' }}>Sensors Detected</p>
                 <h3 style={{ color: 'var(--text-primary)' }}>{stats.sensors} columns</h3>
               </div>
               <div className="glass" style={{ padding: '1rem', borderRadius: '8px' }}>
                 <p style={{ fontSize: '0.85rem' }}>Date Range</p>
                 <h4 style={{ color: 'var(--text-primary)', marginTop: '0.2rem' }}>Start: {stats.start}</h4>
                 <h4 style={{ color: 'var(--text-primary)' }}>End: {stats.end}</h4>
               </div>
            </div>

            <h3 style={{ marginBottom: '1rem' }}>Missing Data Per Sensor</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto', marginBottom: '2rem' }}>
              {Object.entries(stats.missingStats).map(([sensor, missing]) => (
                <div key={sensor} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', borderBottom: '1px solid var(--border-color)'}}>
                  <span style={{ fontSize: '0.9rem' }}>{sensor}</span>
                  <span style={{ color: missing > 0 ? 'var(--accent-warning)' : 'var(--accent-success)', fontWeight: 'bold' }}>
                    {((missing / stats.rowCount) * 100).toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
               <button className="btn btn-primary" onClick={() => proceedWith(PHASES.SCATTER)}>
                 Start cleaning: Scatter Plots First
               </button>
               <button className="btn btn-outline" onClick={() => proceedWith(PHASES.TIMESERIES)}>
                 Start cleaning: Time Series First
               </button>
            </div>
          </div>
        )}
        </div>

      {/* Right: Sidebar Console */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="glass-panel" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>System Console</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-ghost">Settings</button>
            </div>
          </div>
          <div style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            <p>After uploading, review the pre-flight dashboard and choose a cleaning workflow. Use the console to download or commit processed drops.</p>
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-primary" onClick={() => { if (stats) proceedWith(PHASES.SCATTER); else alert('Upload a file first'); }}>Start Cleaning</button>
            <button className="btn btn-outline" onClick={() => { if (stats) navigator.clipboard?.writeText(JSON.stringify({ rows: stats?.rowCount })) }}>Download Current Data</button>
          </div>
        </div>

        <div className="glass" style={{ padding: '1rem', flex: 1, overflowY: 'auto' }}>
          <h4 style={{ marginTop: 0, color: 'var(--text-secondary)' }}>Activity</h4>
          <p style={{ color: 'var(--text-muted)' }}>No activity yet. Upload a file to see parsing logs and pre-flight summaries.</p>
        </div>
      </div>

    </div>
  );
};

export default UploadPhase;
