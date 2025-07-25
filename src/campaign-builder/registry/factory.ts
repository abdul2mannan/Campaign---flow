import type { Node } from "@xyflow/react";
import { nodeRegistry } from "./nodeRegistry";
import { useFlowStore } from "../store/flow-store";

function getNextId(type: string): string {
  const currentNodes = useFlowStore.getState().nodes;
  
  const existingIds = currentNodes
    .filter(node => node.type === type)
    .map(node => node.id)
    .map(id => {
      const match = id.match(new RegExp(`^${type}_(\\d+)$`));
      return match ? parseInt(match[1], 10) : 0;
    })
    .sort((a, b) => a - b);

  // Find the first gap in the sequence or use the next number
  let nextId = 1;
  for (const id of existingIds) {
    if (id === nextId) {
      nextId++;
    } else {
      break;
    }
  }

  const finalId = `${type}_${nextId}`;
  return finalId;
}

export function createNode(type: string, overrides: Partial<Node> = {}): Node {
  const meta = nodeRegistry[type];
  if (!meta) throw new Error(`Unknown node type: ${type}`);

  const newId = getNextId(type);
  
  const node = {
    id: newId,
    type,
    position: { x: 0, y: 0 },
    data: {
      meta,
      config: {},
      delayMode: meta.delayModes[0],
      ...(overrides.data ?? {}),
    },
    ...overrides,
  };
  
  return node;
}
