import { useState, useEffect, useMemo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Zap, Clock, MoreVertical, Trash2 } from "lucide-react";
import React from "react";
import { useFlowStore } from "@/campaign-builder/store/flow-store";
import type { ProfileVisitNode as ProfileVisitNodeType } from "@/campaign-builder/types/flow-nodes";
import { getNodeIconForCanvas } from "@/campaign-builder/utils/node-icons";
import { ButtonHandle } from "@/components/button-handle";
import { ConnectionState, useConnection } from "@xyflow/react";
import "@xyflow/react/dist/style.css";


const selector = (connection: ConnectionState) => {
  return connection.inProgress;
};

export default function ProfileVisitNode({
  data,
  id,
  selected,
}: NodeProps<ProfileVisitNodeType>) {
  const currentNode = useFlowStore((s) => s.nodes.find((n) => n.id === id));
  const nodeData = (currentNode?.data || data) as any;
  const { meta, config = {}, delayMode = "instant" } = nodeData;
  const delay = config.delayMinutes ?? 0;
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingDelay, setEditingDelay] = useState(false);
  const [tempDelay, setTempDelay] = useState(delay.toString());
  const updateNode = useFlowStore((s) => s.updateNode);
  const deleteNode = useFlowStore((s) => s.removeNode);
  const setPlusContext = useFlowStore((s) => s.setPlusContext);

  const connectionInProgress = useConnection(selector);
  const edges = useFlowStore((s) => s.edges);

  useEffect(() => {
    setTempDelay(delay.toString());
  }, [delay, delayMode]);

  // Check if this is the last node (no outgoing edges)
  const isLastNode = useMemo(() => {
    return !edges.some((edge) => edge.source === id);
  }, [edges, id]);

  const isFixed = useMemo(() => delayMode === "fixed" && delay > 0, [delayMode, delay]);
  const topIcon = isFixed ? (
    <Clock className="w-3.5 h-3.5 text-blue-500" strokeWidth={2} />
  ) : (
    <Zap className="w-3.5 h-3.5 text-blue-500" strokeWidth={2} />
  );

  // Use centralized icon utility
  const nodeIcon = getNodeIconForCanvas("profile_visit");

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

  // Plus button click handler
  const handlePlusClick = () => {
    setPlusContext({
      type: "node",
      sourceId: id,
    });
  };

  return (
    <div className="relative w-65 z-10">
      <Handle type="target" position={Position.Top } className="opacity-0"  />
      
      {/* Enhanced ButtonHandle with improved styling */}
      <ButtonHandle
        type="source"
        position={Position.Bottom}
        onClick={handlePlusClick}
        showButton={isLastNode && !connectionInProgress}
      />

      <div className={`relative w-full rounded-xl border shadow-sm overflow-visible ${
        selected ? 'border-blue-500 bg-blue-50 shadow-lg' : 'border-gray-200 bg-white'
      }`}>
        {/* Top label + actions */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <div className="flex items-center gap-1 text-xs text-blue-600 font-medium">
            {topIcon}
            {isFixed ? (
              editingDelay ? (
                <input
                  type="number"
                  min={1}
                  value={tempDelay}
                  onChange={(e) => setTempDelay(e.target.value)}
                  onBlur={() => {
                    const value = parseInt(tempDelay, 10);
                    if (!isNaN(value) && value > 0) {
                      updateNode(id, (node) => {
                        const d = node.data as {
                          config: any;
                          delayMode: string;
                        };
                        d.config.delayMinutes = value;
                      });
                    }
                    setEditingDelay(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter")
                      (e.target as HTMLInputElement).blur();
                  }}
                  className="bg-transparent border border-indigo-300 rounded px-1 py-0.5 text-[11px] w-14 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => {
                    setTempDelay(delay.toString());
                    setEditingDelay(true);
                  }}
                  className="hover:underline underline-offset-2 flex items-center gap-1"
                >
                  <span>Wait for {delay} min</span>
                </button>
              )
            ) : (
              <span>Send immediately</span>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="text-gray-400 hover:text-gray-700"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div className="absolute top-full mt-2 right-2 z-50 w-64 bg-white rounded-xl border border-gray-200 shadow-xl text-sm">
                {delayMode === "instant" && (
                  <button
                    onClick={handleAddDelay}
                    className="flex items-center gap-3 w-full px-4 py-3 text-left text-gray-900 hover:bg-gray-50 transition"
                  >
                    <Clock
                      className="w-4 h-4 text-indigo-500"
                      strokeWidth={2}
                    />
                    <span className="text-[13px] font-medium">
                      Add waiting time before this step
                    </span>
                  </button>
                )}

                {delayMode === "fixed" && (
                  <button
                    onClick={() => {
                      updateNode(id, (node) => {
                        const d = node.data as {
                          config: any;
                          delayMode: string;
                        };
                        d.delayMode = "instant";
                        d.config.delayMinutes = 0;
                      });
                      setMenuOpen(false);
                    }}
                    className="flex items-center gap-3 w-full px-4 py-3 text-left text-gray-900 hover:bg-gray-50 transition"
                  >
                    <Zap className="w-4 h-4 text-blue-500" strokeWidth={2} />
                    <span className="text-[13px] font-medium">
                      Send immediately
                    </span>
                  </button>
                )}

                <button
                  onClick={handleDelete}
                  className="flex items-center gap-3 w-full px-4 py-3 text-left text-red-600 hover:bg-red-50 transition"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="text-[13px] font-medium">
                    Delete this step
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="flex items-start gap-3 px-4 pb-3">
          <div className="bg-indigo-100 rounded-full p-2">
            {nodeIcon}
          </div>
          <div className="flex flex-col">
            <div className="font-semibold text-gray-900">{meta.title}</div>
            {meta.description && (
              <div className="text-xs text-gray-500 mt-0.5">
                {meta.description}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}