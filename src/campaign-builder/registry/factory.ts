import type { Node } from "@xyflow/react";
import { nodeRegistry } from "./nodeRegistry";

let id = 0;
export function createNode(type: string, overrides: Partial<Node> = {}): Node {
  const meta = nodeRegistry[type];
  if (!meta) throw new Error(`Unknown node type: ${type}`);

  return {
    id: `${type}_${++id}`,
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
}
