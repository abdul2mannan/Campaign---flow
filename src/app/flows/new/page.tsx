"use client";

import { useFlowStore } from "@/campaign-builder/store/flow-store";
import { FlowCanvas } from "@/campaign-builder/components/canvas/flow-canvas";

export default function NewFlowPage() {
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);

  return <FlowCanvas nodes={nodes} edges={edges} />;
}