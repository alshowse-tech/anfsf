/**
 * UI/UX Module Constants
 * 
 * Common constants for UI intelligent synthesis.
 * Version: 1.4.0
 */

// ============================================================================
// Breakpoint Constants
// ============================================================================

export const BREAKPOINTS = {
  mobile: { minWidth: 0, maxWidth: 639, columns: 4, gutter: 16 },
  tablet: { minWidth: 640, maxWidth: 1023, columns: 8, gutter: 24 },
  desktop: { minWidth: 1024, maxWidth: Infinity, columns: 12, gutter: 32 },
} as const;

// ============================================================================
// Spacing Scale
// ============================================================================

export const SPACING_SCALE = {
  0: '0',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
  32: '8rem',
} as const;

// ============================================================================
// Typography Scale
// ============================================================================

export const FONT_SIZE_SCALE = {
  xs: '0.75rem',
  sm: '0.875rem',
  base: '1rem',
  lg: '1.125rem',
  xl: '1.25rem',
  '2xl': '1.5rem',
  '3xl': '1.875rem',
} as const;

export const FONT_WEIGHT_SCALE = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

export const LINE_HEIGHT_SCALE = {
  tight: 1.25,
  normal: 1.5,
  relaxed: 1.75,
} as const;

// ============================================================================
// Border Radius
// ============================================================================

export const BORDER_RADIUS_SCALE = {
  none: '0',
  sm: '0.125rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  full: '9999px',
} as const;

// ============================================================================
// Shadow Definitions
// ============================================================================

export const SHADOW_DEFINITIONS = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
} as const;

// ============================================================================
// Default Color Palette
// ============================================================================

export const DEFAULT_PRIMARY_COLOR = {
  50: '#eff6ff',
  100: '#dbeafe',
  200: '#bfdbfe',
  300: '#93c5fd',
  400: '#60a5fa',
  500: '#3b82f6',
  600: '#2563eb',
  700: '#1d4ed8',
  800: '#1e40af',
  900: '#1e3a8a',
};

export const DEFAULT_SECONDARY_COLOR = {
  50: '#f8fafc',
  100: '#f1f5f9',
  200: '#e2e8f0',
  300: '#cbd5e1',
  400: '#94a3b8',
  500: '#64748b',
  600: '#475569',
  700: '#334155',
  800: '#1e293b',
  900: '#0f172a',
};

export const DEFAULT_NEUTRAL_COLOR = {
  50: '#fafafa',
  100: '#f4f4f5',
  200: '#e4e4e7',
  300: '#d4d4d8',
  400: '#a1a1aa',
  500: '#71717a',
  600: '#52525b',
  700: '#3f3f46',
  800: '#27272a',
  900: '#18181b',
};

export const DEFAULT_SEMANTIC_COLORS = {
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
};

// ============================================================================
// Animation Defaults
// ============================================================================

export const ANIMATION_DEFAULTS = {
  duration: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
  easing: {
    linear: 'linear',
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
} as const;

// ============================================================================
// Accessibility Standards
// ============================================================================

export const A11Y_STANDARDS = {
  wcag: {
    level: 'AA',
    version: '2.1',
  },
  minContrastRatio: {
    normal: 4.5,
    large: 3,
  },
  minTouchTarget: 44,
} as const;

// ============================================================================
// Framework Templates
// ============================================================================

export const FRAMEWORK_TEMPLATES = {
  react: {
    extension: '.tsx',
    import: 'import',
    export: 'export',
  },
  vue: {
    extension: '.vue',
    import: 'import',
    export: 'export default',
  },
  angular: {
    extension: '.component.ts',
    import: 'import',
    export: 'export',
  },
} as const;

// ============================================================================
// UI Library Mappings
// ============================================================================

export const UI_LIBRARY_COMPONENTS = {
  antd: {
    button: 'Button',
    input: 'Input',
    form: 'Form',
    modal: 'Modal',
    table: 'Table',
    card: 'Card',
    layout: 'Layout',
    menu: 'Menu',
  },
  mui: {
    button: 'Button',
    input: 'TextField',
    form: 'Form',
    modal: 'Modal',
    table: 'Table',
    card: 'Card',
    layout: 'Box',
    menu: 'Menu',
  },
  chakra: {
    button: 'Button',
    input: 'Input',
    form: 'FormControl',
    modal: 'Modal',
    table: 'Table',
    card: 'Card',
    layout: 'Box',
    menu: 'Menu',
  },
  raw: {
    button: 'button',
    input: 'input',
    form: 'form',
    modal: 'dialog',
    table: 'table',
    card: 'div',
    layout: 'div',
    menu: 'nav',
  },
} as const;

// ============================================================================
// Layout Patterns
// ============================================================================

export const LAYOUT_PATTERNS = {
  dashboard: {
    type: 'grid',
    sections: ['header', 'sidebar', 'main', 'footer'],
  },
  landing: {
    type: 'flex',
    sections: ['header', 'hero', 'features', 'footer'],
  },
  form: {
    type: 'flex',
    sections: ['header', 'content', 'footer'],
  },
  list: {
    type: 'grid',
    sections: ['header', 'filter', 'list', 'pagination', 'footer'],
  },
  detail: {
    type: 'flex',
    sections: ['header', 'breadcrumb', 'content', 'sidebar', 'footer'],
  },
} as const;
