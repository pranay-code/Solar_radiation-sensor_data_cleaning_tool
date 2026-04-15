import React from 'react';
import { X, Trash2 } from 'lucide-react';
import useAppStore from '../store/useAppStore';

const StagingLog = () => {
  const pendingDrops = useAppStore(state => state.pendingDrops);
  const removePendingDrop = useAppStore(state => state.removePendingDrop);
  const clearPendingDrops = useAppStore(state => state.clearPendingDrops);

  // Group by sensor for clear logging
  const groupedDrops = pendingDrops.reduce((acc, drop, index) => {
    if (!acc[drop.sensorName]) {
      acc[drop.sensorName] = [];
    }
    acc[drop.sensorName].push({ ...drop, index });
    return acc;
  }, {});

  return (
    <div style={{ 
      flex: '1', 
      backgroundColor: 'var(--bg-secondary)', 
      borderLeft: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Trash2 size={18} /> Pending Deletions
        </h3>
        {pendingDrops.length > 0 && (
          <button className="btn btn-ghost" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={clearPendingDrops}>
            Clear All
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
        {pendingDrops.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>
            <p>No points selected.</p>
            <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Use the lasso or box tool on the chart to select anomalous points.</p>
          </div>
        ) : (
          Object.keys(groupedDrops).map(sensorName => (
            <div key={sensorName} style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {sensorName} ({groupedDrops[sensorName].length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {groupedDrops[sensorName].map((item) => (
                  <div key={item.index} className="glass" style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '0.5rem 0.75rem', 
                    borderRadius: '6px',
                    fontSize: '0.85rem'
                  }}>
                    <span>{item.timestamp}</span>
                    <button 
                      className="btn btn-ghost" 
                      style={{ padding: '0.2rem', color: 'var(--accent-danger)' }}
                      onClick={() => removePendingDrop(item.index)}
                      title="Cancel this drop"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default StagingLog;
