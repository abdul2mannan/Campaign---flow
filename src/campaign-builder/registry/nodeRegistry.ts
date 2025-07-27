// src/campaign-builder/registry/nodeRegistry.ts
import { NodeProps, Node } from "@xyflow/react";
import ProfileVisitNode from "@/cb/nodes/ProfileVisitNode";
import LikePostNode from "@/cb/nodes/LikePostNode";
import SendInviteNode from "@/cb/nodes/SendInviteNode";
import LinkedInRequestAcceptedNode from "@/cb/nodes/LinkedInRequestAcceptedNode";

/** Generic node component type */
export type NodeComponent = React.FC<NodeProps<Node>>;

export type DelayMode = "instant" | "fixed" | "waitUntil";
export type FieldType = "string" | "number" | "boolean" | "select" | "dateTime";

export interface ConfigField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  default?: any;
  options?: any[];
  optionsSource?: string;
}

export interface PrereqRules {
  requiresUpstream?: string[];
  branchContext?: "yes" | "no" | null;
  integrationFlags?: string[];
}

export interface NodeMetaCore {
  type: string;
  title: string;
  description?: string;
  icon?: string;
  category: "action" | "condition" | "integration";
  inputs: number;
  outputs: number;
  branchable?: boolean;
  prerequisites?: PrereqRules;
  selectionLimit?: number;
  delayModes: DelayMode[];
  styleKey?: string;
  configSchema?: ConfigField[];
  fetchConfigOptions?: (nodeId: string) => Promise<any>;
}

export interface NodeMeta extends NodeMetaCore {
  component: NodeComponent;
}

export const nodeRegistry: Record<string, NodeMeta> = {
  profile_visit: {
    type: "profile_visit",
    title: "Visit Profile",
    description: "View prospect's LinkedIn profile",
    category: "action",
    inputs: 1,
    outputs: 1,
    delayModes: ["instant", "fixed"],
    styleKey: "action-visit-",
    component: ProfileVisitNode as NodeComponent,
  },
  like_post: {
    type: "like_post",
    title: "Like Recent Post",
    description: "Like prospect's most recent post",
    category: "action",
    inputs: 1,
    outputs: 1,
    delayModes: ["instant", "fixed"],
    styleKey: "action-like-",
    component: LikePostNode as NodeComponent,
    configSchema: [
      {
        key: "numberOfPosts",
        label: "Number of Posts",
        type: "number",
        required: true,
        default: 1,
      },
      {
        key: "recentPostWithinDays",
        label: "Recent Post Within (days)",
        type: "number", 
        required: true,
        default: 30,
      },
    ],
  },
  send_invite: {
    type: "send_invite",
    title: "Send Connection Request",
    description: "Send a connection request to prospect",
    category: "action",
    inputs: 1,
    outputs: 1,
    delayModes: ["instant", "fixed"],
    styleKey: "action-invite-",
    component: SendInviteNode as NodeComponent,
    configSchema: [
      {
        key: "message",
        label: "Connection Message",
        type: "string",
        required: false,
        default: "",
      },
      {
        key: "usePersonalMessage",
        label: "Include Personal Message",
        type: "boolean",
        required: false,
        default: false,
      },
    ],
  },
 linkedin_request_accepted: {
    type: "linkedin_request_accepted",
    title: "Is LinkedIn Request Accepted?",
    description: "Check if connection request was accepted",
    category: "condition",
    inputs: 1,
    outputs: 2, // Dynamic: 2 for fixed (branches), 1 for waitUntil
    branchable: true,
    delayModes: ["fixed", "waitUntil"],
    styleKey: "condition-linkedin-",
    component: LinkedInRequestAcceptedNode as NodeComponent,
    configSchema: [
      {
        key: "timeframe",
        label: "Check within timeframe",
        type: "number",
        required: true,
        default: 7,
      },
      {
        key: "timeUnit",
        label: "Time Unit",
        type: "select",
        required: true,
        default: "days",
        options: [
          { value: "hours", label: "Hours" },
          { value: "days", label: "Days" },
          { value: "weeks", label: "Weeks" },
        ],
      },
    ],
  },
}