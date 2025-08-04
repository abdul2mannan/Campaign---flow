// src/campaign-builder/nodes/BaseActionNode.tsx
import React, { useState, useEffect, useMemo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Zap, Clock, MoreVertical, Trash2 } from "lucide-react";
import { useFlowStore } from "@/campaign-builder/store/flow-store";
import { getNodeIconForCanvas } from "@/campaign-builder/utils/node-icons";
import { ButtonHandle } from "@/components/button-handle";
import { ConnectionState, useConnection } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

const selector = (connection: ConnectionState) => {
  return connection.inProgress;
};

interface BaseActionNodeProps {
  nodeType: string;
  nodeProps: NodeProps<Node>;
}

export function BaseActionNode({
  nodeType,
  nodeProps,
}: BaseActionNodeProps) {
  const { data, id, selected } = nodeProps;
  
  const updateNode = useFlowStore((s) => s.updateNode);
  const deleteNode = useFlowStore((s) => s.removeNode);
  const setPlusContext = useFlowStore((s) => s.setPlusContext);

  const currentNode = useFlowStore((s) => s.nodes.find((n) => n.id === id));
  const nodeData = (currentNode?.data || data) as any;
  const { meta, config = {}, delayMode = "instant" } = nodeData;
  
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingDelay, setEditingDelay] = useState(false);
  const [tempDelay, setTempDelay] = useState(
    (config.delayMinutes || 1).toString()
  );
  
  const connectionInProgress = useConnection(selector);
  const edges = useFlowStore((s) => s.edges);

  const delay = config.delayMinutes || 1;

  useEffect(() => {
    setTempDelay(delay.toString());
  }, [delay, delayMode]);

  // Check if this is the last node (no outgoing edges)
  const isLastNode = useMemo(() => {
    return !edges.some((edge) => edge.source === id);
  }, [edges, id]);

  const isFixed = useMemo(
    () => delayMode === "fixed" && delay > 0,
    [delayMode, delay]
  );

  const topIcon = isFixed ? (
    <Clock className="w-3.5 h-3.5 text-blue-500" strokeWidth={2} />
  ) : (
    <Zap className="w-3.5 h-3.5 text-blue-500" strokeWidth={2} />
  );

  // Use centralized icon utility
  const nodeIcon = getNodeIconForCanvas(nodeType);

  const handleAddDelay = () => {
    updateNode(id, (node) => {
      if (typeof node.data === "object" && node.data !== null) {
        const d = node.data as { config: any; delayMode: string };
        if (!d.config) d.config = {};
        d.config.delayMinutes = 60;
        d.delayMode = "fixed";
      }
    });
    setMenuOpen(false);
  };

  const handleDelete = () => {
    deleteNode?.(id);
    setMenuOpen(false);
  };

  const handlePlusClick = () => {
    setPlusContext({
      type: "node",
      sourceId: id,
    });
  };

  const handleDelayToggle = () => {
    updateNode(id, (node) => {
      if (typeof node.data === "object" && node.data !== null) {
        const d = node.data as { config: any; delayMode: string };
        d.delayMode = "instant";
        d.config.delayMinutes = 0;
      }
    });
    setMenuOpen(false);
  };

  return (
    <div className="relative w-72 z-10">
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <ButtonHandle
        type="source"
        position={Position.Bottom}
        onClick={handlePlusClick}
        showButton={isLastNode && !connectionInProgress}
      />

      <div
        className={`relative w-full rounded-2xl border-2 shadow-lg overflow-visible transition-all duration-200 ${
          selected
            ? "border-blue-400 bg-gradient-to-br from-blue-50 to-blue-100 shadow-xl shadow-blue-200/50"
            : "border-gray-200 bg-gradient-to-br from-white to-gray-50 hover:shadow-xl hover:border-gray-300"
        }`}
      >
        {/* Top label + actions */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <div className={`p-1 rounded-lg ${isFixed ? "bg-blue-500/10" : "bg-emerald-500/10"}`}>
              {topIcon}
            </div>
            {isFixed ? (
              editingDelay ? (
                <div className="flex items-center gap-1">
                  <span className="text-blue-700">Wait for</span>
                  <input
                    type="number"
                    value={tempDelay}
                    onChange={(e) => setTempDelay(e.target.value)}
                    onBlur={() => {
                      const value = parseInt(tempDelay, 10);
                      if (!isNaN(value) && value >= 1) {
                        updateNode(id, (node) => {
                          if (typeof node.data === "object" && node.data !== null) {
                            const d = node.data as { config: any };
                            if (!d.config) d.config = {};
                            d.config.delayMinutes = value;
                          }
                        });
                      }
                      setEditingDelay(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const value = parseInt(tempDelay, 10);
                        if (!isNaN(value) && value >= 1) {
                          updateNode(id, (node) => {
                            if (typeof node.data === "object" && node.data !== null) {
                              const d = node.data as { config: any };
                              if (!d.config) d.config = {};
                              d.config.delayMinutes = value;
                            }
                          });
                        }
                        setEditingDelay(false);
                      } else if (e.key === "Escape") {
                        setTempDelay(delay.toString());
                        setEditingDelay(false);
                      }
                    }}
                    className="w-12 px-1 py-0.5 text-xs border-2 border-blue-300 rounded-md text-center bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    min="1"
                    autoFocus
                  />
                  <span className="text-blue-700">min</span>
                </div>
              ) : (
                <button
                  onClick={() => setEditingDelay(true)}
                  className="text-blue-700 hover:text-blue-800 transition-colors px-2 py-1 rounded-md hover:bg-blue-100/50"
                >
                  Wait for {delay} min
                </button>
              )
            ) : (
              <span className="text-emerald-700 px-2 py-1 rounded-md bg-emerald-100/50">Send immediately</span>
            )}
          </div>

          {/* Menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100/50 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-xl shadow-lg py-2 z-50 min-w-[180px]">
                {!isFixed ? (
                  <button
                    onClick={handleAddDelay}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-3"
                  >
                    <Clock className="w-4 h-4 text-gray-500" />
                    Add waiting time before this step
                  </button>
                ) : (
                  <button
                    onClick={handleDelayToggle}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors flex items-center gap-3"
                  >
                    <Zap className="w-4 h-4 text-emerald-600" />
                    Send immediately
                  </button>
                )}
                <button
                  onClick={handleDelete}
                  className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-3"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="px-4 pb-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              {nodeIcon}
            </div>

            <div className="flex-grow min-w-0">
              <h3 className="font-medium text-gray-900 text-sm mb-1">
                {meta?.title}
              </h3>
              <p className="text-xs text-gray-500 mb-2">
                {meta?.description}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Click outside to close menu */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setMenuOpen(false)}
        />
      )}
    </div>
  );
}
