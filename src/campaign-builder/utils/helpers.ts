import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// ===== CSS CLASS UTILITIES =====

/**
 * Utility function for merging CSS classes with Tailwind
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ===== ID GENERATION =====

/**
 * Generate a unique ID for nodes and edges
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Generate a node ID with a prefix
 */
export function generateNodeId(type: string): string {
  return `node-${type}-${generateId()}`
}

/**
 * Generate an edge ID
 */
export function generateEdgeId(source: string, target: string): string {
  return `edge-${source}-${target}-${generateId()}`
}

// ===== POSITION UTILITIES =====

/**
 * Calculate the center position between two points
 */
export function getCenterPosition(
  point1: { x: number; y: number },
  point2: { x: number; y: number }
): { x: number; y: number } {
  return {
    x: (point1.x + point2.x) / 2,
    y: (point1.y + point2.y) / 2,
  }
}

/**
 * Calculate distance between two points
 */
export function getDistance(
  point1: { x: number; y: number },
  point2: { x: number; y: number }
): number {
  return Math.sqrt(
    Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2)
  )
}

/**
 * Get a position offset from another position
 */
export function getOffsetPosition(
  position: { x: number; y: number },
  offsetX: number = 0,
  offsetY: number = 0
): { x: number; y: number } {
  return {
    x: position.x + offsetX,
    y: position.y + offsetY,
  }
}

/**
 * Calculate grid-snapped position
 */
export function snapToGrid(
  position: { x: number; y: number },
  gridSize: number = 20
): { x: number; y: number } {
  return {
    x: Math.round(position.x / gridSize) * gridSize,
    y: Math.round(position.y / gridSize) * gridSize,
  }
}

// ===== NODE UTILITIES =====

/**
 * Calculate default node position based on existing nodes
 */
export function calculateDefaultNodePosition(
  existingNodes: Array<{ position: { x: number; y: number } }>,
  nodeWidth: number = 280,
  nodeHeight: number = 120
): { x: number; y: number } {
  if (existingNodes.length === 0) {
    return { x: 100, y: 100 }
  }

  // Find the rightmost node and place new node to the right
  const rightmostNode = existingNodes.reduce((rightmost, current) => {
    return current.position.x > rightmost.position.x ? current : rightmost
  })

  return {
    x: rightmostNode.position.x + nodeWidth + 50,
    y: rightmostNode.position.y,
  }
}

/**
 * Get node bounds (bounding box)
 */
export function getNodeBounds(
  position: { x: number; y: number },
  width: number = 280,
  height: number = 120
) {
  return {
    x: position.x,
    y: position.y,
    width,
    height,
    right: position.x + width,
    bottom: position.y + height,
    centerX: position.x + width / 2,
    centerY: position.y + height / 2,
  }
}

// ===== DELAY UTILITIES =====

/**
 * Format delay duration for display
 */
export function formatDelay(
  value: number,
  unit: 'minutes' | 'hours' | 'days' | 'weeks'
): string {
  if (value === 1) {
    return `1 ${unit.slice(0, -1)}` // Remove 's' for singular
  }
  return `${value} ${unit}`
}

/**
 * Convert delay to minutes for calculations
 */
export function convertDelayToMinutes(
  value: number,
  unit: 'minutes' | 'hours' | 'days' | 'weeks'
): number {
  const multipliers = {
    minutes: 1,
    hours: 60,
    days: 60 * 24,
    weeks: 60 * 24 * 7,
  }
  return value * multipliers[unit]
}

/**
 * Convert minutes back to appropriate unit
 */
export function convertMinutesToDelay(totalMinutes: number): {
  value: number
  unit: 'minutes' | 'hours' | 'days' | 'weeks'
} {
  const weeks = Math.floor(totalMinutes / (60 * 24 * 7))
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor(totalMinutes / 60)

  if (weeks > 0 && totalMinutes % (60 * 24 * 7) === 0) {
    return { value: weeks, unit: 'weeks' }
  } else if (days > 0 && totalMinutes % (60 * 24) === 0) {
    return { value: days, unit: 'days' }
  } else if (hours > 0 && totalMinutes % 60 === 0) {
    return { value: hours, unit: 'hours' }
  } else {
    return { value: totalMinutes, unit: 'minutes' }
  }
}

// ===== VALIDATION UTILITIES =====

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Validate that a string contains variables in the format {{variable}}
 */
export function hasValidVariables(template: string): boolean {
  const variableRegex = /\{\{[a-zA-Z_][a-zA-Z0-9_]*\}\}/g
  const matches = template.match(variableRegex)
  return matches !== null
}

/**
 * Extract variables from a template string
 */
export function extractVariables(template: string): string[] {
  const variableRegex = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g
  const variables: string[] = []
  let match

  while ((match = variableRegex.exec(template)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1])
    }
  }

  return variables
}

// ===== STRING UTILITIES =====

/**
 * Capitalize first letter of a string
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Convert camelCase or PascalCase to readable title
 */
export function camelToTitle(str: string): string {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (char) => char.toUpperCase())
    .trim()
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + '...'
}

/**
 * Generate initials from a name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2)
}

// ===== DATE UTILITIES =====

/**
 * Format date for display
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Format time for display
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Get relative time (e.g., "2 hours ago")
 */
export function getRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  
  return formatDate(d)
}

// ===== ARRAY UTILITIES =====

/**
 * Remove duplicates from an array
 */
export function unique<T>(array: T[]): T[] {
  return Array.from(new Set(array))
}

/**
 * Group array items by a key
 */
export function groupBy<T>(
  array: T[],
  keyFn: (item: T) => string
): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const key = keyFn(item)
    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(item)
    return groups
  }, {} as Record<string, T[]>)
}

/**
 * Chunk array into smaller arrays
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

// ===== DEBOUNCE UTILITY =====

/**
 * Debounce function to limit how often a function can be called
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(() => func(...args), wait)
  }
}

// ===== COPY TO CLIPBOARD =====

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    return false
  }
}

// ===== DOWNLOAD UTILITIES =====

/**
 * Download JSON data as a file
 */
export function downloadJson(data: any, filename: string): void {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.json') ? filename : `${filename}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Read JSON file from file input
 */
export function readJsonFile(file: File): Promise<any> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string)
        resolve(json)
      } catch (error) {
        reject(new Error('Invalid JSON file'))
      }
    }
    
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}