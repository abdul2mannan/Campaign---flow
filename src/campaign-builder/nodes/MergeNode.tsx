// src/campaign-builder/nodes/MergeNode.tsx
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useFlowStore } from "@/campaign-builder/store/flow-store";
import type { MergeNode as MergeNodeType } from "@/campaign-builder/types/flow-nodes";
import { ButtonHandle } from "@/components/button-handle";
import "@xyflow/react/dist/style.css";
import { useMemo } from "react";
import { ConnectionState, useConnection } from "@xyflow/react";
const selector = (connection: ConnectionState) => {
  return connection.inProgress;
};

export default function MergeNode({
  data,
  id,
  selected,
}: NodeProps<MergeNodeType>) {
  const setPlusContext = useFlowStore((s) => s.setPlusContext);
  const edges = useFlowStore((s) => s.edges);
  const connectionInProgress = useConnection(selector);
  const isLastNode = useMemo(() => {
    return !edges.some((edge) => edge.source === id);
  }, [edges, id]);

  /** blocks selection / drag when you click the empty bar */
  const stopNodeInteraction = (e: React.PointerEvent) => {
    e.stopPropagation(); // no bubble → wrapper never hears it
  };

  const handlePlusClick = () => setPlusContext({ type: "node", sourceId: id });

  return (
    <div
      className="relative w-72 h-4 z-10" // ← React Flow’s wrapper is *outside* this
      onPointerDown={stopNodeInteraction} // block clicks anywhere inside
    >
      {data.branches?.map((b, i) => (
        <Handle
          key={b.id}
          type="target"
          id={b.id}
          position={Position.Top}
          style={{
            left: `${50 + i / 100}%`
          }}
        />
      ))}
      <ButtonHandle
        type="source"
        position={Position.Bottom}
        onClick={handlePlusClick}
        showButton={isLastNode && !connectionInProgress}
      />

      {/* Visual merge representation - diamond shape with lines */}
      <div className="relative w-full h-8 flex items-center justify-center">
        {/* Center diamond/merge symbol */}
        <div className="relative z-10 w-4 h-4 bg-white border-2 border-gray-400 rotate-45 shadow-sm"></div>
      </div>
    </div>
  );
}
