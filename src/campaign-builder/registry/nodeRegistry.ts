import { NodeProps, Node } from "@xyflow/react";
import ProfileVisitNode from "@/cb/nodes/ProfileVisitNode";
import LikePostNode from "@/cb/nodes/LikePostNode";

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
    styleKey: "actiovisitn-",
    component: ProfileVisitNode as NodeComponent, // satisfies compiler
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
};
