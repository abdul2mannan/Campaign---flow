import React from "react";
import { type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { LikePostNode as LikePostNodeType } from "@/campaign-builder/types/flow-nodes";
import { BaseActionNode } from "./BaseActionNode";

export default function LikePostNode(props: NodeProps<LikePostNodeType>) {
  return (
    <BaseActionNode
      nodeType="like_post"
      nodeProps={props}
    />
  );
}
