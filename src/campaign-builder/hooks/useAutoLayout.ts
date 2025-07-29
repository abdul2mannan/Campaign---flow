// src/campaign-builder/hooks/useAutoLayout.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import { computeLayout, computeIncrementalLayout, type LayoutOptions } from '../utils/elk-layout';

interface UseAutoLayoutOptions {
  /** Debounce delay in milliseconds (default: 80ms) */
  debounceMs?: number;
  /** Default layout direction */
  direction?: 'DOWN' | 'UP' | 'LEFT' | 'RIGHT';
  /** Whether to fit view after layout */
  fitViewAfterLayout?: boolean;
  /** Custom spacing options */
  spacing?: {
    nodeNode?: number;
    nodeNodeBetweenLayers?: number;
    edgeNode?: number;
  };
  /** Callback when layout starts */
  onLayoutStart?: () => void;
  /** Callback when layout completes */
  onLayoutComplete?: (nodes: Node[], edges: Edge[]) => void;
  /** Callback when layout fails */
  onLayoutError?: (error: Error) => void;
}

interface UseAutoLayoutReturn {
  /** Whether layout is currently computing */
  isLayouting: boolean;
  /** Manually trigger layout computation */
  layout: (options?: Partial<LayoutOptions>) => Promise<void>;
  /** Trigger incremental layout for specific nodes */
  layoutIncremental: (changedNodeIds: string[], options?: Partial<LayoutOptions>) => Promise<void>;
  /** Cancel any pending layout operation */
  cancelLayout: () => void;
}

export const useAutoLayout = (options: UseAutoLayoutOptions = {}): UseAutoLayoutReturn => {
  const {
    debounceMs = 80,
    direction = 'DOWN',
    fitViewAfterLayout = true,
    spacing,
    onLayoutStart,
    onLayoutComplete,
    onLayoutError,
  } = options;

  const { getNodes, getEdges, setNodes, setEdges, fitView } = useReactFlow();
  const [isLayouting, setIsLayouting] = useState(false);
  
  // Debounce timer reference
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cancel any pending layout
  const cancelLayout = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    setIsLayouting(false);
  }, []);

  // Core layout computation function
  const performLayout = useCallback(async (
    layoutOptions: Partial<LayoutOptions> = {},
    incremental: boolean = false,
    changedNodeIds: string[] = []
  ) => {
    try {
      // Cancel any existing layout
      cancelLayout();
      
      // Create abort controller for this operation
      abortControllerRef.current = new AbortController();
      
      setIsLayouting(true);
      onLayoutStart?.();

      const currentNodes = getNodes();
      const currentEdges = getEdges();

      // Merge layout options
      const finalOptions: LayoutOptions = {
        direction,
        spacing,
        ...layoutOptions,
      };

      // Compute layout
      let result;
      if (incremental && changedNodeIds.length > 0) {
        result = await computeIncrementalLayout(currentNodes, currentEdges, changedNodeIds, finalOptions);
      } else {
        result = await computeLayout(currentNodes, currentEdges, finalOptions);
      }

      // Check if operation was cancelled
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      // Apply the new layout with smooth transitions
      setNodes(result.nodes);
      setEdges(result.edges);

      // Fit view if requested
      if (fitViewAfterLayout) {
        // Small delay to ensure nodes are rendered with new positions
        setTimeout(() => {
          if (!abortControllerRef.current?.signal.aborted) {
            fitView({ duration: 300, padding: 0.2 });
          }
        }, 50);
      }

      onLayoutComplete?.(result.nodes, result.edges);

    } catch (error) {
      console.error('Auto-layout failed:', error);
      onLayoutError?.(error as Error);
    } finally {
      setIsLayouting(false);
      abortControllerRef.current = null;
    }
  }, [
    direction,
    spacing,
    fitViewAfterLayout,
    getNodes,
    getEdges,
    setNodes,
    setEdges,
    fitView,
    onLayoutStart,
    onLayoutComplete,
    onLayoutError,
    cancelLayout
  ]);

  // Debounced layout function
  const layout = useCallback((layoutOptions: Partial<LayoutOptions> = {}) => {
    return new Promise<void>((resolve, reject) => {
      // Cancel existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new timer
      debounceTimerRef.current = setTimeout(async () => {
        try {
          await performLayout(layoutOptions, false);
          resolve();
        } catch (error) {
          reject(error);
        }
      }, debounceMs);
    });
  }, [performLayout, debounceMs]);

  // Incremental layout function (also debounced)
  const layoutIncremental = useCallback((
    changedNodeIds: string[], 
    layoutOptions: Partial<LayoutOptions> = {}
  ) => {
    return new Promise<void>((resolve, reject) => {
      // Cancel existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new timer
      debounceTimerRef.current = setTimeout(async () => {
        try {
          await performLayout(layoutOptions, true, changedNodeIds);
          resolve();
        } catch (error) {
          reject(error);
        }
      }, debounceMs);
    });
  }, [performLayout, debounceMs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelLayout();
    };
  }, [cancelLayout]);

  return {
    isLayouting,
    layout,
    layoutIncremental,
    cancelLayout,
  };
};

// Helper hook for layout button component
export const useLayoutButton = (direction: 'DOWN' | 'UP' | 'LEFT' | 'RIGHT' = 'DOWN') => {
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