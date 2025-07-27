"use client";

import { useState, useCallback, useEffect } from "react";
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
import { Plus, Copy } from "lucide-react";
import ProfileVisitNode from "@/cb/nodes/ProfileVisitNode";
import { ActionPalette } from "@/cb/palette/action-palette";
import { ConfigPanel } from "@/cb/panels/index";
import { useFlowStore } from "@/campaign-builder/store/flow-store";
import "@xyflow/react/dist/style.css";

interface FlowCanvasProps {
  nodes: Node[];
  edges: Edge[];
}

const nodeTypes = {
  profile_visit: ProfileVisitNode,
};

export function FlowCanvas({ nodes, edges }: FlowCanvasProps) {
  const setNodes = useFlowStore((s) => s.setNodes);
  const setEdges = useFlowStore((s) => s.setEdges);
  const currentNodes = useFlowStore((s) => s.nodes);

  const [showActionPalette, setShowActionPalette] = useState(false);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [ignoreEmptySelections, setIgnoreEmptySelections] = useState(false);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes(changes);
    },
    [setNodes]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges(changes);
    },
    [setEdges]
  );

  const handleNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setShowConfigPanel(true);
  };

  const onSelectionChange = useCallback(
    ({ nodes: selected }: { nodes: Node[] }) => {
      // Don't clear selection if we're ignoring empty selections (programmatically selected node)
      if (ignoreEmptySelections && selected.length === 0) {
        return;
      }

      if (selected.length === 1) {
        const latestNode =
          currentNodes.find((n) => n.id === selected[0].id) || selected[0];
        setIgnoreEmptySelections(false); // Reset when user selects a different node
        setSelectedNode(latestNode);
        setShowConfigPanel(true);
      } else if (selected.length === 0) {
        setIgnoreEmptySelections(false);
        setSelectedNode(null);
        setShowConfigPanel(false);
      }
    },
    [currentNodes, ignoreEmptySelections]
  );

  useEffect(() => {
    if (selectedNode && !currentNodes.some((n) => n.id === selectedNode.id)) {
      setSelectedNode(null);
      setShowConfigPanel(false);
    }
  }, [currentNodes, selectedNode]);

  const handleNodeAddedFromPalette = (node: Node) => {
    // Start ignoring empty selections until user closes panel or selects different node
    setIgnoreEmptySelections(true);
    setSelectedNode(node);
    setShowConfigPanel(true);
  };

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
              Create your first automation step to begin building your campaign
              flow.
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
          onSelectionChange={onSelectionChange}
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

          {nodes.length === 0 && <EmptyState />}
        </ReactFlow>
      </ReactFlowProvider>

      <ActionPalette
        isOpen={showActionPalette}
        onClose={() => setShowActionPalette(false)}
        position={{ x: 400, y: 100 }}
        onNodeAdded={handleNodeAddedFromPalette}
      />

      <ConfigPanel
        node={selectedNode}
        isOpen={showConfigPanel}
        onClose={() => {
          setIgnoreEmptySelections(false); // Reset ignore flag when closing manually
          setShowConfigPanel(false);
          setSelectedNode(null);
        }}
      />
    </div>
  );
}
