// src/campaign-builder/store/flow-store.ts
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import {
  type Node,
  type Edge,
  applyNodeChanges,
  applyEdgeChanges,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";

// Simple layout state - no manual positioning
interface LayoutState {
  /** Whether auto-layout is enabled */
  autoLayoutEnabled: boolean;
  /** Whether layout is currently computing */
  isLayouting: boolean;
  /** Layout direction preference */
  layoutDirection: 'DOWN' | 'UP' | 'LEFT' | 'RIGHT';
}

// Plus button context type (existing)
interface PlusContext {
  type: "node" | "edge";
  sourceId: string;
  edgeId?: string;
  targetId?: string;
  sourceNodeId?: string;
  targetNodeId?: string;
  position?: { x: number; y: number };
}

// Layout trigger types
type LayoutTrigger = 
  | { type: 'node_added'; nodeId: string }
  | { type: 'node_removed'; nodeId: string }
  | { type: 'edge_added'; edgeId: string }
  | { type: 'edge_removed'; edgeId: string }
  | { type: 'manual'; }
  | { type: 'incremental'; affectedNodeIds: string[] };

interface FlowState extends LayoutState {
  /* ---------------------- EXISTING STATE ---------------------- */
  nodes: Node[];
  edges: Edge[];
  plusContext: PlusContext | null;

  /* ---------------------- LAYOUT ACTIONS ---------------------- */
  /** Enable/disable auto-layout */
  setAutoLayoutEnabled: (enabled: boolean) => void;
  /** Set layout computing state */
  setIsLayouting: (isLayouting: boolean) => void;
  /** Change layout direction */
  setLayoutDirection: (direction: 'DOWN' | 'UP' | 'LEFT' | 'RIGHT') => void;
  /** Trigger layout computation */
  triggerLayout: (trigger: LayoutTrigger) => void;
  /** Apply layout result */
  applyLayoutResult: (nodes: Node[], edges: Edge[]) => void;
  /** Clear all data */
  clearFlow: () => void;

  /* ---------------------- EXISTING ACTIONS ---------------------- */
  addNodeAtEnd: (node: Node) => void;
  updateNode: (id: string, updater: (node: Node) => void) => void;
  removeNode: (id: string) => void;
  setNodes: (changes: NodeChange[]) => void;
  setEdges: (changes: EdgeChange[]) => void;
  addEdge: (edge: Edge) => void;
  setPlusContext: (context: PlusContext | null) => void;
  clearPlusContext: () => void;
  insertAtEnd: (parentId: string, nodeType: string) => void;
  insertBetweenNodes: (edgeId: string, newNode: Node) => void;
}

// Global layout trigger callback (will be set by the auto-layout hook)
let layoutCallback: ((trigger: LayoutTrigger) => void) | null = null;

export const setLayoutCallback = (callback: ((trigger: LayoutTrigger) => void) | null) => {
  layoutCallback = callback;
};

export const useFlowStore = create<FlowState>()(
  immer<FlowState>((set, get) => ({
    /* ---------------------- EXISTING STATE ---------------------- */
    nodes: [],
    edges: [],
    plusContext: null,

    /* ---------------------- LAYOUT STATE ---------------------- */
    autoLayoutEnabled: true,
    isLayouting: false,
    layoutDirection: 'DOWN',

    /* ---------------------- LAYOUT ACTIONS ---------------------- */
    setAutoLayoutEnabled: (enabled) =>
      set((draft) => {
        draft.autoLayoutEnabled = enabled;
        // If enabling auto-layout, trigger a layout
        if (enabled && draft.nodes.length > 0) {
          setTimeout(() => {
            get().triggerLayout({ type: 'manual' });
          }, 0);
        }
      }),

    setIsLayouting: (isLayouting) =>
      set((draft) => {
        draft.isLayouting = isLayouting;
      }),

    setLayoutDirection: (direction) =>
      set((draft) => {
        draft.layoutDirection = direction;
        // Trigger layout with new direction if auto-layout is enabled
        if (draft.autoLayoutEnabled && draft.nodes.length > 0) {
          setTimeout(() => {
            get().triggerLayout({ type: 'manual' });
          }, 0);
        }
      }),

    triggerLayout: (trigger) => {
      const state = get();
      if (state.autoLayoutEnabled && !state.isLayouting && layoutCallback) {
        layoutCallback(trigger);
      }
    },

    applyLayoutResult: (nodes, edges) =>
      set((draft) => {
        // Simple - just apply the layout result to all nodes
        draft.nodes = nodes as any[];
        draft.edges = edges;
      }),

    clearFlow: () =>
      set((draft) => {
        draft.nodes = [];
        draft.edges = [];
        draft.plusContext = null;
        draft.isLayouting = false;
      }),

    /* ---------------------- ENHANCED EXISTING ACTIONS ---------------------- */

    addNodeAtEnd: (node) =>
      set((draft) => {
        const last = draft.nodes[draft.nodes.length - 1];

        // Capture node ID before async operation
        const nodeId = node.id;

        // Set position for the new node (will be overridden by auto-layout if enabled)
        if (last) {
          node.position = {
            x: last.position.x,
            y: last.position.y + 200,
          };

          // Auto-wire edge from last node → new node
          draft.edges.push({
            id: `${last.id}-${nodeId}`,
            source: last.id,
            target: nodeId,
            type: "buttonedge",
          });
        } else {
          // First node - center it
          node.position = { x: 400, y: 100 };
        }

        draft.nodes.push(node as any);
        
        // Trigger auto-layout after state update
        setTimeout(() => {
          get().triggerLayout({ type: 'node_added', nodeId });
        }, 0);
      }),

    updateNode: (id, updater) =>
      set((draft) => {
        const idx = draft.nodes.findIndex((n) => n.id === id);
        if (idx !== -1) {
          updater(draft.nodes[idx]);
          // Note: Don't trigger layout for config updates, only structure changes
        }
      }),

    removeNode: (id) =>
      set((draft) => {
        draft.nodes = draft.nodes.filter((n) => n.id !== id);
        draft.edges = draft.edges.filter(
          (e) => e.source !== id && e.target !== id
        );
        
        // Trigger auto-layout after state update
        setTimeout(() => {
          get().triggerLayout({ type: 'node_removed', nodeId: id });
        }, 0);
      }),

    setNodes: (changes) =>
      set((draft) => {
        // Apply all changes without manual position tracking
        draft.nodes = applyNodeChanges(changes, draft.nodes);
      }),

    setEdges: (changes) =>
      set((draft) => {
        const oldEdgeCount = draft.edges.length;
        draft.edges = applyEdgeChanges(changes, draft.edges);
        
        // Trigger layout if edges were added/removed
        if (draft.edges.length !== oldEdgeCount) {
          setTimeout(() => {
            get().triggerLayout({ type: 'manual' });
          }, 0);
        }
      }),

    addEdge: (edge) =>
      set((draft) => {
        // Capture edge properties before async operation
        const sourceId = edge.source;
        const targetId = edge.target;
        
        draft.edges.push(edge);
        
        // Trigger incremental layout for connected nodes
        setTimeout(() => {
          get().triggerLayout({ 
            type: 'incremental', 
            affectedNodeIds: [sourceId, targetId] 
          });
        }, 0);
      }),

    /* ---------------------- PLUS CONTEXT ACTIONS ---------------------- */
    setPlusContext: (context) =>
      set((draft) => {
        draft.plusContext = context;
      }),

    clearPlusContext: () =>
      set((draft) => {
        draft.plusContext = null;
      }),

    insertAtEnd: (parentId, nodeType) =>
      set((draft) => {
        // Import createNode dynamically to avoid circular dependency
        const { createNode } = require("@/campaign-builder/registry/factory");

        const parentNode = draft.nodes.find((n) => n.id === parentId);
        if (!parentNode) return;

        // Create new node positioned below parent
        const newNode = createNode(nodeType, {
          position: {
            x: parentNode.position.x,
            y: parentNode.position.y + 200,
          },
        });

        // Capture the new node ID before async operations
        const newNodeId = newNode.id;

        // Find nodes that need to shift down (those below the parent)
        const nodesToShift = draft.nodes.filter(
          (n) => n.position.y > parentNode.position.y
        );

        // Shift existing downstream nodes down by 200px for consistent spacing
        nodesToShift.forEach((node) => {
          node.position.y += 200;
        });

        // Add the new node to the flow
        draft.nodes.push(newNode as any);

        // Handle edge connections
        const existingEdgesFromParent = draft.edges.filter(
          (e) => e.source === parentId
        );

        if (existingEdgesFromParent.length > 0) {
          // Parent already has connections - insert new node in between
          existingEdgesFromParent.forEach((edge) => {
            const edgeIndex = draft.edges.findIndex((e) => e.id === edge.id);
            if (edgeIndex !== -1) {
              draft.edges.splice(edgeIndex, 1);
            }

            // Create new edge: new node → old target
            draft.edges.push({
              id: `${newNodeId}-${edge.target}`,
              source: newNodeId,
              target: edge.target,
              type: "buttonedge",
            });
          });
        }

        // Always create edge: parent → new node
        draft.edges.push({
          id: `${parentId}-${newNodeId}`,
          source: parentId,
          target: newNodeId,
          type: "buttonedge",
        });
        
        // Trigger incremental layout for affected nodes
        setTimeout(() => {
          get().triggerLayout({ 
            type: 'incremental', 
            affectedNodeIds: [parentId, newNodeId] 
          });
        }, 0);
      }),

    insertBetweenNodes: (edgeId, newNode) =>
      set((draft) => {
        const edgeToReplace = draft.edges.find((e) => e.id === edgeId);
        if (!edgeToReplace) return;

        const sourceNode = draft.nodes.find((n) => n.id === edgeToReplace.source);
        const targetNode = draft.nodes.find((n) => n.id === edgeToReplace.target);
        if (!sourceNode || !targetNode) return;

        // Capture IDs before async operation to avoid revoked proxy access
        const sourceId = edgeToReplace.source;
        const targetId = edgeToReplace.target;
        const newNodeId = newNode.id;

        // Position new node between source and target
        newNode.position = {
          x: (sourceNode.position.x + targetNode.position.x) / 2,
          y: (sourceNode.position.y + targetNode.position.y) / 2,
        };

        // Add the new node
        draft.nodes.push(newNode as any);

        // Remove the original edge
        const edgeIndex = draft.edges.findIndex((e) => e.id === edgeId);
        if (edgeIndex !== -1) {
          draft.edges.splice(edgeIndex, 1);
        }

        // Create two new edges: source → new node → target
        draft.edges.push(
          {
            id: `${sourceId}-${newNodeId}`,
            source: sourceId,
            target: newNodeId,
            type: "buttonedge",
          },
          {
            id: `${newNodeId}-${targetId}`,
            source: newNodeId,
            target: targetId,
            type: "buttonedge",
          }
        );
        
        // Trigger incremental layout for affected nodes
        setTimeout(() => {
          get().triggerLayout({ 
            type: 'incremental', 
            affectedNodeIds: [sourceId, newNodeId, targetId] 
          });
        }, 0);
      }),
  }))
);

// Helper functions for external use
export const getFlowState = () => useFlowStore.getState();

// Utility function to get layout statistics
export const getLayoutStats = () => {
  const state = useFlowStore.getState();
  return {
    totalNodes: state.nodes.length,
    totalEdges: state.edges.length,
    autoLayoutEnabled: state.autoLayoutEnabled,
    isLayouting: state.isLayouting,
    layoutDirection: state.layoutDirection,
  };
};

// Utility function for debugging
export const debugFlowState = () => {
  const state = useFlowStore.getState();
  console.log('Flow State Debug:', {
    nodes: state.nodes.map(n => ({ id: n.id, position: n.position, type: n.type })),
    edges: state.edges.map(e => ({ id: e.id, source: e.source, target: e.target })),
    layoutState: {
      autoLayoutEnabled: state.autoLayoutEnabled,
      isLayouting: state.isLayouting,
      layoutDirection: state.layoutDirection,
    }
  });
};

export type { LayoutTrigger, PlusContext, FlowState };