import type { Node } from "@xyflow/react";
import { nodeRegistry } from "./nodeRegistry";
import "@xyflow/react/dist/style.css";
import { generateNodeId } from "@/campaign-builder/utils/helpers";
import type { Branch } from "@/campaign-builder/types/flow-nodes";

function getNodeId(type: string): string {
  return generateNodeId(type);
}

export function createNode(type: string, overrides: Partial<Node> = {}): Node {
  const meta = nodeRegistry[type];
  if (!meta) throw new Error(`Unknown node type: ${type}`);

  const newId = getNodeId(type);

  const defaultBranches: Branch[] | undefined = meta.branchable
    ? meta.defaultBranches
    : undefined;
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
      mergeNodeId: overrides.data?.mergeNodeId ?? null,
      delayMode: defaultDelayMode,
      ...(defaultBranches ? { branches: defaultBranches } : {}),
      ...(overrides.data ?? {}),
    },
    ...overrides,
  };

  return node;
}
