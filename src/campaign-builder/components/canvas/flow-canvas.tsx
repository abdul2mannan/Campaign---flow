'use client';

import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';                           // correct v12 style import

export function FlowCanvas({ nodes, edges }: { nodes: any[]; edges: any[] }) {
  return (
    <div className="h-full w-full">
      <ReactFlowProvider fitView>                                       {/* context for hooks */}
        <ReactFlow  nodes={nodes} edges={edges} fitView proOptions={{ hideAttribution: true }}  >
          <Background bgColor='#f2f2f2' color="#909090" variant={BackgroundVariant.Dots} gap={20} size={1} />       {/* subtle grid */}
          <MiniMap />
          <Controls />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}


