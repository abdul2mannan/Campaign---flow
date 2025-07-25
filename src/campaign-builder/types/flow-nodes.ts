// campaign-builder/types/flow-nodes.ts
import type { Node } from "@xyflow/react";
import type { NodeMetaCore } from "@/campaign-builder/registry/nodeRegistry";

/** Data object carried by a `profile_visit` node (must extend Record) */
export type ProfileVisitData = {
  meta: NodeMetaCore;
  config: { delayMinutes?: number };
  delayMode: "instant" | "fixed";
  [key: string]: unknown;          // satisfies Record<string, unknown>
};

export type ProfileVisitNode = Node<ProfileVisitData, "profile_visit">;
