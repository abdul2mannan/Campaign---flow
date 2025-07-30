// src/campaign-builder/nodes/MergeNode.tsx
import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Plus } from "lucide-react";
import { useFlowStore } from "@/campaign-builder/store/flow-store";
import type { MergeNode as MergeNodeType } from "@/campaign-builder/types/flow-nodes";
import "@xyflow/react/dist/style.css";

export default function MergeNode({
  data,
  id,
  selected,
}: NodeProps<MergeNodeType>) {
  const setPlusContext = useFlowStore((s) => s.setPlusContext);

  const handlePlusClick = () => {
    setPlusContext({
      type: "node",
      sourceId: id,
    });
  };

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        className="opacity-0"
      />

      {/* Main node - circular plus button exactly like your ButtonHandle */}
      <div
        className={`
          rounded-full h-6 w-6 p-0 
          bg-white border border-gray-300
          hover:bg-blue-100 hover:border-blue-300 
          transition-colors
          flex items-center justify-center
          shadow-sm
          cursor-pointer
          ${selected ? "ring-2 ring-blue-500 ring-opacity-50" : ""}
        `}
        onClick={handlePlusClick}
      >
        <Plus size={12} className="text-gray-600" />
      </div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="opacity-0"
      />
    </>
  );
}

MergeNode.displayName = "MergeNode";
