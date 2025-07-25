"use client";

import { useState } from "react";
import { X, Search, Eye, Zap } from "lucide-react";
import type { Node } from "@xyflow/react";
import { nodeRegistry } from "@/campaign-builder/registry/nodeRegistry";
import { createNode } from "@/campaign-builder/registry/factory";
import { useFlowStore } from "@/campaign-builder/store/flow-store";

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
  const addNode = useFlowStore((s) => s.addNodeAtEnd);

  // ────────────────────────────────────────────────────────────────
  // Helpers
  // ────────────────────────────────────────────────────────────────
  const filteredNodes = Object.values(nodeRegistry).filter((node) =>
    (node.title + node.description)
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const handleAddNode = (nodeType: string) => {
    const newNode = createNode(nodeType, {
      position: position || { x: 400, y: 100 },
    });

    // Add to the Zustand store so it appears on the canvas
    addNode(newNode);

    // Notify parent so it can open the ConfigPanel, etc.
    onNodeAdded?.(newNode);

    onClose();
  };

  const getNodeIcon = (nodeType: string) => {
    switch (nodeType) {
      case "profile_visit":
        return <Eye className="w-5 h-5 text-indigo-600" />;
      default:
        return <Zap className="w-5 h-5 text-blue-600" />;
    }
  };

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

  // ────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Add Step</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
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

        {/* Node List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredNodes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No steps found matching "{searchTerm}"</p>
            </div>
          ) : (
            filteredNodes.map((node) => (
              <button
                key={node.type}
                onClick={() => handleAddNode(node.type)}
                className="w-full p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 text-left group"
              >
                <div className="flex items-start gap-3">
                  <div className="bg-white border border-gray-200 rounded-lg p-2 group-hover:border-blue-300 transition-colors">
                    {getNodeIcon(node.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900 text-sm">
                        {node.title}
                      </h3>
                      <span
                        className={`px-2 py-1 text-xs rounded border ${getCategoryColor(
                          node.category
                        )}`}
                      >
                        {node.category}
                      </span>
                    </div>
                    {node.description && (
                      <p className="text-xs text-gray-500 leading-relaxed">
                        {node.description.length > 80
                          ? `${node.description.slice(0, 80)}...`
                          : node.description}
                      </p>
                    )}
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
