import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useFlowStore } from "@/campaign-builder/store/flow-store";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";

interface ButtonEdgeProps extends EdgeProps {
  children?: ReactNode;
  showButton?: boolean;
}

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
  showButton = true,
}: ButtonEdgeProps) => {
  const setPlusContext = useFlowStore((s) => s.setPlusContext);
  
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const onEdgeClick = () => {
    setPlusContext({
      type: 'edge',
      edgeId: id,
      sourceId: source,
      targetId: target,
      sourceNodeId: source,
      targetNodeId: target,
      position: { x: labelX, y: labelY },
    });
  };

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
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