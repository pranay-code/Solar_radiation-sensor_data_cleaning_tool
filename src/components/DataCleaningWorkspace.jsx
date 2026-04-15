import React from 'react';
import useAppStore, { PHASES } from '../store/useAppStore';
import WorkspaceHeader from './WorkspaceHeader';
import StagingLog from './StagingLog';
import WorkspaceBottomNav from './WorkspaceBottomNav';
import ScatterChart from './charts/ScatterChart';
import TimeSeriesChart from './charts/TimeSeriesChart';

const DataCleaningWorkspace = () => {
  const currentPhase = useAppStore(state => state.currentPhase);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <WorkspaceHeader />
      
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Left Side - Main Chart Area (75%) */}
        <div style={{ flex: '3', display: 'flex', flexDirection: 'column', padding: '1rem', borderRight: '1px solid var(--border-color)' }}>
          
          <div className="glass-panel" style={{ flex: 1, marginBottom: '1rem', padding: '1rem', position: 'relative' }}>
             {currentPhase === PHASES.SCATTER && <ScatterChart />}
             {currentPhase === PHASES.TIMESERIES && <TimeSeriesChart />}
          </div>

          <WorkspaceBottomNav />

        </div>

        {/* Right Side - Staging Log (25%) */}
        <StagingLog />

      </div>
    </div>
  );
};

export default DataCleaningWorkspace;
