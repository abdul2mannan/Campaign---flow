import React from "react";
import { type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { SendInviteNode as SendInviteNodeType } from "@/campaign-builder/types/flow-nodes";
import { BaseActionNode } from "./BaseActionNode";

export default function SendInviteNode(props: NodeProps<SendInviteNodeType>) {
  return (
    <BaseActionNode
      nodeType="send_invite"
      nodeProps={props}
    />
  );
}
