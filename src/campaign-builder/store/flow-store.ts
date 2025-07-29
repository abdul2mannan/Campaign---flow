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
import "@xyflow/react/dist/style.css";
import { createNode } from "@/campaign-builder/registry/factory";
export const ANIMATION_MS = 600;
export const NODE_VERTICAL_GAP = 200;

interface LayoutState {
  autoLayoutEnabled: boolean;
  isLayouting: boolean;
  layoutDirection: "DOWN" | "UP" | "LEFT" | "RIGHT";
}

interface PlusContext {
  type: "node" | "edge";
  sourceId: string;
  edgeId?: string;
  targetId?: string;
  sourceNodeId?: string;
  targetNodeId?: string;
  /** Cursor / click position where the palette was opened */
  position?: { x: number; y: number };
}

export type LayoutTrigger = { type: "auto"; affectedNodeIds?: string[] };

interface FlowState extends LayoutState {
  nodes: Node[];
  edges: Edge[];
  plusContext: PlusContext | null;

  /* UI toggles */
  setAutoLayoutEnabled(enabled: boolean): void;
  setIsLayouting(v: boolean): void;
  setLayoutDirection(dir: "DOWN" | "UP" | "LEFT" | "RIGHT"): void;

  /* Layout orchestration */
  triggerLayout(trigger: LayoutTrigger): void;
  applyLayoutResult(nodes: Node[], edges: Edge[]): void;

  /* Full reset */
  clearFlow(): void;

  /* CRUD helpers */
  addNodeAtEnd(nodeType: string): void;
  updateNode(id: string, updater: (n: Node) => void): void;
  removeNode(id: string): void;

  setNodes(changes: NodeChange[]): void;
  setEdges(changes: EdgeChange[]): void;
  addEdge(edge: Edge): void;

  /* Plus-button context */
  setPlusContext(ctx: PlusContext | null): void;
  clearPlusContext(): void;

  /* Insertions that rely on ELK */
  insertAtEnd(parentId: string, nodeType: string): void;
  insertBetweenNodes(edgeId: string, nodeType: string): void;
}

let layoutCallback: ((t: LayoutTrigger) => void) | null = null;
export const setLayoutCallback = (cb: typeof layoutCallback) => {
  layoutCallback = cb;
};

const analyzeNodeConnections = (nodeId: string, edges: Edge[]) => {
  const incoming = edges.filter((e) => e.target === nodeId);
  const outgoing = edges.filter((e) => e.source === nodeId);
  return {
    incoming,
    outgoing,
    isMiddle: incoming.length > 0 && outgoing.length > 0,
  };
};

const createReconnectionEdges = (incoming: Edge[], outgoing: Edge[]): Edge[] =>
  incoming.flatMap((inE) =>
    outgoing.map((outE) => ({
      id: `${inE.source}-${outE.target}`,
      source: inE.source,
      target: outE.target,
      type: "buttonedge",
    }))
  );

const markNode = (node: Node, state: "entering" | "exiting") => ({
  ...node,
  data: { ...node.data, animationState: state },
});

const clearAnim = (node: Node): Node => ({
  ...node,
  data: { ...(node.data || {}), animationState: "stable" },
});

export const useFlowStore = create<FlowState>()(
  immer<FlowState>((set, get) => ({
    /* --------------------------- reactive values ------------------------ */
    nodes: [],
    edges: [],
    plusContext: null,

    autoLayoutEnabled: true,
    isLayouting: false,
    layoutDirection: "DOWN",

    /* ------------------------------- UI -------------------------------- */
    setAutoLayoutEnabled: (enabled) =>
      set((d) => {
        d.autoLayoutEnabled = enabled;
        if (enabled && d.nodes.length) {
          get().triggerLayout({ type: "auto" });
        }
      }),

    setIsLayouting: (v) =>
      set((d) => {
        d.isLayouting = v;
      }),

    setLayoutDirection: (dir) =>
      set((d) => {
        d.layoutDirection = dir;
        if (d.autoLayoutEnabled && d.nodes.length) {
          get().triggerLayout({ type: "auto" });
        }
      }),

    /* --------------------------- Layout orchestration ------------------ */
    triggerLayout: (t) => {
      const s = get();
      if (s.autoLayoutEnabled && !s.isLayouting && layoutCallback) {
        layoutCallback(t);
      }
    },

    applyLayoutResult: (nodes, edges) =>
      set((d) => {
        d.nodes = nodes.map(clearAnim) as any[];
        d.edges = edges;
      }),

    /* ----------------------------- House-keeping ----------------------- */
    clearFlow: () =>
      set((d) => {
        d.nodes = [];
        d.edges = [];
        d.plusContext = null;
        d.isLayouting = false;
      }),

    /* ------------------------------- CRUD ------------------------------ */
    addNodeAtEnd: (nodeType) =>
      set((d) => {
        const last = d.nodes[d.nodes.length - 1];
        /* Let ELK handle positioning entirely */
        const node = createNode(nodeType, {
          position: { x: 0, y: 0 },
        });

        if (last) {
          d.edges.push({
            id: `${last.id}-${node.id}`,
            source: last.id,
            target: node.id,
            type: "buttonedge",
          });
        }

        d.nodes.push(markNode(node, "entering") as any);

        setTimeout(() => {
          set((dd) => {
            const idx = dd.nodes.findIndex((n) => n.id === node.id);
            if (idx !== -1) {
              dd.nodes[idx].data = {
                ...dd.nodes[idx].data,
                animationState: "stable",
              };
            }
          });
        }, ANIMATION_MS);

        get().triggerLayout({
          type: "auto",
          affectedNodeIds: [node.id, last?.id!].filter(Boolean),
        });
      }),

    updateNode: (id, updater) =>
      set((d) => {
        const idx = d.nodes.findIndex((n) => n.id === id);
        if (idx !== -1) updater(d.nodes[idx]);
      }),

    removeNode: (id) =>
      set((d) => {
        const idx = d.nodes.findIndex((n) => n.id === id);
        if (idx === -1) return;

        d.nodes[idx] = markNode(d.nodes[idx], "exiting") as any;

        setTimeout(() => {
          set((draft) => {
            const { incoming, outgoing, isMiddle } = analyzeNodeConnections(
              id,
              draft.edges
            );
            const affected = new Set<string>();

            if (isMiddle) {
              const recon = createReconnectionEdges(incoming, outgoing);
              recon.forEach((e) => {
                if (!draft.edges.some((ex) => ex.id === e.id))
                  draft.edges.push(e);
              });
              incoming.forEach((e) => affected.add(e.source));
              outgoing.forEach((e) => affected.add(e.target));
            }

            draft.nodes = draft.nodes.filter((n) => n.id !== id);
            draft.edges = draft.edges.filter(
              (e) => e.source !== id && e.target !== id
            );

            get().triggerLayout({
              type: "auto",
              affectedNodeIds: [...affected],
            });
          });
        }, ANIMATION_MS / 2);
      }),

    setNodes: (changes) =>
      set((d) => {
        d.nodes = applyNodeChanges(changes, d.nodes);
      }),

    setEdges: (changes) =>
      set((d) => {
        const structural = changes.some(
          (c) => c.type === "add" || c.type === "remove"
        );
        d.edges = applyEdgeChanges(changes, d.edges);
        if (structural) get().triggerLayout({ type: "auto" });
      }),

    addEdge: (edge) =>
      set((d) => {
        d.edges.push(edge);
        get().triggerLayout({
          type: "auto",
          affectedNodeIds: [edge.source, edge.target],
        });
      }),

    /* ---------------------- plus-button helpers ------------------------ */
    setPlusContext: (ctx) => set((d) => void (d.plusContext = ctx)),
    clearPlusContext: () => set((d) => void (d.plusContext = null)),

    insertAtEnd: (parentId, nodeType) =>
      set((d) => {
        const parent = d.nodes.find((n) => n.id === parentId);
        if (!parent) return;
        const newNode = createNode(nodeType, { position: parent.position });
        d.nodes.push(markNode(newNode, "entering") as any);
        d.edges.push({
          id: `${parentId}-${newNode.id}`,
          source: parentId,
          target: newNode.id,
          type: "buttonedge",
        });

        setTimeout(() => {
          set((dd) => {
            const idx = dd.nodes.findIndex((n) => n.id === newNode.id);
            if (idx !== -1) {
              dd.nodes[idx].data = {
                ...dd.nodes[idx].data,
                animationState: "stable",
              };
            }
          });
        }, ANIMATION_MS);

        get().triggerLayout({
          type: "auto",
          affectedNodeIds: [parentId, newNode.id],
        });
      }),

    insertBetweenNodes: (edgeId, nodeType) =>
      set((d) => {
        const e = d.edges.find((ed) => ed.id === edgeId);
        if (!e) return;

        // Get the target node's position to use as initial position
        const targetNode = d.nodes.find((n) => n.id === e.target);
        const initialPosition = targetNode
          ? targetNode.position
          : { x: 0, y: 0 };

        const newNode = createNode(nodeType, { position: initialPosition });
        d.nodes.push(markNode(newNode, "entering") as any);
        d.edges = d.edges.filter((ed) => ed.id !== edgeId);

        d.edges.push(
          {
            id: `${e.source}-${newNode.id}`,
            source: e.source,
            target: newNode.id,
            type: "buttonedge",
          },
          {
            id: `${newNode.id}-${e.target}`,
            source: newNode.id,
            target: e.target,
            type: "buttonedge",
          }
        );

        setTimeout(() => {
          set((dd) => {
            const idx = dd.nodes.findIndex((n) => n.id === newNode.id);
            if (idx !== -1) {
              dd.nodes[idx].data = {
                ...dd.nodes[idx].data,
                animationState: "stable",
              };
            }
          });
        }, ANIMATION_MS);

        get().triggerLayout({
          type: "auto",
          affectedNodeIds: [e.source, newNode.id, e.target],
        });
      }),
  }))
);

export type { PlusContext, FlowState };
