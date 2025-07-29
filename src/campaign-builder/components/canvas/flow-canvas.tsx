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
  Panel,
  useReactFlow,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type OnConnect,
  addEdge,
} from "@xyflow/react";
import { Plus, Copy, Settings, Loader2, AlertCircle } from "lucide-react";

// Your existing imports
import ProfileVisitNode from "@/campaign-builder/nodes/ProfileVisitNode";
import LikePostNode from "@/campaign-builder/nodes/LikePostNode";
import SendInviteNode from "@/campaign-builder/nodes/SendInviteNode";
import LinkedInRequestAcceptedNode from "@/campaign-builder/nodes/LinkedInRequestAcceptedNode";
import { ActionPalette } from "@/campaign-builder/palette/action-palette";
import { ConfigPanel } from "@/campaign-builder/panels/index";
import { useFlowStore, setLayoutCallback } from "@/campaign-builder/store/flow-store";
import { ButtonEdge } from "@/components/button-edge";

// New auto-layout imports
import { LayoutControls } from "../layout/layout-controls";
import { useAutoLayout } from "../../hooks/useAutoLayout";

import "@xyflow/react/dist/style.css";

interface FlowCanvasProps {
  nodes: Node[];
  edges: Edge[];
}

// Your existing node types
const nodeTypes = {
  profile_visit: ProfileVisitNode,
  like_post: LikePostNode,
  send_invite: SendInviteNode,
  linkedin_request_accepted: LinkedInRequestAcceptedNode,
};

// Your existing edge types
const edgeTypes = {
  buttonedge: ButtonEdge,
};

function FlowCanvasInner({ nodes, edges }: FlowCanvasProps) {
  const reactFlowInstance = useReactFlow();
  
  // Store state
  const {
    setNodes,
    setEdges,
    addEdge: storeAddEdge,
    nodes: currentNodes,
    plusContext,
    clearPlusContext,
    insertBetweenNodes,
    // Auto-layout store state
    autoLayoutEnabled,
    isLayouting,
    layoutDirection,
    setIsLayouting,
    applyLayoutResult,
    triggerLayout,
  } = useFlowStore();

  // UI state management
  const [showActionPalette, setShowActionPalette] = useState(false);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [ignoreEmptySelections, setIgnoreEmptySelections] = useState(false);
  const [pendingNodeSelection, setPendingNodeSelection] = useState<string | null>(null);
  
  // Auto-layout integration
  const { layout, layoutIncremental, isLayouting: hookIsLayouting } = useAutoLayout({
    direction: layoutDirection,
    fitViewAfterLayout: true,
    onLayoutStart: () => setIsLayouting(true),
    onLayoutComplete: (layoutedNodes, layoutedEdges) => {
      applyLayoutResult(layoutedNodes, layoutedEdges);
      setIsLayouting(false);
    },
    onLayoutError: (error) => {
      console.error('Layout failed:', error);
      setIsLayouting(false);
    },
  });

  // Connect store to auto-layout hook
  useEffect(() => {
    const handleLayoutTrigger = async (trigger: any) => {
      if (!autoLayoutEnabled) return;

      switch (trigger.type) {
        case 'incremental':
          if (trigger.affectedNodeIds?.length > 0) {
            await layoutIncremental(trigger.affectedNodeIds);
          }
          break;
        case 'node_added':
        case 'node_removed':
        case 'edge_added':
        case 'edge_removed':
        case 'manual':
        default:
          await layout();
          break;
      }
    };

    setLayoutCallback(handleLayoutTrigger);

    return () => {
      setLayoutCallback(null);
    };
  }, [autoLayoutEnabled, layout, layoutIncremental]);

  // Auto-open palette when plus button is clicked
  useEffect(() => {
    if (plusContext) {
      setShowActionPalette(true);
    }
  }, [plusContext]);

  // Handle pending node selection after creation
  useEffect(() => {
    if (pendingNodeSelection) {
      const node = nodes.find((n) => n.id === pendingNodeSelection);
      if (node) {
        setSelectedNode(node);
        setShowConfigPanel(true);
        setPendingNodeSelection(null);
      }
    }
  }, [nodes, pendingNodeSelection]);

  // Clean up selected node if it's deleted
  useEffect(() => {
    if (selectedNode && !currentNodes.some((n: Node) => n.id === selectedNode.id)) {
      setSelectedNode(null);
      setShowConfigPanel(false);
    }
  }, [currentNodes, selectedNode]);

  // Handle node changes with auto-layout trigger on selection
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Check if any node was selected
      const selectionChanges = changes.filter(change => 
        change.type === 'select' && change.selected === true
      );
      
      // Apply changes to store
      setNodes(changes);
      
      // Trigger auto-layout when a node is selected
      if (selectionChanges.length > 0 && autoLayoutEnabled) {
        setTimeout(() => {
          triggerLayout({ type: 'manual' });
        }, 10);
      }
    },
    [setNodes, autoLayoutEnabled, triggerLayout]
  );

  // Handle edge changes
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges(changes);
    },
    [setEdges]
  );

  // Handle new edge connections
  const onConnect: OnConnect = useCallback(
    (connection) => {
      const newEdge = {
        ...connection,
        id: `${connection.source}-${connection.target}`,
        type: "buttonedge",
      };
      storeAddEdge(newEdge);
    },
    [storeAddEdge]
  );

  // Handle node click for configuration
  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setShowConfigPanel(true);
  }, []);

  // Handle selection changes
  const onSelectionChange = useCallback(
    ({ nodes: selected }: { nodes: Node[] }) => {
      if (ignoreEmptySelections && selected.length === 0) {
        return;
      }

      if (selected.length === 1) {
        const latestNode =
          currentNodes.find((n: Node) => n.id === selected[0].id) || selected[0];
        setIgnoreEmptySelections(false);
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

  // Enhanced node addition handler with auto-layout support
  const handleNodeAddedFromPalette = useCallback((node: any) => {
    if (plusContext?.type === "node") {
      // Handle adding node at end of flow using store method
      if (plusContext.sourceId) {
        // Use the store method for consistent behavior and auto-layout
        const { insertAtEnd } = useFlowStore.getState();
        insertAtEnd(plusContext.sourceId, node.type);

        // No need to set pending selection - let the store handle it
      }
    } else if (plusContext?.type === "edge") {
      // Handle adding node between two connected nodes using store method
      if (plusContext.edgeId) {
        // Create node with temporary ID - store will assign proper ID
        const newNode = {
          ...node,
          type: node.type,
        };

        // Use the store method for clean edge insertion and auto-layout
        insertBetweenNodes(plusContext.edgeId, newNode);
      }
    } else {
      // For non-plus button additions, use original logic
      setIgnoreEmptySelections(true);
      setSelectedNode(node);
      setShowConfigPanel(true);
      setPendingNodeSelection(node.id);
    }

    // Always close palette and clear context
    setShowActionPalette(false);
    clearPlusContext();
  }, [plusContext, insertBetweenNodes, clearPlusContext]);

  // Handle configuration save
  const handleSaveConfiguration = useCallback(() => {
    // Unselect all nodes programmatically
    reactFlowInstance.setNodes((nodes) =>
      nodes.map((node) => ({ ...node, selected: false }))
    );
    setSelectedNode(null);
    setShowConfigPanel(false);
    setIgnoreEmptySelections(false);
  }, [reactFlowInstance]);

  // Auto-layout CSS transition styles
  const canvasStyles: React.CSSProperties = {
    transition: autoLayoutEnabled ? 'transform 0.3s ease-out' : 'none',
  };

  // Layout status overlay
  const LayoutStatusOverlay = () => {
    if (!isLayouting && !hookIsLayouting) return null;

    return (
      <div className="absolute inset-0 bg-black/10 flex items-center justify-center z-50 pointer-events-none">
        <div className="bg-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
          <span className="text-sm font-medium text-gray-700">Computing layout...</span>
        </div>
      </div>
    );
  };

  // Enhanced empty state with layout info
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
            <p className="text-gray-600 mb-4">
              Create your first automation step to begin building your campaign flow.
            </p>
            {autoLayoutEnabled && (
              <div className="text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
                ✨ Auto-layout enabled - nodes will position automatically
              </div>
            )}
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
    <div className="h-full w-full relative" style={canvasStyles}>
      {/* Auto-Layout Controls */}
      <div className="absolute top-4 left-4 z-20">
        <LayoutControls />
      </div>

      {/* Layout Status Indicator */}
      {(isLayouting || hookIsLayouting) && (
        <div className="absolute top-4 right-4 z-20">
          <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 flex items-center gap-2 shadow-sm">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            <span className="text-sm text-gray-600">Computing layout...</span>
          </div>
        </div>
      )}

      {/* Main ReactFlow Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        // Disable interactions during layout computation
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={nodes.length>0}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        {/* Background */}
        <Background
          bgColor="#ffffff"
          color="#909090"
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
        />

        {/* Enhanced MiniMap with layout status */}
        <MiniMap
          className={`bg-white border border-gray-200 shadow-sm ${
            isLayouting || hookIsLayouting ? 'opacity-50' : ''
          }`}
          maskColor="rgba(0,0,0,0.1)"
          nodeColor={(node: Node) => {
            const category = (node.data as any)?.meta?.category;
            if (category === 'condition') return '#f59e0b';
            if (category === 'action') return '#3b82f6';
            return '#6b7280';
          }}
        />

        {/* Enhanced Controls */}
        <Controls 
          className="bg-white border border-gray-200 shadow-sm"
          showInteractive={false}
        />

        {/* Layout Information Panel */}
        <Panel position="bottom-right" className="bg-white border border-gray-200 rounded-lg shadow-sm p-3">
          <div className="text-xs text-gray-600 space-y-1">
            <div className="flex justify-between gap-4">
              <span>Auto-Layout:</span>
              <span className={autoLayoutEnabled ? 'text-green-600' : 'text-gray-400'}>
                {autoLayoutEnabled ? 'ON' : 'OFF'}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Direction:</span>
              <span className="uppercase text-xs">{layoutDirection}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Nodes:</span>
              <span>{nodes.length}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Edges:</span>
              <span>{edges.length}</span>
            </div>
            {(isLayouting || hookIsLayouting) && (
              <div className="flex justify-between gap-4 text-blue-600">
                <span>Status:</span>
                <span>Computing...</span>
              </div>
            )}
          </div>
        </Panel>

        {/* Empty state */}
        {nodes.length === 0 && <EmptyState />}
      </ReactFlow>

      {/* Layout computation overlay */}
      <LayoutStatusOverlay />

      {/* Action Palette with plus context support */}
      <ActionPalette
        isOpen={showActionPalette}
        onClose={() => {
          setShowActionPalette(false);
          clearPlusContext();
        }}
        position={{ x: 400, y: 100 }}
        onNodeAdded={handleNodeAddedFromPalette}
      />

      {/* Configuration Panel for node settings */}
      <ConfigPanel
        node={selectedNode}
        isOpen={showConfigPanel}
        onSave={handleSaveConfiguration}
        onClose={() => {
          setIgnoreEmptySelections(false);
          setShowConfigPanel(false);
          setSelectedNode(null);
        }}
      />
    </div>
  );
}

// Main FlowCanvas component with ReactFlowProvider
export function FlowCanvas({ nodes, edges }: FlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner nodes={nodes} edges={edges} />
    </ReactFlowProvider>
  );
}