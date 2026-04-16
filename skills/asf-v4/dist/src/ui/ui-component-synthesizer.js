"use strict";
/**
 * UI Component Synthesizer
 *
 * Intelligent UI component code generation from PRD requirements.
 * Supports multiple frameworks (React/Vue/Angular) and UI libraries.
 *
 * @version 1.4.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_UI_CONFIG = exports.UIComponentSynthesizer = void 0;
exports.createComponentSynthesizer = createComponentSynthesizer;
const constants_1 = require("./constants");
// ============================================================================
// Component Pattern Registry
// ============================================================================
const COMPONENT_PATTERNS = {
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
// ============================================================================
// UI Component Synthesizer Class
// ============================================================================
class UIComponentSynthesizer {
    constructor(config) {
        this.config = config;
    }
    /**
     * Synthesize component from UI requirement
     */
    async synthesize(requirement, config) {
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
    async validateComponent(code) {
        const errors = [];
        const warnings = [];
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
    async optimizeComponent(code) {
        const improvements = [];
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
    detectComponentType(requirement) {
        const desc = requirement.description.toLowerCase();
        if (desc.includes('button') || desc.includes('click'))
            return 'button';
        if (desc.includes('input') || desc.includes('field') || desc.includes('form'))
            return 'input';
        if (desc.includes('card') || desc.includes('panel'))
            return 'card';
        if (desc.includes('modal') || desc.includes('dialog') || desc.includes('popup'))
            return 'modal';
        if (desc.includes('table') || desc.includes('list') || desc.includes('grid'))
            return 'table';
        if (desc.includes('form'))
            return 'form';
        return 'button'; // Default
    }
    createCustomPattern(requirement) {
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
    generateComponentName(requirement) {
        const words = requirement.description.split(' ').slice(0, 3);
        return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
    }
    generateComponentCode(pattern, requirement, config) {
        const { framework, uiLibrary, styling } = config;
        if (framework === 'react') {
            return this.generateReactCode(pattern, uiLibrary, styling, requirement);
        }
        else if (framework === 'vue') {
            return this.generateVueCode(pattern, uiLibrary, styling, requirement);
        }
        else {
            return this.generateAngularCode(pattern, uiLibrary, styling, requirement);
        }
    }
    generateReactCode(pattern, uiLibrary, styling, requirement) {
        const imports = this.generateReactImports(pattern.name, uiLibrary);
        const propsInterface = this.generatePropsInterface(pattern.props);
        const componentCode = this.generateReactComponent(pattern, styling);
        return `${imports}

${propsInterface}

${componentCode}

export default ${pattern.name};`;
    }
    generateReactImports(componentName, uiLibrary) {
        const libraryComponents = constants_1.UI_LIBRARY_COMPONENTS[uiLibrary];
        const componentImport = libraryComponents?.[componentName.toLowerCase()] || componentName;
        if (uiLibrary === 'raw') {
            return `import React from 'react';`;
        }
        return `import React from 'react';
import { ${componentImport} } from '${uiLibrary}';`;
    }
    generatePropsInterface(props) {
        if (props.length === 0)
            return '';
        const propLines = props.map(p => `  ${p.name}${p.required ? '' : '?'}: ${p.type};`).join('\n');
        return `interface ${props[0].name ? 'Component' : ''}Props {
${propLines}
}`;
    }
    generateReactComponent(pattern, styling) {
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
    generateStyleClasses(pattern, styling) {
        if (styling === 'tailwind') {
            return 'px-4 py-2 rounded-lg shadow-md';
        }
        else if (styling === 'css-modules') {
            return 'styles.container';
        }
        else {
            return 'styled-component';
        }
    }
    generateVueCode(pattern, uiLibrary, styling, requirement) {
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
    generateAngularCode(pattern, uiLibrary, styling, requirement) {
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
    getDependencies(config, componentType) {
        const deps = [];
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
    calculateA11yScore(pattern, code) {
        let score = 100;
        // Check for ARIA attributes
        const hasAria = code.includes('aria-');
        if (!hasAria)
            score -= 20;
        // Check for role attribute
        const hasRole = code.includes('role=');
        if (!hasRole)
            score -= 15;
        // Check for keyboard navigation
        const hasKeyboard = code.includes('onKeyDown') || code.includes('onKeyPress') || code.includes('tabIndex');
        if (!hasKeyboard)
            score -= 15;
        // Check for focus management
        const hasFocus = code.includes('focus') || code.includes('autoFocus');
        if (!hasFocus)
            score -= 10;
        return Math.max(0, score);
    }
    addUseMemoHooks(code) {
        // Simple optimization: add useMemo import if not present
        if (!code.includes('useMemo')) {
            return code.replace('import React from', "import React, { useMemo } from");
        }
        return code;
    }
    wrapWithMemo(code) {
        // Handle named export: export default ComponentName;
        const exportMatch = code.match(/export default (\w+);/);
        if (exportMatch) {
            const componentName = exportMatch[1];
            return code.replace(`export default ${componentName};`, `export default React.memo(${componentName});`);
        }
        // Handle inline function export: export default function ComponentName()
        const inlineMatch = code.match(/export default function (\w+)\(/);
        if (inlineMatch) {
            const componentName = inlineMatch[1];
            return code.replace(`export default function ${componentName}(`, `const ${componentName} = React.memo(function ${componentName}(`).replace(/}\n*export default \w+;?$/, '});\n\nexport default ' + componentName + ';').replace(/}\n*$/, '});');
        }
        return code;
    }
}
exports.UIComponentSynthesizer = UIComponentSynthesizer;
// ============================================================================
// Factory Function
// ============================================================================
function createComponentSynthesizer(config) {
    return new UIComponentSynthesizer(config);
}
// ============================================================================
// Default Configuration
// ============================================================================
exports.DEFAULT_UI_CONFIG = {
    framework: 'react',
    uiLibrary: 'antd',
    styling: 'tailwind',
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWktY29tcG9uZW50LXN5bnRoZXNpemVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vc3JjL3VpL3VpLWNvbXBvbmVudC1zeW50aGVzaXplci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7R0FPRzs7O0FBNmJILGdFQUVDO0FBcmJELDJDQUlxQjtBQUVyQiwrRUFBK0U7QUFDL0UsNkJBQTZCO0FBQzdCLCtFQUErRTtBQUUvRSxNQUFNLGtCQUFrQixHQUFxQztJQUMzRCxNQUFNLEVBQUU7UUFDTixJQUFJLEVBQUUsUUFBUTtRQUNkLEtBQUssRUFBRTtZQUNMLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsb0NBQW9DLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUUsV0FBVyxFQUFFO1lBQzNHLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsOEJBQThCLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUUsVUFBVSxFQUFFO1lBQ2pHLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsWUFBWSxFQUFFLE9BQU8sRUFBRTtZQUM3RSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFO1lBQ3hELEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsaUJBQWlCLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRTtTQUM5RDtRQUNELElBQUksRUFBRSxDQUFDLGVBQWUsRUFBRSxlQUFlLEVBQUUscUJBQXFCLENBQUM7S0FDaEU7SUFDRCxLQUFLLEVBQUU7UUFDTCxJQUFJLEVBQUUsT0FBTztRQUNiLEtBQUssRUFBRTtZQUNMLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFFBQVEs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b25lbnQgU3ludGhlc2l6ZXJcbiAqIFxuICogSW50ZWxsaWdlbnQgVUkgY29tcG9uZW50IGNvZGUgZ2VuZXJhdGlvbiBmcm9tIFBSRCByZXF1aXJlbWVudHMuXG4gKiBTdXBwb3J0cyBtdWx0aXBsZSBmcmFtZXdvcmtzIChSZWFjdC9WdWUvQW5ndWxhcikgYW5kIFVJIGxpYnJhcmllcy5cbiAqIFxuICogQHZlcnNpb24gMS40LjBcbiAqL1xuXG5pbXBvcnQgdHlwZSB7XG4gIFVJUmVxdWlyZW1lbnQsXG4gIFVJU3ludGhlc2l6ZXJDb25maWcsXG4gIENvbXBvbmVudFN5bnRoZXNpc1Jlc3VsdCxcbiAgUHJvcERlZmluaXRpb24sXG4gIFZhbGlkYXRpb25SZXN1bHQsXG4gIE9wdGltaXplZFJlc3VsdCxcbn0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQge1xuICBVSV9MSUJSQVJZX0NPTVBPTkVOVFMsXG4gIEZSQU1FV09SS19URU1QTEFURVMsXG4gIEExMVlfU1RBTkRBUkRTLFxufSBmcm9tICcuL2NvbnN0YW50cyc7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIENvbXBvbmVudCBQYXR0ZXJuIFJlZ2lzdHJ5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmNvbnN0IENPTVBPTkVOVF9QQVRURVJOUzogUmVjb3JkPHN0cmluZywgQ29tcG9uZW50UGF0dGVybj4gPSB7XG4gIGJ1dHRvbjoge1xuICAgIG5hbWU6ICdCdXR0b24nLFxuICAgIHByb3BzOiBbXG4gICAgICB7IG5hbWU6ICd2YXJpYW50JywgdHlwZTogXCIncHJpbWFyeScgfCAnc2Vjb25kYXJ5JyB8ICdkYW5nZXInXCIsIHJlcXVpcmVkOiBmYWxzZSwgZGVmYXVsdFZhbHVlOiBcIidwcmltYXJ5J1wiIH0sXG4gICAgICB7IG5hbWU6ICdzaXplJywgdHlwZTogXCInc21hbGwnIHwgJ21lZGl1bScgfCAnbGFyZ2UnXCIsIHJlcXVpcmVkOiBmYWxzZSwgZGVmYXVsdFZhbHVlOiBcIidtZWRpdW0nXCIgfSxcbiAgICAgIHsgbmFtZTogJ2Rpc2FibGVkJywgdHlwZTogJ2Jvb2xlYW4nLCByZXF1aXJlZDogZmFsc2UsIGRlZmF1bHRWYWx1ZTogJ2ZhbHNlJyB9LFxuICAgICAgeyBuYW1lOiAnb25DbGljaycsIHR5cGU6ICcoKSA9PiB2b2lkJywgcmVxdWlyZWQ6IGZhbHNlIH0sXG4gICAgICB7IG5hbWU6ICdjaGlsZHJlbicsIHR5cGU6ICdSZWFjdC5SZWFjdE5vZGUnLCByZXF1aXJlZDogdHJ1ZSB9LFxuICAgIF0sXG4gICAgYTExeTogWydyb2xlPVwiYnV0dG9uXCInLCAnYXJpYS1kaXNhYmxlZCcsICdrZXlib2FyZCBuYXZpZ2F0aW9uJ10sXG4gIH0sXG4gIGlucHV0OiB7XG4gICAgbmFtZTogJ0lucHV0JyxcbiAgICBwcm9wczogW1xuICAgICAgeyBuYW1lOiAndmFsdWUnLCB0eXBlOiAnc3RyaW5nJywgcmVxdWlyZWQ6IHRydWUgfSxcbiAgICAgIHsgbmFtZTogJ29uQ2hhbmdlJywgdHlwZTogJyh2YWx1ZTogc3RyaW5nKSA9PiB2b2lkJywgcmVxdWlyZWQ6IHRydWUgfSxcbiAgICAgIHsgbmFtZTogJ3BsYWNlaG9sZGVyJywgdHlwZTogJ3N0cmluZycsIHJlcXVpcmVkOiBmYWxzZSB9LFxuICAgICAgeyBuYW1lOiAnZGlzYWJsZWQnLCB0eXBlOiAnYm9vbGVhbicsIHJlcXVpcmVkOiBmYWxzZSwgZGVmYXVsdFZhbHVlOiAnZmFsc2UnIH0sXG4gICAgICB7IG5hbWU6ICdlcnJvcicsIHR5cGU6ICdzdHJpbmcnLCByZXF1aXJlZDogZmFsc2UgfSxcbiAgICBdLFxuICAgIGExMXk6IFsnYXJpYS1sYWJlbCcsICdhcmlhLWludmFsaWQnLCAnYXJpYS1kZXNjcmliZWRieSddLFxuICB9LFxuICBmb3JtOiB7XG4gICAgbmFtZTogJ0Zvcm0nLFxuICAgIHByb3BzOiBbXG4gICAgICB7IG5hbWU6ICdvblN1Ym1pdCcsIHR5cGU6ICcoZGF0YTogRm9ybURhdGEpID0+IHZvaWQnLCByZXF1aXJlZDogdHJ1ZSB9LFxuICAgICAgeyBuYW1lOiAnY2hpbGRyZW4nLCB0eXBlOiAnUmVhY3QuUmVhY3ROb2RlJywgcmVxdWlyZWQ6IHRydWUgfSxcbiAgICAgIHsgbmFtZTogJ2NsYXNzTmFtZScsIHR5cGU6ICdzdHJpbmcnLCByZXF1aXJlZDogZmFsc2UgfSxcbiAgICBdLFxuICAgIGExMXk6IFsncm9sZT1cImZvcm1cIicsICdhcmlhLWxhYmVsbGVkYnknXSxcbiAgfSxcbiAgY2FyZDoge1xuICAgIG5hbWU6ICdDYXJkJyxcbiAgICBwcm9wczogW1xuICAgICAgeyBuYW1lOiAndGl0bGUnLCB0eXBlOiAnc3RyaW5nJywgcmVxdWlyZWQ6IGZhbHNlIH0sXG4gICAgICB7IG5hbWU6ICdjaGlsZHJlbicsIHR5cGU6ICdSZWFjdC5SZWFjdE5vZGUnLCByZXF1aXJlZDogdHJ1ZSB9LFxuICAgICAgeyBuYW1lOiAnZm9vdGVyJywgdHlwZTogJ1JlYWN0LlJlYWN0Tm9kZScsIHJlcXVpcmVkOiBmYWxzZSB9LFxuICAgICAgeyBuYW1lOiAnaG92ZXJhYmxlJywgdHlwZTogJ2Jvb2xlYW4nLCByZXF1aXJlZDogZmFsc2UsIGRlZmF1bHRWYWx1ZTogJ2ZhbHNlJyB9LFxuICAgIF0sXG4gICAgYTExeTogWydyb2xlPVwiYXJ0aWNsZVwiJywgJ2FyaWEtbGFiZWxsZWRieSddLFxuICB9LFxuICBtb2RhbDoge1xuICAgIG5hbWU6ICdNb2RhbCcsXG4gICAgcHJvcHM6IFtcbiAgICAgIHsgbmFtZTogJ29wZW4nLCB0eXBlOiAnYm9vbGVhbicsIHJlcXVpcmVkOiB0cnVlIH0sXG4gICAgICB7IG5hbWU6ICdvbkNsb3NlJywgdHlwZTogJygpID0+IHZvaWQnLCByZXF1aXJlZDogdHJ1ZSB9LFxuICAgICAgeyBuYW1lOiAndGl0bGUnLCB0eXBlOiAnc3RyaW5nJywgcmVxdWlyZWQ6IHRydWUgfSxcbiAgICAgIHsgbmFtZTogJ2NoaWxkcmVuJywgdHlwZTogJ1JlYWN0LlJlYWN0Tm9kZScsIHJlcXVpcmVkOiB0cnVlIH0sXG4gICAgICB7IG5hbWU6ICdmb290ZXInLCB0eXBlOiAnUmVhY3QuUmVhY3ROb2RlJywgcmVxdWlyZWQ6IGZhbHNlIH0sXG4gICAgXSxcbiAgICBhMTF5OiBbJ3JvbGU9XCJkaWFsb2dcIicsICdhcmlhLW1vZGFsPVwidHJ1ZVwiJywgJ2FyaWEtbGFiZWxsZWRieScsICdmb2N1cyB0cmFwJ10sXG4gIH0sXG4gIHRhYmxlOiB7XG4gICAgbmFtZTogJ1RhYmxlJyxcbiAgICBwcm9wczogW1xuICAgICAgeyBuYW1lOiAnZGF0YScsIHR5cGU6ICdhbnlbXScsIHJlcXVpcmVkOiB0cnVlIH0sXG4gICAgICB7IG5hbWU6ICdjb2x1bW5zJywgdHlwZTogJ0NvbHVtbkRlZmluaXRpb25bXScsIHJlcXVpcmVkOiB0cnVlIH0sXG4gICAgICB7IG5hbWU6ICdsb2FkaW5nJywgdHlwZTogJ2Jvb2xlYW4nLCByZXF1aXJlZDogZmFsc2UsIGRlZmF1bHRWYWx1ZTogJ2ZhbHNlJyB9LFxuICAgICAgeyBuYW1lOiAncGFnaW5hdGlvbicsIHR5cGU6ICdib29sZWFuJywgcmVxdWlyZWQ6IGZhbHNlLCBkZWZhdWx0VmFsdWU6ICd0cnVlJyB9LFxuICAgIF0sXG4gICAgYTExeTogWydyb2xlPVwidGFibGVcIicsICdhcmlhLXJvd2NvdW50JywgJ2FyaWEtY29sY291bnQnXSxcbiAgfSxcbn07XG5cbmludGVyZmFjZSBDb21wb25lbnRQYXR0ZXJuIHtcbiAgbmFtZTogc3RyaW5nO1xuICBwcm9wczogUHJvcERlZmluaXRpb25bXTtcbiAgYTExeTogc3RyaW5nW107XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFVJIENvbXBvbmVudCBTeW50aGVzaXplciBDbGFzc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5leHBvcnQgY2xhc3MgVUlDb21wb25lbnRTeW50aGVzaXplciB7XG4gIHByaXZhdGUgY29uZmlnOiBVSVN5bnRoZXNpemVyQ29uZmlnO1xuXG4gIGNvbnN0cnVjdG9yKGNvbmZpZzogVUlTeW50aGVzaXplckNvbmZpZykge1xuICAgIHRoaXMuY29uZmlnID0gY29uZmlnO1xuICB9XG5cbiAgLyoqXG4gICAqIFN5bnRoZXNpemUgY29tcG9uZW50IGZyb20gVUkgcmVxdWlyZW1lbnRcbiAgICovXG4gIGFzeW5jIHN5bnRoZXNpemUoXG4gICAgcmVxdWlyZW1lbnQ6IFVJUmVxdWlyZW1lbnQsXG4gICAgY29uZmlnPzogVUlTeW50aGVzaXplckNvbmZpZ1xuICApOiBQcm9taXNlPENvbXBvbmVudFN5bnRoZXNpc1Jlc3VsdD4ge1xuICAgIGNvbnN0IGVmZmVjdGl2ZUNvbmZpZyA9IGNvbmZpZyB8fCB0aGlzLmNvbmZpZztcbiAgICBcbiAgICAvLyBEZXRlY3QgY29tcG9uZW50IHR5cGUgZnJvbSByZXF1aXJlbWVudFxuICAgIGNvbnN0IGNvbXBvbmVudFR5cGUgPSB0aGlzLmRldGVjdENvbXBvbmVudFR5cGUocmVxdWlyZW1lbnQpO1xuICAgIGNvbnN0IHBhdHRlcm4gPSBDT01QT05FTlRfUEFUVEVSTlNbY29tcG9uZW50VHlwZV0gfHwgdGhpcy5jcmVhdGVDdXN0b21QYXR0ZXJuKHJlcXVpcmVtZW50KTtcbiAgICBcbiAgICAvLyBHZW5lcmF0ZSBjb21wb25lbnQgY29kZVxuICAgIGNvbnN0IGNvZGUgPSB0aGlzLmdlbmVyYXRlQ29tcG9uZW50Q29kZShwYXR0ZXJuLCByZXF1aXJlbWVudCwgZWZmZWN0aXZlQ29uZmlnKTtcbiAgICBcbiAgICAvLyBDYWxjdWxhdGUgYWNjZXNzaWJpbGl0eSBzY29yZVxuICAgIGNvbnN0IGExMXlTY29yZSA9IHRoaXMuY2FsY3VsYXRlQTExeVNjb3JlKHBhdHRlcm4sIGNvZGUpO1xuICAgIFxuICAgIHJldHVybiB7XG4gICAgICBjb21wb25lbnROYW1lOiBwYXR0ZXJuLm5hbWUsXG4gICAgICBjb2RlLFxuICAgICAgcHJvcHM6IHBhdHRlcm4ucHJvcHMsXG4gICAgICBkZXBlbmRlbmNpZXM6IHRoaXMuZ2V0RGVwZW5kZW5jaWVzKGVmZmVjdGl2ZUNvbmZpZywgY29tcG9uZW50VHlwZSksXG4gICAgICBhMTF5U2NvcmUsXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBWYWxpZGF0ZSBjb21wb25lbnQgY29kZVxuICAgKi9cbiAgYXN5bmMgdmFsaWRhdGVDb21wb25lbnQoY29kZTogc3RyaW5nKTogUHJvbWlzZTxWYWxpZGF0aW9uUmVzdWx0PiB7XG4gICAgY29uc3QgZXJyb3JzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGNvbnN0IHdhcm5pbmdzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGxldCBzY29yZSA9IDEwMDtcblxuICAgIC8vIENoZWNrIGZvciBjb21tb24gaXNzdWVzXG4gICAgaWYgKCFjb2RlLmluY2x1ZGVzKCdleHBvcnQnKSkge1xuICAgICAgZXJyb3JzLnB1c2goJ0NvbXBvbmVudCBtdXN0IGJlIGV4cG9ydGVkJyk7XG4gICAgICBzY29yZSAtPSAyMDtcbiAgICB9XG5cbiAgICAvLyBDaGVjayBhY2Nlc3NpYmlsaXR5XG4gICAgaWYgKCFjb2RlLmluY2x1ZGVzKCdhcmlhLScpICYmICFjb2RlLmluY2x1ZGVzKCdyb2xlPScpKSB7XG4gICAgICB3YXJuaW5ncy5wdXNoKCdDb25zaWRlciBhZGRpbmcgQVJJQSBhdHRyaWJ1dGVzIGZvciBhY2Nlc3NpYmlsaXR5Jyk7XG4gICAgICBzY29yZSAtPSAxMDtcbiAgICB9XG5cbiAgICAvLyBDaGVjayBmb3IgVHlwZVNjcmlwdCB0eXBlc1xuICAgIGlmICh0aGlzLmNvbmZpZy5mcmFtZXdvcmsgPT09ICdyZWFjdCcgJiYgIWNvZGUuaW5jbHVkZXMoJzonKSkge1xuICAgICAgd2FybmluZ3MucHVzaCgnQ29uc2lkZXIgYWRkaW5nIFR5cGVTY3JpcHQgdHlwZXMgZm9yIHByb3BzJyk7XG4gICAgICBzY29yZSAtPSA1O1xuICAgIH1cblxuICAgIC8vIENoZWNrIGZvciBwcm9wZXIgY2xlYW51cCAodXNlRWZmZWN0IHJldHVybilcbiAgICBpZiAoY29kZS5pbmNsdWRlcygndXNlRWZmZWN0JykgJiYgIWNvZGUuaW5jbHVkZXMoJ3JldHVybiAoKSA9PicpKSB7XG4gICAgICB3YXJuaW5ncy5wdXNoKCd1c2VFZmZlY3Qgc2hvdWxkIHJldHVybiBjbGVhbnVwIGZ1bmN0aW9uJyk7XG4gICAgICBzY29yZSAtPSA1O1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICB2YWxpZDogZXJyb3JzLmxlbmd0aCA9PT0gMCxcbiAgICAgIGVycm9ycyxcbiAgICAgIHdhcm5pbmdzLFxuICAgICAgc2NvcmU6IE1hdGgubWF4KDAsIHNjb3JlKSxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIE9wdGltaXplIGNvbXBvbmVudCBjb2RlXG4gICAqL1xuICBhc3luYyBvcHRpbWl6ZUNvbXBvbmVudChjb2RlOiBzdHJpbmcpOiBQcm9taXNlPE9wdGltaXplZFJlc3VsdD4ge1xuICAgIGNvbnN0IGltcHJvdmVtZW50czogc3RyaW5nW10gPSBbXTtcbiAgICBsZXQgb3B0aW1pemVkQ29kZSA9IGNvZGU7XG4gICAgbGV0IHBlcmZvcm1hbmNlR2FpbiA9IDA7XG5cbiAgICAvLyBPcHRpbWl6ZTogUmVwbGFjZSBpbmxpbmUgb2JqZWN0cyB3aXRoIHVzZU1lbW9cbiAgICBpZiAoY29kZS5pbmNsdWRlcygndXNlRWZmZWN0JykgJiYgY29kZS5pbmNsdWRlcygneycpKSB7XG4gICAgICBvcHRpbWl6ZWRDb2RlID0gdGhpcy5hZGRVc2VNZW1vSG9va3Mob3B0aW1pemVkQ29kZSk7XG4gICAgICBpbXByb3ZlbWVudHMucHVzaCgnQWRkZWQgdXNlTWVtbyBmb3IgZXhwZW5zaXZlIGNvbXB1dGF0aW9ucycpO1xuICAgICAgcGVyZm9ybWFuY2VHYWluICs9IDE1O1xuICAgIH1cblxuICAgIC8vIE9wdGltaXplOiBBZGQgUmVhY3QubWVtbyBmb3IgcHVyZSBjb21wb25lbnRzXG4gICAgaWYgKCFjb2RlLmluY2x1ZGVzKCdSZWFjdC5tZW1vJykgJiYgIWNvZGUuaW5jbHVkZXMoJ21lbW8oJykpIHtcbiAgICAgIG9wdGltaXplZENvZGUgPSB0aGlzLndyYXBXaXRoTWVtbyhvcHRpbWl6ZWRDb2RlKTtcbiAgICAgIGltcHJvdmVtZW50cy5wdXNoKCdXcmFwcGVkIGNvbXBvbmVudCB3aXRoIFJlYWN0Lm1lbW8nKTtcbiAgICAgIHBlcmZvcm1hbmNlR2FpbiArPSAxMDtcbiAgICB9XG5cbiAgICAvLyBPcHRpbWl6ZTogTGF6eSBsb2FkIGhlYXZ5IGNvbXBvbmVudHNcbiAgICBpZiAoY29kZS5sZW5ndGggPiA1MDApIHtcbiAgICAgIGltcHJvdmVtZW50cy5wdXNoKCdDb25zaWRlciBsYXp5IGxvYWRpbmcgZm9yIGxhcmdlIGNvbXBvbmVudHMnKTtcbiAgICAgIHBlcmZvcm1hbmNlR2FpbiArPSA1O1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBvcmlnaW5hbENvZGU6IGNvZGUsXG4gICAgICBvcHRpbWl6ZWRDb2RlLFxuICAgICAgaW1wcm92ZW1lbnRzLFxuICAgICAgcGVyZm9ybWFuY2VHYWluLFxuICAgIH07XG4gIH1cblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIFByaXZhdGUgTWV0aG9kc1xuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgcHJpdmF0ZSBkZXRlY3RDb21wb25lbnRUeXBlKHJlcXVpcmVtZW50OiBVSVJlcXVpcmVtZW50KTogc3RyaW5nIHtcbiAgICBjb25zdCBkZXNjID0gcmVxdWlyZW1lbnQuZGVzY3JpcHRpb24udG9Mb3dlckNhc2UoKTtcbiAgICBcbiAgICBpZiAoZGVzYy5pbmNsdWRlcygnYnV0dG9uJykgfHwgZGVzYy5pbmNsdWRlcygnY2xpY2snKSkgcmV0dXJuICdidXR0b24nO1xuICAgIGlmIChkZXNjLmluY2x1ZGVzKCdpbnB1dCcpIHx8IGRlc2MuaW5jbHVkZXMoJ2ZpZWxkJykgfHwgZGVzYy5pbmNsdWRlcygnZm9ybScpKSByZXR1cm4gJ2lucHV0JztcbiAgICBpZiAoZGVzYy5pbmNsdWRlcygnY2FyZCcpIHx8IGRlc2MuaW5jbHVkZXMoJ3BhbmVsJykpIHJldHVybiAnY2FyZCc7XG4gICAgaWYgKGRlc2MuaW5jbHVkZXMoJ21vZGFsJykgfHwgZGVzYy5pbmNsdWRlcygnZGlhbG9nJykgfHwgZGVzYy5pbmNsdWRlcygncG9wdXAnKSkgcmV0dXJuICdtb2RhbCc7XG4gICAgaWYgKGRlc2MuaW5jbHVkZXMoJ3RhYmxlJykgfHwgZGVzYy5pbmNsdWRlcygnbGlzdCcpIHx8IGRlc2MuaW5jbHVkZXMoJ2dyaWQnKSkgcmV0dXJuICd0YWJsZSc7XG4gICAgaWYgKGRlc2MuaW5jbHVkZXMoJ2Zvcm0nKSkgcmV0dXJuICdmb3JtJztcbiAgICBcbiAgICByZXR1cm4gJ2J1dHRvbic7IC8vIERlZmF1bHRcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlQ3VzdG9tUGF0dGVybihyZXF1aXJlbWVudDogVUlSZXF1aXJlbWVudCk6IENvbXBvbmVudFBhdHRlcm4ge1xuICAgIGNvbnN0IG5hbWUgPSB0aGlzLmdlbmVyYXRlQ29tcG9uZW50TmFtZShyZXF1aXJlbWVudCk7XG4gICAgXG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWUsXG4gICAgICBwcm9wczogW1xuICAgICAgICB7IG5hbWU6ICdjbGFzc05hbWUnLCB0eXBlOiAnc3RyaW5nJywgcmVxdWlyZWQ6IGZhbHNlIH0sXG4gICAgICAgIHsgbmFtZTogJ2NoaWxkcmVuJywgdHlwZTogJ1JlYWN0LlJlYWN0Tm9kZScsIHJlcXVpcmVkOiBmYWxzZSB9LFxuICAgICAgXSxcbiAgICAgIGExMXk6IFsncm9sZT1cInJlZ2lvblwiJywgJ2FyaWEtbGFiZWwnXSxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBnZW5lcmF0ZUNvbXBvbmVudE5hbWUocmVxdWlyZW1lbnQ6IFVJUmVxdWlyZW1lbnQpOiBzdHJpbmcge1xuICAgIGNvbnN0IHdvcmRzID0gcmVxdWlyZW1lbnQuZGVzY3JpcHRpb24uc3BsaXQoJyAnKS5zbGljZSgwLCAzKTtcbiAgICByZXR1cm4gd29yZHMubWFwKHcgPT4gdy5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHcuc2xpY2UoMSkpLmpvaW4oJycpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZW5lcmF0ZUNvbXBvbmVudENvZGUoXG4gICAgcGF0dGVybjogQ29tcG9uZW50UGF0dGVybixcbiAgICByZXF1aXJlbWVudDogVUlSZXF1aXJlbWVudCxcbiAgICBjb25maWc6IFVJU3ludGhlc2l6ZXJDb25maWdcbiAgKTogc3RyaW5nIHtcbiAgICBjb25zdCB7IGZyYW1ld29yaywgdWlMaWJyYXJ5LCBzdHlsaW5nIH0gPSBjb25maWc7XG4gICAgXG4gICAgaWYgKGZyYW1ld29yayA9PT0gJ3JlYWN0Jykge1xuICAgICAgcmV0dXJuIHRoaXMuZ2VuZXJhdGVSZWFjdENvZGUocGF0dGVybiwgdWlMaWJyYXJ5LCBzdHlsaW5nLCByZXF1aXJlbWVudCk7XG4gICAgfSBlbHNlIGlmIChmcmFtZXdvcmsgPT09ICd2dWUnKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZW5lcmF0ZVZ1ZUNvZGUocGF0dGVybiwgdWlMaWJyYXJ5LCBzdHlsaW5nLCByZXF1aXJlbWVudCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLmdlbmVyYXRlQW5ndWxhckNvZGUocGF0dGVybiwgdWlMaWJyYXJ5LCBzdHlsaW5nLCByZXF1aXJlbWVudCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZW5lcmF0ZVJlYWN0Q29kZShcbiAgICBwYXR0ZXJuOiBDb21wb25lbnRQYXR0ZXJuLFxuICAgIHVpTGlicmFyeTogc3RyaW5nLFxuICAgIHN0eWxpbmc6IHN0cmluZyxcbiAgICByZXF1aXJlbWVudDogVUlSZXF1aXJlbWVudFxuICApOiBzdHJpbmcge1xuICAgIGNvbnN0IGltcG9ydHMgPSB0aGlzLmdlbmVyYXRlUmVhY3RJbXBvcnRzKHBhdHRlcm4ubmFtZSwgdWlMaWJyYXJ5KTtcbiAgICBjb25zdCBwcm9wc0ludGVyZmFjZSA9IHRoaXMuZ2VuZXJhdGVQcm9wc0ludGVyZmFjZShwYXR0ZXJuLnByb3BzKTtcbiAgICBjb25zdCBjb21wb25lbnRDb2RlID0gdGhpcy5nZW5lcmF0ZVJlYWN0Q29tcG9uZW50KHBhdHRlcm4sIHN0eWxpbmcpO1xuICAgIFxuICAgIHJldHVybiBgJHtpbXBvcnRzfVxuXG4ke3Byb3BzSW50ZXJmYWNlfVxuXG4ke2NvbXBvbmVudENvZGV9XG5cbmV4cG9ydCBkZWZhdWx0ICR7cGF0dGVybi5uYW1lfTtgO1xuICB9XG5cbiAgcHJpdmF0ZSBnZW5lcmF0ZVJlYWN0SW1wb3J0cyhjb21wb25lbnROYW1lOiBzdHJpbmcsIHVpTGlicmFyeTogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBjb25zdCBsaWJyYXJ5Q29tcG9uZW50cyA9IFVJX0xJQlJBUllfQ09NUE9ORU5UU1t1aUxpYnJhcnkgYXMga2V5b2YgdHlwZW9mIFVJX0xJQlJBUllfQ09NUE9ORU5UU107XG4gICAgY29uc3QgY29tcG9uZW50SW1wb3J0ID0gbGlicmFyeUNvbXBvbmVudHM/Lltjb21wb25lbnROYW1lLnRvTG93ZXJDYXNlKCkgYXMga2V5b2YgdHlwZW9mIGxpYnJhcnlDb21wb25lbnRzXSB8fCBjb21wb25lbnROYW1lO1xuICAgIFxuICAgIGlmICh1aUxpYnJhcnkgPT09ICdyYXcnKSB7XG4gICAgICByZXR1cm4gYGltcG9ydCBSZWFjdCBmcm9tICdyZWFjdCc7YDtcbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIGBpbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnO1xuaW1wb3J0IHsgJHtjb21wb25lbnRJbXBvcnR9IH0gZnJvbSAnJHt1aUxpYnJhcnl9JztgO1xuICB9XG5cbiAgcHJpdmF0ZSBnZW5lcmF0ZVByb3BzSW50ZXJmYWNlKHByb3BzOiBQcm9wRGVmaW5pdGlvbltdKTogc3RyaW5nIHtcbiAgICBpZiAocHJvcHMubGVuZ3RoID09PSAwKSByZXR1cm4gJyc7XG4gICAgXG4gICAgY29uc3QgcHJvcExpbmVzID0gcHJvcHMubWFwKHAgPT4gXG4gICAgICBgICAke3AubmFtZX0ke3AucmVxdWlyZWQgPyAnJyA6ICc/J306ICR7cC50eXBlfTtgXG4gICAgKS5qb2luKCdcXG4nKTtcbiAgICBcbiAgICByZXR1cm4gYGludGVyZmFjZSAke3Byb3BzWzBdLm5hbWUgPyAnQ29tcG9uZW50JyA6ICcnfVByb3BzIHtcbiR7cHJvcExpbmVzfVxufWA7XG4gIH1cblxuICBwcml2YXRlIGdlbmVyYXRlUmVhY3RDb21wb25lbnQocGF0dGVybjogQ29tcG9uZW50UGF0dGVybiwgc3R5bGluZzogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBjb25zdCBwcm9wc1BhcmFtID0gcGF0dGVybi5wcm9wcy5sZW5ndGggPiAwID8gJ3Byb3BzOiBDb21wb25lbnRQcm9wcycgOiAnJztcbiAgICBjb25zdCBzdHlsZUF0dHIgPSBzdHlsaW5nID09PSAndGFpbHdpbmQnID8gJ2NsYXNzTmFtZScgOiAnY2xhc3NOYW1lJztcbiAgICBcbiAgICByZXR1cm4gYGZ1bmN0aW9uICR7cGF0dGVybi5uYW1lfSgke3Byb3BzUGFyYW19KSB7XG4gIHJldHVybiAoXG4gICAgPCR7cGF0dGVybi5uYW1lLnRvTG93ZXJDYXNlKCl9ICR7c3R5bGVBdHRyfT1cIiR7dGhpcy5nZW5lcmF0ZVN0eWxlQ2xhc3NlcyhwYXR0ZXJuLCBzdHlsaW5nKX1cIj5cbiAgICAgIHtwcm9wcy5jaGlsZHJlbn1cbiAgICA8LyR7cGF0dGVybi5uYW1lLnRvTG93ZXJDYXNlKCl9PlxuICApO1xufWA7XG4gIH1cblxuICBwcml2YXRlIGdlbmVyYXRlU3R5bGVDbGFzc2VzKHBhdHRlcm46IENvbXBvbmVudFBhdHRlcm4sIHN0eWxpbmc6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgaWYgKHN0eWxpbmcgPT09ICd0YWlsd2luZCcpIHtcbiAgICAgIHJldHVybiAncHgtNCBweS0yIHJvdW5kZWQtbGcgc2hhZG93LW1kJztcbiAgICB9IGVsc2UgaWYgKHN0eWxpbmcgPT09ICdjc3MtbW9kdWxlcycpIHtcbiAgICAgIHJldHVybiAnc3R5bGVzLmNvbnRhaW5lcic7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiAnc3R5bGVkLWNvbXBvbmVudCc7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZW5lcmF0ZVZ1ZUNvZGUoXG4gICAgcGF0dGVybjogQ29tcG9uZW50UGF0dGVybixcbiAgICB1aUxpYnJhcnk6IHN0cmluZyxcbiAgICBzdHlsaW5nOiBzdHJpbmcsXG4gICAgcmVxdWlyZW1lbnQ6IFVJUmVxdWlyZW1lbnRcbiAgKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYDx0ZW1wbGF0ZT5cbiAgPCR7cGF0dGVybi5uYW1lLnRvTG93ZXJDYXNlKCl9IGNsYXNzPVwiJHt0aGlzLmdlbmVyYXRlU3R5bGVDbGFzc2VzKHBhdHRlcm4sIHN0eWxpbmcpfVwiPlxuICAgIDxzbG90Pjwvc2xvdD5cbiAgPC8ke3BhdHRlcm4ubmFtZS50b0xvd2VyQ2FzZSgpfT5cbjwvdGVtcGxhdGU+XG5cbjxzY3JpcHQgc2V0dXAgbGFuZz1cInRzXCI+XG4vLyBDb21wb25lbnQgbG9naWMgaGVyZVxuPC9zY3JpcHQ+XG5cbjxzdHlsZSBzY29wZWQ+XG4vKiBTdHlsZXMgaGVyZSAqL1xuPC9zdHlsZT5gO1xuICB9XG5cbiAgcHJpdmF0ZSBnZW5lcmF0ZUFuZ3VsYXJDb2RlKFxuICAgIHBhdHRlcm46IENvbXBvbmVudFBhdHRlcm4sXG4gICAgdWlMaWJyYXJ5OiBzdHJpbmcsXG4gICAgc3R5bGluZzogc3RyaW5nLFxuICAgIHJlcXVpcmVtZW50OiBVSVJlcXVpcmVtZW50XG4gICk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBpbXBvcnQgeyBDb21wb25lbnQsIElucHV0IH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5cbkBDb21wb25lbnQoe1xuICBzZWxlY3RvcjogJ2FwcC0ke3BhdHRlcm4ubmFtZS50b0xvd2VyQ2FzZSgpfScsXG4gIHRlbXBsYXRlOiBcXGA8ZGl2IGNsYXNzPVwiJHt0aGlzLmdlbmVyYXRlU3R5bGVDbGFzc2VzKHBhdHRlcm4sIHN0eWxpbmcpfVwiPjxuZy1jb250ZW50PjwvbmctY29udGVudD48L2Rpdj5cXGAsXG4gIHN0eWxlczogW11cbn0pXG5leHBvcnQgY2xhc3MgJHtwYXR0ZXJuLm5hbWV9Q29tcG9uZW50IHtcbiAgQElucHV0KCkgY2hpbGRyZW46IGFueTtcbn1gO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXREZXBlbmRlbmNpZXMoY29uZmlnOiBVSVN5bnRoZXNpemVyQ29uZmlnLCBjb21wb25lbnRUeXBlOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gICAgY29uc3QgZGVwczogc3RyaW5nW10gPSBbXTtcbiAgICBcbiAgICBpZiAoY29uZmlnLmZyYW1ld29yayA9PT0gJ3JlYWN0Jykge1xuICAgICAgZGVwcy5wdXNoKCdyZWFjdCcpO1xuICAgIH1cbiAgICBcbiAgICBpZiAoY29uZmlnLnVpTGlicmFyeSAhPT0gJ3JhdycpIHtcbiAgICAgIGRlcHMucHVzaChjb25maWcudWlMaWJyYXJ5KTtcbiAgICB9XG4gICAgXG4gICAgaWYgKGNvbmZpZy5zdHlsaW5nID09PSAnc3R5bGVkLWNvbXBvbmVudHMnKSB7XG4gICAgICBkZXBzLnB1c2goJ3N0eWxlZC1jb21wb25lbnRzJyk7XG4gICAgfVxuICAgIFxuICAgIHJldHVybiBkZXBzO1xuICB9XG5cbiAgcHJpdmF0ZSBjYWxjdWxhdGVBMTF5U2NvcmUocGF0dGVybjogQ29tcG9uZW50UGF0dGVybiwgY29kZTogc3RyaW5nKTogbnVtYmVyIHtcbiAgICBsZXQgc2NvcmUgPSAxMDA7XG4gICAgXG4gICAgLy8gQ2hlY2sgZm9yIEFSSUEgYXR0cmlidXRlc1xuICAgIGNvbnN0IGhhc0FyaWEgPSBjb2RlLmluY2x1ZGVzKCdhcmlhLScpO1xuICAgIGlmICghaGFzQXJpYSkgc2NvcmUgLT0gMjA7XG4gICAgXG4gICAgLy8gQ2hlY2sgZm9yIHJvbGUgYXR0cmlidXRlXG4gICAgY29uc3QgaGFzUm9sZSA9IGNvZGUuaW5jbHVkZXMoJ3JvbGU9Jyk7XG4gICAgaWYgKCFoYXNSb2xlKSBzY29yZSAtPSAxNTtcbiAgICBcbiAgICAvLyBDaGVjayBmb3Iga2V5Ym9hcmQgbmF2aWdhdGlvblxuICAgIGNvbnN0IGhhc0tleWJvYXJkID0gY29kZS5pbmNsdWRlcygnb25LZXlEb3duJykgfHwgY29kZS5pbmNsdWRlcygnb25LZXlQcmVzcycpIHx8IGNvZGUuaW5jbHVkZXMoJ3RhYkluZGV4Jyk7XG4gICAgaWYgKCFoYXNLZXlib2FyZCkgc2NvcmUgLT0gMTU7XG4gICAgXG4gICAgLy8gQ2hlY2sgZm9yIGZvY3VzIG1hbmFnZW1lbnRcbiAgICBjb25zdCBoYXNGb2N1cyA9IGNvZGUuaW5jbHVkZXMoJ2ZvY3VzJykgfHwgY29kZS5pbmNsdWRlcygnYXV0b0ZvY3VzJyk7XG4gICAgaWYgKCFoYXNGb2N1cykgc2NvcmUgLT0gMTA7XG4gICAgXG4gICAgcmV0dXJuIE1hdGgubWF4KDAsIHNjb3JlKTtcbiAgfVxuXG4gIHByaXZhdGUgYWRkVXNlTWVtb0hvb2tzKGNvZGU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgLy8gU2ltcGxlIG9wdGltaXphdGlvbjogYWRkIHVzZU1lbW8gaW1wb3J0IGlmIG5vdCBwcmVzZW50XG4gICAgaWYgKCFjb2RlLmluY2x1ZGVzKCd1c2VNZW1vJykpIHtcbiAgICAgIHJldHVybiBjb2RlLnJlcGxhY2UoJ2ltcG9ydCBSZWFjdCBmcm9tJywgXCJpbXBvcnQgUmVhY3QsIHsgdXNlTWVtbyB9IGZyb21cIik7XG4gICAgfVxuICAgIHJldHVybiBjb2RlO1xuICB9XG5cbiAgcHJpdmF0ZSB3cmFwV2l0aE1lbW8oY29kZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAvLyBIYW5kbGUgbmFtZWQgZXhwb3J0OiBleHBvcnQgZGVmYXVsdCBDb21wb25lbnROYW1lO1xuICAgIGNvbnN0IGV4cG9ydE1hdGNoID0gY29kZS5tYXRjaCgvZXhwb3J0IGRlZmF1bHQgKFxcdyspOy8pO1xuICAgIGlmIChleHBvcnRNYXRjaCkge1xuICAgICAgY29uc3QgY29tcG9uZW50TmFtZSA9IGV4cG9ydE1hdGNoWzFdO1xuICAgICAgcmV0dXJuIGNvZGUucmVwbGFjZShcbiAgICAgICAgYGV4cG9ydCBkZWZhdWx0ICR7Y29tcG9uZW50TmFtZX07YCxcbiAgICAgICAgYGV4cG9ydCBkZWZhdWx0IFJlYWN0Lm1lbW8oJHtjb21wb25lbnROYW1lfSk7YFxuICAgICAgKTtcbiAgICB9XG4gICAgXG4gICAgLy8gSGFuZGxlIGlubGluZSBmdW5jdGlvbiBleHBvcnQ6IGV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIENvbXBvbmVudE5hbWUoKVxuICAgIGNvbnN0IGlubGluZU1hdGNoID0gY29kZS5tYXRjaCgvZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKFxcdyspXFwoLyk7XG4gICAgaWYgKGlubGluZU1hdGNoKSB7XG4gICAgICBjb25zdCBjb21wb25lbnROYW1lID0gaW5saW5lTWF0Y2hbMV07XG4gICAgICByZXR1cm4gY29kZS5yZXBsYWNlKFxuICAgICAgICBgZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gJHtjb21wb25lbnROYW1lfShgLFxuICAgICAgICBgY29uc3QgJHtjb21wb25lbnROYW1lfSA9IFJlYWN0Lm1lbW8oZnVuY3Rpb24gJHtjb21wb25lbnROYW1lfShgXG4gICAgICApLnJlcGxhY2UoXG4gICAgICAgIC99XFxuKmV4cG9ydCBkZWZhdWx0IFxcdys7PyQvLFxuICAgICAgICAnfSk7XFxuXFxuZXhwb3J0IGRlZmF1bHQgJyArIGNvbXBvbmVudE5hbWUgKyAnOydcbiAgICAgICkucmVwbGFjZShcbiAgICAgICAgL31cXG4qJC8sXG4gICAgICAgICd9KTsnXG4gICAgICApO1xuICAgIH1cbiAgICBcbiAgICByZXR1cm4gY29kZTtcbiAgfVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBGYWN0b3J5IEZ1bmN0aW9uXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVDb21wb25lbnRTeW50aGVzaXplcihjb25maWc6IFVJU3ludGhlc2l6ZXJDb25maWcpOiBVSUNvbXBvbmVudFN5bnRoZXNpemVyIHtcbiAgcmV0dXJuIG5ldyBVSUNvbXBvbmVudFN5bnRoZXNpemVyKGNvbmZpZyk7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIERlZmF1bHQgQ29uZmlndXJhdGlvblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5leHBvcnQgY29uc3QgREVGQVVMVF9VSV9DT05GSUc6IFVJU3ludGhlc2l6ZXJDb25maWcgPSB7XG4gIGZyYW1ld29yazogJ3JlYWN0JyxcbiAgdWlMaWJyYXJ5OiAnYW50ZCcsXG4gIHN0eWxpbmc6ICd0YWlsd2luZCcsXG59O1xuIl19