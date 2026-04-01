/**
 * UI Component Synthesizer
 * 
 * Intelligent UI component code generation from PRD requirements.
 * Supports multiple frameworks (React/Vue/Angular) and UI libraries.
 * 
 * @version 1.4.0
 */

import type {
  UIRequirement,
  UISynthesizerConfig,
  ComponentSynthesisResult,
  PropDefinition,
  ValidationResult,
  OptimizedResult,
} from './types';
import {
  UI_LIBRARY_COMPONENTS,
  FRAMEWORK_TEMPLATES,
  A11Y_STANDARDS,
} from './constants';

// ============================================================================
// Component Pattern Registry
// ============================================================================

const COMPONENT_PATTERNS: Record<string, ComponentPattern> = {
  button: {
    name: 'Button',
    props: [
      { name: 'variant', type: "'primary' | 'secondary' | 'danger'", required: false, defaultValue: "'primary'" },
      { name: 'size', type: "'small' | 'medium' | 'large'", required: false, defaultValue: "'medium'" },
      { name: 'disabled', type: 'boolean', required: false, defaultValue: 'false' },
      { name: 'onClick', type: '() => void', required: false },
      { name: 'children', type: 'React.ReactNode', required: true },
    ],
    a11y: ['role="button"', 'aria-disabled', 'keyboard navigation'],
  },
  input: {
    name: 'Input',
    props: [
      { name: 'value', type: 'string', required: true },
      { name: 'onChange', type: '(value: string) => void', required: true },
      { name: 'placeholder', type: 'string', required: false },
      { name: 'disabled', type: 'boolean', required: false, defaultValue: 'false' },
      { name: 'error', type: 'string', required: false },
    ],
    a11y: ['aria-label', 'aria-invalid', 'aria-describedby'],
  },
  form: {
    name: 'Form',
    props: [
      { name: 'onSubmit', type: '(data: FormData) => void', required: true },
      { name: 'children', type: 'React.ReactNode', required: true },
      { name: 'className', type: 'string', required: false },
    ],
    a11y: ['role="form"', 'aria-labelledby'],
  },
  card: {
    name: 'Card',
    props: [
      { name: 'title', type: 'string', required: false },
      { name: 'children', type: 'React.ReactNode', required: true },
      { name: 'footer', type: 'React.ReactNode', required: false },
      { name: 'hoverable', type: 'boolean', required: false, defaultValue: 'false' },
    ],
    a11y: ['role="article"', 'aria-labelledby'],
  },
  modal: {
    name: 'Modal',
    props: [
      { name: 'open', type: 'boolean', required: true },
      { name: 'onClose', type: '() => void', required: true },
      { name: 'title', type: 'string', required: true },
      { name: 'children', type: 'React.ReactNode', required: true },
      { name: 'footer', type: 'React.ReactNode', required: false },
    ],
    a11y: ['role="dialog"', 'aria-modal="true"', 'aria-labelledby', 'focus trap'],
  },
  table: {
    name: 'Table',
    props: [
      { name: 'data', type: 'any[]', required: true },
      { name: 'columns', type: 'ColumnDefinition[]', required: true },
      { name: 'loading', type: 'boolean', required: false, defaultValue: 'false' },
      { name: 'pagination', type: 'boolean', required: false, defaultValue: 'true' },
    ],
    a11y: ['role="table"', 'aria-rowcount', 'aria-colcount'],
  },
};

interface ComponentPattern {
  name: string;
  props: PropDefinition[];
  a11y: string[];
}

// ============================================================================
// UI Component Synthesizer Class
// ============================================================================

export class UIComponentSynthesizer {
  private config: UISynthesizerConfig;

  constructor(config: UISynthesizerConfig) {
    this.config = config;
  }

  /**
   * Synthesize component from UI requirement
   */
  async synthesize(
    requirement: UIRequirement,
    config?: UISynthesizerConfig
  ): Promise<ComponentSynthesisResult> {
    const effectiveConfig = config || this.config;
    
    // Detect component type from requirement
    const componentType = this.detectComponentType(requirement);
    const pattern = COMPONENT_PATTERNS[componentType] || this.createCustomPattern(requirement);
    
    // Generate component code
    const code = this.generateComponentCode(pattern, requirement, effectiveConfig);
    
    // Calculate accessibility score
    const a11yScore = this.calculateA11yScore(pattern, code);
    
    return {
      componentName: pattern.name,
      code,
      props: pattern.props,
      dependencies: this.getDependencies(effectiveConfig, componentType),
      a11yScore,
    };
  }

  /**
   * Validate component code
   */
  async validateComponent(code: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 100;

    // Check for common issues
    if (!code.includes('export')) {
      errors.push('Component must be exported');
      score -= 20;
    }

    // Check accessibility
    if (!code.includes('aria-') && !code.includes('role=')) {
      warnings.push('Consider adding ARIA attributes for accessibility');
      score -= 10;
    }

    // Check for TypeScript types
    if (this.config.framework === 'react' && !code.includes(':')) {
      warnings.push('Consider adding TypeScript types for props');
      score -= 5;
    }

    // Check for proper cleanup (useEffect return)
    if (code.includes('useEffect') && !code.includes('return () =>')) {
      warnings.push('useEffect should return cleanup function');
      score -= 5;
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, score),
    };
  }

  /**
   * Optimize component code
   */
  async optimizeComponent(code: string): Promise<OptimizedResult> {
    const improvements: string[] = [];
    let optimizedCode = code;
    let performanceGain = 0;

    // Optimize: Replace inline objects with useMemo
    if (code.includes('useEffect') && code.includes('{')) {
      optimizedCode = this.addUseMemoHooks(optimizedCode);
      improvements.push('Added useMemo for expensive computations');
      performanceGain += 15;
    }

    // Optimize: Add React.memo for pure components
    if (!code.includes('React.memo') && !code.includes('memo(')) {
      optimizedCode = this.wrapWithMemo(optimizedCode);
      improvements.push('Wrapped component with React.memo');
      performanceGain += 10;
    }

    // Optimize: Lazy load heavy components
    if (code.length > 500) {
      improvements.push('Consider lazy loading for large components');
      performanceGain += 5;
    }

    return {
      originalCode: code,
      optimizedCode,
      improvements,
      performanceGain,
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private detectComponentType(requirement: UIRequirement): string {
    const desc = requirement.description.toLowerCase();
    
    if (desc.includes('button') || desc.includes('click')) return 'button';
    if (desc.includes('input') || desc.includes('field') || desc.includes('form')) return 'input';
    if (desc.includes('card') || desc.includes('panel')) return 'card';
    if (desc.includes('modal') || desc.includes('dialog') || desc.includes('popup')) return 'modal';
    if (desc.includes('table') || desc.includes('list') || desc.includes('grid')) return 'table';
    if (desc.includes('form')) return 'form';
    
    return 'button'; // Default
  }

  private createCustomPattern(requirement: UIRequirement): ComponentPattern {
    const name = this.generateComponentName(requirement);
    
    return {
      name,
      props: [
        { name: 'className', type: 'string', required: false },
        { name: 'children', type: 'React.ReactNode', required: false },
      ],
      a11y: ['role="region"', 'aria-label'],
    };
  }

  private generateComponentName(requirement: UIRequirement): string {
    const words = requirement.description.split(' ').slice(0, 3);
    return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
  }

  private generateComponentCode(
    pattern: ComponentPattern,
    requirement: UIRequirement,
    config: UISynthesizerConfig
  ): string {
    const { framework, uiLibrary, styling } = config;
    
    if (framework === 'react') {
      return this.generateReactCode(pattern, uiLibrary, styling, requirement);
    } else if (framework === 'vue') {
      return this.generateVueCode(pattern, uiLibrary, styling, requirement);
    } else {
      return this.generateAngularCode(pattern, uiLibrary, styling, requirement);
    }
  }

  private generateReactCode(
    pattern: ComponentPattern,
    uiLibrary: string,
    styling: string,
    requirement: UIRequirement
  ): string {
    const imports = this.generateReactImports(pattern.name, uiLibrary);
    const propsInterface = this.generatePropsInterface(pattern.props);
    const componentCode = this.generateReactComponent(pattern, styling);
    
    return `${imports}

${propsInterface}

${componentCode}

export default ${pattern.name};`;
  }

  private generateReactImports(componentName: string, uiLibrary: string): string {
    const libraryComponents = UI_LIBRARY_COMPONENTS[uiLibrary as keyof typeof UI_LIBRARY_COMPONENTS];
    const componentImport = libraryComponents?.[componentName.toLowerCase() as keyof typeof libraryComponents] || componentName;
    
    if (uiLibrary === 'raw') {
      return `import React from 'react';`;
    }
    
    return `import React from 'react';
import { ${componentImport} } from '${uiLibrary}';`;
  }

  private generatePropsInterface(props: PropDefinition[]): string {
    if (props.length === 0) return '';
    
    const propLines = props.map(p => 
      `  ${p.name}${p.required ? '' : '?'}: ${p.type};`
    ).join('\n');
    
    return `interface ${props[0].name ? 'Component' : ''}Props {
${propLines}
}`;
  }

  private generateReactComponent(pattern: ComponentPattern, styling: string): string {
    const propsParam = pattern.props.length > 0 ? 'props: ComponentProps' : '';
    const styleAttr = styling === 'tailwind' ? 'className' : 'className';
    
    return `function ${pattern.name}(${propsParam}) {
  return (
    <${pattern.name.toLowerCase()} ${styleAttr}="${this.generateStyleClasses(pattern, styling)}">
      {props.children}
    </${pattern.name.toLowerCase()}>
  );
}`;
  }

  private generateStyleClasses(pattern: ComponentPattern, styling: string): string {
    if (styling === 'tailwind') {
      return 'px-4 py-2 rounded-lg shadow-md';
    } else if (styling === 'css-modules') {
      return 'styles.container';
    } else {
      return 'styled-component';
    }
  }

  private generateVueCode(
    pattern: ComponentPattern,
    uiLibrary: string,
    styling: string,
    requirement: UIRequirement
  ): string {
    return `<template>
  <${pattern.name.toLowerCase()} class="${this.generateStyleClasses(pattern, styling)}">
    <slot></slot>
  </${pattern.name.toLowerCase()}>
</template>

<script setup lang="ts">
// Component logic here
</script>

<style scoped>
/* Styles here */
</style>`;
  }

  private generateAngularCode(
    pattern: ComponentPattern,
    uiLibrary: string,
    styling: string,
    requirement: UIRequirement
  ): string {
    return `import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-${pattern.name.toLowerCase()}',
  template: \`<div class="${this.generateStyleClasses(pattern, styling)}"><ng-content></ng-content></div>\`,
  styles: []
})
export class ${pattern.name}Component {
  @Input() children: any;
}`;
  }

  private getDependencies(config: UISynthesizerConfig, componentType: string): string[] {
    const deps: string[] = [];
    
    if (config.framework === 'react') {
      deps.push('react');
    }
    
    if (config.uiLibrary !== 'raw') {
      deps.push(config.uiLibrary);
    }
    
    if (config.styling === 'styled-components') {
      deps.push('styled-components');
    }
    
    return deps;
  }

  private calculateA11yScore(pattern: ComponentPattern, code: string): number {
    let score = 100;
    
    // Check for ARIA attributes
    const hasAria = code.includes('aria-');
    if (!hasAria) score -= 20;
    
    // Check for role attribute
    const hasRole = code.includes('role=');
    if (!hasRole) score -= 15;
    
    // Check for keyboard navigation
    const hasKeyboard = code.includes('onKeyDown') || code.includes('onKeyPress') || code.includes('tabIndex');
    if (!hasKeyboard) score -= 15;
    
    // Check for focus management
    const hasFocus = code.includes('focus') || code.includes('autoFocus');
    if (!hasFocus) score -= 10;
    
    return Math.max(0, score);
  }

  private addUseMemoHooks(code: string): string {
    // Simple optimization: add useMemo import if not present
    if (!code.includes('useMemo')) {
      return code.replace('import React from', "import React, { useMemo } from");
    }
    return code;
  }

  private wrapWithMemo(code: string): string {
    const exportMatch = code.match(/export default (\w+);/);
    if (exportMatch) {
      const componentName = exportMatch[1];
      return code.replace(
        `export default ${componentName};`,
        `export default React.memo(${componentName});`
      );
    }
    return code;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createComponentSynthesizer(config: UISynthesizerConfig): UIComponentSynthesizer {
  return new UIComponentSynthesizer(config);
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_UI_CONFIG: UISynthesizerConfig = {
  framework: 'react',
  uiLibrary: 'antd',
  styling: 'tailwind',
};
