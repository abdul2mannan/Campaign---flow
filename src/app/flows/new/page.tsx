"use client";

import { useEffect } from "react";
import { v4 as uuid } from "uuid";
import { useFlowStore } from "@/campaign-builder/store/flow-store";
import { FlowCanvas } from "@/campaign-builder/components/canvas/flow-canvas";
import { createNode } from "@/campaign-builder/registry/factory";

export default function NewFlowPage() {
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const addNode = useFlowStore((s) => s.addNodeAtEnd);

  useEffect(() => {
    if (nodes.length === 0) {
      const node = createNode("profile_visit", {
        position: { x: 400, y: 50 },
      });
      addNode(node);
    }
  }, [addNode, nodes.length]);

  return <FlowCanvas nodes={nodes} edges={edges} />;
}
