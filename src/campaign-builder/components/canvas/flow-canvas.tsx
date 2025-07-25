"use client";

import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
} from "@xyflow/react";

import  ProfileVisitNode from "@/cb/nodes/ProfileVisitNode";
import "@xyflow/react/dist/style.css";

export function FlowCanvas({ nodes, edges }: { nodes: any[]; edges: any[] }) {
  const nodeTypes = {
    profile_visit: ProfileVisitNode,
  
  };

  return (
    <div className="h-full w-full">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          nodeTypes={nodeTypes  }
          proOptions={{ hideAttribution: true }}
        >
          <Background
            bgColor="#ffffff"
            color="#909090"
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
          />
          <MiniMap />
          <Controls />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}
