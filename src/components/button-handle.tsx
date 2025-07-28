// src/components/button-handle.tsx
import { Position, type HandleProps } from "@xyflow/react";
import { BaseHandle } from "@/components/base-handle";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const wrapperClassNames: Record<Position, string> = {
  [Position.Top]:
    "flex-col-reverse left-1/2 -translate-y-full -translate-x-1/2",
  [Position.Bottom]: "flex-col left-1/2 translate-y-[10px] -translate-x-1/2",
  [Position.Left]:
    "flex-row-reverse top-1/2 -translate-x-full -translate-y-1/2",
  [Position.Right]: "top-1/2 -translate-y-1/2 translate-x-[10px]",
};

interface ButtonHandleProps extends HandleProps {
  showButton?: boolean;
  onClick?: () => void;
}

export const ButtonHandle = ({
  showButton = true,
  position = Position.Bottom,
  onClick,
  children,
  ...props
}: ButtonHandleProps) => {
  const wrapperClassName = wrapperClassNames[position || Position.Bottom];
  const vertical = position === Position.Top || position === Position.Bottom;

  return (
    <BaseHandle position={position} id={props.id} {...props}>
      {showButton && (
        <div
          className={`absolute flex items-center ${wrapperClassName} pointer-events-none`}
        >
          {/* Connection line */}
          <div
            className={`bg-gray-300 ${vertical ? "h-10 w-[1px]" : "h-[1px] w-10"}`}
          />
          
          {/* Plus button */}
          <div className="nodrag nopan pointer-events-auto">
            {children || (
              <Button
                onClick={onClick}
                size="sm"
                variant="secondary"
                className="rounded-full h-6 w-6 p-0 hover:bg-blue-100 hover:border-blue-300 transition-colors"
              >
                <Plus size={12} className="text-gray-600" />
              </Button>
            )}
          </div>
        </div>
      )}
    </BaseHandle>
  );
};