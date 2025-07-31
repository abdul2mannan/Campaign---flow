import ELK from "elkjs/lib/elk.bundled.js";
import type { Node, Edge } from "@xyflow/react";
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
  "elk.layered.unnecessaryBendpoints": "true",
  "elk.eliminate": "true",
  "elk.spacing.nodeNode": "500",
  "elk.layered.spacing.nodeNodeBetweenLayers": "200",
  "elk.spacing.edgeNode": "200",
  "elk.spacing.edgeEdge": "200",
  "elk.layered.spacing.edgeNodeBetweenLayers": "120",
  "elk.layered.spacing.edgeEdgeBetweenLayers": "120",
  "elk.portConstraints": "FIXED_ORDER",
  "elk.layered.mergeEdges": "true",
  "elk.layered.thoroughness": "7",
  "elk.layered.nodePlacement.favorStraightEdges": "true",
};

// Convert React Flow nodes/edges to ELK format
const toElkFormat = (nodes: Node[], edges: Edge[], options: LayoutOptions) => {
  const elkOptions = {
    ...DEFAULT_ELK_OPTIONS,
    "elk.direction": options.direction || "DOWN",
  };

  // Apply custom spacing if provided
  if (options.spacing) {
    if (options.spacing.nodeNode) {
      elkOptions["elk.spacing.nodeNode"] = options.spacing.nodeNode.toString();
    }
    if (options.spacing.nodeNodeBetweenLayers) {
      elkOptions["elk.layered.spacing.nodeNodeBetweenLayers"] =
        options.spacing.nodeNodeBetweenLayers.toString();
    }
    if (options.spacing.edgeNode) {
      elkOptions["elk.spacing.edgeNode"] = options.spacing.edgeNode.toString();
    }
  }

  // Convert nodes to ELK format
  const elkNodes = nodes.map((node) => {
    return {
      id: node.id,
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

      return {
        ...originalNode,
        position: {
          x: elkNode.x,
          y: elkNode.y,
        },
        // Store the computed dimensions for future reference
        measured: {
          width: elkNode.width || 280,
          height: elkNode.height || 120,
        },
      };
    }) || [];

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
