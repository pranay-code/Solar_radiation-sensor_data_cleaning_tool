import React, { useMemo, useState, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import useAppStore from '../../store/useAppStore';

const ScatterChart = () => {
  const echartsRef = useRef(null);
  
  const masterData = useAppStore(state => state.masterData);
  const timestampColumn = useAppStore(state => state.timestampColumn);
  const scatterPairs = useAppStore(state => state.scatterPairs);
  const currentStepIndex = useAppStore(state => state.currentStepIndex);
  const sensorDeletions = useAppStore(state => state.sensorDeletions);
  const addPendingDrops = useAppStore(state => state.addPendingDrops);

  const [brushSelection, setBrushSelection] = useState(null); // { indices: [] }

  const pair = scatterPairs[currentStepIndex];
  const sensorA = pair ? pair[0] : null;
  const sensorB = pair ? pair[1] : null;

  // Derive the active dataset for drawing
  const { chartData, mappedTimestamps } = useMemo(() => {
    if (!sensorA || !sensorB) return { chartData: [], mappedTimestamps: [] };

    const delA = sensorDeletions[sensorA] || new Set();
    const delB = sensorDeletions[sensorB] || new Set();

    const data = [];
    const timestamps = [];

    for (let i = 0; i < masterData.length; i++) {
      const row = masterData[i];
      const ts = row[timestampColumn];
      
      // If either sensor's value at this timestamp was already deleted, we skip drawing it
      if (!delA.has(ts) && !delB.has(ts)) {
        const valA = row[sensorA];
        const valB = row[sensorB];
        // Only push if both are valid numbers
        if (valA !== null && valA !== undefined && valB !== null && valB !== undefined) {
          data.push([valA, valB]);
          timestamps.push(ts);
        }
      }
    }

    // Cap at 20K rendered points for scatter performance.
    // Uniform-stride subsampling preserves outlier distribution since outliers
    // are spread proportionally through the dataset.
    const MAX_SCATTER_POINTS = 20_000;
    if (data.length > MAX_SCATTER_POINTS) {
      const stride = Math.ceil(data.length / MAX_SCATTER_POINTS);
      const sampledData = [];
      const sampledTs = [];
      for (let i = 0; i < data.length; i += stride) {
        sampledData.push(data[i]);
        sampledTs.push(timestamps[i]);
      }
      return { chartData: sampledData, mappedTimestamps: sampledTs };
    }
    
    return { chartData: data, mappedTimestamps: timestamps };
  }, [masterData, timestampColumn, sensorDeletions, sensorA, sensorB]);

  const option = {
    animation: false, // Performance
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: function (params) {
        const ts = mappedTimestamps[params.dataIndex];
        return `Time: ${ts}<br/>${sensorA}: ${params.value[0]}<br/>${sensorB}: ${params.value[1]}`;
      }
    },
    toolbox: {
      feature: {
        brush: {
          type: ['rect', 'polygon', 'clear']
        }
      },
      iconStyle: { borderColor: '#fff' }
    },
    brush: {
      xAxisIndex: 'all',
      yAxisIndex: 'all',
      outOfBrush: {
        colorAlpha: 0.1
      }
    },
    xAxis: {
      type: 'value',
      name: sensorA,
      nameLocation: 'middle',
      nameGap: 30,
      scale: true,
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
      axisLabel: { color: '#94a3b8' },
      nameTextStyle: { color: '#f8fafc' }
    },
    yAxis: {
      type: 'value',
      name: sensorB,
      nameLocation: 'middle',
      nameGap: 40,
      scale: true,
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
      axisLabel: { color: '#94a3b8' },
      nameTextStyle: { color: '#f8fafc' }
    },
    series: [
      {
        type: 'scatter',
        symbolSize: 4,
        large: true,
        largeThreshold: 5000,
        itemStyle: { color: '#6366f1', opacity: 0.8 },
        data: chartData
      }
    ]
  };

  const onEvents = {
    'brushEnd': (params) => {
      if (!params || !params.areas || params.areas.length === 0) return;
      
      const brushComponent = params.areas[0];
      
      // Echarts doesn't directly expose indices in brushEnd sometimes, 
      // Instead we get coordinates. But wait, `echartsInstance.dispatchAction` handles it,
      // Actually `brushEnd` event gives us nothing useful if large mode is on, NO wait, 
      // ECharts provides `echartsInstance.getOption()` but an easier way is `brushSelected` event.
    },
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

  const handleStageDrops = (target) => {
    if (!brushSelection || brushSelection.length === 0) return;

    const drops = [];
    brushSelection.forEach(idx => {
      const ts = mappedTimestamps[idx];
      if (target === 'A' || target === 'BOTH') {
        drops.push({ timestamp: ts, sensorName: sensorA });
      }
      if (target === 'B' || target === 'BOTH') {
        drops.push({ timestamp: ts, sensorName: sensorB });
      }
    });

    addPendingDrops(drops);
    
    // Clear brush from UI
    if (echartsRef.current) {
      echartsRef.current.getEchartsInstance().dispatchAction({
        type: 'brush',
        command: 'clear',
        areas: []
      });
    }
    setBrushSelection(null);
  };

  if (!sensorA) return null;

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
          <h4 style={{ marginBottom: '1rem' }}>Drop {brushSelection.length} selected points from:</h4>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
            <button className="btn btn-outline" style={{ fontSize: '0.8rem' }} onClick={() => handleStageDrops('A')}>
              {sensorA} Only
            </button>
            <button className="btn btn-outline" style={{ fontSize: '0.8rem' }} onClick={() => handleStageDrops('B')}>
              {sensorB} Only
            </button>
            <button className="btn btn-danger" style={{ fontSize: '0.8rem' }} onClick={() => handleStageDrops('BOTH')}>
              Both Sensors
            </button>
          </div>
          <button 
            className="btn btn-ghost" 
            style={{ marginTop: '0.5rem', width: '100%', fontSize: '0.8rem' }}
            onClick={() => {
              setBrushSelection(null);
              echartsRef.current.getEchartsInstance().dispatchAction({ type: 'brush', command: 'clear', areas: [] });
            }}
          >
            Cancel Selection
          </button>
        </div>
      )}
    </div>
  );
};

export default ScatterChart;
