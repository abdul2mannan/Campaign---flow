"use client";

import { useState } from "react";
import { X, Search } from "lucide-react";
import type { Node } from "@xyflow/react";
import { nodeRegistry } from "@/campaign-builder/registry/nodeRegistry";
import { createNode } from "@/campaign-builder/registry/factory";
import { useFlowStore } from "@/campaign-builder/store/flow-store";
import { getNodeIcon } from "@/campaign-builder/utils/node-icons";
import "@xyflow/react/dist/style.css";

interface ActionPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called right after a node is created & added to the flow */
  onNodeAdded?: (node: Node) => void;
  /** Where the new node should appear if the user doesn't drag‑drop */
  position?: { x: number; y: number };
}

export function ActionPalette({
  isOpen,
  onClose,
  onNodeAdded,
  position,
}: ActionPaletteProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // EXISTING: Keep existing store methods
  const addNode = useFlowStore((s) => s.addNodeAtEnd);

  // NEW: Plus context functionality
  const plusContext = useFlowStore((s) => s.plusContext);
  const insertAtEnd = useFlowStore((s) => s.insertAtEnd);
  const clearPlusContext = useFlowStore((s) => s.clearPlusContext);

  // UNCHANGED: Keep existing filtering logic
  const filteredNodes = Object.values(nodeRegistry).filter((node) =>
    (node.title + node.description)
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  // ENHANCED: Context-aware node addition
  const handleAddNode = (nodeType: string) => {
    if (plusContext?.type === "node" && plusContext.sourceId) {
      insertAtEnd(plusContext.sourceId, nodeType);
      clearPlusContext();
    } else if (plusContext?.type === "edge" && plusContext.edgeId) {
      const newNode = createNode(nodeType, {
        position: position || { x: 400, y: 100 },
      });
      onNodeAdded?.(newNode);
    } else {
      // EXISTING: Use original logic for non-plus-button cases
      const newNode = createNode(nodeType, {
        position: position || { x: 400, y: 100 },
      });
      addNode(newNode);

      // Call onNodeAdded for non-plus-button cases
      onNodeAdded?.({
        id: "",
        type: nodeType,
        position: { x: 0, y: 0 },
        data: {},
      } as Node);
    }

    onClose();
  };

  // UNCHANGED: Keep existing helper functions
  const getCategoryColor = (category: string) => {
    switch (category) {
      case "action":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "condition":
        return "bg-green-50 text-green-700 border-green-200";
      case "integration":
        return "bg-purple-50 text-purple-700 border-purple-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  // ENHANCED: Context-aware close handler
  const handleClose = () => {
    clearPlusContext(); // NEW: Clear plus context when closing
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        {/* ENHANCED: Context-aware header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {/* NEW: Different title based on context */}
            {plusContext?.type === "node" ? "Add Next Step" : "Add Step"}
          </h2>
          <button
            onClick={handleClose} // CHANGED: Use enhanced close handler
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* UNCHANGED: Keep existing search functionality */}
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search steps..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* UNCHANGED: Keep existing node list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredNodes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No steps found</p>
              <p className="text-sm">Try adjusting your search</p>
            </div>
          ) : (
            filteredNodes.map((node) => (
              <button
                key={node.type}
                onClick={() => handleAddNode(node.type)} // Uses enhanced handler
                className="w-full p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-gray-100 rounded-lg p-2 group-hover:bg-blue-100 transition-colors">
                    {getNodeIcon(node.type)}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 group-hover:text-blue-900">
                      {node.title}
                    </div>
                    {node.description && (
                      <div className="text-sm text-gray-500 mt-0.5">
                        {node.description}
                      </div>
                    )}
                  </div>
                  <div
                    className={`px-2 py-1 rounded-full text-xs border ${getCategoryColor(
                      node.category
                    )}`}
                  >
                    {node.category}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
