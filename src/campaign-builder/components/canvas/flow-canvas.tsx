// src/campaign-builder/components/canvas/flow-canvas.tsx
/* eslint react-hooks/exhaustive-deps: 0 */
"use client";

import { useState, useCallback, useEffect, CSSProperties } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useReactFlow,
  addEdge,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type OnConnect,
} from "@xyflow/react";
import { Plus, Copy, Loader2 } from "lucide-react";

import ProfileVisitNode from "@/campaign-builder/nodes/ProfileVisitNode";
import LikePostNode from "@/campaign-builder/nodes/LikePostNode";
import SendInviteNode from "@/campaign-builder/nodes/SendInviteNode";
import LinkedInRequestAcceptedNode from "@/campaign-builder/nodes/LinkedInRequestAcceptedNode";
import MergeNode from "@/campaign-builder/nodes/MergeNode";

import { ActionPalette } from "@/campaign-builder/palette/action-palette";
import { ConfigPanel } from "@/campaign-builder/panels/index";

import {
  useFlowStore,
  setLayoutCallback,
  type LayoutTrigger,
} from "@/campaign-builder/store/flow-store";

import { ButtonEdge } from "@/components/button-edge";
import { useAutoLayout } from "../../hooks/useAutoLayout";

import "@xyflow/react/dist/style.css";


const nodeTypes = {
  profile_visit: ProfileVisitNode,
  like_post: LikePostNode,
  send_invite: SendInviteNode,
  linkedin_request_accepted: LinkedInRequestAcceptedNode,
  merge: MergeNode,
};

const edgeTypes = {
  buttonedge: ButtonEdge,
};



function FlowCanvasInner({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) {
  const {
    setNodes,
    setEdges,
    nodes: storeNodes,
    plusContext,
    clearPlusContext,
    autoLayoutEnabled,
    layoutDirection,
    setIsLayouting,
    applyLayoutResult,
    createAutoMergeForConditional,
    handleDelayModeChange,
  } = useFlowStore();

  const reactFlowInstance = useReactFlow();

  const [showActionPalette, setShowActionPalette] = useState(false);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const { layout, layoutIncremental } = useAutoLayout({
    direction: layoutDirection,
    fitViewAfterLayout: false,
    onLayoutStart: () => setIsLayouting(true),
    onLayoutComplete: (n, e) => {
      applyLayoutResult(n, e);
      setIsLayouting(false);
    },
    onLayoutError: () => setIsLayouting(false),
  });

  /** subscribe once to layout triggers coming from the store */
  useEffect(() => {
    const cb = async (t: LayoutTrigger) => {
      if (!autoLayoutEnabled) return;
      if (t.affectedNodeIds?.length) {
        await layoutIncremental(t.affectedNodeIds);
      } else {
        await layout();
      }
    };
    setLayoutCallback(cb);
    return () => setLayoutCallback(null);
  }, [autoLayoutEnabled, layout, layoutIncremental]);

  /* -------------------------- plus-button palette ------------------------ */

  useEffect(() => {
    if (plusContext) setShowActionPalette(true);
  }, [plusContext]);

  /* ----------------------- node add from palette ------------------------ */

  const handleNodeAddedFromPalette = useCallback(() => {
    setShowActionPalette(false);
    clearPlusContext();
  }, [plusContext, clearPlusContext]);

  /* ---------------------------- CRUD handlers ---------------------------- */

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes(changes),
    [setNodes]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges(changes),
    [setEdges]
  );

  const handleNodeClick = useCallback((_: React.MouseEvent, n: Node) => {
    // Don't open config panel for merge nodes
    if (n.type === "merge") return;
    
    setSelectedNode(n);
    setShowConfigPanel(true);
  }, []);

  const onSelectionChange = useCallback(
    ({ nodes: sel }: { nodes: Node[] }) => {
      // Filter out merge nodes from selection
      const selectableNodes = sel.filter(n => n.type !== "merge");
      
      if (selectableNodes.length === 1) {
        const live = storeNodes.find((n) => n.id === selectableNodes[0].id) || selectableNodes[0];
        setSelectedNode(live);
        setShowConfigPanel(true);
      } else if (selectableNodes.length === 0) {
        setSelectedNode(null);
        setShowConfigPanel(false);
      }
    },
    [storeNodes]
  );

  const handleSaveConfiguration = useCallback(() => {
    reactFlowInstance.setNodes((ns) =>
      ns.map((n) => ({ ...n, selected: false }))
    );
    setSelectedNode(null);
    setShowConfigPanel(false);
  }, [reactFlowInstance]);

  /* ---------------------------- Style sheet ----------------------------- */

  // useEffect(() => {
  //   const id = "flow-anim-styles";
  //   if (document.getElementById(id)) return;

  //   const style = document.createElement("style");
  //   style.id = id;
  //   style.textContent = `
  //     .react-flow__node {transition:transform .35s cubic-bezier(.4,0,.2,1)!important;}
  //     .react-flow__node[data-new="true"]{animation:nodeEnter .5s forwards}
  //     .react-flow__node[data-deleting="true"]{animation:nodeExit .3s forwards;pointer-events:none}
  //     @keyframes nodeEnter{0%{opacity:0;transform:scale(.8) translateY(-10px)}
  //       60%{opacity:.8;transform:scale(1.02)}100%{opacity:1}}
  //     @keyframes nodeExit{0%{opacity:1}100%{opacity:0;transform:scale(.9)}}`;
  //   document.head.appendChild(style);
  //   return () => style.remove();
  // }, []);

  useEffect(() => {
    const selectedConditionalNodes = storeNodes.filter((node) => {
      const isConditional =
        node.selected &&
        (node.data.category === "condition" || node.data?.branchable === true);

      // Only process nodes with delayMode === "fixed"
      const hasFixedDelayMode = node.data?.delayMode === "fixed";

      return isConditional && hasFixedDelayMode;
    });

    selectedConditionalNodes.forEach((node) => {
      // Check if this conditional node doesn't already have a merge node
      const hasMergeConnection = edges.some(
        (edge) =>
          edge.source === node.id &&
          storeNodes.find((n) => n.id === edge.target && n.type === "merge")
      );

      if (!hasMergeConnection) {
        // Create auto-merge after a short delay to avoid conflicts
        setTimeout(() => {
          createAutoMergeForConditional(node.id);
        }, 100);
      }
    });
  }, [storeNodes, edges, createAutoMergeForConditional]);

  // Add this useEffect to monitor delayMode changes
  useEffect(() => {
    // This effect monitors changes in node data to detect delayMode switches
    // Note: This will be triggered by the conditional node components when they update delayMode
  }, [storeNodes, handleDelayModeChange]);
  /* ----------------------------- Overlays ------------------------------- */

  const EmptyState = () =>
    nodes.length === 0 ? (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-50/50 z-10 pointer-events-none">
        <div className="text-center space-y-6 max-w-md pointer-events-auto">
          <div className="space-y-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <Plus className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Start Building Your Campaign
              </h3>
              <p className="text-gray-600 mb-4">
                Create your first automation step to begin building your flow.
              </p>
              {autoLayoutEnabled && (
                <div className="text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
                  ✨ Auto-layout enabled
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setShowActionPalette(true)}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add First Step
            </button>

            <div className="text-sm text-gray-500">OR</div>

            <button className="w-full px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2">
              <Copy className="w-5 h-5" />
              Choose a Flow Template
            </button>
          </div>
        </div>
      </div>
    ) : null;

  /* ------------------------------ Render -------------------------------- */

  // Process nodes to make merge nodes non-selectable and non-draggable
  const processedNodes = nodes.map(node => {
    if (node.type === "merge") {
      return {
        ...node,
        selectable: false,
        draggable: false,
        focusable: false,
      };
    }
    return node;
  });

  return (
    <div className="h-full w-full relative">
      <ReactFlow
        nodes={processedNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onSelectionChange={onSelectionChange}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={!!nodes.length}
        selectNodesOnDrag={false}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background
          bgColor="#ffffff"
          variant={BackgroundVariant.Dots}
          color="#909090"
          gap={20}
          size={1}
        />
        <MiniMap
          className="bg-white border border-gray-200 shadow-sm"
          maskColor="rgba(0,0,0,0.1)"
          nodeColor={(n) => {
            const c = (n.data as any)?.meta?.category;
            if (c === "condition") return "#f59e0b";
            if (c === "action") return "#3b82f6";
            return "#6b7280";
          }}
        />
        <Controls
          className="bg-white border border-gray-200 shadow-sm"
          showInteractive={false}
        />
        <EmptyState />
      </ReactFlow>

      <ActionPalette
        isOpen={showActionPalette}
        onClose={() => {
          setShowActionPalette(false);
          clearPlusContext();
        }}
        onNodeAdded={handleNodeAddedFromPalette}
      />

      <ConfigPanel
        node={selectedNode}
        isOpen={showConfigPanel}
        onSave={handleSaveConfiguration}
        onClose={() => {
          setSelectedNode(null);
          setShowConfigPanel(false);
        }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

export function FlowCanvas(props: { nodes: Node[]; edges: Edge[] }) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
