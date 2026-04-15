import React, { useMemo, useState, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import useAppStore from '../../store/useAppStore';

const TimeSeriesChart = () => {
  const echartsRef = useRef(null);
  
  const masterData = useAppStore(state => state.masterData);
  const timestampColumn = useAppStore(state => state.timestampColumn);
  const sensorColumns = useAppStore(state => state.sensorColumns);
  const currentStepIndex = useAppStore(state => state.currentStepIndex);
  // Subscribe to the specific sensor's deletion set only — avoids re-render
  // when unrelated sensors get deletions committed.
  const sensorDeletions = useAppStore(state => state.sensorDeletions);
  const addPendingDrops = useAppStore(state => state.addPendingDrops);

  // Compute activeSensor early so the deletion-set memo stays stable
  const activeSensor = sensorColumns[currentStepIndex];
  const [brushSelection, setBrushSelection] = useState(null);

  // Derive the active dataset for drawing
  const { chartData, mappedTimestamps } = useMemo(() => {
    if (!activeSensor) return { chartData: [], mappedTimestamps: [] };

    const delSet = sensorDeletions[activeSensor] || new Set();

    const data = [];
    const timestamps = [];

    // Assuming uniform step or parsing timestamps might be needed for true time scale,
    // but category axis with timestamps works best for preserving index mapping easily
    for (let i = 0; i < masterData.length; i++) {
        const row = masterData[i];
        const ts = row[timestampColumn];
        
        if (!delSet.has(ts)) {
            const val = row[activeSensor];
            if (val !== null && val !== undefined) {
                // Since this is line/timeseries, we just send category + value
                data.push([ts, val]);
                timestamps.push(ts);
            }
        }
    }
    
    return { chartData: data, mappedTimestamps: timestamps };
  }, [masterData, timestampColumn, sensorDeletions, activeSensor]);

  const option = {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' }
    },
    toolbox: {
      feature: {
        brush: { type: ['rect', 'polygon', 'clear'] }
      },
      iconStyle: { borderColor: '#fff' }
    },
    brush: {
      xAxisIndex: 'all',
      yAxisIndex: 'all',
      outOfBrush: { colorAlpha: 0.1 }
    },
    dataZoom: [
      { type: 'inside', xAxisIndex: 0 },
      { type: 'slider', xAxisIndex: 0, textStyle: { color: '#fff' } }
    ],
    xAxis: {
      type: 'category', // Standard category handles holes better if we want uniform spacing visually
      name: 'Time',
      nameLocation: 'middle',
      nameGap: 30,
      splitLine: { show: false },
      axisLabel: { color: '#94a3b8' },
      nameTextStyle: { color: '#f8fafc' }
    },
    yAxis: {
      type: 'value',
      name: activeSensor,
      nameLocation: 'middle',
      nameGap: 40,
      scale: true,
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
      axisLabel: { color: '#94a3b8' },
      nameTextStyle: { color: '#f8fafc' }
    },
    series: [
      {
        type: 'line',
        symbol: 'circle',
        symbolSize: 2,
        showSymbol: false,
        // LTTB: ECharts will downsample the rendered points while preserving
        // the visual shape of the curve.  All original data still lives in
        // mappedTimestamps for accurate brush-selection mapping.
        sampling: 'lttb',
        large: true,
        largeThreshold: 2000,
        itemStyle: { color: '#10b981' },
        lineStyle: { width: 1.5, opacity: 0.8 },
        data: chartData
      }
    ]
  };

  const onEvents = {
    'brushSelected': (params) => {
      const brushComponent = params.batch[0];
      const selectedIndices = brushComponent.selected[0].dataIndex;
      
      if (selectedIndices.length > 0) {
        setBrushSelection(selectedIndices);
      } else {
        setBrushSelection(null);
      }
    }
  };

  const handleStageDrops = () => {
    if (!brushSelection || brushSelection.length === 0) return;

    const drops = [];
    brushSelection.forEach(idx => {
      const ts = mappedTimestamps[idx];
      drops.push({ timestamp: ts, sensorName: activeSensor });
    });

    addPendingDrops(drops);
    
    if (echartsRef.current) {
      echartsRef.current.getEchartsInstance().dispatchAction({
        type: 'brush', command: 'clear', areas: []
      });
    }
    setBrushSelection(null);
  };

  if (!activeSensor) return null;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ReactECharts 
        ref={echartsRef}
        option={option} 
        onEvents={onEvents}
        style={{ height: '100%', width: '100%' }} 
        opts={{ renderer: 'canvas' }}
      />
      
      {brushSelection && brushSelection.length > 0 && (
        <div className="glass-panel animate-fade-in" style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '1rem',
          zIndex: 10,
          textAlign: 'center',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
        }}>
          <h4 style={{ marginBottom: '1rem' }}>Drop {brushSelection.length} selected points?</h4>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
            <button className="btn btn-danger" onClick={handleStageDrops}>
              Confirm Deletion
            </button>
            <button 
              className="btn btn-ghost" 
              onClick={() => {
                setBrushSelection(null);
                echartsRef.current.getEchartsInstance().dispatchAction({ type: 'brush', command: 'clear', areas: [] });
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeSeriesChart;
