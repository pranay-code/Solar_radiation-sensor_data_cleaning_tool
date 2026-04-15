import React from 'react';
import { Download, RefreshCw } from 'lucide-react';
import useAppStore, { PHASES } from '../store/useAppStore';

const WorkspaceHeader = () => {
  const currentPhase = useAppStore(state => state.currentPhase);
  const currentStepIndex = useAppStore(state => state.currentStepIndex);
  const scatterPairs = useAppStore(state => state.scatterPairs);
  const sensorColumns = useAppStore(state => state.sensorColumns);
  const startOver = useAppStore(state => state.startOver);
  const setPhase = useAppStore(state => state.setPhase);

  const handleStartOver = () => {
    if (window.confirm("Warning: This will wipe all progress and return you to the upload screen. Proceed?")) {
      startOver();
    }
  };

  const downloadCurrentData = () => {
    // We can just trigger the export phase right away or handle background save
    if (window.confirm("Do you want to finalize cleaning and download now?")) {
      setPhase(PHASES.EXPORT);
    }
  };

  let titleText = "";
  if (currentPhase === PHASES.SCATTER) {
    const pair = scatterPairs[currentStepIndex];
    if (pair) {
      titleText = `Step ${currentStepIndex + 1} of ${scatterPairs.length}: ${pair[0]} vs ${pair[1]}`;
    }
  } else if (currentPhase === PHASES.TIMESERIES) {
    const sensor = sensorColumns[currentStepIndex];
    if (sensor) {
      titleText = `Step ${currentStepIndex + 1} of ${sensorColumns.length}: ${sensor} Time Series`;
    }
  }

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      padding: '1rem 2rem', 
      borderBottom: '1px solid var(--border-color)',
      backgroundColor: 'var(--bg-secondary)'
    }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <RefreshCw 
          size={20} 
          style={{ cursor: 'pointer', color: 'var(--accent-danger)' }} 
          onClick={handleStartOver} 
          title="Start Over"
        />
        <h3 style={{ margin: 0, fontWeight: 500 }}>{titleText}</h3>
      </div>

      <button className="btn btn-outline" onClick={downloadCurrentData}>
        <Download size={16} /> Download Current Data
      </button>
      
    </div>
  );
};

export default WorkspaceHeader;
