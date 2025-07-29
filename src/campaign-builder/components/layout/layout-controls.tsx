// src/campaign-builder/components/layout/layout-controls.tsx
import React from 'react';

// Simplified interface for backward compatibility
interface LayoutControlsProps {
  className?: string;
}

// Empty component since auto-layout is now always enabled
// This prevents import errors while we transition away from manual layout controls
export const LayoutControls: React.FC<LayoutControlsProps> = ({ className = '' }) => {
  // Return null - no UI needed since layout is automatic
  return null;
};

// Simple layout button for minimal UI - also disabled
export const LayoutButton: React.FC<{
  direction?: 'DOWN' | 'UP' | 'LEFT' | 'RIGHT';
  className?: string;
}> = ({ direction = 'DOWN', className = '' }) => {
  // Return null - no manual layout buttons needed
  return null;
};

// Helper hook for layout button component - simplified to do nothing
export const useLayoutButton = (direction: 'DOWN' | 'UP' | 'LEFT' | 'RIGHT' = 'DOWN') => {
  return {
    onClick: () => {}, // No-op
    disabled: true,   // Always disabled
    isLayouting: false,
  };
};