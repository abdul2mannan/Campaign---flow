"use client";

import { useState, useEffect } from "react";
import { X, Settings, Zap, Clock, Eye } from "lucide-react";
import { useFlowStore } from "@/campaign-builder/store/flow-store";
import type { Node } from "@xyflow/react";
import type { ConfigField } from "@/campaign-builder/registry/nodeRegistry";
import { getNodeIcon } from "@/campaign-builder/utils/node-icons";
import "@xyflow/react/dist/style.css";

interface ConfigPanelProps {
  node: Node | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

export function ConfigPanel({
  node,
  isOpen,
  onClose,
  onSave,
}: ConfigPanelProps) {
  const updateNode = useFlowStore((s) => s.updateNode);
  const [localConfig, setLocalConfig] = useState<Record<string, any>>({});

  const currentNode = useFlowStore((s) =>
    node ? s.nodes.find((n) => n.id === node.id) ?? node : null
  );

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
  const setDelayMode = (mode: "instant" | "fixed" | "waitUntil") => {
    updateNode(currentNode.id, (n) => {
      if (typeof n.data === "object" && n.data !== null) {
        const d = n.data as any;
        d.delayMode = mode;

        // When switching to fixed mode, set a default delay if none exists
        if (mode === "fixed") {
          if (!d.config) d.config = {};
          if (!d.config.delayMinutes || d.config.delayMinutes === 0) {
            d.config.delayMinutes = 15; // Default to 15 minutes
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
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
            placeholder={field.label}
          />
        );
      case "number":
        return (
          <div className="relative">
            <input
              type="number"
              value={currentValue}
              onChange={(e) =>
                handleConfigChange(field.key, parseInt(e.target.value) || 0)
              }
              className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white text-lg font-medium"
              min={0}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-400">
              {currentValue || field.default || 0}
            </div>
          </div>
        );
      case "boolean":
        return (
          <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              checked={currentValue}
              onChange={(e) => handleConfigChange(field.key, e.target.checked)}
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">
              {field.label}
            </span>
          </label>
        );
      case "select":
        return (
          <select
            value={currentValue}
            onChange={(e) => handleConfigChange(field.key, e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
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
    <div className="fixed inset-y-0 right-0 w-96 bg-white border-l border-gray-200 shadow-2xl z-40 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <div className="bg-white rounded-lg p-2 shadow-sm">
              {getNodeIcon(meta?.type || "", { className: "w-5 h-5" })}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Configure Action
              </h2>
              <p className="text-sm text-gray-600">{meta?.title}</p>
            </div>
          </div>
          <button
            onClick={() => {
              onSave?.();
              onClose();
            }}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-white/50 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Step Info Card */}
        <div className="p-6 border-b border-gray-100">
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="bg-white rounded-full p-2 shadow-sm">
                {getNodeIcon(meta?.type || "", { className: "w-5 h-5" })}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">
                  {meta?.title}
                </h3>
                {meta?.description && (
                  <p className="text-sm text-gray-600">{meta.description}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Timing Section */}
        {meta?.delayModes?.length > 0 && (
          <div className="p-6 border-b border-gray-100">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-600" />
              Timing
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {/* For conditional nodes, show Within/Wait until options */}
              {meta?.category === "condition" ? (
                <>
                  <button
                    onClick={() => setDelayMode("fixed")}
                    className={`p-4 border-2 rounded-xl transition-all duration-200 ${
                      delayMode === "fixed"
                        ? "bg-blue-50 border-blue-300 text-blue-700 shadow-sm"
                        : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div
                        className={`p-2 rounded-lg ${
                          delayMode === "fixed" ? "bg-blue-100" : "bg-gray-100"
                        }`}
                      >
                        <Clock className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-medium">Within</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setDelayMode("waitUntil")}
                    className={`p-4 border-2 rounded-xl transition-all duration-200 ${
                      delayMode === "waitUntil"
                        ? "bg-blue-50 border-blue-300 text-blue-700 shadow-sm"
                        : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div
                        className={`p-2 rounded-lg ${
                          delayMode === "waitUntil"
                            ? "bg-blue-100"
                            : "bg-gray-100"
                        }`}
                      >
                        <Eye className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-medium">Wait until</span>
                    </div>
                  </button>
                </>
              ) : (
                /* For action nodes, show Immediate/Delayed options */
                <>
                  <button
                    onClick={() => setDelayMode("instant")}
                    className={`p-4 border-2 rounded-xl transition-all duration-200 ${
                      delayMode === "instant"
                        ? "bg-blue-50 border-blue-300 text-blue-700 shadow-sm"
                        : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div
                        className={`p-2 rounded-lg ${
                          delayMode === "instant"
                            ? "bg-blue-100"
                            : "bg-gray-100"
                        }`}
                      >
                        <Zap className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-medium">Immediate</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setDelayMode("fixed")}
                    className={`p-4 border-2 rounded-xl transition-all duration-200 ${
                      delayMode === "fixed"
                        ? "bg-blue-50 border-blue-300 text-blue-700 shadow-sm"
                        : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div
                        className={`p-2 rounded-lg ${
                          delayMode === "fixed" ? "bg-blue-100" : "bg-gray-100"
                        }`}
                      >
                        <Clock className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-medium">Delayed</span>
                    </div>
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Configuration Section */}
        {configSchema.length > 0 && (
          <div className="p-6">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4 text-gray-600" />
              Configuration
            </h4>
            <div className="space-y-5">
              {configSchema.map((field) => (
                <div key={field.key} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {field.label}
                    {field.required && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </label>
                  <div className="relative">{renderConfigField(field)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 p-6 bg-gray-50">
        <button
          onClick={() => {
            onSave?.();
            onClose();
          }}
          className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
        >
          Save Configuration
        </button>
      </div>
    </div>
  );
}
