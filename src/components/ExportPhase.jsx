import React, { useState } from 'react';
import Papa from 'papaparse';
import { DownloadCloud, CheckCircle, RefreshCcw } from 'lucide-react';
import useAppStore from '../store/useAppStore';

const ExportPhase = () => {
  const masterData = useAppStore(state => state.masterData);
  const sensorColumns = useAppStore(state => state.sensorColumns);
  const timestampColumn = useAppStore(state => state.timestampColumn);
  const sensorDeletions = useAppStore(state => state.sensorDeletions);
  const startOver = useAppStore(state => state.startOver);

  const [isExporting, setIsExporting] = useState(false);
  const [downloadReady, setDownloadReady] = useState(false);
  const [exportUrl, setExportUrl] = useState('');
  const [exportFileName, setExportFileName] = useState('');
  const [totalDrops, setTotalDrops] = useState(0);

  const handleFinalize = () => {
    setIsExporting(true);

    // Give UI a tick to render loader
    setTimeout(() => {
      // Create a deep copy of the array of objects to avoid mutating masterData 
      // (in case they want to 'go back' or 'start over', but here it's fine)
      const exportData = [];
      let totalDroppedPoints = 0;

      for (let i = 0; i < masterData.length; i++) {
        const originalRow = masterData[i];
        const ts = originalRow[timestampColumn];
        
        const newRow = { [timestampColumn]: ts };

        sensorColumns.forEach(sensor => {
          const isDropped = sensorDeletions[sensor] && sensorDeletions[sensor].has(ts);
          if (isDropped) {
            newRow[sensor] = null; // Blank out the cell data
            totalDroppedPoints++;
          } else {
            newRow[sensor] = originalRow[sensor];
          }
        });

        exportData.push(newRow);
      }

      setTotalDrops(totalDroppedPoints);

      const csvString = Papa.unparse(exportData);
      
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const dateStr = new Date().toISOString().split('T')[0];
      
      setExportUrl(url);
      setExportFileName(`cleaned_sensor_data_${dateStr}.csv`);
      setDownloadReady(true);
      setIsExporting(false);
      
    }, 100);
  };

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="glass-panel" style={{ maxWidth: '600px', width: '100%', padding: '3rem', textAlign: 'center' }}>
        
        <CheckCircle size={64} style={{ color: 'var(--accent-success)', margin: '0 auto 1.5rem' }} />
        <h1 style={{ marginBottom: '1rem' }}>Data Cleaning Complete!</h1>
        <p style={{ marginBottom: '2rem' }}>You have successfully reviewed all sensor pairs and individual timelines.</p>

        {!downloadReady && !isExporting && (
          <button className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }} onClick={handleFinalize}>
            Finalize & Process Dataset
          </button>
        )}

        {isExporting && (
          <div className="animate-fade-in" style={{ padding: '2rem' }}>
            <div style={{ 
              width: '40px', height: '40px', 
              border: '4px solid var(--border-color)', 
              borderTopColor: 'var(--accent-primary)', 
              borderRadius: '50%', margin: '0 auto 1rem',
              animation: 'spin 1s linear infinite'
            }} />
            <h3>Processing final dataset...</h3>
          </div>
        )}

        {downloadReady && (
          <div className="animate-fade-in" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '2rem', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <h3 style={{ color: 'var(--accent-success)', marginBottom: '0.5rem' }}>Successfully Dropped {totalDrops.toLocaleString()} Data Points.</h3>
            <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>The dropped points have been replaced with blank cells.</p>
            
            <a 
              href={exportUrl} 
              download={exportFileName} 
              className="btn btn-primary" 
              style={{ display: 'inline-flex', width: '100%', marginBottom: '1rem', textDecoration: 'none' }}
            >
              <DownloadCloud size={20} /> Download Final CSV
            </a>

            <button className="btn btn-outline" style={{ width: '100%' }} onClick={startOver}>
              <RefreshCcw size={18} /> Start Fresh With New File
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default ExportPhase;
