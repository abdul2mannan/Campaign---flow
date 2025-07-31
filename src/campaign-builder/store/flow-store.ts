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
import { Branch } from "../types/flow-nodes";
export const ANIMATION_MS = 0;
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
  position?: { x: number; y: number };
}

export type LayoutTrigger = { type: "auto"; affectedNodeIds?: string[] };

const createMergeNodeForConditional = (
  conditionalNodeId: string,
  nodes: any[],
  edges: any[]
) => {
  const conditionalNode = nodes.find((n) => n.id === conditionalNodeId);
  if (!conditionalNode) {
    return null;
  }

  // Check if this conditional node already has a merge node
  const existingMergeConnection = edges.find(
    (e) =>
      e.source === conditionalNodeId &&
      nodes.find((n) => n.id === e.target && n.type === "merge")
  );

  if (existingMergeConnection) return null; // Already has a merge node

  // Check if this is a branchable condition node
  const isConditionalNode =
    conditionalNode.data?.meta?.category === "condition" ||
    conditionalNode.data?.meta?.branchable === true;

  if (!isConditionalNode) return null;

  // IMPORTANT: Only create merge node if delayMode is "fixed" (branches)
  const delayMode = conditionalNode.data?.delayMode;
  if (delayMode !== "fixed") {
    return null; // Don't create merge for "waitUntil" mode
  }

  // Create merge node positioned below the conditional node
  const mergeNode = createNode("merge", {
    position: {
      x: conditionalNode.position.x,
      y: conditionalNode.position.y, // Position below
    },
    data: {
      branches: conditionalNode.data?.branches,
    },
  });

  // Create edges from conditional node's "yes" and "no" outputs to merge node
  const branchEdges = conditionalNode.data?.branches?.map((b: Branch) => ({
    id: `${conditionalNodeId}-${b.id}-${mergeNode.id}`,
    source: conditionalNodeId,
    target: mergeNode.id,
    sourceHandle: b.id,
    targetHandle: b.id,
    type: "buttonedge",
    data: {
      label: b.label,
    },
  }));
  return {
    mergeNode,
    edges: branchEdges,
  };
};
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

  createAutoMergeForConditional: (conditionalNodeId: string) => Promise<void>;
  createAutoMergeForConditionalWithTarget: (
    conditionalNodeId: string,
    targetNodeId: string
  ) => Promise<void>;
  handleDelayModeChange: (nodeId: string, newDelayMode: string) => void; // Add this
}

let layoutCallback: ((t: LayoutTrigger) => void) | null = null;
export const setLayoutCallback = (cb: typeof layoutCallback) => {
  layoutCallback = cb;
};

const analyzeNodeConnections = (nodeId: string, edges: Edge[]) => {
  const incoming = edges.filter((e) => e.target === nodeId); //target
  const outgoing = edges.filter((e) => e.source === nodeId); //source
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
        });

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

    insertAtEnd: async (parentId, nodeType) =>
      set((d) => {
        const parent = d.nodes.find((n) => n.id === parentId);
        if (!parent) return;
        const newNode = createNode(nodeType, { position: parent.position });
        const isConditional =
          (newNode.data?.meta as any)?.category === "condition";

        // Always add the node to the nodes array
        d.nodes.push(markNode(newNode, "entering") as any);
        d.edges.push({
          id: `${parentId}-${newNode.id}`,
          source: parentId,
          target: newNode.id,
          type: "buttonedge",
        });
        if (isConditional) {
          if ((newNode.data?.delayMode as any) === "fixed") {
            setTimeout(() => {
              get().createAutoMergeForConditional(newNode.id);
            }, 100);
          }
        }

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
        const isConditional =
          (newNode.data?.meta as any)?.category === "condition";
        const targetId = e.target;
        const label = e.data?.label as string;
        // Always add the node to the nodes array
        d.nodes.push(markNode(newNode, "entering") as any);
        d.edges = d.edges.filter((ed) => ed.id !== edgeId);
        d.edges.push({
          id: `${e.source}-${newNode.id}`,
          source: e.source,
          target: newNode.id,
          sourceHandle: e.sourceHandle,
          type: "buttonedge",
          data: {
            label: label,
          },
        });
        if (isConditional) {
          const newNodeId = newNode.id;

          if ((newNode.data?.delayMode as any) === "fixed") {
            setTimeout(async () => {
              try {
                await get().createAutoMergeForConditionalWithTarget(
                  newNodeId,
                  targetId
                );
              } catch (error) {
                console.error("Failed to create merge node:", error);
              }
            }, 200);
          }
        } else {
          // For non-conditional nodes, create both incoming and outgoing edges
          
          d.edges.push({
            id: `${newNode.id}-${e.target}`,
            source: newNode.id,
            target: e.target,
            targetHandle: e.targetHandle,
            type: "buttonedge",
          });
        }

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

    createAutoMergeForConditional: async (conditionalNodeId) => {
      try {
        // Wait for any pending state updates to complete
        await new Promise((resolve) => setTimeout(resolve, 50));

        return new Promise<void>((resolve, reject) => {
          set((d) => {
            try {
              const result = createMergeNodeForConditional(
                conditionalNodeId,
                d.nodes,
                d.edges
              );
              if (!result) {
                reject(new Error("No merge node result returned"));
                return;
              }

              const { mergeNode, edges } = result;

              // Add the merge node
              d.nodes.push(markNode(mergeNode, "entering") as any);

              // Add the connecting edges
              d.edges.push(...edges);

              // Trigger layout
              setTimeout(() => {
                set((dd) => {
                  const idx = dd.nodes.findIndex((n) => n.id === mergeNode.id);
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
                affectedNodeIds: [conditionalNodeId, mergeNode.id],
              });

              resolve();
            } catch (error) {
              console.error("Error in createAutoMergeForConditional:", error);
              reject(error);
            }
          });
        });
      } catch (error) {
        console.error("Error creating merge node:", error);
        throw error;
      }
    },

    createAutoMergeForConditionalWithTarget: async (
      conditionalNodeId,
      targetNodeId
    ) => {
      try {
        // Wait for any pending state updates to complete
        await new Promise((resolve) => setTimeout(resolve, 50));

        return new Promise<void>((resolve, reject) => {
          set((d) => {
            try {
              // Get the most current state to ensure we have the latest nodes
              const currentState = get();

              // Use the existing helper function to create the merge node
              const result = createMergeNodeForConditional(
                conditionalNodeId,
                currentState.nodes,
                currentState.edges
              );

              if (!result) {
                reject(
                  new Error("Merge node creation failed - conditions not met")
                );
                return;
              }

              const { mergeNode, edges } = result;

              // Create edge from merge node to the target node
              const targetEdge = {
                id: `${mergeNode.id}-${targetNodeId}`,
                source: mergeNode.id,
                target: targetNodeId,
                type: "buttonedge",
              };

              // Add the merge node
              d.nodes.push(markNode(mergeNode, "entering") as any);

              // Add the connecting edges
              d.edges.push(...edges);
              d.edges.push(targetEdge);

              setTimeout(() => {
                set((dd) => {
                  const idx = dd.nodes.findIndex((n) => n.id === mergeNode.id);
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
                affectedNodeIds: [
                  conditionalNodeId,
                  mergeNode.id,
                  targetNodeId,
                ],
              });

              resolve();
            } catch (error) {
              console.error(
                "Error in createAutoMergeForConditionalWithTarget:",
                error
              );
              reject(error);
            }
          });
        });
      } catch (error) {
        console.error("Error creating merge node:", error);
        throw error;
      }
    },

    // Add this new action to handle delayMode changes
    handleDelayModeChange: (nodeId, newDelayMode) =>
      set((d) => {
        const node = d.nodes.find((n) => n.id === nodeId);
        if (!node) return;

        // Update the node's delayMode
        if (node.data) {
          (node.data.meta as any).delayMode = newDelayMode;
        }

        // Check if this is a conditional node
        const isConditionalNode =
          (node.data?.meta as any)?.category === "condition" ||
          (node.data?.meta as any)?.branchable === true;
        if (!isConditionalNode) return;

        if (newDelayMode === "fixed") {
          setTimeout(() => {
            get().createAutoMergeForConditional(nodeId);
          }, 100);
        } else if (newDelayMode === "waitUntil") {
          // Remove merge node and its connections if switching to waitUntil mode
          const connectedMergeNodes = d.edges
            .filter((e) => e.source === nodeId)
            .map((e) =>
              d.nodes.find((n) => n.id === e.target && n.type === "merge")
            )
            .filter(Boolean);

          connectedMergeNodes.forEach((mergeNode) => {
            if (mergeNode) {
              // Remove merge node and all its connections
              d.nodes = d.nodes.filter((n) => n.id !== mergeNode.id);
              d.edges = d.edges.filter(
                (e) =>
                  e.source !== mergeNode.id &&
                  e.target !== mergeNode.id &&
                  e.source !== nodeId // Remove the branching edges from conditional node
              );
            }
          });

          get().triggerLayout({
            type: "auto",
            affectedNodeIds: [nodeId],
          });
        }
      }),
  }))
);

export type { PlusContext, FlowState };
