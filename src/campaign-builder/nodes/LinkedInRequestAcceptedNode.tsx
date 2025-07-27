// src/campaign-builder/nodes/LinkedInRequestAcceptedNode.tsx
import React, { useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Clock, MoreVertical, Trash2, GitBranch } from "lucide-react";
import { useFlowStore } from "@/campaign-builder/store/flow-store";
import type { LinkedInRequestAcceptedNode as LinkedInRequestAcceptedNodeType } from "@/campaign-builder/types/flow-nodes";
import { getNodeIconForCanvas } from "@/campaign-builder/utils/node-icons";

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

  const timeframe = config.timeframe || 7;
  const timeUnit = config.timeUnit || "days";

  // Use centralized icon utility
  const nodeIcon = getNodeIconForCanvas("linkedin_request_accepted");

  const handleDelete = () => {
    deleteNode?.(id);
    setMenuOpen(false);
  };

  return (
    <div className="relative w-72 z-10">
      <Handle type="target" position={Position.Top} className="opacity-0" />
      
      {/* Yes branch handle */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="yes"
        style={{ left: '30%' }}
        className="opacity-0" 
      />
      
      {/* No branch handle */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="no"
        style={{ left: '70%' }}
        className="opacity-0" 
      />

      <div className={`relative w-full rounded-xl border shadow-sm overflow-visible ${
        selected ? 'border-blue-500 bg-blue-50 shadow-lg' : 'border-gray-200 bg-white'
      }`}>
        {/* Top label + actions */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <div className="flex items-center gap-1 text-xs text-blue-600 font-medium">
            <Clock className="w-3.5 h-3.5 text-blue-500" strokeWidth={2} />
            <span>Check within {timeframe} {timeUnit}</span>
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

        {/* Branch indicators */}
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
      </div>
    </div>
  );
}