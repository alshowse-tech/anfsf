/**
 * ASF V4.0 UI Synthesis Module - Contract Pack Extension
 * 
 * Handles UI component synthesis with asset manifest management.
 * Version: v1.5.0
 * 
 * Features:
 * - Asset manifest generation (styles, fonts, images, icons)
 * - MCP synchronization with PreviewController
 * - Manifest integrity validation
 */

import type { ContractDiff, ContractType } from './types';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Style asset types.
 */
export interface StyleAssets {
  /** Critical CSS (inlined) */
  critical?: string;
  
  /** External style URLs */
  external: string[];
  
  /** Dynamic styles (runtime generated) */
  dynamic: string[];
  
  /** Tailwind utility classes */
  tailwind: string[];
  
  /** Font URLs */
  fonts?: string[];
}

/**
 * Component tree asset references.
 */
export interface ComponentTreeAssets {
  /** Image URLs */
  images: string[];
  
  /** Icon references */
  icons: string[];
}

/**
 * Complete asset manifest for UI synthesis.
 */
export interface AssetManifest {
  /** Style assets */
  styles: {
    critical?: string;
    external: string[];
    dynamic: string[];
    tailwind: string[];
  };
  
  /** Font assets */
  fonts?: string[];
  
  /** Other assets */
  assets: {
    images: string[];
    icons: string[];
  };
}

/**
 * UI Synthesis configuration.
 */
export interface UISynthesisConfig {
  /** Target framework */
  framework?: 'react' | 'vue' | 'angular' | 'svelte';
  
  /** UI library */
  uiLibrary?: 'antd' | 'material-ui' | 'chakra' | 'tailwind';
  
  /** Styling approach */
  styling?: 'css-modules' | 'styled-components' | 'tailwind' | 'inline';
  
  /** Enable critical CSS inlining */
  enableCriticalCSS?: boolean;
  
  /** Enable asset validation */
  enableAssetValidation?: boolean;
}

/**
 * UI Synthesis result.
 */
export interface UISynthesisResult {
  /** Component name */
  componentName: string;
  
  /** Generated code */
  code: string;
  
  /** Component props */
  props: Record<string, any>;
  
  /** Dependencies */
  dependencies: string[];
  
  /** Accessibility score */
  a11yScore: number;
  
  /** Asset manifest */
  assetManifest: AssetManifest;
}

/**
 * MCP Bus interface for synchronization.
 */
export interface MCPBus {
  send(message: MCPMessage): Promise<void>;
}

/**
 * MCP Message structure.
 */
export interface MCPMessage {
  type: 'command' | 'event' | 'proposal' | 'response';
  from?: string;
  to?: string;
  target?: string;
  payload: any;
  traceId?: string;
  idempotencyKey?: string;
  ttl?: number;
}

// ============================================================================
// UI Synthesis Module
// ============================================================================

/**
 * UI Synthesis Module - Manages UI component generation with asset tracking.
 */
export class UISynthesisModule {
  private config: Required<UISynthesisConfig>;
  private mcpBus: MCPBus | null;

  constructor(
    config: UISynthesisConfig = {},
    mcpBus?: MCPBus
  ) {
    this.config = {
      framework: config.framework || 'react',
      uiLibrary: config.uiLibrary || 'tailwind',
      styling: config.styling || 'tailwind',
      enableCriticalCSS: config.enableCriticalCSS ?? true,
      enableAssetValidation: config.enableAssetValidation ?? true,
    } as Required<UISynthesisConfig>;
    this.mcpBus = mcpBus || null;
  }

  /**
   * Synthesize UI component from requirements.
   */
  async synthesize(
    requirement: any,
    componentTree: ComponentTreeAssets
  ): Promise<UISynthesisResult> {
    // Generate component code (simplified for demo)
    const componentName = requirement.componentName || 'GeneratedComponent';
    const code = this.generateComponentCode(requirement);
    const props = this.extractProps(requirement);
    const dependencies = this.extractDependencies(requirement);
    const a11yScore = this.calculateA11yScore(requirement);

    // Build style assets from requirement
    const styles = this.extractStyles(requirement);

    // Create asset manifest
    const assetManifest: AssetManifest = {
      styles: {
        critical: styles.critical,
        external: styles.external,
        dynamic: styles.dynamic,
        tailwind: styles.tailwind,
      },
      fonts: styles.fonts,
      assets: {
        images: componentTree.images,
        icons: componentTree.icons,
      },
    };

    // Validate manifest integrity
    if (this.config.enableAssetValidation) {
      this.validateManifestIntegrity(assetManifest);
    }

    // MCP synchronization
    if (this.mcpBus) {
      await this.mcpBus.send({
        type: "command",
        payload: {
          assetManifest,
          target: "PreviewController"
        },
        traceId: this.generateTraceId(),
        idempotencyKey: `ui-synthesis-${componentName}-${Date.now()}`,
        ttl: 30000, // 30 seconds TTL
      });
    }

    return {
      componentName,
      code,
      props,
      dependencies,
      a11yScore,
      assetManifest,
    };
  }

  /**
   * Validate asset manifest integrity.
   * 
   * Throws error if manifest is empty or invalid.
   */
  private validateManifestIntegrity(manifest: AssetManifest): void {
    // Check if both critical and external styles are missing
    if (!manifest.styles.critical && manifest.styles.external.length === 0) {
      throw new Error('Style asset manifest empty - GenUI output validation failed');
    }

    // Validate style arrays are not undefined
    if (!Array.isArray(manifest.styles.external)) {
      throw new Error('Style asset manifest invalid: external styles must be an array');
    }

    if (!Array.isArray(manifest.styles.dynamic)) {
      throw new Error('Style asset manifest invalid: dynamic styles must be an array');
    }

    if (!Array.isArray(manifest.styles.tailwind)) {
      throw new Error('Style asset manifest invalid: tailwind styles must be an array');
    }

    // Validate assets
    if (!Array.isArray(manifest.assets.images)) {
      throw new Error('Asset manifest invalid: images must be an array');
    }

    if (!Array.isArray(manifest.assets.icons)) {
      throw new Error('Asset manifest invalid: icons must be an array');
    }
  }

  /**
   * Extract styles from requirement.
   */
  private extractStyles(requirement: any): StyleAssets {
    const styles: StyleAssets = {
      critical: undefined,
      external: [],
      dynamic: [],
      tailwind: [],
      fonts: [],
    };

    // Extract critical CSS if provided
    if (requirement.criticalCSS) {
      styles.critical = requirement.criticalCSS;
    }

    // Extract external stylesheets
    if (requirement.externalStyles) {
      styles.external = Array.isArray(requirement.externalStyles)
        ? requirement.externalStyles
        : [requirement.externalStyles];
    }

    // Extract dynamic styles
    if (requirement.dynamicStyles) {
      styles.dynamic = Array.isArray(requirement.dynamicStyles)
        ? requirement.dynamicStyles
        : [requirement.dynamicStyles];
    }

    // Extract Tailwind classes
    if (requirement.tailwindClasses) {
      styles.tailwind = Array.isArray(requirement.tailwindClasses)
        ? requirement.tailwindClasses
        : [requirement.tailwindClasses];
    }

    // Extract fonts
    if (requirement.fonts) {
      styles.fonts = Array.isArray(requirement.fonts)
        ? requirement.fonts
        : [requirement.fonts];
    }

    return styles;
  }

  /**
   * Generate component code (simplified).
   */
  private generateComponentCode(requirement: any): string {
    const componentName = requirement.componentName || 'Component';
    
    switch (this.config.framework) {
      case 'react':
        return this.generateReactComponent(componentName, requirement);
      case 'vue':
        return this.generateVueComponent(componentName, requirement);
      case 'angular':
        return this.generateAngularComponent(componentName, requirement);
      default:
        return `// ${componentName} - ${this.config.framework}`;
    }
  }

  private generateReactComponent(name: string, requirement: any): string {
    return `import React from 'react';

export interface ${name}Props {
  ${Object.entries(requirement.props || {}).map(([key, value]: [string, any]) => 
    `${key}${value.required ? '' : '?'}: ${value.type || 'any'};`
  ).join('\n  ')}
}

export const ${name}: React.FC<${name}Props> = (props) => {
  return (
    <div className="${(requirement.tailwindClasses || []).join(' ')}">
      ${name} Component
    </div>
  );
};

export default ${name};`;
  }

  private generateVueComponent(name: string, requirement: any): string {
    return `<template>
  <div class="${(requirement.tailwindClasses || []).join(' ')}">
    ${name} Component
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: '${name}',
  props: {
    ${Object.entries(requirement.props || {}).map(([key, value]: [string, any]) => 
    `${key}: { type: ${value.type || 'Object'}, required: ${value.required || false} }`
  ).join(',\n    ')}
  }
});
</script>`;
  }

  private generateAngularComponent(name: string, requirement: any): string {
    return `import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-${name.toLowerCase()}',
  template: \`
    <div class="${(requirement.tailwindClasses || []).join(' ')}">
      ${name} Component
    </div>
  \`
})
export class ${name}Component {
  ${Object.entries(requirement.props || {}).map(([key, value]: [string, any]) => 
    `@Input() ${key}${value.required ? '' : '?'}: ${value.type || 'any'};`
  ).join('\n  ')}
}`;
  }

  /**
   * Extract props from requirement.
   */
  private extractProps(requirement: any): Record<string, any> {
    return requirement.props || {};
  }

  /**
   * Extract dependencies from requirement.
   */
  private extractDependencies(requirement: any): string[] {
    const deps = new Set<string>();
    
    // Add framework-specific dependencies
    switch (this.config.framework) {
      case 'react':
        deps.add('react');
        break;
      case 'vue':
        deps.add('vue');
        break;
      case 'angular':
        deps.add('@angular/core');
        break;
    }

    // Add UI library dependencies
    if (this.config.uiLibrary) {
      deps.add(this.config.uiLibrary);
    }

    // Add custom dependencies
    if (requirement.dependencies) {
      if (Array.isArray(requirement.dependencies)) {
        requirement.dependencies.forEach((d: string) => deps.add(d));
      } else {
        deps.add(requirement.dependencies);
      }
    }

    return Array.from(deps);
  }

  /**
   * Calculate accessibility score.
   */
  private calculateA11yScore(requirement: any): number {
    let score = 100;

    // Deduct for missing alt text
    if (requirement.hasImages && !requirement.altText) {
      score -= 20;
    }

    // Deduct for missing labels
    if (requirement.hasInputs && !requirement.labels) {
      score -= 20;
    }

    // Deduct for poor contrast
    if (requirement.lowContrast) {
      score -= 15;
    }

    // Deduct for missing keyboard navigation
    if (requirement.interactive && !requirement.keyboardNav) {
      score -= 25;
    }

    return Math.max(0, score);
  }

  /**
   * Generate trace ID for MCP messages.
   */
  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Set MCP bus for synchronization.
   */
  setMCPBus(mcpBus: MCPBus): void {
    this.mcpBus = mcpBus;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create UI synthesis module with default config.
 */
export function createUISynthesisModule(
  config?: UISynthesisConfig,
  mcpBus?: MCPBus
): UISynthesisModule {
  return new UISynthesisModule(config, mcpBus);
}

/**
 * Create asset manifest from styles and component tree.
 */
export function createAssetManifest(
  styles: StyleAssets,
  componentTree: ComponentTreeAssets
): AssetManifest {
  const manifest: AssetManifest = {
    styles: {
      critical: styles.critical,
      external: styles.external || [],
      dynamic: styles.dynamic || [],
      tailwind: styles.tailwind || [],
    },
    fonts: styles.fonts,
    assets: {
      images: componentTree.images || [],
      icons: componentTree.icons || [],
    },
  };

  // Validate manifest
  if (!manifest.styles.critical && manifest.styles.external.length === 0) {
    throw new Error('Style asset manifest empty - GenUI output validation failed');
  }

  return manifest;
}

// ============================================================================
// Exports
// ============================================================================

export default UISynthesisModule;
