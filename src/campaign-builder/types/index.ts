import type { Node as ReactFlowNode, Edge as ReactFlowEdge, XYPosition } from '@xyflow/react'

// ===== CORE NODE TYPES =====

export type NodeType = 'start' | 'action' | 'condition' | 'end'

export type ActionNodeSubtype = 
  | 'visit-profile'
  | 'follow-profile'
  | 'follow-company'
  | 'endorse-skills'
  | 'like-post'
  | 'comment-post'
  | 'send-invite'
  | 'send-message'
  | 'withdraw-request'
  | 'send-email'
  | 'send-whatsapp'
  | 'integration'

export type ConditionNodeSubtype =
  | 'linkedin-request-accepted'
  | 'replied-linkedin'
  | 'replied-email'
  | 'email-opened'
  | 'link-opened'
  | 'response-sentiment'
  | 'custom-condition'

export type DelayType = 'fixed' | 'within' | 'wait-until'

export interface DelayConfig {
  type: DelayType
  value: number
  unit: 'minutes' | 'hours' | 'days' | 'weeks'
  condition?: string // For 'wait-until' type
}

export interface NodeConfig {
  // Common config
  title: string
  description?: string
  delay?: DelayConfig
  
  // Action-specific config
  actionConfig?: {
    template?: string
    variables?: Record<string, any>
    platform?: 'linkedin' | 'email' | 'whatsapp' | 'integration'
    integrationId?: string
  }
  
  // Condition-specific config
  conditionConfig?: {
    conditionType: ConditionNodeSubtype
    operator?: 'equals' | 'contains' | 'greater' | 'less'
    expectedValue?: any
    timeout?: DelayConfig
  }
  
  // A/B Testing config
  abTestConfig?: {
    enabled: boolean
    versionA: {
      name: string
      weight: number
      config: Record<string, any>
    }
    versionB: {
      name: string
      weight: number
      config: Record<string, any>
    }
  }
}

// ===== FLOW NODE INTERFACE =====

export interface FlowNodeData {
  id: string
  type: NodeType
  subtype?: ActionNodeSubtype | ConditionNodeSubtype
  config: NodeConfig
  
  // UI state
  selected: boolean
  hasError: boolean
  isExecuting: boolean
  
  // Validation
  prerequisites: string[]
  isValid: boolean
  validationErrors: string[]
}

export interface FlowNode extends Omit<ReactFlowNode, 'data'> {
  data: FlowNodeData
  measured?: {
    width: number
    height: number
  }
}

// ===== FLOW EDGE INTERFACE =====

export type EdgeType = 'default' | 'conditional' | 'delayed'

export interface FlowEdgeData {
  id: string
  type: EdgeType
  
  // Conditional edges
  condition?: 'yes' | 'no'
  
  // Edge delays (alternative to node delays)
  delay?: DelayConfig
  
  // UI state
  animated: boolean
  selected: boolean
}

export interface FlowEdge extends Omit<ReactFlowEdge, 'data'> {
  data: FlowEdgeData
}

// ===== FLOW STATE =====

export interface FlowState {
  nodes: FlowNode[]
  edges: FlowEdge[]
  
  // Metadata
  id: string
  name: string
  description?: string
  version: number
  createdAt: string
  updatedAt: string
  
  // UI state
  viewport: {
    x: number
    y: number
    zoom: number
  }
  
  // Selection state
  selectedNodes: string[]
  selectedEdges: string[]
  
  // Canvas state
  isLoading: boolean
  isDirty: boolean
  lastSaved?: string
}

// ===== NODE REGISTRY =====

export interface NodeTypeDefinition {
  type: NodeType
  subtype?: ActionNodeSubtype | ConditionNodeSubtype
  name: string
  description: string
  icon: string
  category: 'action' | 'condition' | 'control'
  
  // Prerequisites
  requiresPrevious: NodeType[]
  allowedNext: NodeType[]
  maxConnections?: number
  
  // Configuration
  defaultConfig: Partial<NodeConfig>
  configSchema?: any // JSON schema for validation
  
  // UI
  color: string
  bgColor: string
  borderColor: string
}

// ===== CANVAS INTERACTION =====

export interface CanvasPosition {
  x: number
  y: number
}

export interface PlusButtonData {
  id: string
  position: CanvasPosition
  sourceNodeId?: string
  sourceHandle?: string
  targetNodeId?: string
  edgeId?: string
  context: 'node-output' | 'edge-midpoint' | 'canvas'
}

// ===== STORE ACTIONS =====

export interface FlowActions {
  // Node operations
  addNode: (type: NodeType, subtype?: ActionNodeSubtype | ConditionNodeSubtype, position?: XYPosition) => void
  updateNode: (nodeId: string, updates: Partial<FlowNodeData>) => void
  deleteNode: (nodeId: string) => void
  duplicateNode: (nodeId: string) => void
  
  // Edge operations
  addEdge: (sourceId: string, targetId: string, edgeData?: Partial<FlowEdgeData>) => void
  updateEdge: (edgeId: string, updates: Partial<FlowEdgeData>) => void
  deleteEdge: (edgeId: string) => void
  
  // Selection
  selectNode: (nodeId: string, multi?: boolean) => void
  selectEdge: (edgeId: string, multi?: boolean) => void
  clearSelection: () => void
  
  // Canvas
  setViewport: (viewport: { x: number; y: number; zoom: number }) => void
  fitView: () => void
  
  // Flow operations
  loadFlow: (flow: FlowState) => void
  saveFlow: () => Promise<void>
  resetFlow: () => void
  
  // Validation
  validateFlow: () => boolean
  validateNode: (nodeId: string) => boolean
  
  // Undo/Redo
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
}

// ===== EXPORT COMBINED TYPES =====

export type FlowStore = FlowState & FlowActions

// Re-export React Flow types for convenience
export type { XYPosition, Connection, ConnectionMode } from '@xyflow/react'