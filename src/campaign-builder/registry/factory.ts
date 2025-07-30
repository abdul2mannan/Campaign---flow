import type { Node } from "@xyflow/react";
import { nodeRegistry } from "./nodeRegistry";
import "@xyflow/react/dist/style.css";
import { generateNodeId } from "@/campaign-builder/utils/helpers";

function getNodeId(type: string): string {
  return generateNodeId(type);
}

export function createNode(type: string, overrides: Partial<Node> = {}): Node {
  const meta = nodeRegistry[type];
  if (!meta) throw new Error(`Unknown node type: ${type}`);

  const newId = getNodeId(type);

  let defaultDelayMode = meta.delayModes[0];
  if (meta.category === "condition") {
    defaultDelayMode = "fixed";
  }

  const node = {
    id: newId,
    type,
    position: overrides.position ? overrides.position : { x: 0, y: 0 },
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
