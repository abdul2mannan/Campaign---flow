// src/campaign-builder/utils/node-icons.tsx
import React from "react";
import { Eye, Heart, Zap, SendHorizontal, GitBranch } from "lucide-react";

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
    case "send_invite":
      return <SendHorizontal className={`${className} text-green-600`} strokeWidth={strokeWidth} />;
    case "linkedin_request_accepted":
      return <GitBranch className={`${className} text-yellow-600`} strokeWidth={strokeWidth} />;
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
    case "send_invite":
      return <SendHorizontal className="w-4 h-4 text-green-600" strokeWidth={2} />;
    case "linkedin_request_accepted":
      return <GitBranch className="w-4 h-4 text-yellow-600" strokeWidth={2} />;
    default:
      return <Zap className="w-4 h-4 text-blue-600" strokeWidth={2} />;
  }
};