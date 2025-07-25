// campaign-builder/store/flow-store.ts
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

interface FlowState {
  /* Graph data */
  nodes: Node[];
  edges: Edge[];

  /* Graph actions */
  addNodeAtEnd: (node: Node) => void;
  updateNode: (id: string, updater: (node: Node) => void) => void;
  removeNode: (id: string) => void;

  setNodes: (changes: NodeChange[]) => void;
  setEdges: (changes: EdgeChange[]) => void;
  addEdge: (edge: Edge) => void;
}

export const useFlowStore = create<FlowState>()(
  immer<FlowState>((set) => ({
    /* ---------------------- state ---------------------- */
    nodes: [],
    edges: [],

    /* -------------------- actions ---------------------- */
    addNodeAtEnd: (node) =>
      set((draft) => {
        const last = draft.nodes[draft.nodes.length - 1];

        // auto‑wire edge from last node → new node
        if (last) {
          draft.edges.push({
            id: `${last.id}-${node.id}`,
            source: last.id,
            target: node.id,
          });
        }
        draft.nodes.push(node as any);
      }),

    updateNode: (id, updater) =>
      set((draft) => {
        const idx = draft.nodes.findIndex((n) => n.id === id);
        if (idx !== -1) {
          updater(draft.nodes[idx]);
        }
      }),

    removeNode: (id) =>
      set((draft) => {
        draft.nodes = draft.nodes.filter((n) => n.id !== id);
        draft.edges = draft.edges.filter(
          (e) => e.source !== id && e.target !== id
        );
      }),

    setNodes: (changes) =>
      set((draft) => {
        draft.nodes = applyNodeChanges(changes, draft.nodes);
      }),

    setEdges: (changes) =>
      set((draft) => {
        draft.edges = applyEdgeChanges(changes, draft.edges);
      }),

    addEdge: (edge) =>
      set((draft) => {
        draft.edges.push(edge);
      }),
  }))
);
