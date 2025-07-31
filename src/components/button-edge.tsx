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
  useStore,
  type EdgeProps,
  type ReactFlowState,
} from "@xyflow/react";

interface ButtonEdgeProps extends EdgeProps {
  children?: ReactNode;
  showButton?: boolean;
}

const BEND_STEP = 60;

/**
 * Map an edge's index (k) among `total` parallel edges to a bend offset.
 * – If total is **odd**, the centre edge (k==mid) stays straight (0 offset);
 *   others bend symmetrically: … -2, -1, 0, +1, +2 …
 * – If total is **even**, every edge bends with no 0 lane:
 *     k: 0,1,2,3,4,5 … → -1,+1,-2,+2,-3,+3 …
 */
const getBendOffset = (k: number, total: number): number => {
  if (total % 2 === 1) {
    const mid = Math.floor(total / 2); // centre index
    return (k - mid) * BEND_STEP; // 0 for centre, ±1, ±2 …
  }
  // even: zig-zag pattern that skips 0
  const magnitude = Math.floor(k / 2) + 1; // 1,1,2,2,3,3…
  const sign = k % 2 === 0 ? -1 : 1; // -, +, -, + …
  return sign * magnitude * BEND_STEP;
};

const getSpecialPath = (
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  offset: number
) => {
  const verticalGap = targetY - sourceY;

  // Pure downward control for the start
  const c1x = sourceX;
  const c1y = sourceY + verticalGap * 0.4;

  // Horizontal outward control for the end
  const c2x = targetX + offset;
  const c2y = targetY - verticalGap * 0.6;

  return `M ${sourceX},${sourceY} C ${c1x},${c1y} ${c2x},${c2y} ${targetX},${targetY}`;

};
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

  /** 1️⃣ Gather and stabilise all parallel edges */
  const similarEdges = useStore(
    (s: ReactFlowState) =>
      s.edges
        .filter((e) => e.source === source && e.target === target)
        .sort((a, b) => a.id.localeCompare(b.id)) // deterministic order
  );

  const idx = similarEdges.findIndex((e) => e.id === id);
  const total = similarEdges.length;

  const params = {
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  };

  /** 2️⃣ Decide the path */
  let path: string;
  let labelX: number;
  let labelY: number;
  if (total === 1) {
    // single edge → default smooth curve
    const [bezierPath, lX, lY] = getSmoothStepPath(params);
    path = bezierPath;
    labelX = lX;
    labelY = lY;
  } else {
    const offset = getBendOffset(idx, total);
    if (offset === 0) {
      // centre edge of an odd count → leave straight
      const [bezierPath, lX, lY] = getBezierPath(params);
      path = bezierPath;
      labelX = lX;
      labelY = lY;
    } else {
      // curved siblings
      path = getSpecialPath(sourceX, sourceY, targetX, targetY, offset);
      // Calculate label position for curved path
      const cx = (sourceX + targetX) / 2;
      const cy = (sourceY + targetY) / 2;
      labelX = cx + offset;
      labelY = cy;
    }
  }

  const onEdgeClick = () => {
    setPlusContext({
      type: "edge",
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
      <BaseEdge path={path} markerEnd={markerEnd} style={style} />
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            className="absolute nopan nodrag pointer-events-none"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
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
