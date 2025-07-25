import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { Node, Edge } from "@xyflow/react";

interface FlowState {
  nodes: Node[];
  edges: Edge[];
  addNodeAtEnd: (node: Node) => void;
}

export const useFlowStore = create<FlowState>()(
  immer((set) => ({
    nodes: [],
    edges: [],
    addNodeAtEnd: (node) =>
      set((draft) => {
        const last = draft.nodes[draft.nodes.length - 1];
        if (last) {
          draft.edges.push({
            id: `${last.id}-${node.id}`,
            source: last.id,
            target: node.id,
          });
        }
        draft.nodes.push(node as any);
      }),
  }))
);
