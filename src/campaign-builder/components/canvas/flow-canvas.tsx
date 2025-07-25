"use client";

import { useState, useCallback } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";

import ProfileVisitNode from "@/cb/nodes/ProfileVisitNode";
import { ActionPalette } from "@/cb/palette/action-palette";
import { ConfigPanel } from "@/cb/panels/index";
import { useFlowStore } from "@/campaign-builder/store/flow-store";
import { Plus, Copy } from "lucide-react";
import "@xyflow/react/dist/style.css";

interface FlowCanvasProps {
  nodes: Node[];
  edges: Edge[];
}

export function FlowCanvas({ nodes, edges }: FlowCanvasProps) {
  const setNodes = useFlowStore((s) => s.setNodes);
  const setEdges = useFlowStore((s) => s.setEdges);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes(changes),
    [setNodes]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges(changes),
    [setEdges]
  );
  const [showActionPalette, setShowActionPalette] = useState(false);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const nodeTypes = {
    profile_visit: ProfileVisitNode,
  };

  const handleNodeClick = (event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setShowConfigPanel(true);
  };

  // Empty state component
  const EmptyState = () => (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-50/50 z-10 pointer-events-none">
      <div className="text-center space-y-6 max-w-md pointer-events-auto">
        <div className="space-y-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
            <Plus className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Start Building Your Campaign
            </h3>
            <p className="text-gray-600">
              Create your first automation step to begin building your campaign flow.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => setShowActionPalette(true)}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add First Step
          </button>
          
          <div className="text-sm text-gray-500">OR</div>
          
          <button className="w-full px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center justify-center gap-2">
            <Copy className="w-5 h-5" />
            Choose a Flow Template
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full w-full relative">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          nodeTypes={nodeTypes}
          nodesDraggable={nodes.length > 0}
          nodesConnectable={nodes.length > 0}
          elementsSelectable={nodes.length > 0}
          fitView
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
          
          {/* Show empty state when no nodes */}
          {nodes.length === 0 && <EmptyState />}
        </ReactFlow>
      </ReactFlowProvider>

      {/* Action Palette */}
      <ActionPalette
        isOpen={showActionPalette}
        onClose={() => setShowActionPalette(false)}
        position={{ x: 400, y: 100 }}
      />

      {/* Config Panel */}
      <ConfigPanel
        node={selectedNode}
        isOpen={showConfigPanel}
        onClose={() => {
          setShowConfigPanel(false);
          setSelectedNode(null);
        }}
      />
    </div>
  );
}