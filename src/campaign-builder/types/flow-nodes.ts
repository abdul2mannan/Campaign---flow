// src/campaign-builder/types/flow-nodes.ts
import type { Node } from "@xyflow/react";
import type { NodeMetaCore } from "@/campaign-builder/registry/nodeRegistry";
import "@xyflow/react/dist/style.css";
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

/** Data object carried by a `send_invite` node (must extend Record) */
export type SendInviteData = {
  meta: NodeMetaCore;
  config: { 
    delayMinutes?: number;
    message?: string;
    usePersonalMessage?: boolean;
  };
  delayMode: "instant" | "fixed";
  [key: string]: unknown;          // satisfies Record<string, unknown>
};

export type SendInviteNode = Node<SendInviteData, "send_invite">;

/** Data object carried by a `linkedin_request_accepted` conditional node (must extend Record) */
export type LinkedInRequestAcceptedData = {
  meta: NodeMetaCore;
  config: { 
    timeframe?: number;
    timeUnit?: "hours" | "days" | "weeks";
    delayMinutes?: number; // For fixed mode delays
  };
  delayMode: "fixed" | "waitUntil";
  [key: string]: unknown;          // satisfies Record<string, unknown>
};

export type LinkedInRequestAcceptedNode = Node<LinkedInRequestAcceptedData, "linkedin_request_accepted">;