import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import useAppStore from '../store/useAppStore';

const WorkspaceBottomNav = () => {
  const commitAndNext = useAppStore(state => state.commitAndNext);
  const goBack = useAppStore(state => state.goBack);
  const historyStack = useAppStore(state => state.historyStack);
  const pendingDrops = useAppStore(state => state.pendingDrops);

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', borderTop: '1px solid var(--border-color)', marginTop: 'auto' }}>
      
      <button 
        className="btn btn-outline" 
        onClick={goBack} 
        disabled={historyStack.length === 0}
      >
        <ArrowLeft size={16} /> Back to Previous Context
      </button>

      <button 
        className="btn btn-primary" 
        onClick={commitAndNext}
      >
        Commit {pendingDrops.length > 0 ? `(${pendingDrops.length} drops)` : ''} & Next <ArrowRight size={16} />
      </button>

    </div>
  );
};

export default WorkspaceBottomNav;
