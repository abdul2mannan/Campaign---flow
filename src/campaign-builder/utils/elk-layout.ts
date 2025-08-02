import ELK from "elkjs/lib/elk.bundled.js";
import { type Node, type Edge, Position } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

export interface LayoutOptions {
  direction?: "DOWN" | "UP" | "LEFT" | "RIGHT";
  spacing?: {
    nodeNode?: number;
    nodeNodeBetweenLayers?: number;
    edgeNode?: number;
  };
  algorithm?: "layered";
}

export interface LayoutResult {
  nodes: Node[];
  edges: Edge[];
}

// Default ELK configuration optimized for campaign flows
const DEFAULT_ELK_OPTIONS = {
  "elk.algorithm": "layered",
  "elk.direction": "DOWN",
  "elk.edgeRouting": "ORTHOGONAL",
  "elk.spacing.nodeNode": "200",
  "elk.spacing.edgeNode": "200",
  "elk.spacing.edgeEdge": "200",
  // "elk.layered.unnecessaryBendpoints": "true",
  "elk.layered.spacing.nodeNodeBetweenLayers": "200",
  // "elk.layered.spacing.edgeNodeBetweenLayers": "200",
  // "elk.layered.spacing.edgeEdgeBetweenLayers": "200",
  // "elk.layered.nodePlacement.favorStraightEdges": "true",
  "elk.layered.thoroughness": "7",
  "elk.layered.nodePlacement.bk.fixedAlignment": "BALANCED",

  // "elk.layered.nodePlacement.bk.edgeStraightening": "NONE",
  // "org.eclipse.elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
  // "org.eclipse.elk.layered.wrapping.strategy": "MULTI_EDGE",
  "elk.animate": "true",
};
// Convert React Flow nodes/edges to ELK format
const toElkFormat = (nodes: Node[], edges: Edge[], options: LayoutOptions) => {
  const elkOptions = {
    ...DEFAULT_ELK_OPTIONS,
    "elk.direction": options.direction || "DOWN",
  };

  // Apply custom spacing if provided
  // if (options.spacing) {
  //   if (options.spacing.nodeNode) {
  //     elkOptions["elk.spacing.nodeNode"] = options.spacing.nodeNode.toString();
  //   }
  //   if (options.spacing.nodeNodeBetweenLayers) {
  //     elkOptions["elk.layered.spacing.nodeNodeBetweenLayers"] =
  //       options.spacing.nodeNodeBetweenLayers.toString();
  //   }
  //   if (options.spacing.edgeNode) {
  //     elkOptions["elk.spacing.edgeNode"] = options.spacing.edgeNode.toString();
  //   }
  // }

  // Convert nodes to ELK format
  const elkNodes = nodes.map((node) => {
    return {
      id: node.id,
      type: node.type,
      x: node.position?.x || 0,
      y: node.position?.y || 0,
      position: {
        x: node.position.x || 0,
        y: node.position.y || 0,
      },
      data: node.data,
      measured: node.measured, // Default width if not measured
      layoutOptions: { "elk.portConstraints": "FIXED_ORDER" },
    };
  });

  // Convert edges to ELK format
  const elkEdges = edges.map((edge) => ({
    id: edge.id,
    sources: [edge.source],
    targets: [edge.target],
  }));

  return {
    id: "root",
    layoutOptions: elkOptions,
    children: elkNodes,
    edges: elkEdges,
  };
};

// Convert ELK result back to React Flow format
const fromElkFormat = (
  elkGraph: any,
  originalNodes: Node[],
  originalEdges: Edge[]
): LayoutResult => {
  const layoutedNodes =
    elkGraph.children?.map((elkNode: any) => {
      const originalNode = originalNodes.find((n) => n.id === elkNode.id);
      if (!originalNode) {
        throw new Error(`Node ${elkNode.id} not found in original nodes`);
      }

      let xPosition = originalNode.position.x;
      // console.log("Original Node:", originalNode);
      console.log("ELK Node:", elkNode);
      // Special handling for merge nodes - position them at the center of th
      // eir parent node

      const parentEdge = originalEdges.find(
        (edge) => edge.target === originalNode.id
      );

      const childEdge = originalEdges.find(
        (edge) => edge.source === originalNode.id
      );
      const parentNode = originalNodes.find(
        (node) => node.id === parentEdge?.source
      );

      if (
        (parentEdge?.data?.pluscontext as any)?.type === "branch-yes" ||
        (parentEdge?.data?.pluscontext as any)?.type === "branch-no"
      ) {
        xPosition = originalNode.position.x;
      } else if (
        parentEdge &&
        ((parentEdge?.data?.pluscontext as any)?.type === "edge" ||
          parentEdge.type === "buttonedge")
      ) {
        xPosition = originalNode?.position.x;
      }

      if (originalNode.type === "merge") {
        if (parentEdge) {
          if (
            parentNode &&
            (parentNode.data?.meta as any)?.category === "condition"
          ) {
            // Calculate centered position: parent.x + (parent.width - merge.width) / 2
            const parentWidth = parentNode.measured?.width || 0;
            const mergeWidth = originalNode.measured?.width || 0;
            const widthDifference = parentWidth - mergeWidth;
            const offset = widthDifference / 2;
            xPosition = (parentNode.position.x || 0) + offset;
          } else {
            xPosition = originalNode.position.x;
          }
        }
      }
      elkNode.x = xPosition;
      return {
        ...originalNode,
        position: {
          x: xPosition,
          y: elkNode.y,
        },
      };
    }) || [];
  console.log("Layouted Nodes:", layoutedNodes);
  return {
    nodes: layoutedNodes,
    edges: originalEdges, // Edges remain unchanged
  };
};

// Main layout function
export const computeLayout = async (
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {}
): Promise<LayoutResult> => {
  if (nodes.length === 0) {
    return { nodes: [], edges: [] };
  }

  try {
    const elk = new ELK();

    // Convert to ELK format
    const elkGraph = toElkFormat(nodes, edges, options);

    // Compute layout
    const layoutedGraph = await elk.layout(elkGraph);

    // Convert back to React Flow format
    return fromElkFormat(layoutedGraph, nodes, edges);
  } catch (error) {
    console.error(error);
    throw new Error("Failed to auto layout");
  }
};

// Incremental layout for performance (only layout affected subgraph)
export const computeIncrementalLayout = async (
  nodes: Node[],
  edges: Edge[],
  changedNodeIds: string[],
  options: LayoutOptions = {}
): Promise<LayoutResult> => {
  return computeLayout(nodes, edges, options);
};
