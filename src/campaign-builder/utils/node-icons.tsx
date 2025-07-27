import React from "react";
import { Eye, Heart, Zap } from "lucide-react";

interface NodeIconProps {
  className?: string;
  strokeWidth?: number;
}

export const getNodeIcon = (nodeType: string, props: NodeIconProps = {}) => {
  const { className = "w-5 h-5", strokeWidth = 2 } = props;
  
  switch (nodeType) {
    case "profile_visit":
      return <Eye className={`${className} text-indigo-600`} strokeWidth={strokeWidth} />;
    case "like_post":
      return <Heart className={`${className} text-red-600`} strokeWidth={strokeWidth} />;
    default:
      return <Zap className={`${className} text-blue-600`} strokeWidth={strokeWidth} />;
  }
};

export const getNodeIconForCanvas = (nodeType: string) => {
  switch (nodeType) {
    case "profile_visit":
      return <Eye className="w-4 h-4 text-indigo-600" strokeWidth={2} />;
    case "like_post":
      return <Heart className="w-4 h-4 text-red-600" strokeWidth={2} />;
    default:
      return <Zap className="w-4 h-4 text-blue-600" strokeWidth={2} />;
  }
};
