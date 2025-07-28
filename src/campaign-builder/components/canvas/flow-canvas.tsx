// src/campaign-builder/components/canvas/flow-canvas.tsx
"use client";

import { useState, useCallback, useEffect } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useReactFlow,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";
import { Plus, Copy } from "lucide-react";
import ProfileVisitNode from "@/cb/nodes/ProfileVisitNode";
import LikePostNode from "@/cb/nodes/LikePostNode";
import SendInviteNode from "@/cb/nodes/SendInviteNode";
import LinkedInRequestAcceptedNode from "@/cb/nodes/LinkedInRequestAcceptedNode";
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
  like_post: LikePostNode,
  send_invite: SendInviteNode,
  linkedin_request_accepted: LinkedInRequestAcceptedNode,
};

function FlowCanvasInner({ nodes, edges }: FlowCanvasProps) {
  const reactFlowInstance = useReactFlow();
  const setNodes = useFlowStore((s) => s.setNodes);
  const setEdges = useFlowStore((s) => s.setEdges);
  const currentNodes = useFlowStore((s) => s.nodes);

  // Plus context management
  const plusContext = useFlowStore((s) => s.plusContext);
  const clearPlusContext = useFlowStore((s) => s.clearPlusContext);

  // UI state management
  const [showActionPalette, setShowActionPalette] = useState(false);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [ignoreEmptySelections, setIgnoreEmptySelections] = useState(false);
  const [pendingNodeSelection, setPendingNodeSelection] = useState<string | null>(null);

  // Auto-open palette when plus button is clicked
  useEffect(() => {
    if (plusContext) {
      setShowActionPalette(true);
    }
  }, [plusContext]);

  // Handle node changes
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes(changes);
    },
    [setNodes]
  );

  // Handle edge changes
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges(changes);
    },
    [setEdges]
  );

  // Handle node click for configuration
  const handleNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setShowConfigPanel(true);
  };

  // Handle selection changes
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

  // Clean up selected node if it's deleted
  useEffect(() => {
    if (selectedNode && !currentNodes.some((n) => n.id === selectedNode.id)) {
      setSelectedNode(null);
      setShowConfigPanel(false);
    }
  }, [currentNodes, selectedNode]);

  // Handle pending node selection for newly added nodes
  useEffect(() => {
    if (pendingNodeSelection && currentNodes.some(n => n.id === pendingNodeSelection)) {
      // Node has been added to the store, now select it in ReactFlow
      reactFlowInstance.setNodes((nodes) =>
        nodes.map((n) => ({
          ...n,
          selected: n.id === pendingNodeSelection
        }))
      );
      setPendingNodeSelection(null);
    }
  }, [currentNodes, pendingNodeSelection, reactFlowInstance]);

  // Enhanced context-aware node addition handler
  const handleNodeAddedFromPalette = (node: Node) => {
    if (plusContext?.type === 'node') {
      // For plus button context, find the newly added node for selection
      // The node was already added via insertAtEnd, so we need to find it differently
      setTimeout(() => {
        // Find the most recently added node that matches the expected position
        const parentNode = currentNodes.find(n => n.id === plusContext.sourceId);
        if (parentNode) {
          const newNode = currentNodes.find(n => 
            n.position.y === parentNode.position.y + 150 && 
            n.position.x === parentNode.position.x &&
            n.id !== parentNode.id
          );
          if (newNode) {
            setIgnoreEmptySelections(true);
            setSelectedNode(newNode);
            setShowConfigPanel(true);
            // Select the node in ReactFlow
            reactFlowInstance.setNodes((nodes) =>
              nodes.map((n) => ({
                ...n,
                selected: n.id === newNode.id
              }))
            );
          }
        }
      }, 100); // Small delay to ensure store update completes
    } else {
      // For non-plus button additions, use original logic
      setIgnoreEmptySelections(true);
      setSelectedNode(node);
      setShowConfigPanel(true);
      setPendingNodeSelection(node.id);
    }
  };

  // Handle configuration save
  const handleSaveConfiguration = () => {
    // Unselect all nodes programmatically
    reactFlowInstance.setNodes((nodes) =>
      nodes.map((node) => ({ ...node, selected: false }))
    );
    setSelectedNode(null);
    setShowConfigPanel(false);
    setIgnoreEmptySelections(false);
  };

  // Empty state component when no nodes exist
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
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
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

      {/* Action Palette with plus context support */}
      <ActionPalette
        isOpen={showActionPalette}
        onClose={() => {
          setShowActionPalette(false);
          clearPlusContext(); // Clear plus context when closing
        }}
        position={{ x: 400, y: 100 }}
        onNodeAdded={handleNodeAddedFromPalette} // Uses enhanced handler
      />

      {/* Configuration Panel for node settings */}
      <ConfigPanel
        node={selectedNode}
        isOpen={showConfigPanel}
        onSave={handleSaveConfiguration}
        onClose={() => {
          setIgnoreEmptySelections(false); // Reset ignore flag when closing manually
          setShowConfigPanel(false);
          setSelectedNode(null);
        }}
      />
    </div>
  );
}

export function FlowCanvas({ nodes, edges }: FlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner nodes={nodes} edges={edges} />
    </ReactFlowProvider>
  );
}