import type { Node } from "@xyflow/react";
import { nodeRegistry } from "./nodeRegistry";
import { useFlowStore } from "../store/flow-store";

function getNextId(type: string): string {
  // Use timestamp for unique ID generation
  const timestamp = Date.now();
  const finalId = `${type}-${timestamp}`;
  return finalId;
}

export function createNode(type: string, overrides: Partial<Node> = {}): Node {
  const meta = nodeRegistry[type];
  if (!meta) throw new Error(`Unknown node type: ${type}`);

  const newId = getNextId(type);
  
  // Set default delay mode based on node category
  let defaultDelayMode = meta.delayModes[0];
  if (meta.category === "condition") {
    // For conditional nodes, default to "waitUntil" mode
    defaultDelayMode = "waitUntil";
  }
  
  const node = {
    id: newId,
    type,
    position: { x: 0, y: 0 },
    data: {
      meta,
      config: {},
      delayMode: defaultDelayMode,
      ...(overrides.data ?? {}),
    },
    ...overrides,
  };
  
  return node;
}