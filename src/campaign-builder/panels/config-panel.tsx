"use client";

import { useState, useEffect } from "react";
import { X, Settings, Zap, Clock } from "lucide-react";
import { useFlowStore } from "@/campaign-builder/store/flow-store";
import type { Node } from "@xyflow/react";
import type { ConfigField } from "@/campaign-builder/registry/nodeRegistry";

interface ConfigPanelProps {
  node: Node | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ConfigPanel({ node, isOpen, onClose }: ConfigPanelProps) {
  const updateNode = useFlowStore((s) => s.updateNode);
  const [localConfig, setLocalConfig] = useState<Record<string, any>>({});

  const currentNode = useFlowStore((s) =>
    node ? s.nodes.find((n) => n.id === node.id) ?? node : null
  );

  // ─────────────────────────────────────────────────────────────
  // Sync local config when node changes
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentNode) return;
    const d: any = currentNode.data;
    setLocalConfig({ ...d.config });
  }, [currentNode?.data?.config, currentNode?.data?.delayMode]);

  if (!isOpen || !currentNode) return null;

  const { meta, config = {}, delayMode = "instant" } = currentNode.data as any;

  // Remove delay‑related fields so they never render here
  const configSchema: ConfigField[] = (meta?.configSchema || []).filter(
    (f: ConfigField) => !["delay", "delayMinutes", "waitTime"].includes(f.key)
  );

  // ─────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────
  const setDelayMode = (mode: "instant" | "fixed") => {
    updateNode(currentNode.id, (n) => {
      if (typeof n.data === "object" && n.data !== null) {
        const d = n.data as any;
        d.delayMode = mode;

        // When switching to fixed mode, set a default delay if none exists
        if (mode === "fixed") {
          if (!d.config) d.config = {};
          if (!d.config.delayMinutes || d.config.delayMinutes === 0) {
            d.config.delayMinutes = 60; // Default to 5 minutes
          }
        }
      }
    });
  };

  const handleConfigChange = (key: string, value: any) => {
    const newConfig = { ...localConfig, [key]: value };
    setLocalConfig(newConfig);
    updateNode(currentNode.id, (n) => {
      if (typeof n.data === "object" && n.data !== null) {
        const d = n.data as any;
        if (!d.config) d.config = {};
        d.config[key] = value;
      }
    });
  };

  const renderConfigField = (field: ConfigField) => {
    const currentValue = config[field.key] ?? field.default ?? "";
    switch (field.type) {
      case "string":
        return (
          <input
            type="text"
            value={currentValue}
            onChange={(e) => handleConfigChange(field.key, e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={field.label}
          />
        );
      case "number":
        return (
          <input
            type="number"
            value={currentValue}
            onChange={(e) =>
              handleConfigChange(field.key, parseInt(e.target.value) || 0)
            }
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            min={0}
          />
        );
      case "boolean":
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={currentValue}
              onChange={(e) => handleConfigChange(field.key, e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">{field.label}</span>
          </label>
        );
      case "select":
        return (
          <select
            value={currentValue}
            onChange={(e) => handleConfigChange(field.key, e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {field.options?.map((option: any) => (
              <option
                key={option.value || option}
                value={option.value || option}
              >
                {option.label || option}
              </option>
            ))}
          </select>
        );
      default:
        return <div className="text-sm text-gray-500">Unsupported type</div>;
    }
  };

  // ─────────────────────────────────────────────────────────────
  // JSX
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-white border-l border-gray-200 shadow-xl z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Configure Step
          </h2>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Step Info */}
        <div>
          <h3 className="font-medium text-gray-900 mb-1">{meta?.title}</h3>
          {meta?.description && (
            <p className="text-sm text-gray-600">{meta.description}</p>
          )}
        </div>

        {/* Timing Toggle */}
        {meta?.delayModes?.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Timing</h4>
            <div className="flex gap-2">
              <button
                onClick={() => setDelayMode("instant")}
                className={`flex-1 px-3 py-2 text-sm border rounded-lg transition-colors ${
                  delayMode === "instant"
                    ? "bg-blue-50 border-blue-300 text-blue-700"
                    : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-1 justify-center">
                  <Zap className="w-4 h-4" /> Immediate
                </div>
              </button>
              <button
                onClick={() => setDelayMode("fixed")}
                className={`flex-1 px-3 py-2 text-sm border rounded-lg transition-colors ${
                  delayMode === "fixed"
                    ? "bg-blue-50 border-blue-300 text-blue-700"
                    : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-1 justify-center">
                  <Clock className="w-4 h-4" /> Delayed
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Custom Config */}
        {configSchema.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Configuration</h4>
            <div className="space-y-4">
              {configSchema.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label}
                    {field.required && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </label>
                  {renderConfigField(field)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4">
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}
