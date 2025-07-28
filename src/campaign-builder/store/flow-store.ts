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

// NEW: Plus button context type
interface PlusContext {
  type: "node" | "edge";
  sourceId: string;
  edgeId?: string;
  targetId?: string;
  sourceNodeId?: string;
  targetNodeId?: string;
  position?: { x: number; y: number }; // For future edge plus buttons
}

interface FlowState {
  /* ---------------------- EXISTING STATE ---------------------- */
  nodes: Node[];
  edges: Edge[];

  /* ---------------------- NEW: Plus Context ---------------------- */
  plusContext: PlusContext | null;

  /* ---------------------- EXISTING ACTIONS ---------------------- */
  addNodeAtEnd: (node: Node) => void;
  updateNode: (id: string, updater: (node: Node) => void) => void;
  removeNode: (id: string) => void;
  setNodes: (changes: NodeChange[]) => void;
  setEdges: (changes: EdgeChange[]) => void;
  addEdge: (edge: Edge) => void;

  /* ---------------------- NEW: Plus Context Actions ---------------------- */
  setPlusContext: (context: PlusContext | null) => void;
  clearPlusContext: () => void;
  insertAtEnd: (parentId: string, nodeType: string) => void;
  insertBetweenNodes: (edgeId: string, newNode: Node) => void;
}

export const useFlowStore = create<FlowState>()(
  immer<FlowState>((set, get) => ({
    /* ---------------------- EXISTING STATE ---------------------- */
    nodes: [],
    edges: [],

    /* ---------------------- NEW STATE ---------------------- */
    plusContext: null,

    /* ---------------------- EXISTING ACTIONS (UNCHANGED) ---------------------- */

    // Keep existing addNodeAtEnd exactly the same
    addNodeAtEnd: (node) =>
      set((draft) => {
        const last = draft.nodes[draft.nodes.length - 1];

        // Set position for the new node
        if (last) {
          // Position new node below the last one with consistent spacing
          node.position = {
            x: last.position.x,
            y: last.position.y + 200, // Increased spacing to match insertBetweenNodes
          };

          // auto‑wire edge from last node → new node
          draft.edges.push({
            id: `${last.id}-${node.id}`,
            source: last.id,
            target: node.id,
            type: "buttonedge",
          });
        } else {
          // First node - center it
          node.position = { x: 400, y: 100 };
        }

        draft.nodes.push(node as any);
      }),

    // Keep existing updateNode exactly the same
    updateNode: (id, updater) =>
      set((draft) => {
        const idx = draft.nodes.findIndex((n) => n.id === id);
        if (idx !== -1) {
          updater(draft.nodes[idx]);
        }
      }),

    // Keep existing removeNode exactly the same
    removeNode: (id) =>
      set((draft) => {
        draft.nodes = draft.nodes.filter((n) => n.id !== id);
        draft.edges = draft.edges.filter(
          (e) => e.source !== id && e.target !== id
        );
      }),

    // Keep existing setNodes exactly the same
    setNodes: (changes) =>
      set((draft) => {
        // Filter out position changes to prevent node movement
        const filteredChanges = changes.filter(
          (change) => change.type !== "position"
        );
        draft.nodes = applyNodeChanges(filteredChanges, draft.nodes);
      }),

    // Keep existing setEdges exactly the same
    setEdges: (changes) =>
      set((draft) => {
        draft.edges = applyEdgeChanges(changes, draft.edges);
      }),

    // Keep existing addEdge exactly the same
    addEdge: (edge) =>
      set((draft) => {
        draft.edges.push(edge);
      }),

    /* ---------------------- NEW ACTIONS ---------------------- */

    // Set plus button context (tracks which plus button was clicked)
    setPlusContext: (context) =>
      set((draft) => {
        draft.plusContext = context;
      }),

    // Clear plus button context
    clearPlusContext: () =>
      set((draft) => {
        draft.plusContext = null;
      }),

    // Insert node after specific parent (for plus button clicks)
    insertAtEnd: (parentId, nodeType) =>
      set((draft) => {
        const { createNode } = require("@/campaign-builder/registry/factory");

        const parentNode = draft.nodes.find((n) => n.id === parentId);
        if (!parentNode) return;

        // Create new node positioned below parent
        const newNode = createNode(nodeType, {
          position: {
            x: parentNode.position.x,
            y: parentNode.position.y + 200, // Consistent spacing
          },
        });

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
            // Remove old edge from parent
            const edgeIndex = draft.edges.findIndex((e) => e.id === edge.id);
            if (edgeIndex !== -1) {
              draft.edges.splice(edgeIndex, 1);
            }

            // Create new edge: new node → old target
            draft.edges.push({
              id: `${newNode.id}-${edge.target}`,
              source: newNode.id,
              target: edge.target,
              type: "buttonedge",
            });
          });
        }

        // Always create edge: parent → new node
        draft.edges.push({
          id: `${parentId}-${newNode.id}`,
          source: parentId,
          target: newNode.id,
          type: "buttonedge",
        });
      }),

    // Insert node between two connected nodes (for edge plus buttons)
    insertBetweenNodes: (edgeId, newNode) =>
      set((draft) => {
        const edgeToReplace = draft.edges.find((e) => e.id === edgeId);
        if (!edgeToReplace) return;

        // Find source and target nodes to calculate better positioning
        const sourceNode = draft.nodes.find(
          (n) => n.id === edgeToReplace.source
        );
        const targetNode = draft.nodes.find(
          (n) => n.id === edgeToReplace.target
        );

        if (sourceNode && targetNode) {
          // Calculate minimum spacing needed - ensure at least 200px gap between nodes
          const minSpacing = 200; // Increased from 150px to accommodate larger nodes

          // Position new node between source and target
          newNode.position = {
            x: sourceNode.position.x,
            y: sourceNode.position.y + minSpacing,
          };

          // Calculate how much we need to shift target and downstream nodes
          const requiredShift =
            newNode.position.y + minSpacing - targetNode.position.y;
          const shiftAmount = Math.max(requiredShift, minSpacing); // Ensure minimum spacing

          // Shift target and all downstream nodes down by the calculated amount
          const nodesToShift = draft.nodes.filter(
            (n) => n.position.y >= targetNode.position.y
          );
          nodesToShift.forEach((node) => {
            node.position.y += shiftAmount;
          });
        }

        // Add the new node
        draft.nodes.push(newNode as any);

        // Remove the old edge
        draft.edges = draft.edges.filter((e) => e.id !== edgeId);

        // Create two new edges: source -> new node -> target
        draft.edges.push({
          id: `edge_${edgeToReplace.source}_${newNode.id}`,
          source: edgeToReplace.source,
          target: newNode.id,
          type: "buttonedge",
        });

        draft.edges.push({
          id: `edge_${newNode.id}_${edgeToReplace.target}`,
          source: newNode.id,
          target: edgeToReplace.target,
          type: "buttonedge",
        });
      }),
  }))
);
