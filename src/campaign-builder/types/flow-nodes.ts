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

/** Data object carried by a `like_post` node (must extend Record) */
export type LikePostData = {
  meta: NodeMetaCore;
  config: { delayMinutes?: number };
  delayMode: "instant" | "fixed";
  [key: string]: unknown;          // satisfies Record<string, unknown>
};

export type LikePostNode = Node<LikePostData, "like_post">;
