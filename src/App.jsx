import React from 'react';
import useAppStore, { PHASES } from './store/useAppStore';
import UploadPhase from './components/UploadPhase';
import DataCleaningWorkspace from './components/DataCleaningWorkspace';
import ExportPhase from './components/ExportPhase';

function App() {
  const currentPhase = useAppStore(state => state.currentPhase);

  return (
    <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {currentPhase === PHASES.UPLOAD && <UploadPhase />}
      {(currentPhase === PHASES.SCATTER || currentPhase === PHASES.TIMESERIES) && <DataCleaningWorkspace />}
      {currentPhase === PHASES.EXPORT && <ExportPhase />}
    </div>
  );
}

export default App;
