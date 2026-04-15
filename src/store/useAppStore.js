import { create } from 'zustand';

// Calculate all unique pairs for the scatter phase
const generateCombinations = (items) => {
  const combinations = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      combinations.push([items[i], items[j]]);
    }
  }
  return combinations;
};

export const PHASES = {
  UPLOAD: 'UPLOAD',
  SCATTER: 'SCATTER',
  TIMESERIES: 'TIMESERIES',
  EXPORT: 'EXPORT'
};

const useAppStore = create((set, get) => ({
  // 1. Core Data
  masterData: [],        // Fixed after upload
  sensorColumns: [],     // Array of sensor names (excluding Timestamp)
  timestampColumn: '',   // The header name of the time column
  
  // 2. State & Deletions
  sensorDeletions: {},   // { [sensorName]: Set<timestamp> }
  pendingDrops: [],      // Array of drops currently lasso'd: { timestamp, sensorName }
  
  // 3. Navigation State
  currentPhase: PHASES.UPLOAD,
  currentStepIndex: 0,   // General index for the phase we are in
  scatterPairs: [],      // Generated uniquely from sensorColumns
  
  // 4. Time Machine History
  historyStack: [],      // Array of snapshots: { phase, stepIndex, sensorDeletions }

  // --- ACTIONS ---

  // Initialize data parsed by PapaParse
  initData: (data, headers) => {
    // Assume first column with "time" or "date" or just the first column is timestamp
    // For safety, let's look for common timestamp names or default to first
    let timeCol = Object.keys(data[0])[0]; 
    const lowerHeaders = headers.map(h => h.toLowerCase());
    const timeIndex = lowerHeaders.findIndex(h => h.includes('time') || h.includes('date'));
    if (timeIndex !== -1) {
      timeCol = headers[timeIndex];
    }

    const sensors = headers.filter(h => h !== timeCol);
    
    const initialDeletions = {};
    sensors.forEach(s => {
      initialDeletions[s] = new Set();
    });

    const scatterPairs = generateCombinations(sensors);

    set({
      masterData: data,
      sensorColumns: sensors,
      timestampColumn: timeCol,
      sensorDeletions: initialDeletions,
      scatterPairs,
      currentPhase: PHASES.UPLOAD, // Keep them here until they pick Scatter or TS
      currentStepIndex: 0,
      historyStack: [],
      pendingDrops: []
    });
  },

  setPhase: (phase) => {
    set({ currentPhase: phase, currentStepIndex: 0 });
  },

  // Staging
  addPendingDrops: (drops) => {
    // drops: array of { timestamp, sensorName }
    set((state) => ({
      pendingDrops: [...state.pendingDrops, ...drops]
    }));
  },

  removePendingDrop: (indexToRemove) => {
    set((state) => ({
      pendingDrops: state.pendingDrops.filter((_, i) => i !== indexToRemove)
    }));
  },
  
  clearPendingDrops: () => {
    set({ pendingDrops: [] });
  },

  // Save the current state to history and commit pending drops
  commitAndNext: () => {
    const state = get();
    
    // 1. Create a snapshot of current deletions to save
    const deletionsSnapshot = {};
    Object.keys(state.sensorDeletions).forEach(col => {
      deletionsSnapshot[col] = new Set(state.sensorDeletions[col]);
    });

    const snapshot = {
      phase: state.currentPhase,
      stepIndex: state.currentStepIndex,
      sensorDeletions: deletionsSnapshot
    };

    // 2. Commit staging drops to actual deletions
    const newDeletions = {};
    Object.keys(state.sensorDeletions).forEach(col => {
      newDeletions[col] = new Set(state.sensorDeletions[col]);
    });

    state.pendingDrops.forEach(drop => {
      if (newDeletions[drop.sensorName]) {
        newDeletions[drop.sensorName].add(drop.timestamp);
      }
    });

    // 3. Advance Step
    let nextPhase = state.currentPhase;
    let nextStepIndex = state.currentStepIndex + 1;

    if (state.currentPhase === PHASES.SCATTER) {
      if (nextStepIndex >= state.scatterPairs.length) {
        nextPhase = PHASES.TIMESERIES;
        nextStepIndex = 0;
      }
    } else if (state.currentPhase === PHASES.TIMESERIES) {
      if (nextStepIndex >= state.sensorColumns.length) {
        nextPhase = PHASES.EXPORT;
        nextStepIndex = 0;
      }
    }

    set((state) => ({
      historyStack: [...state.historyStack, snapshot],
      sensorDeletions: newDeletions,
      pendingDrops: [],
      currentPhase: nextPhase,
      currentStepIndex: nextStepIndex
    }));
  },

  // Time Machine - restore exactly to previous state
  goBack: () => {
    const state = get();
    if (state.historyStack.length === 0) return; // Can't go back

    const lastSnapshot = state.historyStack[state.historyStack.length - 1];
    
    // Create new detached copies of the snapshot's sets
    const restoredDeletions = {};
    Object.keys(lastSnapshot.sensorDeletions).forEach(col => {
      restoredDeletions[col] = new Set(lastSnapshot.sensorDeletions[col]);
    });

    set((state) => ({
      historyStack: state.historyStack.slice(0, -1),
      sensorDeletions: restoredDeletions,
      currentPhase: lastSnapshot.phase,
      currentStepIndex: lastSnapshot.stepIndex,
      pendingDrops: [] // wipe pending drops when traveling in time
    }));
  },

  // Start Over (Wipes Everything)
  startOver: () => {
    set({
      masterData: [],
      sensorColumns: [],
      timestampColumn: '',
      sensorDeletions: {},
      pendingDrops: [],
      currentPhase: PHASES.UPLOAD,
      currentStepIndex: 0,
      scatterPairs: [],
      historyStack: []
    });
  }
}));

export default useAppStore;
