'use client';

import { useEffect } from 'react';
import { v4 as uuid } from 'uuid';
import { useFlowStore } from '@/campaign-builder/store/flow-store';
import { FlowCanvas } from '@/campaign-builder/components/canvas/flow-canvas';

export default function NewFlowPage() {
  const nodes   = useFlowStore((s) => s.nodes);
  const edges   = useFlowStore((s) => s.edges);
  const addNode = useFlowStore((s) => s.addNodeAtEnd);

  // inject a single node on first mount
  useEffect(() => {
    if (nodes.length === 0) {
      addNode({
        id: uuid(),
        type: 'default',                        // React Flow built‑in for now
        position: { x: 400, y: 50 },
        data: { label: 'Visit Profile' },
      });
    }
  }, [addNode, nodes.length]);

  return <FlowCanvas nodes={nodes} edges={edges} />;
}
