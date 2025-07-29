// src/campaign-builder/nodes/LinkedInRequestAcceptedNode.tsx
import React, { useState, useEffect } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Clock, MoreVertical, Trash2, GitBranch, Eye } from "lucide-react";
import { useFlowStore } from "@/campaign-builder/store/flow-store";
import type { LinkedInRequestAcceptedNode as LinkedInRequestAcceptedNodeType } from "@/campaign-builder/types/flow-nodes";
import { getNodeIconForCanvas } from "@/campaign-builder/utils/node-icons";
import "@xyflow/react/dist/style.css";
export default function LinkedInRequestAcceptedNode({
  data,
  id,
  selected,
}: NodeProps<LinkedInRequestAcceptedNodeType>) {
  const updateNode = useFlowStore((s) => s.updateNode);
  const deleteNode = useFlowStore((s) => s.removeNode);
  const currentNode = useFlowStore((s) => s.nodes.find((n) => n.id === id));
  const nodeData = (currentNode?.data || data) as any;
  const { meta, config = {}, delayMode = "waitUntil" } = nodeData;

  const [menuOpen, setMenuOpen] = useState(false);
  const [editingTimeframe, setEditingTimeframe] = useState(false);
  const [tempTimeframe, setTempTimeframe] = useState((config.timeframe || 7).toString());

  const timeframe = config.timeframe || 7;
  const timeUnit = config.timeUnit || "days";
  const isBranching = delayMode === "fixed";

  useEffect(() => {
    setTempTimeframe((config.timeframe || 7).toString());
  }, [config.timeframe, delayMode]);

  // Use centralized icon utility
  const nodeIcon = getNodeIconForCanvas("linkedin_request_accepted");

  const topIcon = isBranching ? (
    <Clock className="w-3.5 h-3.5 text-blue-500" strokeWidth={2} />
  ) : (
    <Eye className="w-3.5 h-3.5 text-blue-500" strokeWidth={2} />
  );

  const handleDelete = () => {
    deleteNode?.(id);
    setMenuOpen(false);
  };

  const handleSwitchToFixed = () => {
    updateNode(id, (node) => {
      if (typeof node.data === "object" && node.data !== null) {
        const d = node.data as { delayMode: string; config: any };
        d.delayMode = "fixed";
        if (!d.config) d.config = {};
        if (!d.config.timeframe) d.config.timeframe = 7;
        if (!d.config.timeUnit) d.config.timeUnit = "days";
      }
    });
    setMenuOpen(false);
  };

  const handleSwitchToWaitUntil = () => {
    updateNode(id, (node) => {
      if (typeof node.data === "object" && node.data !== null) {
        const d = node.data as { delayMode: string };
        d.delayMode = "waitUntil";
      }
    });
    setMenuOpen(false);
  };

  return (
    <div className="relative w-72 z-10">
      <Handle type="target" position={Position.Top} className="opacity-0" />
      
      {isBranching ? (
        <>
          {/* Yes branch handle for fixed mode */}
          <Handle 
            type="source" 
            position={Position.Bottom} 
            id="yes"
            style={{ left: '30%' }}
            className="opacity-0" 
          />
          
          {/* No branch handle for fixed mode */}
          <Handle 
            type="source" 
            position={Position.Bottom} 
            id="no"
            style={{ left: '70%' }}
            className="opacity-0" 
          />
        </>
      ) : (
        /* Single output handle for waitUntil mode */
        <Handle 
          type="source" 
          position={Position.Bottom} 
          className="opacity-0" 
        />
      )}

      <div className={`relative w-full rounded-xl border shadow-sm overflow-visible ${
        selected ? 'border-blue-500 bg-blue-50 shadow-lg' : 'border-gray-200 bg-white'
      }`}>
        {/* Top label + actions */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <div className="flex items-center gap-1 text-xs text-blue-600 font-medium">
            {topIcon}
            {isBranching ? (
              editingTimeframe ? (
                <div className="flex items-center gap-1">
                  <span>Check within</span>
                  <input
                    type="number"
                    min={1}
                    value={tempTimeframe}
                    onChange={(e) => setTempTimeframe(e.target.value)}
                    onBlur={() => {
                      const value = parseInt(tempTimeframe, 10);
                      if (!isNaN(value) && value > 0) {
                        updateNode(id, (node) => {
                          const d = node.data as { config: any };
                          if (!d.config) d.config = {};
                          d.config.timeframe = value;
                        });
                      }
                      setEditingTimeframe(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter")
                        (e.target as HTMLInputElement).blur();
                    }}
                    className="bg-transparent border border-indigo-300 rounded px-1 py-0.5 text-[11px] w-12 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    autoFocus
                  />
                  <span>{timeUnit}</span>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setTempTimeframe(timeframe.toString());
                    setEditingTimeframe(true);
                  }}
                  className="hover:underline underline-offset-2 flex items-center gap-1"
                >
                  <span>Check within {timeframe} {timeUnit}</span>
                </button>
              )
            ) : (
              <span>Wait until accepted</span>
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
                {delayMode === "waitUntil" && (
                  <button
                    onClick={handleSwitchToFixed}
                    className="flex items-center gap-3 w-full px-4 py-3 text-left text-gray-900 hover:bg-gray-50 transition"
                  >
                    <Clock className="w-4 h-4 text-indigo-500" strokeWidth={2} />
                    <span className="text-[13px] font-medium">
                      Switch to "Within timeframe" mode
                    </span>
                  </button>
                )}

                {delayMode === "fixed" && (
                  <button
                    onClick={handleSwitchToWaitUntil}
                    className="flex items-center gap-3 w-full px-4 py-3 text-left text-gray-900 hover:bg-gray-50 transition"
                  >
                    <Eye className="w-4 h-4 text-blue-500" strokeWidth={2} />
                    <span className="text-[13px] font-medium">
                      Switch to "Wait until" mode
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
          <div className="bg-yellow-100 rounded-full p-2">
            {nodeIcon}
          </div>
          <div className="flex flex-col flex-1">
            <div className="font-semibold text-gray-900">{meta.title}</div>
            {meta.description && (
              <div className="text-xs text-gray-500 mt-0.5">
                {meta.description}
              </div>
            )}
          </div>
        </div>

        {/* Branch indicators - only show for fixed mode */}
        {isBranching && (
          <div className="flex items-center justify-between px-4 pb-3 pt-1">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-green-600 font-medium">Yes</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <GitBranch className="w-3 h-3" />
              <span>Condition</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-red-600 font-medium">No</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}