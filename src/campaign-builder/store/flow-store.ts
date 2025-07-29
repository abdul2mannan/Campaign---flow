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

// PHASE 2: Helper functions for smart deletion
const analyzeNodeConnections = (nodeId: string, edges: Edge[]) => {
  const incomingEdges = edges.filter(e => e.target === nodeId);
  const outgoingEdges = edges.filter(e => e.source === nodeId);
  
  return {
    incomingEdges,
    outgoingEdges,
    isStartNode: incomingEdges.length === 0,
    isEndNode: outgoingEdges.length === 0,
    isMiddleNode: incomingEdges.length > 0 && outgoingEdges.length > 0,
    isBranchingNode: outgoingEdges.length > 1,
  };
};

const createReconnectionEdges = (incomingEdges: Edge[], outgoingEdges: Edge[]): Edge[] => {
  const newEdges: Edge[] = [];
  
  // For each incoming edge source, connect to each outgoing edge target
  incomingEdges.forEach(inEdge => {
    outgoingEdges.forEach(outEdge => {
      const edgeId = `${inEdge.source}-${outEdge.target}`;
      
      // Avoid creating duplicate edges
      if (!newEdges.some(e => e.id === edgeId)) {
        newEdges.push({
          id: edgeId,
          source: inEdge.source,
          target: outEdge.target,
          type: "buttonedge", // Use consistent edge type
        });
      }
    });
  });
  
  return newEdges;
};

// PHASE 3: Animation helper functions
const markNodeAsNew = (node: Node): Node => {
  return {
    ...node,
    data: {
      ...node.data,
      // Mark as new for fade-in animation
      isNew: true,
      animationState: 'entering',
    },
  };
};

const markNodeAsDeleting = (node: Node): Node => {
  return {
    ...node,
    data: {
      ...node.data,
      // Mark as deleting for fade-out animation
      isDeleting: true,
      animationState: 'exiting',
    },
  };
};

const clearAnimationStates = (node: Node): Node => {
  const { isNew, isDeleting, animationState, ...cleanData } = node.data || {};
  return {
    ...node,
    data: {
      ...cleanData,
      animationState: 'stable',
    },
  };
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
        // PHASE 3: Clear animation states when applying layout
        const cleanNodes = nodes.map(clearAnimationStates);
        draft.nodes = cleanNodes as any[];
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

        // PHASE 3: Mark new node for fade-in animation
        const animatedNode = markNodeAsNew(node);
        draft.nodes.push(animatedNode as any);
        
        // PHASE 3: Clear animation state after delay
        setTimeout(() => {
          const store = get();
          const nodeIndex = store.nodes.findIndex(n => n.id === nodeId);
          if (nodeIndex !== -1) {
            set((draft) => {
              Object.assign(draft.nodes[nodeIndex], clearAnimationStates(draft.nodes[nodeIndex]));
            });
          }
        }, 600); // Clear after animation completes
        
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

    // PHASE 2 + 3: ENHANCED SMART DELETION WITH ANIMATIONS
    removeNode: (id) =>
      set((draft) => {
        // PHASE 3: First mark node as deleting for fade-out animation
        const nodeIndex = draft.nodes.findIndex(n => n.id === id);
        if (nodeIndex !== -1) {
          Object.assign(draft.nodes[nodeIndex], markNodeAsDeleting(draft.nodes[nodeIndex]));
        }

        // PHASE 3: Delay actual deletion to allow fade-out animation
        setTimeout(() => {
          set((draft) => {
            // PHASE 2: Analyze connections before deletion
            const nodeConnections = analyzeNodeConnections(id, draft.edges);
            const { incomingEdges, outgoingEdges, isMiddleNode } = nodeConnections;
            
            // Collect affected node IDs for layout update
            const affectedNodeIds = new Set<string>();
            
            // PHASE 2: Smart reconnection for middle nodes
            if (isMiddleNode && incomingEdges.length > 0 && outgoingEdges.length > 0) {
              console.log(`Smart deletion: Reconnecting middle node ${id}`);
              
              // Create new edges to reconnect the flow
              const reconnectionEdges = createReconnectionEdges(incomingEdges, outgoingEdges);
              
              // Add affected nodes for layout
              incomingEdges.forEach(e => affectedNodeIds.add(e.source));
              outgoingEdges.forEach(e => affectedNodeIds.add(e.target));
              
              // Remove the node and its edges
              draft.nodes = draft.nodes.filter((n) => n.id !== id);
              draft.edges = draft.edges.filter(
                (e) => e.source !== id && e.target !== id
              );
              
              // Add reconnection edges
              reconnectionEdges.forEach(edge => {
                // Only add if edge doesn't already exist
                if (!draft.edges.some(e => e.id === edge.id)) {
                  draft.edges.push(edge);
                }
              });
              
              console.log(`Created ${reconnectionEdges.length} reconnection edges`);
            } else {
              // PHASE 2: Simple deletion for start/end nodes
              console.log(`Simple deletion: ${nodeConnections.isStartNode ? 'Start' : nodeConnections.isEndNode ? 'End' : 'Special'} node ${id}`);
              
              // Collect affected neighbors
              [...incomingEdges, ...outgoingEdges].forEach(edge => {
                if (edge.source !== id) affectedNodeIds.add(edge.source);
                if (edge.target !== id) affectedNodeIds.add(edge.target);
              });
              
              // Standard deletion - remove node and connected edges
              draft.nodes = draft.nodes.filter((n) => n.id !== id);
              draft.edges = draft.edges.filter(
                (e) => e.source !== id && e.target !== id
              );
            }
            
            // PHASE 2: Enhanced layout trigger with affected nodes
            setTimeout(() => {
              const affectedNodesArray = Array.from(affectedNodeIds);
              if (affectedNodesArray.length > 0) {
                get().triggerLayout({ 
                  type: 'incremental', 
                  affectedNodeIds: affectedNodesArray 
                });
              } else {
                get().triggerLayout({ type: 'node_removed', nodeId: id });
              }
            }, 0);
          });
        }, 350); // Delay to allow fade-out animation
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

        // PHASE 3: Mark new node for fade-in animation
        const animatedNode = markNodeAsNew(newNode);
        draft.nodes.push(animatedNode as any);

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

        // PHASE 3: Clear animation state after delay
        setTimeout(() => {
          const store = get();
          const nodeIndex = store.nodes.findIndex(n => n.id === newNodeId);
          if (nodeIndex !== -1) {
            set((draft) => {
              Object.assign(draft.nodes[nodeIndex], clearAnimationStates(draft.nodes[nodeIndex]));
            });
          }
        }, 600);
        
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

        // PHASE 3: Mark new node for fade-in animation
        const animatedNode = markNodeAsNew(newNode);
        draft.nodes.push(animatedNode as any);

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

        // PHASE 3: Clear animation state after delay
        setTimeout(() => {
          const store = get();
          const nodeIndex = store.nodes.findIndex(n => n.id === newNodeId);
          if (nodeIndex !== -1) {
            set((draft) => {
              Object.assign(draft.nodes[nodeIndex], clearAnimationStates(draft.nodes[nodeIndex]));
            });
          }
        }, 600);
        
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