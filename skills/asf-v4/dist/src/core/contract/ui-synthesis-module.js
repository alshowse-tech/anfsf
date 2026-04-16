"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UISynthesisModule = void 0;
exports.createUISynthesisModule = createUISynthesisModule;
exports.createAssetManifest = createAssetManifest;
// ============================================================================
// UI Synthesis Module
// ============================================================================
/**
 * UI Synthesis Module - Manages UI component generation with asset tracking.
 */
class UISynthesisModule {
    constructor(config = {}, mcpBus) {
        this.config = {
            framework: config.framework || 'react',
            uiLibrary: config.uiLibrary || 'tailwind',
            styling: config.styling || 'tailwind',
            enableCriticalCSS: config.enableCriticalCSS ?? true,
            enableAssetValidation: config.enableAssetValidation ?? true,
        };
        this.mcpBus = mcpBus || null;
    }
    /**
     * Synthesize UI component from requirements.
     */
    async synthesize(requirement, componentTree) {
        // Generate component code (simplified for demo)
        const componentName = requirement.componentName || 'GeneratedComponent';
        const code = this.generateComponentCode(requirement);
        const props = this.extractProps(requirement);
        const dependencies = this.extractDependencies(requirement);
        const a11yScore = this.calculateA11yScore(requirement);
        // Build style assets from requirement
        const styles = this.extractStyles(requirement);
        // Create asset manifest
        const assetManifest = {
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
    validateManifestIntegrity(manifest) {
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
    extractStyles(requirement) {
        const styles = {
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
    generateComponentCode(requirement) {
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
    generateReactComponent(name, requirement) {
        return `import React from 'react';

export interface ${name}Props {
  ${Object.entries(requirement.props || {}).map(([key, value]) => `${key}${value.required ? '' : '?'}: ${value.type || 'any'};`).join('\n  ')}
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
    generateVueComponent(name, requirement) {
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
    ${Object.entries(requirement.props || {}).map(([key, value]) => `${key}: { type: ${value.type || 'Object'}, required: ${value.required || false} }`).join(',\n    ')}
  }
});
</script>`;
    }
    generateAngularComponent(name, requirement) {
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
  ${Object.entries(requirement.props || {}).map(([key, value]) => `@Input() ${key}${value.required ? '' : '?'}: ${value.type || 'any'};`).join('\n  ')}
}`;
    }
    /**
     * Extract props from requirement.
     */
    extractProps(requirement) {
        return requirement.props || {};
    }
    /**
     * Extract dependencies from requirement.
     */
    extractDependencies(requirement) {
        const deps = new Set();
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
            Array.isArray(requirement.dependencies)
                ? requirement.dependencies.forEach((d) => deps.add(d))
                : deps.add(requirement.dependencies);
        }
        return Array.from(deps);
    }
    /**
     * Calculate accessibility score.
     */
    calculateA11yScore(requirement) {
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
    generateTraceId() {
        return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Set MCP bus for synchronization.
     */
    setMCPBus(mcpBus) {
        this.mcpBus = mcpBus;
    }
}
exports.UISynthesisModule = UISynthesisModule;
// ============================================================================
// Factory Functions
// ============================================================================
/**
 * Create UI synthesis module with default config.
 */
function createUISynthesisModule(config, mcpBus) {
    return new UISynthesisModule(config, mcpBus);
}
/**
 * Create asset manifest from styles and component tree.
 */
function createAssetManifest(styles, componentTree) {
    const manifest = {
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
exports.default = UISynthesisModule;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWktc3ludGhlc2lzLW1vZHVsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy9jb3JlL2NvbnRyYWN0L3VpLXN5bnRoZXNpcy1tb2R1bGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7Ozs7O0dBVUc7OztBQThjSCwwREFLQztBQUtELGtEQXdCQztBQW5YRCwrRUFBK0U7QUFDL0Usc0JBQXNCO0FBQ3RCLCtFQUErRTtBQUUvRTs7R0FFRztBQUNILE1BQWEsaUJBQWlCO0lBSTVCLFlBQ0UsU0FBNEIsRUFBRSxFQUM5QixNQUFlO1FBRWYsSUFBSSxDQUFDLE1BQU0sR0FBRztZQUNaLFNBQVMsRUFBRSxNQUFNLENBQUMsU0FBUyxJQUFJLE9BQU87WUFDdEMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxTQUFTLElBQUksVUFBVTtZQUN6QyxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sSUFBSSxVQUFVO1lBQ3JDLGlCQUFpQixFQUFFLE1BQU0sQ0FBQyxpQkFBaUIsSUFBSSxJQUFJO1lBQ25ELHFCQUFxQixFQUFFLE1BQU0sQ0FBQyxxQkFBcUIsSUFBSSxJQUFJO1NBQzdCLENBQUM7UUFDakMsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLElBQUksSUFBSSxDQUFDO0lBQy9CLENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxVQUFVLENBQ2QsV0FBZ0IsRUFDaEIsYUFBa0M7UUFFbEMsZ0RBQWdEO1FBQ2hELE1BQU0sYUFBYSxHQUFHLFdBQVcsQ0FBQyxhQUFhLElBQUksb0JBQW9CLENBQUM7UUFDeEUsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ3JELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDN0MsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFdBQVcsQ0FBQyxDQUFD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KiBBU0YgVjQuMCBVSSBTeW50aGVzaXMgTW9kdWxlIC0gQ29udHJhY3QgUGFjayBFeHRlbnNpb25cbiAqIFxuICogSGFuZGxlcyBVSSBjb21wb25lbnQgc3ludGhlc2lzIHdpdGggYXNzZXQgbWFuaWZlc3QgbWFuYWdlbWVudC5cbiAqIFZlcnNpb246IHYxLjUuMFxuICogXG4gKiBGZWF0dXJlczpcbiAqIC0gQXNzZXQgbWFuaWZlc3QgZ2VuZXJhdGlvbiAoc3R5bGVzLCBmb250cywgaW1hZ2VzLCBpY29ucylcbiAqIC0gTUNQIHN5bmNocm9uaXphdGlvbiB3aXRoIFByZXZpZXdDb250cm9sbGVyXG4gKiAtIE1hbmlmZXN0IGludGVncml0eSB2YWxpZGF0aW9uXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBDb250cmFjdERpZmYsIENvbnRyYWN0VHlwZSB9IGZyb20gJy4vdHlwZXMnO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBUeXBlIERlZmluaXRpb25zXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogU3R5bGUgYXNzZXQgdHlwZXMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU3R5bGVBc3NldHMge1xuICAvKiogQ3JpdGljYWwgQ1NTIChpbmxpbmVkKSAqL1xuICBjcml0aWNhbD86IHN0cmluZztcbiAgXG4gIC8qKiBFeHRlcm5hbCBzdHlsZSBVUkxzICovXG4gIGV4dGVybmFsOiBzdHJpbmdbXTtcbiAgXG4gIC8qKiBEeW5hbWljIHN0eWxlcyAocnVudGltZSBnZW5lcmF0ZWQpICovXG4gIGR5bmFtaWM6IHN0cmluZ1tdO1xuICBcbiAgLyoqIFRhaWx3aW5kIHV0aWxpdHkgY2xhc3NlcyAqL1xuICB0YWlsd2luZDogc3RyaW5nW107XG4gIFxuICAvKiogRm9udCBVUkxzICovXG4gIGZvbnRzPzogc3RyaW5nW107XG59XG5cbi8qKlxuICogQ29tcG9uZW50IHRyZWUgYXNzZXQgcmVmZXJlbmNlcy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDb21wb25lbnRUcmVlQXNzZXRzIHtcbiAgLyoqIEltYWdlIFVSTHMgKi9cbiAgaW1hZ2VzOiBzdHJpbmdbXTtcbiAgXG4gIC8qKiBJY29uIHJlZmVyZW5jZXMgKi9cbiAgaWNvbnM6IHN0cmluZ1tdO1xufVxuXG4vKipcbiAqIENvbXBsZXRlIGFzc2V0IG1hbmlmZXN0IGZvciBVSSBzeW50aGVzaXMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQXNzZXRNYW5pZmVzdCB7XG4gIC8qKiBTdHlsZSBhc3NldHMgKi9cbiAgc3R5bGVzOiB7XG4gICAgY3JpdGljYWw/OiBzdHJpbmc7XG4gICAgZXh0ZXJuYWw6IHN0cmluZ1tdO1xuICAgIGR5bmFtaWM6IHN0cmluZ1tdO1xuICAgIHRhaWx3aW5kOiBzdHJpbmdbXTtcbiAgfTtcbiAgXG4gIC8qKiBGb250IGFzc2V0cyAqL1xuICBmb250cz86IHN0cmluZ1tdO1xuICBcbiAgLyoqIE90aGVyIGFzc2V0cyAqL1xuICBhc3NldHM6IHtcbiAgICBpbWFnZXM6IHN0cmluZ1tdO1xuICAgIGljb25zOiBzdHJpbmdbXTtcbiAgfTtcbn1cblxuLyoqXG4gKiBVSSBTeW50aGVzaXMgY29uZmlndXJhdGlvbi5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBVSVN5bnRoZXNpc0NvbmZpZyB7XG4gIC8qKiBUYXJnZXQgZnJhbWV3b3JrICovXG4gIGZyYW1ld29yaz86ICdyZWFjdCcgfCAndnVlJyB8ICdhbmd1bGFyJyB8ICdzdmVsdGUnO1xuICBcbiAgLyoqIFVJIGxpYnJhcnkgKi9cbiAgdWlMaWJyYXJ5PzogJ2FudGQnIHwgJ21hdGVyaWFsLXVpJyB8ICdjaGFrcmEnIHwgJ3RhaWx3aW5kJztcbiAgXG4gIC8qKiBTdHlsaW5nIGFwcHJvYWNoICovXG4gIHN0eWxpbmc/OiAnY3NzLW1vZHVsZXMnIHwgJ3N0eWxlZC1jb21wb25lbnRzJyB8ICd0YWlsd2luZCcgfCAnaW5saW5lJztcbiAgXG4gIC8qKiBFbmFibGUgY3JpdGljYWwgQ1NTIGlubGluaW5nICovXG4gIGVuYWJsZUNyaXRpY2FsQ1NTPzogYm9vbGVhbjtcbiAgXG4gIC8qKiBFbmFibGUgYXNzZXQgdmFsaWRhdGlvbiAqL1xuICBlbmFibGVBc3NldFZhbGlkYXRpb24/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIFVJIFN5bnRoZXNpcyByZXN1bHQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVUlTeW50aGVzaXNSZXN1bHQge1xuICAvKiogQ29tcG9uZW50IG5hbWUgKi9cbiAgY29tcG9uZW50TmFtZTogc3RyaW5nO1xuICBcbiAgLyoqIEdlbmVyYXRlZCBjb2RlICovXG4gIGNvZGU6IHN0cmluZztcbiAgXG4gIC8qKiBDb21wb25lbnQgcHJvcHMgKi9cbiAgcHJvcHM6IFJlY29yZDxzdHJpbmcsIGFueT47XG4gIFxuICAvKiogRGVwZW5kZW5jaWVzICovXG4gIGRlcGVuZGVuY2llczogc3RyaW5nW107XG4gIFxuICAvKiogQWNjZXNzaWJpbGl0eSBzY29yZSAqL1xuICBhMTF5U2NvcmU6IG51bWJlcjtcbiAgXG4gIC8qKiBBc3NldCBtYW5pZmVzdCAqL1xuICBhc3NldE1hbmlmZXN0OiBBc3NldE1hbmlmZXN0O1xufVxuXG4vKipcbiAqIE1DUCBCdXMgaW50ZXJmYWNlIGZvciBzeW5jaHJvbml6YXRpb24uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTUNQQnVzIHtcbiAgc2VuZChtZXNzYWdlOiBNQ1BNZXNzYWdlKTogUHJvbWlzZTx2b2lkPjtcbn1cblxuLyoqXG4gKiBNQ1AgTWVzc2FnZSBzdHJ1Y3R1cmUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTUNQTWVzc2FnZSB7XG4gIHR5cGU6ICdjb21tYW5kJyB8ICdldmVudCcgfCAncHJvcG9zYWwnIHwgJ3Jlc3BvbnNlJztcbiAgZnJvbT86IHN0cmluZztcbiAgdG8/OiBzdHJpbmc7XG4gIHRhcmdldD86IHN0cmluZztcbiAgcGF5bG9hZDogYW55O1xuICB0cmFjZUlkPzogc3RyaW5nO1xuICBpZGVtcG90ZW5jeUtleT86IHN0cmluZztcbiAgdHRsPzogbnVtYmVyO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBVSSBTeW50aGVzaXMgTW9kdWxlXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogVUkgU3ludGhlc2lzIE1vZHVsZSAtIE1hbmFnZXMgVUkgY29tcG9uZW50IGdlbmVyYXRpb24gd2l0aCBhc3NldCB0cmFja2luZy5cbiAqL1xuZXhwb3J0IGNsYXNzIFVJU3ludGhlc2lzTW9kdWxlIHtcbiAgcHJpdmF0ZSBjb25maWc6IFJlcXVpcmVkPFVJU3ludGhlc2lzQ29uZmlnPjtcbiAgcHJpdmF0ZSBtY3BCdXM6IE1DUEJ1cyB8IG51bGw7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgY29uZmlnOiBVSVN5bnRoZXNpc0NvbmZpZyA9IHt9LFxuICAgIG1jcEJ1cz86IE1DUEJ1c1xuICApIHtcbiAgICB0aGlzLmNvbmZpZyA9IHtcbiAgICAgIGZyYW1ld29yazogY29uZmlnLmZyYW1ld29yayB8fCAncmVhY3QnLFxuICAgICAgdWlMaWJyYXJ5OiBjb25maWcudWlMaWJyYXJ5IHx8ICd0YWlsd2luZCcsXG4gICAgICBzdHlsaW5nOiBjb25maWcuc3R5bGluZyB8fCAndGFpbHdpbmQnLFxuICAgICAgZW5hYmxlQ3JpdGljYWxDU1M6IGNvbmZpZy5lbmFibGVDcml0aWNhbENTUyA/PyB0cnVlLFxuICAgICAgZW5hYmxlQXNzZXRWYWxpZGF0aW9uOiBjb25maWcuZW5hYmxlQXNzZXRWYWxpZGF0aW9uID8/IHRydWUsXG4gICAgfSBhcyBSZXF1aXJlZDxVSVN5bnRoZXNpc0NvbmZpZz47XG4gICAgdGhpcy5tY3BCdXMgPSBtY3BCdXMgfHwgbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBTeW50aGVzaXplIFVJIGNvbXBvbmVudCBmcm9tIHJlcXVpcmVtZW50cy5cbiAgICovXG4gIGFzeW5jIHN5bnRoZXNpemUoXG4gICAgcmVxdWlyZW1lbnQ6IGFueSxcbiAgICBjb21wb25lbnRUcmVlOiBDb21wb25lbnRUcmVlQXNzZXRzXG4gICk6IFByb21pc2U8VUlTeW50aGVzaXNSZXN1bHQ+IHtcbiAgICAvLyBHZW5lcmF0ZSBjb21wb25lbnQgY29kZSAoc2ltcGxpZmllZCBmb3IgZGVtbylcbiAgICBjb25zdCBjb21wb25lbnROYW1lID0gcmVxdWlyZW1lbnQuY29tcG9uZW50TmFtZSB8fCAnR2VuZXJhdGVkQ29tcG9uZW50JztcbiAgICBjb25zdCBjb2RlID0gdGhpcy5nZW5lcmF0ZUNvbXBvbmVudENvZGUocmVxdWlyZW1lbnQpO1xuICAgIGNvbnN0IHByb3BzID0gdGhpcy5leHRyYWN0UHJvcHMocmVxdWlyZW1lbnQpO1xuICAgIGNvbnN0IGRlcGVuZGVuY2llcyA9IHRoaXMuZXh0cmFjdERlcGVuZGVuY2llcyhyZXF1aXJlbWVudCk7XG4gICAgY29uc3QgYTExeVNjb3JlID0gdGhpcy5jYWxjdWxhdGVBMTF5U2NvcmUocmVxdWlyZW1lbnQpO1xuXG4gICAgLy8gQnVpbGQgc3R5bGUgYXNzZXRzIGZyb20gcmVxdWlyZW1lbnRcbiAgICBjb25zdCBzdHlsZXMgPSB0aGlzLmV4dHJhY3RTdHlsZXMocmVxdWlyZW1lbnQpO1xuXG4gICAgLy8gQ3JlYXRlIGFzc2V0IG1hbmlmZXN0XG4gICAgY29uc3QgYXNzZXRNYW5pZmVzdDogQXNzZXRNYW5pZmVzdCA9IHtcbiAgICAgIHN0eWxlczoge1xuICAgICAgICBjcml0aWNhbDogc3R5bGVzLmNyaXRpY2FsLFxuICAgICAgICBleHRlcm5hbDogc3R5bGVzLmV4dGVybmFsLFxuICAgICAgICBkeW5hbWljOiBzdHlsZXMuZHluYW1pYyxcbiAgICAgICAgdGFpbHdpbmQ6IHN0eWxlcy50YWlsd2luZCxcbiAgICAgIH0sXG4gICAgICBmb250czogc3R5bGVzLmZvbnRzLFxuICAgICAgYXNzZXRzOiB7XG4gICAgICAgIGltYWdlczogY29tcG9uZW50VHJlZS5pbWFnZXMsXG4gICAgICAgIGljb25zOiBjb21wb25lbnRUcmVlLmljb25zLFxuICAgICAgfSxcbiAgICB9O1xuXG4gICAgLy8gVmFsaWRhdGUgbWFuaWZlc3QgaW50ZWdyaXR5XG4gICAgaWYgKHRoaXMuY29uZmlnLmVuYWJsZUFzc2V0VmFsaWRhdGlvbikge1xuICAgICAgdGhpcy52YWxpZGF0ZU1hbmlmZXN0SW50ZWdyaXR5KGFzc2V0TWFuaWZlc3QpO1xuICAgIH1cblxuICAgIC8vIE1DUCBzeW5jaHJvbml6YXRpb25cbiAgICBpZiAodGhpcy5tY3BCdXMpIHtcbiAgICAgIGF3YWl0IHRoaXMubWNwQnVzLnNlbmQoe1xuICAgICAgICB0eXBlOiBcImNvbW1hbmRcIixcbiAgICAgICAgcGF5bG9hZDoge1xuICAgICAgICAgIGFzc2V0TWFuaWZlc3QsXG4gICAgICAgICAgdGFyZ2V0OiBcIlByZXZpZXdDb250cm9sbGVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgdHJhY2VJZDogdGhpcy5nZW5lcmF0ZVRyYWNlSWQoKSxcbiAgICAgICAgaWRlbXBvdGVuY3lLZXk6IGB1aS1zeW50aGVzaXMtJHtjb21wb25lbnROYW1lfS0ke0RhdGUubm93KCl9YCxcbiAgICAgICAgdHRsOiAzMDAwMCwgLy8gMzAgc2Vjb25kcyBUVExcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBjb21wb25lbnROYW1lLFxuICAgICAgY29kZSxcbiAgICAgIHByb3BzLFxuICAgICAgZGVwZW5kZW5jaWVzLFxuICAgICAgYTExeVNjb3JlLFxuICAgICAgYXNzZXRNYW5pZmVzdCxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFZhbGlkYXRlIGFzc2V0IG1hbmlmZXN0IGludGVncml0eS5cbiAgICogXG4gICAqIFRocm93cyBlcnJvciBpZiBtYW5pZmVzdCBpcyBlbXB0eSBvciBpbnZhbGlkLlxuICAgKi9cbiAgcHJpdmF0ZSB2YWxpZGF0ZU1hbmlmZXN0SW50ZWdyaXR5KG1hbmlmZXN0OiBBc3NldE1hbmlmZXN0KTogdm9pZCB7XG4gICAgLy8gQ2hlY2sgaWYgYm90aCBjcml0aWNhbCBhbmQgZXh0ZXJuYWwgc3R5bGVzIGFyZSBtaXNzaW5nXG4gICAgaWYgKCFtYW5pZmVzdC5zdHlsZXMuY3JpdGljYWwgJiYgbWFuaWZlc3Quc3R5bGVzLmV4dGVybmFsLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdTdHlsZSBhc3NldCBtYW5pZmVzdCBlbXB0eSAtIEdlblVJIG91dHB1dCB2YWxpZGF0aW9uIGZhaWxlZCcpO1xuICAgIH1cblxuICAgIC8vIFZhbGlkYXRlIHN0eWxlIGFycmF5cyBhcmUgbm90IHVuZGVmaW5lZFxuICAgIGlmICghQXJyYXkuaXNBcnJheShtYW5pZmVzdC5zdHlsZXMuZXh0ZXJuYWwpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1N0eWxlIGFzc2V0IG1hbmlmZXN0IGludmFsaWQ6IGV4dGVybmFsIHN0eWxlcyBtdXN0IGJlIGFuIGFycmF5Jyk7XG4gICAgfVxuXG4gICAgaWYgKCFBcnJheS5pc0FycmF5KG1hbmlmZXN0LnN0eWxlcy5keW5hbWljKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdTdHlsZSBhc3NldCBtYW5pZmVzdCBpbnZhbGlkOiBkeW5hbWljIHN0eWxlcyBtdXN0IGJlIGFuIGFycmF5Jyk7XG4gICAgfVxuXG4gICAgaWYgKCFBcnJheS5pc0FycmF5KG1hbmlmZXN0LnN0eWxlcy50YWlsd2luZCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignU3R5bGUgYXNzZXQgbWFuaWZlc3QgaW52YWxpZDogdGFpbHdpbmQgc3R5bGVzIG11c3QgYmUgYW4gYXJyYXknKTtcbiAgICB9XG5cbiAgICAvLyBWYWxpZGF0ZSBhc3NldHNcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkobWFuaWZlc3QuYXNzZXRzLmltYWdlcykpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQXNzZXQgbWFuaWZlc3QgaW52YWxpZDogaW1hZ2VzIG11c3QgYmUgYW4gYXJyYXknKTtcbiAgICB9XG5cbiAgICBpZiAoIUFycmF5LmlzQXJyYXkobWFuaWZlc3QuYXNzZXRzLmljb25zKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdBc3NldCBtYW5pZmVzdCBpbnZhbGlkOiBpY29ucyBtdXN0IGJlIGFuIGFycmF5Jyk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEV4dHJhY3Qgc3R5bGVzIGZyb20gcmVxdWlyZW1lbnQuXG4gICAqL1xuICBwcml2YXRlIGV4dHJhY3RTdHlsZXMocmVxdWlyZW1lbnQ6IGFueSk6IFN0eWxlQXNzZXRzIHtcbiAgICBjb25zdCBzdHlsZXM6IFN0eWxlQXNzZXRzID0ge1xuICAgICAgY3JpdGljYWw6IHVuZGVmaW5lZCxcbiAgICAgIGV4dGVybmFsOiBbXSxcbiAgICAgIGR5bmFtaWM6IFtdLFxuICAgICAgdGFpbHdpbmQ6IFtdLFxuICAgICAgZm9udHM6IFtdLFxuICAgIH07XG5cbiAgICAvLyBFeHRyYWN0IGNyaXRpY2FsIENTUyBpZiBwcm92aWRlZFxuICAgIGlmIChyZXF1aXJlbWVudC5jcml0aWNhbENTUykge1xuICAgICAgc3R5bGVzLmNyaXRpY2FsID0gcmVxdWlyZW1lbnQuY3JpdGljYWxDU1M7XG4gICAgfVxuXG4gICAgLy8gRXh0cmFjdCBleHRlcm5hbCBzdHlsZXNoZWV0c1xuICAgIGlmIChyZXF1aXJlbWVudC5leHRlcm5hbFN0eWxlcykge1xuICAgICAgc3R5bGVzLmV4dGVybmFsID0gQXJyYXkuaXNBcnJheShyZXF1aXJlbWVudC5leHRlcm5hbFN0eWxlcylcbiAgICAgICAgPyByZXF1aXJlbWVudC5leHRlcm5hbFN0eWxlc1xuICAgICAgICA6IFtyZXF1aXJlbWVudC5leHRlcm5hbFN0eWxlc107XG4gICAgfVxuXG4gICAgLy8gRXh0cmFjdCBkeW5hbWljIHN0eWxlc1xuICAgIGlmIChyZXF1aXJlbWVudC5keW5hbWljU3R5bGVzKSB7XG4gICAgICBzdHlsZXMuZHluYW1pYyA9IEFycmF5LmlzQXJyYXkocmVxdWlyZW1lbnQuZHluYW1pY1N0eWxlcylcbiAgICAgICAgPyByZXF1aXJlbWVudC5keW5hbWljU3R5bGVzXG4gICAgICAgIDogW3JlcXVpcmVtZW50LmR5bmFtaWNTdHlsZXNdO1xuICAgIH1cblxuICAgIC8vIEV4dHJhY3QgVGFpbHdpbmQgY2xhc3Nlc1xuICAgIGlmIChyZXF1aXJlbWVudC50YWlsd2luZENsYXNzZXMpIHtcbiAgICAgIHN0eWxlcy50YWlsd2luZCA9IEFycmF5LmlzQXJyYXkocmVxdWlyZW1lbnQudGFpbHdpbmRDbGFzc2VzKVxuICAgICAgICA/IHJlcXVpcmVtZW50LnRhaWx3aW5kQ2xhc3Nlc1xuICAgICAgICA6IFtyZXF1aXJlbWVudC50YWlsd2luZENsYXNzZXNdO1xuICAgIH1cblxuICAgIC8vIEV4dHJhY3QgZm9udHNcbiAgICBpZiAocmVxdWlyZW1lbnQuZm9udHMpIHtcbiAgICAgIHN0eWxlcy5mb250cyA9IEFycmF5LmlzQXJyYXkocmVxdWlyZW1lbnQuZm9udHMpXG4gICAgICAgID8gcmVxdWlyZW1lbnQuZm9udHNcbiAgICAgICAgOiBbcmVxdWlyZW1lbnQuZm9udHNdO1xuICAgIH1cblxuICAgIHJldHVybiBzdHlsZXM7XG4gIH1cblxuICAvKipcbiAgICogR2VuZXJhdGUgY29tcG9uZW50IGNvZGUgKHNpbXBsaWZpZWQpLlxuICAgKi9cbiAgcHJpdmF0ZSBnZW5lcmF0ZUNvbXBvbmVudENvZGUocmVxdWlyZW1lbnQ6IGFueSk6IHN0cmluZyB7XG4gICAgY29uc3QgY29tcG9uZW50TmFtZSA9IHJlcXVpcmVtZW50LmNvbXBvbmVudE5hbWUgfHwgJ0NvbXBvbmVudCc7XG4gICAgXG4gICAgc3dpdGNoICh0aGlzLmNvbmZpZy5mcmFtZXdvcmspIHtcbiAgICAgIGNhc2UgJ3JlYWN0JzpcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2VuZXJhdGVSZWFjdENvbXBvbmVudChjb21wb25lbnROYW1lLCByZXF1aXJlbWVudCk7XG4gICAgICBjYXNlICd2dWUnOlxuICAgICAgICByZXR1cm4gdGhpcy5nZW5lcmF0ZVZ1ZUNvbXBvbmVudChjb21wb25lbnROYW1lLCByZXF1aXJlbWVudCk7XG4gICAgICBjYXNlICdhbmd1bGFyJzpcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2VuZXJhdGVBbmd1bGFyQ29tcG9uZW50KGNvbXBvbmVudE5hbWUsIHJlcXVpcmVtZW50KTtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiBgLy8gJHtjb21wb25lbnROYW1lfSAtICR7dGhpcy5jb25maWcuZnJhbWV3b3JrfWA7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZW5lcmF0ZVJlYWN0Q29tcG9uZW50KG5hbWU6IHN0cmluZywgcmVxdWlyZW1lbnQ6IGFueSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBpbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnO1xuXG5leHBvcnQgaW50ZXJmYWNlICR7bmFtZX1Qcm9wcyB7XG4gICR7T2JqZWN0LmVudHJpZXMocmVxdWlyZW1lbnQucHJvcHMgfHwge30pLm1hcCgoW2tleSwgdmFsdWVdOiBbc3RyaW5nLCBhbnldKSA9PiBcbiAgICBgJHtrZXl9JHt2YWx1ZS5yZXF1aXJlZCA/ICcnIDogJz8nfTogJHt2YWx1ZS50eXBlIHx8ICdhbnknfTtgXG4gICkuam9pbignXFxuICAnKX1cbn1cblxuZXhwb3J0IGNvbnN0ICR7bmFtZX06IFJlYWN0LkZDPCR7bmFtZX1Qcm9wcz4gPSAocHJvcHMpID0+IHtcbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cIiR7KHJlcXVpcmVtZW50LnRhaWx3aW5kQ2xhc3NlcyB8fCBbXSkuam9pbignICcpfVwiPlxuICAgICAgJHtuYW1lfSBDb21wb25lbnRcbiAgICA8L2Rpdj5cbiAgKTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0ICR7bmFtZX07YDtcbiAgfVxuXG4gIHByaXZhdGUgZ2VuZXJhdGVWdWVDb21wb25lbnQobmFtZTogc3RyaW5nLCByZXF1aXJlbWVudDogYW55KTogc3RyaW5nIHtcbiAgICByZXR1cm4gYDx0ZW1wbGF0ZT5cbiAgPGRpdiBjbGFzcz1cIiR7KHJlcXVpcmVtZW50LnRhaWx3aW5kQ2xhc3NlcyB8fCBbXSkuam9pbignICcpfVwiPlxuICAgICR7bmFtZX0gQ29tcG9uZW50XG4gIDwvZGl2PlxuPC90ZW1wbGF0ZT5cblxuPHNjcmlwdCBsYW5nPVwidHNcIj5cbmltcG9ydCB7IGRlZmluZUNvbXBvbmVudCB9IGZyb20gJ3Z1ZSc7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbXBvbmVudCh7XG4gIG5hbWU6ICcke25hbWV9JyxcbiAgcHJvcHM6IHtcbiAgICAke09iamVjdC5lbnRyaWVzKHJlcXVpcmVtZW50LnByb3BzIHx8IHt9KS5tYXAoKFtrZXksIHZhbHVlXTogW3N0cmluZywgYW55XSkgPT4gXG4gICAgYCR7a2V5fTogeyB0eXBlOiAke3ZhbHVlLnR5cGUgfHwgJ09iamVjdCd9LCByZXF1aXJlZDogJHt2YWx1ZS5yZXF1aXJlZCB8fCBmYWxzZX0gfWBcbiAgKS5qb2luKCcsXFxuICAgICcpfVxuICB9XG59KTtcbjwvc2NyaXB0PmA7XG4gIH1cblxuICBwcml2YXRlIGdlbmVyYXRlQW5ndWxhckNvbXBvbmVudChuYW1lOiBzdHJpbmcsIHJlcXVpcmVtZW50OiBhbnkpOiBzdHJpbmcge1xuICAgIHJldHVybiBgaW1wb3J0IHsgQ29tcG9uZW50LCBJbnB1dCB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuXG5AQ29tcG9uZW50KHtcbiAgc2VsZWN0b3I6ICdhcHAtJHtuYW1lLnRvTG93ZXJDYXNlKCl9JyxcbiAgdGVtcGxhdGU6IFxcYFxuICAgIDxkaXYgY2xhc3M9XCIkeyhyZXF1aXJlbWVudC50YWlsd2luZENsYXNzZXMgfHwgW10pLmpvaW4oJyAnKX1cIj5cbiAgICAgICR7bmFtZX0gQ29tcG9uZW50XG4gICAgPC9kaXY+XG4gIFxcYFxufSlcbmV4cG9ydCBjbGFzcyAke25hbWV9Q29tcG9uZW50IHtcbiAgJHtPYmplY3QuZW50cmllcyhyZXF1aXJlbWVudC5wcm9wcyB8fCB7fSkubWFwKChba2V5LCB2YWx1ZV06IFtzdHJpbmcsIGFueV0pID0+IFxuICAgIGBASW5wdXQoKSAke2tleX0ke3ZhbHVlLnJlcXVpcmVkID8gJycgOiAnPyd9OiAke3ZhbHVlLnR5cGUgfHwgJ2FueSd9O2BcbiAgKS5qb2luKCdcXG4gICcpfVxufWA7XG4gIH1cblxuICAvKipcbiAgICogRXh0cmFjdCBwcm9wcyBmcm9tIHJlcXVpcmVtZW50LlxuICAgKi9cbiAgcHJpdmF0ZSBleHRyYWN0UHJvcHMocmVxdWlyZW1lbnQ6IGFueSk6IFJlY29yZDxzdHJpbmcsIGFueT4ge1xuICAgIHJldHVybiByZXF1aXJlbWVudC5wcm9wcyB8fCB7fTtcbiAgfVxuXG4gIC8qKlxuICAgKiBFeHRyYWN0IGRlcGVuZGVuY2llcyBmcm9tIHJlcXVpcmVtZW50LlxuICAgKi9cbiAgcHJpdmF0ZSBleHRyYWN0RGVwZW5kZW5jaWVzKHJlcXVpcmVtZW50OiBhbnkpOiBzdHJpbmdbXSB7XG4gICAgY29uc3QgZGVwcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIFxuICAgIC8vIEFkZCBmcmFtZXdvcmstc3BlY2lmaWMgZGVwZW5kZW5jaWVzXG4gICAgc3dpdGNoICh0aGlzLmNvbmZpZy5mcmFtZXdvcmspIHtcbiAgICAgIGNhc2UgJ3JlYWN0JzpcbiAgICAgICAgZGVwcy5hZGQoJ3JlYWN0Jyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAndnVlJzpcbiAgICAgICAgZGVwcy5hZGQoJ3Z1ZScpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ2FuZ3VsYXInOlxuICAgICAgICBkZXBzLmFkZCgnQGFuZ3VsYXIvY29yZScpO1xuICAgICAgICBicmVhaztcbiAgICB9XG5cbiAgICAvLyBBZGQgVUkgbGlicmFyeSBkZXBlbmRlbmNpZXNcbiAgICBpZiAodGhpcy5jb25maWcudWlMaWJyYXJ5KSB7XG4gICAgICBkZXBzLmFkZCh0aGlzLmNvbmZpZy51aUxpYnJhcnkpO1xuICAgIH1cblxuICAgIC8vIEFkZCBjdXN0b20gZGVwZW5kZW5jaWVzXG4gICAgaWYgKHJlcXVpcmVtZW50LmRlcGVuZGVuY2llcykge1xuICAgICAgQXJyYXkuaXNBcnJheShyZXF1aXJlbWVudC5kZXBlbmRlbmNpZXMpXG4gICAgICAgID8gcmVxdWlyZW1lbnQuZGVwZW5kZW5jaWVzLmZvckVhY2goKGQ6IHN0cmluZykgPT4gZGVwcy5hZGQoZCkpXG4gICAgICAgIDogZGVwcy5hZGQocmVxdWlyZW1lbnQuZGVwZW5kZW5jaWVzKTtcbiAgICB9XG5cbiAgICByZXR1cm4gQXJyYXkuZnJvbShkZXBzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxjdWxhdGUgYWNjZXNzaWJpbGl0eSBzY29yZS5cbiAgICovXG4gIHByaXZhdGUgY2FsY3VsYXRlQTExeVNjb3JlKHJlcXVpcmVtZW50OiBhbnkpOiBudW1iZXIge1xuICAgIGxldCBzY29yZSA9IDEwMDtcblxuICAgIC8vIERlZHVjdCBmb3IgbWlzc2luZyBhbHQgdGV4dFxuICAgIGlmIChyZXF1aXJlbWVudC5oYXNJbWFnZXMgJiYgIXJlcXVpcmVtZW50LmFsdFRleHQpIHtcbiAgICAgIHNjb3JlIC09IDIwO1xuICAgIH1cblxuICAgIC8vIERlZHVjdCBmb3IgbWlzc2luZyBsYWJlbHNcbiAgICBpZiAocmVxdWlyZW1lbnQuaGFzSW5wdXRzICYmICFyZXF1aXJlbWVudC5sYWJlbHMpIHtcbiAgICAgIHNjb3JlIC09IDIwO1xuICAgIH1cblxuICAgIC8vIERlZHVjdCBmb3IgcG9vciBjb250cmFzdFxuICAgIGlmIChyZXF1aXJlbWVudC5sb3dDb250cmFzdCkge1xuICAgICAgc2NvcmUgLT0gMTU7XG4gICAgfVxuXG4gICAgLy8gRGVkdWN0IGZvciBtaXNzaW5nIGtleWJvYXJkIG5hdmlnYXRpb25cbiAgICBpZiAocmVxdWlyZW1lbnQuaW50ZXJhY3RpdmUgJiYgIXJlcXVpcmVtZW50LmtleWJvYXJkTmF2KSB7XG4gICAgICBzY29yZSAtPSAyNTtcbiAgICB9XG5cbiAgICByZXR1cm4gTWF0aC5tYXgoMCwgc2NvcmUpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlIHRyYWNlIElEIGZvciBNQ1AgbWVzc2FnZXMuXG4gICAqL1xuICBwcml2YXRlIGdlbmVyYXRlVHJhY2VJZCgpOiBzdHJpbmcge1xuICAgIHJldHVybiBgdHJhY2VfJHtEYXRlLm5vdygpfV8ke01hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cigyLCA5KX1gO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldCBNQ1AgYnVzIGZvciBzeW5jaHJvbml6YXRpb24uXG4gICAqL1xuICBzZXRNQ1BCdXMobWNwQnVzOiBNQ1BCdXMpOiB2b2lkIHtcbiAgICB0aGlzLm1jcEJ1cyA9IG1jcEJ1cztcbiAgfVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBGYWN0b3J5IEZ1bmN0aW9uc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIENyZWF0ZSBVSSBzeW50aGVzaXMgbW9kdWxlIHdpdGggZGVmYXVsdCBjb25maWcuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVVSVN5bnRoZXNpc01vZHVsZShcbiAgY29uZmlnPzogVUlTeW50aGVzaXNDb25maWcsXG4gIG1jcEJ1cz86IE1DUEJ1c1xuKTogVUlTeW50aGVzaXNNb2R1bGUge1xuICByZXR1cm4gbmV3IFVJU3ludGhlc2lzTW9kdWxlKGNvbmZpZywgbWNwQnVzKTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYXNzZXQgbWFuaWZlc3QgZnJvbSBzdHlsZXMgYW5kIGNvbXBvbmVudCB0cmVlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlQXNzZXRNYW5pZmVzdChcbiAgc3R5bGVzOiBTdHlsZUFzc2V0cyxcbiAgY29tcG9uZW50VHJlZTogQ29tcG9uZW50VHJlZUFzc2V0c1xuKTogQXNzZXRNYW5pZmVzdCB7XG4gIGNvbnN0IG1hbmlmZXN0OiBBc3NldE1hbmlmZXN0ID0ge1xuICAgIHN0eWxlczoge1xuICAgICAgY3JpdGljYWw6IHN0eWxlcy5jcml0aWNhbCxcbiAgICAgIGV4dGVybmFsOiBzdHlsZXMuZXh0ZXJuYWwgfHwgW10sXG4gICAgICBkeW5hbWljOiBzdHlsZXMuZHluYW1pYyB8fCBbXSxcbiAgICAgIHRhaWx3aW5kOiBzdHlsZXMudGFpbHdpbmQgfHwgW10sXG4gICAgfSxcbiAgICBmb250czogc3R5bGVzLmZvbnRzLFxuICAgIGFzc2V0czoge1xuICAgICAgaW1hZ2VzOiBjb21wb25lbnRUcmVlLmltYWdlcyB8fCBbXSxcbiAgICAgIGljb25zOiBjb21wb25lbnRUcmVlLmljb25zIHx8IFtdLFxuICAgIH0sXG4gIH07XG5cbiAgLy8gVmFsaWRhdGUgbWFuaWZlc3RcbiAgaWYgKCFtYW5pZmVzdC5zdHlsZXMuY3JpdGljYWwgJiYgbWFuaWZlc3Quc3R5bGVzLmV4dGVybmFsLmxlbmd0aCA9PT0gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcignU3R5bGUgYXNzZXQgbWFuaWZlc3QgZW1wdHkgLSBHZW5VSSBvdXRwdXQgdmFsaWRhdGlvbiBmYWlsZWQnKTtcbiAgfVxuXG4gIHJldHVybiBtYW5pZmVzdDtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRXhwb3J0c1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5leHBvcnQgZGVmYXVsdCBVSVN5bnRoZXNpc01vZHVsZTtcbiJdfQ==