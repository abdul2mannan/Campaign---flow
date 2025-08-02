// src/components/button-edge.tsx
import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useFlowStore } from "@/campaign-builder/store/flow-store";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";

interface ButtonEdgeProps extends EdgeProps {
  children?: ReactNode;
  showButton?: boolean;
}

const Badge = ({ label }: { label: string }) => {
  const colour =
    label.toLowerCase() === "yes"
      ? "text-green-600"
      : label.toLowerCase() === "no"
      ? "text-red-600"
      : "text-gray-600";
  return (
    <span
      className={`nodrag nopan pointer-events-none select-none
                  px-1 py-0.5 text-xs font-medium ${colour}
                  bg-white/80 rounded shadow`}
    >
      {label}
    </span>
  );
};

export const ButtonEdge = ({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  children,
  data,
  showButton = true,
}: ButtonEdgeProps) => {
  const setPlusContext = useFlowStore((s) => s.setPlusContext);
  // Always use default Bezier path
  const params = {
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  };
  const [path, labelX, labelY] = getSmoothStepPath(params);

  const onEdgeClick = () => {
    setPlusContext({
      type: (data?.pluscontext as any)?.type || "edge",
      edgeId: (data?.pluscontext as any)?.edgeId || id,
      sourceId: (data?.pluscontext as any)?.sourceId || source,
      targetId: (data?.pluscontext as any)?.targetId || target,
      position: { x: labelX, y: labelY },
    });
  };

  return (
    <>
      <BaseEdge path={path} markerEnd={markerEnd} style={style} />
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            className="absolute nopan nodrag pointer-events-none"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${
                labelY - 50
              }px)`,
            }}
          >
            <Badge label={data.label as string} />
          </div>
        </EdgeLabelRenderer>
      )}
      {showButton && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-auto absolute"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
          >
            {children || (
              <Button
                onClick={onEdgeClick}
                size="sm"
                variant="secondary"
                className="rounded-full h-6 w-6 p-0 hover:bg-blue-100 hover:border-blue-300 transition-colors"
              >
                <Plus size={12} className="text-gray-600" />
              </Button>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};
