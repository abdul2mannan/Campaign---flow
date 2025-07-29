// src/campaign-builder/utils/helpers.ts

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function generateNodeId(type: string): string {
  return `node-${type}-${generateId()}`
}


export function generateEdgeId(source: string, target: string): string {
  return `edge-${source}-${target}-${generateId()}`
}









