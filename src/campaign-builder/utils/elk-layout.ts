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
  algorithm?: "layered" | "force" | "mrtree" | "radial";
}

export interface LayoutResult {
  nodes: Node[];
  edges: Edge[];
}

// Default ELK configuration optimized for campaign flows
const DEFAULT_ELK_OPTIONS = {
  "elk.algorithm": "layered",
  "elk.direction": "DOWN",
  "elk.spacing.nodeNode": "120",
  "elk.spacing.nodeNodeBetweenLayers": "160",
  "elk.spacing.edgeNode": "80",
  "elk.layered.spacing.edgeNodeBetweenLayers": "80",
  "elk.portConstraints": "FIXED_ORDER",
  "elk.layered.mergeEdges": "true",
  "elk.layered.thoroughness": "7",
  "elk.layered.unnecessaryBendpoints": "false",
  "elk.layered.nodePlacement.favorStraightEdges": "true",
};

// Node size estimation for different node types
const getNodeDimensions = (node: Node) => {
  const nodeData = node.data as any;
  const nodeType = node.type || "default";

  // Base dimensions
  let width = 280; // Default width for most campaign nodes
  let height = 120; // Default height for action nodes

  // Adjust based on node type
  if (nodeData?.meta?.category === "condition") {
    height = 140; // Conditional nodes are taller
  }

  if (nodeType === "start") {
    width = 200;
    height = 80;
  }

  // Adjust for node content (text length, etc.)
  if (nodeData?.config?.message && nodeData.config.message.length > 50) {
    height += 20; // Add height for longer content
  }

  return { width, height };
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
      elkOptions["elk.spacing.nodeNodeBetweenLayers"] =
        options.spacing.nodeNodeBetweenLayers.toString();
    }
    if (options.spacing.edgeNode) {
      elkOptions["elk.spacing.edgeNode"] = options.spacing.edgeNode.toString();
    }
  }

  // Convert nodes to ELK format
  const elkNodes = nodes.map((node) => {
    const dimensions = getNodeDimensions(node);

    return {
      id: node.id,
      width: dimensions.width,
      height: dimensions.height,
      // Preserve any existing position as a hint (ELK can use this)
      x: node.position?.x,
      y: node.position?.y,
    };
  });

  // Convert edges to ELK format
  const elkEdges = edges.map((edge) => ({
    id: edge.id,
    sources: [edge.source],
    targets: [edge.target],
    // Add routing options for conditional edges
    layoutOptions: edge.data?.branch
      ? {
          "elk.edge.type": edge.data.branch === "yes" ? "DIRECTED" : "DIRECTED",
        }
      : undefined,
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
          x: elkNode.x || 0,
          y: elkNode.y || 0,
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
  // Early return if no nodes
  if (nodes.length === 0) {
    return { nodes: [], edges: [] };
  }

  // Single node case - just center it
  if (nodes.length === 1) {
    return {
      nodes: [
        {
          ...nodes[0],
          position: { x: 400, y: 100 },
        },
      ],
      edges,
    };
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
    console.error("ELK layout computation failed:", error);

    // Fallback to simple vertical layout
    const fallbackNodes = nodes.map((node, index) => ({
      ...node,
      position: {
        x: 400,
        y: 100 + index * 200,
      },
    }));

    return { nodes: fallbackNodes, edges };
  }
};

// Utility function for layout direction helpers
export const getLayoutDirection = (direction: string) => {
  switch (direction.toUpperCase()) {
    case "UP":
      return "UP";
    case "LEFT":
      return "LEFT";
    case "RIGHT":
      return "RIGHT";
    default:
      return "DOWN";
  }
};

// Incremental layout for performance (only layout affected subgraph)
export const computeIncrementalLayout = async (
  nodes: Node[],
  edges: Edge[],
  changedNodeIds: string[],
  options: LayoutOptions = {}
): Promise<LayoutResult> => {
  // For now, do full layout - incremental can be optimized later
  // TODO: Implement subgraph extraction and partial layout
  return computeLayout(nodes, edges, options);
};
