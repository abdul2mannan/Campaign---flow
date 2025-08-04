import React from "react";
import { type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { ProfileVisitNode as ProfileVisitNodeType } from "@/campaign-builder/types/flow-nodes";
import { BaseActionNode } from "./BaseActionNode";

export default function ProfileVisitNode(props: NodeProps<ProfileVisitNodeType>) {
  return (
    <BaseActionNode
      nodeType="profile_visit"
      nodeProps={props}
    />
  );
}
