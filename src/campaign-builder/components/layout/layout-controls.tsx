// src/campaign-builder/components/layout/layout-controls.tsx
import React, { useEffect, useCallback } from 'react';
import { 
  RotateCcw, 
  ArrowDown, 
  ArrowUp, 
  ArrowLeft, 
  ArrowRight,
  Settings,
  Play,
  Pause,
  RefreshCw
} from 'lucide-react';
import { useAutoLayout } from '../../hooks/useAutoLayout';
import { useFlowStore, setLayoutCallback } from '../../store/flow-store';

interface LayoutControlsProps {
  className?: string;
}

const DirectionButton: React.FC<{
  direction: 'DOWN' | 'UP' | 'LEFT' | 'RIGHT';
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
}> = ({ direction, icon, isActive, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`
      p-2 h-10 w-10 rounded border transition-all duration-200
      ${isActive 
        ? 'bg-blue-500 text-white border-blue-500 shadow-sm' 
        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
      }
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    `}
    title={`Layout ${direction.toLowerCase()}`}
  >
    {icon}
  </button>
);

export const LayoutControls: React.FC<LayoutControlsProps> = ({ className = '' }) => {
  const {
    autoLayoutEnabled,
    isLayouting,
    layoutDirection,
    setAutoLayoutEnabled,
    setIsLayouting,
    setLayoutDirection,
    applyLayoutResult,
    triggerLayout,
    nodes,
    edges,
  } = useFlowStore();

  // Initialize auto-layout hook
  const { layout, layoutIncremental, isLayouting: hookIsLayouting } = useAutoLayout({
    direction: layoutDirection,
    fitViewAfterLayout: true,
    onLayoutStart: () => setIsLayouting(true),
    onLayoutComplete: (layoutedNodes, layoutedEdges) => {
      applyLayoutResult(layoutedNodes, layoutedEdges);
      setIsLayouting(false);
    },
    onLayoutError: (error) => {
      console.error('Layout failed:', error);
      setIsLayouting(false);
    },
  });

  // Connect store to auto-layout hook
  useEffect(() => {
    const handleLayoutTrigger = async (trigger: any) => {
      if (!autoLayoutEnabled) return;

      switch (trigger.type) {
        case 'incremental':
          if (trigger.affectedNodeIds?.length > 0) {
            await layoutIncremental(trigger.affectedNodeIds);
          }
          break;
        case 'node_added':
        case 'node_removed':
        case 'edge_added':
        case 'edge_removed':
        case 'manual':
        default:
          await layout();
          break;
      }
    };

    setLayoutCallback(handleLayoutTrigger);

    return () => {
      setLayoutCallback(null);
    };
  }, [autoLayoutEnabled, layout, layoutIncremental]);

  // Direction change handlers
  const handleDirectionChange = useCallback((direction: 'DOWN' | 'UP' | 'LEFT' | 'RIGHT') => {
    setLayoutDirection(direction);
  }, [setLayoutDirection]);

  // Manual layout trigger
  const handleManualLayout = useCallback(() => {
    if (!isLayouting && nodes.length > 0) {
      triggerLayout({ type: 'manual' });
    }
  }, [isLayouting, nodes.length, triggerLayout]);

  // Toggle auto-layout
  const handleToggleAutoLayout = useCallback(() => {
    setAutoLayoutEnabled(!autoLayoutEnabled);
  }, [autoLayoutEnabled, setAutoLayoutEnabled]);

  const isDisabled = isLayouting || hookIsLayouting || nodes.length === 0;

  return (
    <div className={`flex items-center gap-2 p-2 bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Auto-layout toggle */}
      <button
        onClick={handleToggleAutoLayout}
        className={`
          flex items-center gap-2 px-3 py-2 rounded border transition-all duration-200
          ${autoLayoutEnabled 
            ? 'bg-green-500 text-white border-green-500 hover:bg-green-600' 
            : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
          }
        `}
        title={`${autoLayoutEnabled ? 'Disable' : 'Enable'} auto-layout`}
      >
        {autoLayoutEnabled ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
        <span className="text-sm font-medium">
          Auto-Layout
        </span>
      </button>

      {/* Divider */}
      <div className="w-px h-6 bg-gray-300" />

      {/* Direction controls */}
      <div className="flex items-center gap-1">
        <span className="text-sm text-gray-600 mr-2">Direction:</span>
        
        <DirectionButton
          direction="UP"
          icon={<ArrowUp className="w-4 h-4" />}
          isActive={layoutDirection === 'UP'}
          onClick={() => handleDirectionChange('UP')}
          disabled={isDisabled}
        />
        
        <DirectionButton
          direction="DOWN"
          icon={<ArrowDown className="w-4 h-4" />}
          isActive={layoutDirection === 'DOWN'}
          onClick={() => handleDirectionChange('DOWN')}
          disabled={isDisabled}
        />
        
        <DirectionButton
          direction="LEFT"
          icon={<ArrowLeft className="w-4 h-4" />}
          isActive={layoutDirection === 'LEFT'}
          onClick={() => handleDirectionChange('LEFT')}
          disabled={isDisabled}
        />
        
        <DirectionButton
          direction="RIGHT"
          icon={<ArrowRight className="w-4 h-4" />}
          isActive={layoutDirection === 'RIGHT'}
          onClick={() => handleDirectionChange('RIGHT')}
          disabled={isDisabled}
        />
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-gray-300" />

      {/* Manual layout trigger */}
      <button
        onClick={handleManualLayout}
        disabled={isDisabled}
        className={`
          flex items-center gap-2 px-3 py-2 rounded border transition-all duration-200
          ${isDisabled 
            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
            : 'bg-blue-500 text-white border-blue-500 hover:bg-blue-600'
          }
        `}
        title="Manually trigger layout"
      >
        {isLayouting || hookIsLayouting ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : (
          <RotateCcw className="w-4 h-4" />
        )}
        <span className="text-sm font-medium">
          Re-Layout
        </span>
      </button>

      {/* Layout status indicator */}
      {(isLayouting || hookIsLayouting) && (
        <div className="flex items-center gap-2 text-sm text-blue-600">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <span>Computing layout...</span>
        </div>
      )}

      {/* Node count info */}
      <div className="text-sm text-gray-500 ml-2">
        {nodes.length} {nodes.length === 1 ? 'node' : 'nodes'}
      </div>
    </div>
  );
};

// Simple layout button for minimal UI
export const LayoutButton: React.FC<{
  direction?: 'DOWN' | 'UP' | 'LEFT' | 'RIGHT';
  className?: string;
}> = ({ direction = 'DOWN', className = '' }) => {
  const { onClick, disabled, isLayouting } = useLayoutButton(direction);

  const getIcon = () => {
    switch (direction) {
      case 'UP': return <ArrowUp className="w-4 h-4" />;
      case 'LEFT': return <ArrowLeft className="w-4 h-4" />;
      case 'RIGHT': return <ArrowRight className="w-4 h-4" />;
      default: return <ArrowDown className="w-4 h-4" />;
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        p-2 h-10 w-10 bg-white border border-gray-300 rounded shadow-sm
        hover:bg-gray-50 hover:border-gray-400 transition-all duration-200
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      title={`Auto-layout ${direction.toLowerCase()}`}
    >
      {isLayouting ? (
        <RefreshCw className="w-4 h-4 animate-spin" />
      ) : (
        getIcon()
      )}
    </button>
  );
};

//... rest of the component code

// Helper hook for simple layout button (moved here to avoid circular imports)
const useLayoutButton = (direction: 'DOWN' | 'UP' | 'LEFT' | 'RIGHT' = 'DOWN') => {
  const { layout, isLayouting } = useAutoLayout({
    direction,
    fitViewAfterLayout: true,
  });

  const handleClick = useCallback(() => {
    if (!isLayouting) {
      layout();
    }
  }, [layout, isLayouting]);

  return {
    onClick: handleClick,
    disabled: isLayouting,
    isLayouting,
  };
};