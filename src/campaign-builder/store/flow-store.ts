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
import { initialize } from "next/dist/server/lib/render-server";
export const ANIMATION_MS = 0;
export const NODE_VERTICAL_GAP = 200;

interface LayoutState {
  autoLayoutEnabled: boolean;
  isLayouting: boolean;
  layoutDirection: "DOWN" | "UP" | "LEFT" | "RIGHT";
}

interface PlusContext {
  type: "node" | "edge" | "branch-yes" | "branch-no" | string;
  sourceId: string;
  edgeId?: string;
  targetId?: string;
  sourceNodeId?: string;
  targetNodeId?: string;
  position?: { x: number; y: number };
}

interface Edges extends Edge {
  pluscontext?: PlusContext;
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

  const initialPosition = conditionalNode.position;
  const mergePosition = initialPosition.y + NODE_VERTICAL_GAP;
  const parentWidth = 288;
  const mergeWidth = 16;
  const widthDifference = parentWidth - mergeWidth;
  const offset = widthDifference / 2;
  const xPosition = (conditionalNode.position.x || 0) + offset;
  // Position below the conditional node
  // Create merge node positioned below the conditional node
  const mergeNode = createNode("merge", {
    position: {
      x: xPosition,
      y: mergePosition, // Position below
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
      pluscontext: {
        type: `branch-${b.id}`,
        sourceId: conditionalNodeId,
        targetId: mergeNode.id,
        edgeId: `${conditionalNodeId}-${b.id}-${mergeNode.id}`,
        sourceNodeId: conditionalNodeId,
        targetNodeId: mergeNode.id,
      },
    },
  }));

  return {
    mergeNode,
    edges: branchEdges,
  };
};

const getNodeDeletionType = (nodeId: string, nodes: Node[], edges: Edge[]) => {
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return null;

  const { incoming, outgoing, isMiddle } = analyzeNodeConnections(
    nodeId,
    edges
  );

  // Check if it's a conditional node
  const isConditional = (node.data?.meta as any)?.category === "condition";
  // Check if it's a last node (no outgoing connections)
  const isLastNode = outgoing.length === 0;
  // Check if it's a branching conditional (fixed mode creates Yes/No branches)
  const isBranchingConditional =
    isConditional && node.data?.delayMode === "fixed";

  return {
    node,
    incoming,
    outgoing,
    isLastNode,
    isMiddle,
    isConditional,
    isBranchingConditional,
  };
};

// Function to find all nodes in a conditional branch using direct merge lookup
const findConditionalBranchNodes = (
  conditionalNodeId: string,
  nodes: Node[],
  edges: Edge[]
) => {
  const conditionalNode = nodes.find((n) => n.id === conditionalNodeId);
  if (!conditionalNode) {
    return {
      nodesToDelete: [conditionalNodeId],
      mergeNodeId: null,
      postMergeNodes: [],
    };
  }

  const nodesToDelete = new Set<string>();
  const postMergeNodes = new Set<string>();

  // Add the conditional node itself
  nodesToDelete.add(conditionalNodeId);

  // Get merge node ID directly from conditional node data
  const mergeNodeId = conditionalNode.data?.mergeNodeId as string | undefined;

  if (mergeNodeId) {
    const mergeNode = nodes.find((n) => n.id === mergeNodeId);
    if (mergeNode) {
      // Add merge node to deletion list
      nodesToDelete.add(mergeNodeId);

      // Find all nodes between conditional and merge by traversing both branches
      const branchNodes = findNodesBetweenConditionalAndMerge(
        conditionalNodeId,
        mergeNodeId,
        edges
      );
      branchNodes.forEach((nodeId) => nodesToDelete.add(nodeId));

      // Find nodes that come after the merge (for reconnection)
      const postMergeEdges = edges.filter((e) => e.source === mergeNodeId);
      postMergeEdges.forEach((e) => postMergeNodes.add(e.target));
    }
  } else {
    // Fallback: If no merge node reference, traverse branches manually
    const branchNodes = traverseBranchesFromConditional(
      conditionalNodeId,
      nodes,
      edges
    );
    branchNodes.forEach((nodeId) => nodesToDelete.add(nodeId));
  }

  return {
    nodesToDelete: Array.from(nodesToDelete),
    mergeNodeId,
    postMergeNodes: Array.from(postMergeNodes),
  };
};

// Helper to find nodes between conditional and merge by following both branch paths
const findNodesBetweenConditionalAndMerge = (
  conditionalNodeId: string,
  mergeNodeId: string,
  edges: Edge[]
): string[] => {
  const branchNodes = new Set<string>();
  const visited = new Set<string>();

  // Start from conditional node, follow both yes and no branches
  const conditionalOutgoing = edges.filter(
    (e) => e.source === conditionalNodeId
  );

  for (const edge of conditionalOutgoing) {
    if (edge.sourceHandle === "yes" || edge.sourceHandle === "no") {
      // Follow this branch until we reach the merge node
      const pathNodes = followBranchPath(
        edge.target,
        mergeNodeId,
        edges,
        visited
      );
      pathNodes.forEach((nodeId) => branchNodes.add(nodeId));
    }
  }

  return Array.from(branchNodes);
};

// Helper to follow a single branch path from start to merge
const followBranchPath = (
  startNodeId: string,
  mergeNodeId: string,
  edges: Edge[],
  globalVisited: Set<string>
): string[] => {
  const pathNodes: string[] = [];
  const queue = [startNodeId];
  const localVisited = new Set<string>();

  while (queue.length > 0) {
    const currentNodeId = queue.shift()!;

    if (localVisited.has(currentNodeId) || globalVisited.has(currentNodeId))
      continue;
    if (currentNodeId === mergeNodeId) break; // Reached merge, stop

    localVisited.add(currentNodeId);
    globalVisited.add(currentNodeId);
    pathNodes.push(currentNodeId);

    // Find next nodes in the path
    const outgoing = edges.filter((e) => e.source === currentNodeId);
    for (const edge of outgoing) {
      queue.push(edge.target);
    }
  }

  return pathNodes;
};

// Fallback traversal for conditionals without merge node reference
const traverseBranchesFromConditional = (
  conditionalNodeId: string,
  nodes: Node[],
  edges: Edge[]
): string[] => {
  const branchNodes = new Set<string>();
  const visited = new Set<string>();
  const queue = [conditionalNodeId];

  while (queue.length > 0) {
    const currentNodeId = queue.shift()!;
    if (visited.has(currentNodeId)) continue;
    visited.add(currentNodeId);

    const outgoing = edges.filter((e) => e.source === currentNodeId);

    for (const edge of outgoing) {
      const targetNode = nodes.find((n) => n.id === edge.target);
      if (!targetNode) continue;

      // Stop at merge nodes, but don't include regular nodes that might be merge points
      if (targetNode.type === "merge") continue;

      branchNodes.add(edge.target);
      queue.push(edge.target);
    }
  }

  return Array.from(branchNodes);
};
interface FlowState extends LayoutState {
  nodes: Node[];
  edges: Edges[];
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
  insertBetweenNodes(
    edgeId: string,
    nodeType: string,
    plusContextType: string
  ): void;

  createAutoMergeForConditional: (conditionalNodeId: string) => Promise<void>;
  createAutoMergeForConditionalWithTarget: (
    conditionalNodeId: string,
    targetNodeId: string,
    targetHandleId: string
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

const createReconnectionEdges = (
  incoming: Edge[],
  outgoing: Edge[],
  nodes: Node[]
): Edge[] =>
  incoming.flatMap((inE) =>
    outgoing.map((outE) => {
      const sourceNode = nodes.find((n) => n.id === inE.source);
      const targetNode = nodes.find((n) => n.id === outE.target);

      // Check if source is conditional node
      const sourceIsConditional =
        (sourceNode?.data?.meta as any)?.category === "condition";

      // Check if target is merge node
      const targetIsMerge = targetNode?.type === "merge";

      let sourceHandle = undefined;
      let targetHandle = undefined;
      let edgeData = {};
      // Preserve sourceHandle if source is conditional
      if (sourceIsConditional) {
        sourceHandle = inE.sourceHandle;

        // Preserve label and pluscontext from conditional edge
        if (inE.data) {
          const originalLabel = inE.data.label;
          const originalPlusContext = inE.data.pluscontext;

          edgeData = {
            label: originalLabel,
            pluscontext: originalPlusContext
              ? {
                  ...originalPlusContext,
                  // Update target information in pluscontext
                  targetId: outE.target,
                  targetNodeId: outE.target,
                  edgeId: `${inE.source}-${sourceHandle}-${outE.target}`,
                }
              : undefined,
          };
        }
      }

      // Preserve targetHandle if target is merge
      if (targetIsMerge) {
        targetHandle = outE.targetHandle;
      }

      return {
        id: `${inE.source}-${sourceHandle}-${outE.target}`,
        source: inE.source,
        target: outE.target,
        sourceHandle,
        targetHandle,
        type: "buttonedge",
        data: Object.keys(edgeData).length > 0 ? edgeData : undefined,
      };
    })
  );

const markNode = (node: Node, state: "entering" | "exiting" | "stable") => ({
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
        /* Let ELK handle positioning entirely */
        const node = createNode(nodeType);
        d.nodes.push(markNode(node, "entering") as any);
        if ((node.data?.meta as any)?.category === "condition") {
          get().createAutoMergeForConditional(node.id);
        }

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
          affectedNodeIds: [node.id].filter(Boolean),
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

        // Mark node as exiting for animation
        d.nodes[idx] = markNode(d.nodes[idx], "exiting") as any;

        setTimeout(() => {
          set((draft) => {
            const deletionInfo = getNodeDeletionType(
              id,
              draft.nodes,
              draft.edges
            );
            if (!deletionInfo) return;

            const {
              node,
              incoming,
              outgoing,
              isLastNode,
              isMiddle,
              isConditional,
              isBranchingConditional,
            } = deletionInfo;

            const affected = new Set<string>();

            if (isBranchingConditional) {
              // CASE 3: Conditional node with branches - delete entire branch structure

              const branchInfo = findConditionalBranchNodes(
                id,
                draft.nodes,
                draft.edges
              );

              // Mark all nodes in branch as exiting for staggered animation
              branchInfo.nodesToDelete.forEach((nodeId, index) => {
                if (nodeId !== id) {
                  // Don't double-mark the main node
                  setTimeout(() => {
                    set((animDraft) => {
                      const nodeIdx = animDraft.nodes.findIndex(
                        (n) => n.id === nodeId
                      );
                      if (nodeIdx !== -1) {
                        animDraft.nodes[nodeIdx] = markNode(
                          animDraft.nodes[nodeIdx],
                          "exiting"
                        ) as any;
                      }
                    });
                  }, index * 50); // Stagger animations
                }
              });

              // Create reconnection edges from incoming to post-merge nodes
              if (branchInfo.postMergeNodes.length > 0) {
                incoming.forEach((inEdge) => {
                  branchInfo.postMergeNodes.forEach((targetNodeId) => {
                    const targetNode = draft.nodes.find(
                      (n) => n.id === targetNodeId
                    );
                    const sourceNode = draft.nodes.find(
                      (n) => n.id === inEdge.source
                    );
                    const sourceIsConditional =
                      (sourceNode?.data?.meta as any)?.category === "condition";

                    // Find the original outgoing edge from merge to preserve targetHandle
                    const originalOutgoingFromMerge = draft.edges.find(
                      (e) =>
                        e.source === branchInfo.mergeNodeId &&
                        e.target === targetNodeId
                    );

                    let edgeData = {};

                    // Preserve label and pluscontext if source is conditional
                    if (sourceIsConditional && inEdge.data) {
                      const originalLabel = inEdge.data.label;
                      const originalPlusContext = inEdge.data.pluscontext;

                      edgeData = {
                        label: originalLabel,
                        pluscontext: originalPlusContext
                          ? {
                              ...originalPlusContext,
                              // Update target information in pluscontext
                              targetId: targetNodeId,
                              targetNodeId: targetNodeId,
                              edgeId: `${inEdge.source}-${targetNodeId}`,
                            }
                          : undefined,
                      };
                    }

                    const reconnectionEdge = {
                      id: `${inEdge.source}-${targetNodeId}`,
                      source: inEdge.source,
                      target: targetNodeId,
                      sourceHandle: inEdge.sourceHandle, // Preserve source handle from incoming
                      targetHandle: originalOutgoingFromMerge?.targetHandle, // Preserve target handle from merge outgoing
                      type: "buttonedge",
                      data:
                        Object.keys(edgeData).length > 0 ? edgeData : undefined,
                    };

                    // Only add if it doesn't already exist
                    if (
                      !draft.edges.some((e) => e.id === reconnectionEdge.id)
                    ) {
                      draft.edges.push(reconnectionEdge);
                    }

                    affected.add(inEdge.source);
                    affected.add(targetNodeId);
                  });
                });
              } else {
                // No post-merge nodes, just track incoming nodes for layout
                incoming.forEach((e) => affected.add(e.source));
              }

              // Remove all nodes and their edges from the branch
              draft.nodes = draft.nodes.filter(
                (n) => !branchInfo.nodesToDelete.includes(n.id)
              );
              draft.edges = draft.edges.filter(
                (e) =>
                  !branchInfo.nodesToDelete.includes(e.source) &&
                  !branchInfo.nodesToDelete.includes(e.target)
              );
            } else if (isLastNode) {
              // CASE 1: Simple last node deletion

              // Track all incoming sources for layout update
              incoming.forEach((e) => affected.add(e.source));

              // Remove node and its edges
              draft.nodes = draft.nodes.filter((n) => n.id !== id);
              draft.edges = draft.edges.filter(
                (e) => e.source !== id && e.target !== id
              );
            } else if (isMiddle) {
              // CASE 2: Middle node deletion with reconnection

              // Create reconnection edges using existing helper
              const recon = createReconnectionEdges(
                incoming,
                outgoing,
                draft.nodes
              );

              recon.forEach((e) => {
                if (
                  !draft.edges.some(
                    (ex) =>
                      ex.id === e.id &&
                      ex.sourceHandle === e.sourceHandle &&
                      ex.targetHandle === e.targetHandle
                  )
                ) {
                  draft.edges.push(e);
                }
              });

              // Track affected nodes for layout
              incoming.forEach((e) => affected.add(e.source));
              outgoing.forEach((e) => affected.add(e.target));

              // Remove node and its direct edges
              draft.nodes = draft.nodes.filter((n) => n.id !== id);
              draft.edges = draft.edges.filter(
                (e) => e.source !== id && e.target !== id
              );
            } else {
              // CASE 4: Simple deletion for edge cases (first node, isolated node, etc.)

              // Track connected nodes for layout
              incoming.forEach((e) => affected.add(e.source));
              outgoing.forEach((e) => affected.add(e.target));

              // Remove node and its edges
              draft.nodes = draft.nodes.filter((n) => n.id !== id);
              draft.edges = draft.edges.filter(
                (e) => e.source !== id && e.target !== id
              );
            }

            // Trigger layout with affected nodes after a brief delay to allow animations
            setTimeout(() => {
              get().triggerLayout({
                type: "auto",
                affectedNodeIds: Array.from(affected),
              });
            }, 100);
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
        let initialPosition = parent.position || { x: 0, y: 0 };
        if (parent.type === "merge") {
          initialPosition = {
            x: parent.position.x - 136,
            y: parent.position.y + NODE_VERTICAL_GAP,
          };
        }
        const newNode = createNode(nodeType, { position: initialPosition });

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

    insertBetweenNodes: (edgeId, nodeType, plusContextType) =>
      set((d) => {
        const e = d.edges.find((ed) => ed.id === edgeId);
        if (!e) return;
        const sourceNode = d.nodes.find((n) => n.id === e.source);
        const targetNode = d.nodes.find((n) => n.id === e.target);
        const targetHandle = e.targetHandle || "";
        let initialPosition = targetNode?.position;
        const label = e.data?.label as string;
        const sourceIsconditional =
          (sourceNode?.data?.meta as any)?.category === "condition";
        //position
        if (plusContextType === "edge") {
          if (sourceNode?.type === "merge") {
            initialPosition = {
              x: sourceNode.position.x - 136,
              y: 0,
            };
          } else {
            if (sourceNode) {
              initialPosition = { x: sourceNode.position.x, y: 0 };
            }
          }
        } else if (plusContextType === "branch-yes") {
          if (sourceIsconditional) {
            if (sourceNode) {
              initialPosition = { x: sourceNode.position.x - 200, y: 0 };
            }
          } else {
            if (sourceNode) {
              initialPosition = { x: sourceNode.position.x, y: 0 };
            }
          }
        } else if (plusContextType === "branch-no") {
          if (sourceIsconditional) {
            if (sourceNode) {
              initialPosition = { x: sourceNode.position.x + 200, y: 0 };
            }
          } else {
            if (sourceNode) {
              initialPosition = { x: sourceNode.position.x, y: 0 };
            }
          }
        }

        // Get the target node's position to use as initial position
        const newNode = createNode(nodeType, { position: initialPosition });
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
            pluscontext: {
              type: plusContextType,
              sourceId: e.source,
              targetId: newNode.id,
            },
          },
        });
        const isConditional =
          (newNode.data?.meta as any)?.category === "condition";
        const targetId = e.target;
        if (isConditional) {
          const newNodeId = newNode.id;
          if ((newNode.data?.delayMode as any) === "fixed") {
            setTimeout(async () => {
              try {
                await get().createAutoMergeForConditionalWithTarget(
                  newNodeId,
                  targetId,
                  targetHandle
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
              const conditionalNodeIndex = d.nodes.findIndex(
                (n) => n.id === conditionalNodeId
              );
              if (conditionalNodeIndex !== -1) {
                d.nodes[conditionalNodeIndex].data.mergeNodeId = mergeNode.id;
              }
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
      targetNodeId,
      targetHandleId
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
              const conditionalNodeIndex = d.nodes.findIndex(
                (n) => n.id === conditionalNodeId
              );
              if (conditionalNodeIndex !== -1) {
                d.nodes[conditionalNodeIndex].data.mergeNodeId = mergeNode.id;
              }
              // Create edge from merge node to the target node
              const targetEdge = {
                id: `${mergeNode.id}-${targetNodeId}`,
                source: mergeNode.id,
                target: targetNodeId,
                targetHandle: targetHandleId,
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
          // CREATE BRANCH STRUCTURE with existing target connection

          // Find existing outgoing connection from conditional node (waitUntil mode has single output)
          const existingOutgoing = d.edges.find((e) => e.source === nodeId);

          if (existingOutgoing) {
            // Conditional is connected to a target node - connect merge to this target
            const targetNodeId = existingOutgoing?.target;
            const targetHandleId = existingOutgoing?.targetHandle || "";
            d.edges = d.edges.filter((e) => e.id !== existingOutgoing.id);
            setTimeout(async () => {
              try {
                // Use existing function that connects merge to specific target
                await get().createAutoMergeForConditionalWithTarget(
                  nodeId,
                  targetNodeId,
                  targetHandleId
                );
              } catch (error) {
                console.error(
                  "Failed to create merge node with target:",
                  error
                );
                set((restoreDraft) => {
                  if (
                    !restoreDraft.edges.some(
                      (e) => e.id === existingOutgoing.id
                    )
                  ) {
                    restoreDraft.edges.push(existingOutgoing);
                  }
                });
              }
            }, 100);
          } else {
            // No existing connection - create basic merge structure

            setTimeout(() => {
              get().createAutoMergeForConditional(nodeId);
            }, 100);
          }
        } else if (newDelayMode === "waitUntil") {
          // REMOVE BRANCH STRUCTURE - Enhanced logic

          // Find the complete branch structure using existing logic
          const branchInfo = findConditionalBranchNodes(
            nodeId,
            d.nodes,
            d.edges
          );

          // Filter out the conditional node itself (we want to keep it)
          const nodesToDelete = branchInfo.nodesToDelete.filter(
            (id) => id !== nodeId
          );
          const postMergeNodeIds = branchInfo.postMergeNodes;

          if (nodesToDelete.length === 0) {
            // Still need to clean up any branch edges from the conditional node
            d.edges = d.edges.filter(
              (e) =>
                !(
                  e.source === nodeId &&
                  (e.sourceHandle === "yes" || e.sourceHandle === "no")
                )
            );
            return;
          }

          // Get incoming edges to the conditional node (for reconnection source)
          const conditionalIncoming = d.edges.filter(
            (e) => e.target === nodeId
          );

          // Set up affected nodes for layout
          const affected = new Set<string>();
          affected.add(nodeId); // The conditional node itself

          // Add incoming sources to affected nodes
          conditionalIncoming.forEach((e) => affected.add(e.source));

          // Add post-merge nodes to affected
          postMergeNodeIds.forEach((id) => affected.add(id));

          // STEP 1: Mark branch nodes for staggered exit animation (excluding conditional)
          nodesToDelete.forEach((nodeToDeleteId, index) => {
            setTimeout(() => {
              set((animDraft) => {
                const nodeIdx = animDraft.nodes.findIndex(
                  (n) => n.id === nodeToDeleteId
                );
                if (nodeIdx !== -1) {
                  animDraft.nodes[nodeIdx] = markNode(
                    animDraft.nodes[nodeIdx],
                    "exiting"
                  ) as any;
                }
              });
            }, index * 50); // Stagger animations
          });

          // STEP 2: After animation delay, perform the actual removal and reconnection
          setTimeout(() => {
            set((draft) => {
              // Create reconnection edges from conditional node to post-merge nodes
              if (postMergeNodeIds.length > 0) {
                postMergeNodeIds.forEach((targetNodeId) => {
                  const targetNode = draft.nodes.find(
                    (n) => n.id === targetNodeId
                  );

                  // Find the original edge from merge to target to preserve targetHandle
                  const originalMergeEdge = draft.edges.find(
                    (e) =>
                      e.source === branchInfo.mergeNodeId &&
                      e.target === targetNodeId
                  );

                  // Create reconnection edge from conditional directly to post-merge node
                  const reconnectionEdge = {
                    id: `${nodeId}-${targetNodeId}`,
                    source: nodeId,
                    target: targetNodeId,
                    sourceHandle: undefined, // Single output for waitUntil mode
                    targetHandle: originalMergeEdge?.targetHandle, // Preserve target handle
                    type: "buttonedge",
                    data: undefined, // Clean edge data for waitUntil mode
                  };

                  // Only add if it doesn't already exist
                  if (
                    !draft.edges.some(
                      (e) =>
                        e.id === reconnectionEdge.id &&
                        e.source === reconnectionEdge.source &&
                        e.target === reconnectionEdge.target
                    )
                  ) {
                    draft.edges.push(reconnectionEdge);
                  }
                });
              }

              // Remove all branch nodes and their edges
              draft.nodes = draft.nodes.filter(
                (n) => !nodesToDelete.includes(n.id)
              );
              draft.edges = draft.edges.filter(
                (e) =>
                  !nodesToDelete.includes(e.source) &&
                  !nodesToDelete.includes(e.target)
              );

              // Clean up the conditional node data
              const conditionalNodeIndex = draft.nodes.findIndex(
                (n) => n.id === nodeId
              );
              if (conditionalNodeIndex !== -1) {
                const conditionalNode = draft.nodes[conditionalNodeIndex];
                if (conditionalNode.data) {
                  // Remove merge node reference
                  delete conditionalNode.data.mergeNodeId;

                  // Clear branch-specific configuration if needed
                  // Keep other node data intact
                }
              }
            });

            // STEP 3: Trigger layout update for affected nodes

            get().triggerLayout({
              type: "auto",
              affectedNodeIds: Array.from(affected),
            });
          }, ANIMATION_MS / 2 + nodesToDelete.length * 50); // Wait for staggered animations
        }
      }),
  }))
);

export type { PlusContext, FlowState };
