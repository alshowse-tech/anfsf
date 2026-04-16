"use strict";
/**
 * Prototype Generator
 *
 * Integrates all UI modules to generate complete interactive prototypes
 * from PRD. Supports export to Figma and code.
 *
 * @version 1.4.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrototypeGenerator = void 0;
exports.createPrototypeGenerator = createPrototypeGenerator;
exports.generatePrototypeSummary = generatePrototypeSummary;
exports.calculatePrototypeComplexity = calculatePrototypeComplexity;
exports.validatePrototype = validatePrototype;
const ui_component_synthesizer_1 = require("./ui-component-synthesizer");
const layout_generator_1 = require("./layout-generator");
const design_system_mapper_1 = require("./design-system-mapper");
const interaction_flow_engine_1 = require("./interaction-flow-engine");
// ============================================================================
// Prototype Generator Class
// ============================================================================
class PrototypeGenerator {
    constructor(config) {
        this.prototypeCache = new Map();
        const uiConfig = config ? this.convertConfig(config) : ui_component_synthesizer_1.DEFAULT_UI_CONFIG;
        this.componentSynthesizer = (0, ui_component_synthesizer_1.createComponentSynthesizer)(uiConfig);
        this.layoutGenerator = (0, layout_generator_1.createLayoutGenerator)();
        this.designSystemMapper = (0, design_system_mapper_1.createDesignSystemMapper)();
        this.interactionFlowEngine = (0, interaction_flow_engine_1.createInteractionFlowEngine)();
    }
    /**
     * Generate complete prototype from PRD
     */
    async generate(prd, config) {
        // Check cache
        const cached = this.prototypeCache.get(prd.id);
        if (cached)
            return cached;
        const effectiveConfig = config || this.getDefaultConfig();
        // 1. Extract design tokens
        const designTokens = await this.designSystemMapper.extractFromPRD(prd);
        // 2. Generate pages
        const pages = await this.generatePages(prd, effectiveConfig, designTokens);
        // 3. Generate interaction flows
        const flows = await this.generateFlows(prd);
        // 4. Create prototype definition
        const prototype = {
            id: `prototype-${prd.id}`,
            pages,
            flows,
            designTokens,
            previewUrl: this.generatePreviewUrl(prd),
            shareUrl: this.generateShareUrl(prd),
        };
        this.prototypeCache.set(prd.id, prototype);
        return prototype;
    }
    /**
     * Export prototype to Figma
     */
    async exportToFigma(prototype) {
        try {
            // Simulate Figma export
            const components = prototype.pages.flatMap(p => p.components.map(c => c.name));
            return {
                success: true,
                figmaFileId: `figma-${prototype.id}-${Date.now()}`,
                figmaUrl: `https://figma.com/file/${prototype.id}`,
                components,
            };
        }
        catch (error) {
            return {
                success: false,
                components: [],
                errors: [error instanceof Error ? error.message : 'Export failed'],
            };
        }
    }
    /**
     * Export prototype to code
     */
    async exportToCode(prototype, options) {
        const files = [];
        let totalLines = 0;
        let componentCount = 0;
        let testCount = 0;
        let storyCount = 0;
        // Generate component files
        for (const page of prototype.pages) {
            for (const component of page.components) {
                const componentFile = this.generateComponentFile(component, page, options);
                files.push(componentFile);
                totalLines += componentFile.content.split('\n').length;
                componentCount++;
                // Generate test file if requested
                if (options.includeTests) {
                    const testFile = this.generateTestFile(component, page, options);
                    files.push(testFile);
                    totalLines += testFile.content.split('\n').length;
                    testCount++;
                }
                // Generate story file if requested
                if (options.includeStories) {
                    const storyFile = this.generateStoryFile(component, page, options);
                    files.push(storyFile);
                    totalLines += storyFile.content.split('\n').length;
                    storyCount++;
                }
            }
            // Generate page layout file
            const layoutFile = this.generateLayoutFile(page, prototype.designTokens, options);
            files.push(layoutFile);
            totalLines += layoutFile.content.split('\n').length;
        }
        // Generate design tokens file
        const tokensFile = this.generateTokensFile(prototype.designTokens, options);
        files.push(tokensFile);
        totalLines += tokensFile.content.split('\n').length;
        // Generate index file
        const indexFile = this.generateIndexFile(files, options);
        files.push(indexFile);
        return {
            success: true,
            files,
            summary: {
                totalFiles: files.length,
                totalLines,
                components: componentCount,
                tests: testCount,
                stories: storyCount,
            },
        };
    }
    /**
     * Collect feedback for prototype
     */
    async collectFeedback(prototype) {
        // Simulate feedback collection
        // In production, this would integrate with feedback collection service
        return [
            {
                id: 'feedback-1',
                userId: 'user-1',
                pageId: prototype.pages[0]?.id || '',
                rating: 4,
                comment: 'Great layout, but could improve mobile responsiveness',
                timestamp: new Date(),
            },
        ];
    }
    // ============================================================================
    // Private Methods - Generation
    // ============================================================================
    async generatePages(prd, config, designTokens) {
        const pages = [];
        // Generate page for each user flow
        for (const userFlow of prd.userFlows) {
            // Generate layout
            const layout = await this.layoutGenerator.generateFromFlow([userFlow], prd.uiRequirements);
            // Generate components
            const components = await this.generateComponentsForFlow(userFlow, config);
            // Get flows for this page
            const flows = await this.interactionFlowEngine.generateFromUserFlow(userFlow);
            pages.push({
                id: `page-${userFlow.id}`,
                name: userFlow.name,
                path: this.generatePagePath(userFlow),
                layout,
                components,
                flows: flows.map(f => f.id),
            });
        }
        return pages;
    }
    async generateComponentsForFlow(userFlow, config) {
        const components = [];
        // Generate components based on flow steps
        for (const step of userFlow.steps) {
            const component = await this.componentSynthesizer.synthesize({
                id: `req-${step.id}`,
                description: step.action,
                priority: 'medium',
                acceptanceCriteria: [],
            }, this.convertConfig(config));
            components.push({
                id: `comp-${step.id}`,
                name: component.componentName,
                type: component.componentName,
                props: this.propsToObject(component.props),
                styles: {},
            });
        }
        return components;
    }
    async generateFlows(prd) {
        const allFlows = [];
        for (const userFlow of prd.userFlows) {
            const flows = await this.interactionFlowEngine.generateFromUserFlow(userFlow);
            // Add error handling to all flows
            const flowsWithErrorHandling = flows.map(flow => this.interactionFlowEngine.addErrorHandling(flow));
            allFlows.push(...flowsWithErrorHandling);
        }
        return allFlows;
    }
    // ============================================================================
    // Private Methods - Code Generation
    // ============================================================================
    generateComponentFile(component, page, options) {
        const content = `import React from 'react';

interface ${component.name}Props {
  className?: string;
  children?: React.ReactNode;
}

export function ${component.name}({ className, children }: ${component.name}Props) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}

export default ${component.name};
`;
        return {
            path: `${options.outputDir}/components/${component.name}.tsx`,
            content,
            type: 'component',
        };
    }
    generateTestFile(component, page, options) {
        const content = `import { render, screen } from '@testing-library/react';
import ${component.name} from './${component.name}';

describe('${component.name}', () => {
  it('renders correctly', () => {
    render(<${component.name}>Test</${component.name}>);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
`;
        return {
            path: `${options.outputDir}/components/${component.name}.test.tsx`,
            content,
            type: 'test',
        };
    }
    generateStoryFile(component, page, options) {
        const content = `import type { Meta, StoryObj } from '@storybook/react';
import ${component.name} from './${component.name}';

const meta = {
  title: 'Components/${component.name}',
  component: ${component.name},
} satisfies Meta<typeof ${component.name}>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Default content',
  },
};
`;
        return {
            path: `${options.outputDir}/components/${component.name}.stories.tsx`,
            content,
            type: 'story',
        };
    }
    generateLayoutFile(page, tokens, options) {
        const content = `import React from 'react';
import { ${page.components.map(c => c.name).join(', ')} } from '../components';

export function ${page.name.replace(/\s+/g, '')}Layout() {
  return (
    <div className="layout">
      ${page.components.map(c => `<${c.name} />`).join('\n      ')}
    </div>
  );
}
`;
        return {
            path: `${options.outputDir}/layouts/${page.name.replace(/\s+/g, '')}Layout.tsx`,
            content,
            type: 'component',
        };
    }
    generateTokensFile(tokens, options) {
        const content = `export const designTokens = ${JSON.stringify(tokens, null, 2)};

export type DesignTokens = typeof designTokens;
`;
        return {
            path: `${options.outputDir}/tokens/design-tokens.ts`,
            content,
            type: 'type',
        };
    }
    generateIndexFile(files, options) {
        const componentExports = files
            .filter(f => f.type === 'component' && !f.path.includes('Layout'))
            .map(f => {
            const name = f.path.split('/').pop()?.replace('.tsx', '');
            return `export { ${name} } from './components/${name}';`;
        })
            .join('\n');
        const content = `// Auto-generated index file
${componentExports}

export { designTokens } from './tokens/design-tokens';
`;
        return {
            path: `${options.outputDir}/index.ts`,
            content,
            type: 'type',
        };
    }
    // ============================================================================
    // Private Methods - Utilities
    // ============================================================================
    getDefaultConfig() {
        return {
            framework: 'react',
            uiLibrary: 'antd',
            styling: 'tailwind',
            responsive: true,
            accessible: true,
            theme: 'light',
        };
    }
    convertConfig(config) {
        return {
            framework: config.framework,
            uiLibrary: config.uiLibrary,
            styling: config.styling,
        };
    }
    generatePagePath(userFlow) {
        return `/${userFlow.name.toLowerCase().replace(/\s+/g, '-')}`;
    }
    generatePreviewUrl(prd) {
        return `https://prototype.anfsf.dev/preview/${prd.id}`;
    }
    generateShareUrl(prd) {
        return `https://prototype.anfsf.dev/share/${prd.id}`;
    }
    propsToObject(props) {
        return props.reduce((acc, prop) => {
            acc[prop.name] = prop.defaultValue || null;
            return acc;
        }, {});
    }
}
exports.PrototypeGenerator = PrototypeGenerator;
// ============================================================================
// Factory Function
// ============================================================================
function createPrototypeGenerator(config) {
    return new PrototypeGenerator(config);
}
// ============================================================================
// Utility Functions
// ============================================================================
/**
 * Generate prototype summary
 */
function generatePrototypeSummary(prototype) {
    return `
# Prototype Summary

**ID**: ${prototype.id}
**Pages**: ${prototype.pages.length}
**Flows**: ${prototype.flows.length}
**Preview**: ${prototype.previewUrl}
**Share**: ${prototype.shareUrl}

## Pages

${prototype.pages.map(p => `- ${p.name} (${p.path}) - ${p.components.length} components`).join('\n')}

## Design Tokens

- Colors: Primary, Secondary, Neutral, Semantic
- Typography: ${prototype.designTokens.typography.fontFamily}
- Spacing Scale: ${Object.keys(prototype.designTokens.spacing).length} values
- Shadows: ${Object.keys(prototype.designTokens.shadows).length} variants
- Border Radius: ${Object.keys(prototype.designTokens.radii).length} variants
`.trim();
}
/**
 * Calculate prototype complexity score
 */
function calculatePrototypeComplexity(prototype) {
    let score = 0;
    // Page complexity
    score += prototype.pages.length * 20;
    // Component complexity
    const totalComponents = prototype.pages.reduce((sum, p) => sum + p.components.length, 0);
    score += totalComponents * 10;
    // Flow complexity
    score += prototype.flows.length * 15;
    // Design system complexity
    score += Object.keys(prototype.designTokens.colors).length * 5;
    score += Object.keys(prototype.designTokens.typography).length * 3;
    return Math.min(100, score);
}
/**
 * Validate prototype completeness
 */
function validatePrototype(prototype) {
    const issues = [];
    // Check pages
    if (prototype.pages.length === 0) {
        issues.push('Prototype must have at least one page');
    }
    // Check components
    for (const page of prototype.pages) {
        if (page.components.length === 0) {
            issues.push(`Page "${page.name}" has no components`);
        }
    }
    // Check flows
    if (prototype.flows.length === 0) {
        issues.push('Prototype should have at least one interaction flow');
    }
    // Check design tokens
    if (!prototype.designTokens.colors) {
        issues.push('Missing color tokens');
    }
    return {
        valid: issues.length === 0,
        issues,
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvdG90eXBlLWdlbmVyYXRvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy91aS9wcm90b3R5cGUtZ2VuZXJhdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7OztHQU9HOzs7QUE4Y0gsNERBRUM7QUFTRCw0REFzQkM7QUFLRCxvRUFrQkM7QUFLRCw4Q0E2QkM7QUF0aEJELHlFQUFtSDtBQUNuSCx5REFBNEU7QUFDNUUsaUVBQXNGO0FBQ3RGLHVFQUErRjtBQUUvRiwrRUFBK0U7QUFDL0UsNEJBQTRCO0FBQzVCLCtFQUErRTtBQUUvRSxNQUFhLGtCQUFrQjtJQU83QixZQUFZLE1BQXlCO1FBRjdCLG1CQUFjLEdBQXFDLElBQUksR0FBRyxFQUFFLENBQUM7UUFHbkUsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyw0Q0FBaUIsQ0FBQztRQUN6RSxJQUFJLENBQUMsb0JBQW9CLEdBQUcsSUFBQSxxREFBMEIsRUFBQyxRQUFRLENBQUMsQ0FBQztRQUNqRSxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUEsd0NBQXFCLEdBQUUsQ0FBQztRQUMvQyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBQSwrQ0FBd0IsR0FBRSxDQUFDO1FBQ3JELElBQUksQ0FBQyxxQkFBcUIsR0FBRyxJQUFBLHFEQUEyQixHQUFFLENBQUM7SUFDN0QsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLFFBQVEsQ0FBQyxHQUFRLEVBQUUsTUFBeUI7UUFDaEQsY0FBYztRQUNkLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUMvQyxJQUFJLE1BQU07WUFBRSxPQUFPLE1BQU0sQ0FBQztRQUUxQixNQUFNLGVBQWUsR0FBRyxNQUFNLElBQUksSUFB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O0lBRUQsbUJBQW1CO0lBQ25CLEtBQUssTUFBTSxJQUFJLElBQUksU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ25DLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDakMsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLElBQUksQ0FBQyxJQUFJLHFCQUFxQixDQUFDLENBQUM7UUFDdkQsQ0FBQztJQUNILENBQUM7SUFFRCxjQUFjO0lBQ2QsSUFBSSxTQUFTLENBQUMsS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUNqQyxNQUFNLENBQUMsSUFBSSxDQUFDLHFEQUFxRCxDQUFDLENBQUM7SUFDckUsQ0FBQztJQUVELHNCQUFzQjtJQUN0QixJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNuQyxNQUFNLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLENBQUM7SUFDdEMsQ0FBQztJQUVELE9BQU87UUFDTCxLQUFLLEVBQUUsTUFBTSxDQUFDLE1BQU0sS0FBSyxDQUFDO1FBQzFCLE1BQU07S0FDUCxDQUFDO0FBQ0osQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogUHJvdG90eXBlIEdlbmVyYXRvclxuICogXG4gKiBJbnRlZ3JhdGVzIGFsbCBVSSBtb2R1bGVzIHRvIGdlbmVyYXRlIGNvbXBsZXRlIGludGVyYWN0aXZlIHByb3RvdHlwZXNcbiAqIGZyb20gUFJELiBTdXBwb3J0cyBleHBvcnQgdG8gRmlnbWEgYW5kIGNvZGUuXG4gKiBcbiAqIEB2ZXJzaW9uIDEuNC4wXG4gKi9cblxuaW1wb3J0IHR5cGUge1xuICBQcm90b3R5cGVEZWZpbml0aW9uLFxuICBQYWdlRGVmaW5pdGlvbixcbiAgR2VuZXJhdGlvbkNvbmZpZyxcbiAgRXhwb3J0UmVzdWx0LFxuICBFeHBvcnRPcHRpb25zLFxuICBDb2RlRXhwb3J0LFxuICBFeHBvcnRlZEZpbGUsXG4gIEV4cG9ydFN1bW1hcnksXG4gIEZlZWRiYWNrLFxuICBQUkQsXG4gIERlc2lnblRva2VucyxcbiAgSW50ZXJhY3Rpb25GbG93LFxuICBMYXlvdXREZWZpbml0aW9uLFxuICBDb21wb25lbnRTeW50aGVzaXNSZXN1bHQsXG59IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHsgVUlDb21wb25lbnRTeW50aGVzaXplciwgY3JlYXRlQ29tcG9uZW50U3ludGhlc2l6ZXIsIERFRkFVTFRfVUlfQ09ORklHIH0gZnJvbSAnLi91aS1jb21wb25lbnQtc3ludGhlc2l6ZXInO1xuaW1wb3J0IHsgTGF5b3V0R2VuZXJhdG9yLCBjcmVhdGVMYXlvdXRHZW5lcmF0b3IgfSBmcm9tICcuL2xheW91dC1nZW5lcmF0b3InO1xuaW1wb3J0IHsgRGVzaWduU3lzdGVtTWFwcGVyLCBjcmVhdGVEZXNpZ25TeXN0ZW1NYXBwZXIgfSBmcm9tICcuL2Rlc2lnbi1zeXN0ZW0tbWFwcGVyJztcbmltcG9ydCB7IEludGVyYWN0aW9uRmxvd0VuZ2luZSwgY3JlYXRlSW50ZXJhY3Rpb25GbG93RW5naW5lIH0gZnJvbSAnLi9pbnRlcmFjdGlvbi1mbG93LWVuZ2luZSc7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFByb3RvdHlwZSBHZW5lcmF0b3IgQ2xhc3Ncbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGNsYXNzIFByb3RvdHlwZUdlbmVyYXRvciB7XG4gIHByaXZhdGUgY29tcG9uZW50U3ludGhlc2l6ZXI6IFVJQ29tcG9uZW50U3ludGhlc2l6ZXI7XG4gIHByaXZhdGUgbGF5b3V0R2VuZXJhdG9yOiBMYXlvdXRHZW5lcmF0b3I7XG4gIHByaXZhdGUgZGVzaWduU3lzdGVtTWFwcGVyOiBEZXNpZ25TeXN0ZW1NYXBwZXI7XG4gIHByaXZhdGUgaW50ZXJhY3Rpb25GbG93RW5naW5lOiBJbnRlcmFjdGlvbkZsb3dFbmdpbmU7XG4gIHByaXZhdGUgcHJvdG90eXBlQ2FjaGU6IE1hcDxzdHJpbmcsIFByb3RvdHlwZURlZmluaXRpb24+ID0gbmV3IE1hcCgpO1xuXG4gIGNvbnN0cnVjdG9yKGNvbmZpZz86IEdlbmVyYXRpb25Db25maWcpIHtcbiAgICBjb25zdCB1aUNvbmZpZyA9IGNvbmZpZyA/IHRoaXMuY29udmVydENvbmZpZyhjb25maWcpIDogREVGQVVMVF9VSV9DT05GSUc7XG4gICAgdGhpcy5jb21wb25lbnRTeW50aGVzaXplciA9IGNyZWF0ZUNvbXBvbmVudFN5bnRoZXNpemVyKHVpQ29uZmlnKTtcbiAgICB0aGlzLmxheW91dEdlbmVyYXRvciA9IGNyZWF0ZUxheW91dEdlbmVyYXRvcigpO1xuICAgIHRoaXMuZGVzaWduU3lzdGVtTWFwcGVyID0gY3JlYXRlRGVzaWduU3lzdGVtTWFwcGVyKCk7XG4gICAgdGhpcy5pbnRlcmFjdGlvbkZsb3dFbmdpbmUgPSBjcmVhdGVJbnRlcmFjdGlvbkZsb3dFbmdpbmUoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZW5lcmF0ZSBjb21wbGV0ZSBwcm90b3R5cGUgZnJvbSBQUkRcbiAgICovXG4gIGFzeW5jIGdlbmVyYXRlKHByZDogUFJELCBjb25maWc/OiBHZW5lcmF0aW9uQ29uZmlnKTogUHJvbWlzZTxQcm90b3R5cGVEZWZpbml0aW9uPiB7XG4gICAgLy8gQ2hlY2sgY2FjaGVcbiAgICBjb25zdCBjYWNoZWQgPSB0aGlzLnByb3RvdHlwZUNhY2hlLmdldChwcmQuaWQpO1xuICAgIGlmIChjYWNoZWQpIHJldHVybiBjYWNoZWQ7XG5cbiAgICBjb25zdCBlZmZlY3RpdmVDb25maWcgPSBjb25maWcgfHwgdGhpcy5nZXREZWZhdWx0Q29uZmlnKCk7XG5cbiAgICAvLyAxLiBFeHRyYWN0IGRlc2lnbiB0b2tlbnNcbiAgICBjb25zdCBkZXNpZ25Ub2tlbnMgPSBhd2FpdCB0aGlzLmRlc2lnblN5c3RlbU1hcHBlci5leHRyYWN0RnJvbVBSRChwcmQpO1xuXG4gICAgLy8gMi4gR2VuZXJhdGUgcGFnZXNcbiAgICBjb25zdCBwYWdlcyA9IGF3YWl0IHRoaXMuZ2VuZXJhdGVQYWdlcyhwcmQsIGVmZmVjdGl2ZUNvbmZpZywgZGVzaWduVG9rZW5zKTtcblxuICAgIC8vIDMuIEdlbmVyYXRlIGludGVyYWN0aW9uIGZsb3dzXG4gICAgY29uc3QgZmxvd3MgPSBhd2FpdCB0aGlzLmdlbmVyYXRlRmxvd3MocHJkKTtcblxuICAgIC8vIDQuIENyZWF0ZSBwcm90b3R5cGUgZGVmaW5pdGlvblxuICAgIGNvbnN0IHByb3RvdHlwZTogUHJvdG90eXBlRGVmaW5pdGlvbiA9IHtcbiAgICAgIGlkOiBgcHJvdG90eXBlLSR7cHJkLmlkfWAsXG4gICAgICBwYWdlcyxcbiAgICAgIGZsb3dzLFxuICAgICAgZGVzaWduVG9rZW5zLFxuICAgICAgcHJldmlld1VybDogdGhpcy5nZW5lcmF0ZVByZXZpZXdVcmwocHJkKSxcbiAgICAgIHNoYXJlVXJsOiB0aGlzLmdlbmVyYXRlU2hhcmVVcmwocHJkKSxcbiAgICB9O1xuXG4gICAgdGhpcy5wcm90b3R5cGVDYWNoZS5zZXQocHJkLmlkLCBwcm90b3R5cGUpO1xuICAgIHJldHVybiBwcm90b3R5cGU7XG4gIH1cblxuICAvKipcbiAgICogRXhwb3J0IHByb3RvdHlwZSB0byBGaWdtYVxuICAgKi9cbiAgYXN5bmMgZXhwb3J0VG9GaWdtYShwcm90b3R5cGU6IFByb3RvdHlwZURlZmluaXRpb24pOiBQcm9taXNlPEV4cG9ydFJlc3VsdD4ge1xuICAgIHRyeSB7XG4gICAgICAvLyBTaW11bGF0ZSBGaWdtYSBleHBvcnRcbiAgICAgIGNvbnN0IGNvbXBvbmVudHMgPSBwcm90b3R5cGUucGFnZXMuZmxhdE1hcChwID0+IFxuICAgICAgICBwLmNvbXBvbmVudHMubWFwKGMgPT4gYy5uYW1lKVxuICAgICAgKTtcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgZmlnbWFGaWxlSWQ6IGBmaWdtYS0ke3Byb3RvdHlwZS5pZH0tJHtEYXRlLm5vdygpfWAsXG4gICAgICAgIGZpZ21hVXJsOiBgaHR0cHM6Ly9maWdtYS5jb20vZmlsZS8ke3Byb3RvdHlwZS5pZH1gLFxuICAgICAgICBjb21wb25lbnRzLFxuICAgICAgfTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgIGNvbXBvbmVudHM6IFtdLFxuICAgICAgICBlcnJvcnM6IFtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdFeHBvcnQgZmFpbGVkJ10sXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBFeHBvcnQgcHJvdG90eXBlIHRvIGNvZGVcbiAgICovXG4gIGFzeW5jIGV4cG9ydFRvQ29kZShcbiAgICBwcm90b3R5cGU6IFByb3RvdHlwZURlZmluaXRpb24sXG4gICAgb3B0aW9uczogRXhwb3J0T3B0aW9uc1xuICApOiBQcm9taXNlPENvZGVFeHBvcnQ+IHtcbiAgICBjb25zdCBmaWxlczogRXhwb3J0ZWRGaWxlW10gPSBbXTtcbiAgICBsZXQgdG90YWxMaW5lcyA9IDA7XG4gICAgbGV0IGNvbXBvbmVudENvdW50ID0gMDtcbiAgICBsZXQgdGVzdENvdW50ID0gMDtcbiAgICBsZXQgc3RvcnlDb3VudCA9IDA7XG5cbiAgICAvLyBHZW5lcmF0ZSBjb21wb25lbnQgZmlsZXNcbiAgICBmb3IgKGNvbnN0IHBhZ2Ugb2YgcHJvdG90eXBlLnBhZ2VzKSB7XG4gICAgICBmb3IgKGNvbnN0IGNvbXBvbmVudCBvZiBwYWdlLmNvbXBvbmVudHMpIHtcbiAgICAgICAgY29uc3QgY29tcG9uZW50RmlsZSA9IHRoaXMuZ2VuZXJhdGVDb21wb25lbnRGaWxlKGNvbXBvbmVudCwgcGFnZSwgb3B0aW9ucyk7XG4gICAgICAgIGZpbGVzLnB1c2goY29tcG9uZW50RmlsZSk7XG4gICAgICAgIHRvdGFsTGluZXMgKz0gY29tcG9uZW50RmlsZS5jb250ZW50LnNwbGl0KCdcXG4nKS5sZW5ndGg7XG4gICAgICAgIGNvbXBvbmVudENvdW50Kys7XG5cbiAgICAgICAgLy8gR2VuZXJhdGUgdGVzdCBmaWxlIGlmIHJlcXVlc3RlZFxuICAgICAgICBpZiAob3B0aW9ucy5pbmNsdWRlVGVzdHMpIHtcbiAgICAgICAgICBjb25zdCB0ZXN0RmlsZSA9IHRoaXMuZ2VuZXJhdGVUZXN0RmlsZShjb21wb25lbnQsIHBhZ2UsIG9wdGlvbnMpO1xuICAgICAgICAgIGZpbGVzLnB1c2godGVzdEZpbGUpO1xuICAgICAgICAgIHRvdGFsTGluZXMgKz0gdGVzdEZpbGUuY29udGVudC5zcGxpdCgnXFxuJykubGVuZ3RoO1xuICAgICAgICAgIHRlc3RDb3VudCsrO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gR2VuZXJhdGUgc3RvcnkgZmlsZSBpZiByZXF1ZXN0ZWRcbiAgICAgICAgaWYgKG9wdGlvbnMuaW5jbHVkZVN0b3JpZXMpIHtcbiAgICAgICAgICBjb25zdCBzdG9yeUZpbGUgPSB0aGlzLmdlbmVyYXRlU3RvcnlGaWxlKGNvbXBvbmVudCwgcGFnZSwgb3B0aW9ucyk7XG4gICAgICAgICAgZmlsZXMucHVzaChzdG9yeUZpbGUpO1xuICAgICAgICAgIHRvdGFsTGluZXMgKz0gc3RvcnlGaWxlLmNvbnRlbnQuc3BsaXQoJ1xcbicpLmxlbmd0aDtcbiAgICAgICAgICBzdG9yeUNvdW50Kys7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gR2VuZXJhdGUgcGFnZSBsYXlvdXQgZmlsZVxuICAgICAgY29uc3QgbGF5b3V0RmlsZSA9IHRoaXMuZ2VuZXJhdGVMYXlvdXRGaWxlKHBhZ2UsIHByb3RvdHlwZS5kZXNpZ25Ub2tlbnMsIG9wdGlvbnMpO1xuICAgICAgZmlsZXMucHVzaChsYXlvdXRGaWxlKTtcbiAgICAgIHRvdGFsTGluZXMgKz0gbGF5b3V0RmlsZS5jb250ZW50LnNwbGl0KCdcXG4nKS5sZW5ndGg7XG4gICAgfVxuXG4gICAgLy8gR2VuZXJhdGUgZGVzaWduIHRva2VucyBmaWxlXG4gICAgY29uc3QgdG9rZW5zRmlsZSA9IHRoaXMuZ2VuZXJhdGVUb2tlbnNGaWxlKHByb3RvdHlwZS5kZXNpZ25Ub2tlbnMsIG9wdGlvbnMpO1xuICAgIGZpbGVzLnB1c2godG9rZW5zRmlsZSk7XG4gICAgdG90YWxMaW5lcyArPSB0b2tlbnNGaWxlLmNvbnRlbnQuc3BsaXQoJ1xcbicpLmxlbmd0aDtcblxuICAgIC8vIEdlbmVyYXRlIGluZGV4IGZpbGVcbiAgICBjb25zdCBpbmRleEZpbGUgPSB0aGlzLmdlbmVyYXRlSW5kZXhGaWxlKGZpbGVzLCBvcHRpb25zKTtcbiAgICBmaWxlcy5wdXNoKGluZGV4RmlsZSk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgIGZpbGVzLFxuICAgICAgc3VtbWFyeToge1xuICAgICAgICB0b3RhbEZpbGVzOiBmaWxlcy5sZW5ndGgsXG4gICAgICAgIHRvdGFsTGluZXMsXG4gICAgICAgIGNvbXBvbmVudHM6IGNvbXBvbmVudENvdW50LFxuICAgICAgICB0ZXN0czogdGVzdENvdW50LFxuICAgICAgICBzdG9yaWVzOiBzdG9yeUNvdW50LFxuICAgICAgfSxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIENvbGxlY3QgZmVlZGJhY2sgZm9yIHByb3RvdHlwZVxuICAgKi9cbiAgYXN5bmMgY29sbGVjdEZlZWRiYWNrKHByb3RvdHlwZTogUHJvdG90eXBlRGVmaW5pdGlvbik6IFByb21pc2U8RmVlZGJhY2tbXT4ge1xuICAgIC8vIFNpbXVsYXRlIGZlZWRiYWNrIGNvbGxlY3Rpb25cbiAgICAvLyBJbiBwcm9kdWN0aW9uLCB0aGlzIHdvdWxkIGludGVncmF0ZSB3aXRoIGZlZWRiYWNrIGNvbGxlY3Rpb24gc2VydmljZVxuICAgIHJldHVybiBbXG4gICAgICB7XG4gICAgICAgIGlkOiAnZmVlZGJhY2stMScsXG4gICAgICAgIHVzZXJJZDogJ3VzZXItMScsXG4gICAgICAgIHBhZ2VJZDogcHJvdG90eXBlLnBhZ2VzWzBdPy5pZCB8fCAnJyxcbiAgICAgICAgcmF0aW5nOiA0LFxuICAgICAgICBjb21tZW50OiAnR3JlYXQgbGF5b3V0LCBidXQgY291bGQgaW1wcm92ZSBtb2JpbGUgcmVzcG9uc2l2ZW5lc3MnLFxuICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCksXG4gICAgICB9LFxuICAgIF07XG4gIH1cblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIFByaXZhdGUgTWV0aG9kcyAtIEdlbmVyYXRpb25cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gIHByaXZhdGUgYXN5bmMgZ2VuZXJhdGVQYWdlcyhcbiAgICBwcmQ6IFBSRCxcbiAgICBjb25maWc6IEdlbmVyYXRpb25Db25maWcsXG4gICAgZGVzaWduVG9rZW5zOiBEZXNpZ25Ub2tlbnNcbiAgKTogUHJvbWlzZTxQYWdlRGVmaW5pdGlvbltdPiB7XG4gICAgY29uc3QgcGFnZXM6IFBhZ2VEZWZpbml0aW9uW10gPSBbXTtcblxuICAgIC8vIEdlbmVyYXRlIHBhZ2UgZm9yIGVhY2ggdXNlciBmbG93XG4gICAgZm9yIChjb25zdCB1c2VyRmxvdyBvZiBwcmQudXNlckZsb3dzKSB7XG4gICAgICAvLyBHZW5lcmF0ZSBsYXlvdXRcbiAgICAgIGNvbnN0IGxheW91dCA9IGF3YWl0IHRoaXMubGF5b3V0R2VuZXJhdG9yLmdlbmVyYXRlRnJvbUZsb3coXG4gICAgICAgIFt1c2VyRmxvd10sXG4gICAgICAgIHByZC51aVJlcXVpcmVtZW50c1xuICAgICAgKTtcblxuICAgICAgLy8gR2VuZXJhdGUgY29tcG9uZW50c1xuICAgICAgY29uc3QgY29tcG9uZW50cyA9IGF3YWl0IHRoaXMuZ2VuZXJhdGVDb21wb25lbnRzRm9yRmxvdyh1c2VyRmxvdywgY29uZmlnKTtcblxuICAgICAgLy8gR2V0IGZsb3dzIGZvciB0aGlzIHBhZ2VcbiAgICAgIGNvbnN0IGZsb3dzID0gYXdhaXQgdGhpcy5pbnRlcmFjdGlvbkZsb3dFbmdpbmUuZ2VuZXJhdGVGcm9tVXNlckZsb3codXNlckZsb3cpO1xuXG4gICAgICBwYWdlcy5wdXNoKHtcbiAgICAgICAgaWQ6IGBwYWdlLSR7dXNlckZsb3cuaWR9YCxcbiAgICAgICAgbmFtZTogdXNlckZsb3cubmFtZSxcbiAgICAgICAgcGF0aDogdGhpcy5nZW5lcmF0ZVBhZ2VQYXRoKHVzZXJGbG93KSxcbiAgICAgICAgbGF5b3V0LFxuICAgICAgICBjb21wb25lbnRzLFxuICAgICAgICBmbG93czogZmxvd3MubWFwKGYgPT4gZi5pZCksXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gcGFnZXM7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGdlbmVyYXRlQ29tcG9uZW50c0ZvckZsb3coXG4gICAgdXNlckZsb3c6IGFueSxcbiAgICBjb25maWc6IEdlbmVyYXRpb25Db25maWdcbiAgKTogUHJvbWlzZTxhbnlbXT4ge1xuICAgIGNvbnN0IGNvbXBvbmVudHM6IGFueVtdID0gW107XG4gICAgXG4gICAgLy8gR2VuZXJhdGUgY29tcG9uZW50cyBiYXNlZCBvbiBmbG93IHN0ZXBzXG4gICAgZm9yIChjb25zdCBzdGVwIG9mIHVzZXJGbG93LnN0ZXBzKSB7XG4gICAgICBjb25zdCBjb21wb25lbnQgPSBhd2FpdCB0aGlzLmNvbXBvbmVudFN5bnRoZXNpemVyLnN5bnRoZXNpemUoXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogYHJlcS0ke3N0ZXAuaWR9YCxcbiAgICAgICAgICBkZXNjcmlwdGlvbjogc3RlcC5hY3Rpb24sXG4gICAgICAgICAgcHJpb3JpdHk6ICdtZWRpdW0nLFxuICAgICAgICAgIGFjY2VwdGFuY2VDcml0ZXJpYTogW10sXG4gICAgICAgIH0sXG4gICAgICAgIHRoaXMuY29udmVydENvbmZpZyhjb25maWcpXG4gICAgICApO1xuXG4gICAgICBjb21wb25lbnRzLnB1c2goe1xuICAgICAgICBpZDogYGNvbXAtJHtzdGVwLmlkfWAsXG4gICAgICAgIG5hbWU6IGNvbXBvbmVudC5jb21wb25lbnROYW1lLFxuICAgICAgICB0eXBlOiBjb21wb25lbnQuY29tcG9uZW50TmFtZSxcbiAgICAgICAgcHJvcHM6IHRoaXMucHJvcHNUb09iamVjdChjb21wb25lbnQucHJvcHMpLFxuICAgICAgICBzdHlsZXM6IHt9LFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNvbXBvbmVudHM7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGdlbmVyYXRlRmxvd3MocHJkOiBQUkQpOiBQcm9taXNlPEludGVyYWN0aW9uRmxvd1tdPiB7XG4gICAgY29uc3QgYWxsRmxvd3M6IEludGVyYWN0aW9uRmxvd1tdID0gW107XG5cbiAgICBmb3IgKGNvbnN0IHVzZXJGbG93IG9mIHByZC51c2VyRmxvd3MpIHtcbiAgICAgIGNvbnN0IGZsb3dzID0gYXdhaXQgdGhpcy5pbnRlcmFjdGlvbkZsb3dFbmdpbmUuZ2VuZXJhdGVGcm9tVXNlckZsb3codXNlckZsb3cpO1xuICAgICAgXG4gICAgICAvLyBBZGQgZXJyb3IgaGFuZGxpbmcgdG8gYWxsIGZsb3dzXG4gICAgICBjb25zdCBmbG93c1dpdGhFcnJvckhhbmRsaW5nID0gZmxvd3MubWFwKGZsb3cgPT5cbiAgICAgICAgdGhpcy5pbnRlcmFjdGlvbkZsb3dFbmdpbmUuYWRkRXJyb3JIYW5kbGluZyhmbG93KVxuICAgICAgKTtcbiAgICAgIFxuICAgICAgYWxsRmxvd3MucHVzaCguLi5mbG93c1dpdGhFcnJvckhhbmRsaW5nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gYWxsRmxvd3M7XG4gIH1cblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIFByaXZhdGUgTWV0aG9kcyAtIENvZGUgR2VuZXJhdGlvblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgcHJpdmF0ZSBnZW5lcmF0ZUNvbXBvbmVudEZpbGUoXG4gICAgY29tcG9uZW50OiBhbnksXG4gICAgcGFnZTogUGFnZURlZmluaXRpb24sXG4gICAgb3B0aW9uczogRXhwb3J0T3B0aW9uc1xuICApOiBFeHBvcnRlZEZpbGUge1xuICAgIGNvbnN0IGNvbnRlbnQgPSBgaW1wb3J0IFJlYWN0IGZyb20gJ3JlYWN0JztcblxuaW50ZXJmYWNlICR7Y29tcG9uZW50Lm5hbWV9UHJvcHMge1xuICBjbGFzc05hbWU/OiBzdHJpbmc7XG4gIGNoaWxkcmVuPzogUmVhY3QuUmVhY3ROb2RlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gJHtjb21wb25lbnQubmFtZX0oeyBjbGFzc05hbWUsIGNoaWxkcmVuIH06ICR7Y29tcG9uZW50Lm5hbWV9UHJvcHMpIHtcbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT17Y2xhc3NOYW1lfT5cbiAgICAgIHtjaGlsZHJlbn1cbiAgICA8L2Rpdj5cbiAgKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgJHtjb21wb25lbnQubmFtZX07XG5gO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHBhdGg6IGAke29wdGlvbnMub3V0cHV0RGlyfS9jb21wb25lbnRzLyR7Y29tcG9uZW50Lm5hbWV9LnRzeGAsXG4gICAgICBjb250ZW50LFxuICAgICAgdHlwZTogJ2NvbXBvbmVudCcsXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2VuZXJhdGVUZXN0RmlsZShcbiAgICBjb21wb25lbnQ6IGFueSxcbiAgICBwYWdlOiBQYWdlRGVmaW5pdGlvbixcbiAgICBvcHRpb25zOiBFeHBvcnRPcHRpb25zXG4gICk6IEV4cG9ydGVkRmlsZSB7XG4gICAgY29uc3QgY29udGVudCA9IGBpbXBvcnQgeyByZW5kZXIsIHNjcmVlbiB9IGZyb20gJ0B0ZXN0aW5nLWxpYnJhcnkvcmVhY3QnO1xuaW1wb3J0ICR7Y29tcG9uZW50Lm5hbWV9IGZyb20gJy4vJHtjb21wb25lbnQubmFtZX0nO1xuXG5kZXNjcmliZSgnJHtjb21wb25lbnQubmFtZX0nLCAoKSA9PiB7XG4gIGl0KCdyZW5kZXJzIGNvcnJlY3RseScsICgpID0+IHtcbiAgICByZW5kZXIoPCR7Y29tcG9uZW50Lm5hbWV9PlRlc3Q8LyR7Y29tcG9uZW50Lm5hbWV9Pik7XG4gICAgZXhwZWN0KHNjcmVlbi5nZXRCeVRleHQoJ1Rlc3QnKSkudG9CZUluVGhlRG9jdW1lbnQoKTtcbiAgfSk7XG59KTtcbmA7XG5cbiAgICByZXR1cm4ge1xuICAgICAgcGF0aDogYCR7b3B0aW9ucy5vdXRwdXREaXJ9L2NvbXBvbmVudHMvJHtjb21wb25lbnQubmFtZX0udGVzdC50c3hgLFxuICAgICAgY29udGVudCxcbiAgICAgIHR5cGU6ICd0ZXN0JyxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBnZW5lcmF0ZVN0b3J5RmlsZShcbiAgICBjb21wb25lbnQ6IGFueSxcbiAgICBwYWdlOiBQYWdlRGVmaW5pdGlvbixcbiAgICBvcHRpb25zOiBFeHBvcnRPcHRpb25zXG4gICk6IEV4cG9ydGVkRmlsZSB7XG4gICAgY29uc3QgY29udGVudCA9IGBpbXBvcnQgdHlwZSB7IE1ldGEsIFN0b3J5T2JqIH0gZnJvbSAnQHN0b3J5Ym9vay9yZWFjdCc7XG5pbXBvcnQgJHtjb21wb25lbnQubmFtZX0gZnJvbSAnLi8ke2NvbXBvbmVudC5uYW1lfSc7XG5cbmNvbnN0IG1ldGEgPSB7XG4gIHRpdGxlOiAnQ29tcG9uZW50cy8ke2NvbXBvbmVudC5uYW1lfScsXG4gIGNvbXBvbmVudDogJHtjb21wb25lbnQubmFtZX0sXG59IHNhdGlzZmllcyBNZXRhPHR5cGVvZiAke2NvbXBvbmVudC5uYW1lfT47XG5cbmV4cG9ydCBkZWZhdWx0IG1ldGE7XG50eXBlIFN0b3J5ID0gU3RvcnlPYmo8dHlwZW9mIG1ldGE+O1xuXG5leHBvcnQgY29uc3QgRGVmYXVsdDogU3RvcnkgPSB7XG4gIGFyZ3M6IHtcbiAgICBjaGlsZHJlbjogJ0RlZmF1bHQgY29udGVudCcsXG4gIH0sXG59O1xuYDtcblxuICAgIHJldHVybiB7XG4gICAgICBwYXRoOiBgJHtvcHRpb25zLm91dHB1dERpcn0vY29tcG9uZW50cy8ke2NvbXBvbmVudC5uYW1lfS5zdG9yaWVzLnRzeGAsXG4gICAgICBjb250ZW50LFxuICAgICAgdHlwZTogJ3N0b3J5JyxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBnZW5lcmF0ZUxheW91dEZpbGUoXG4gICAgcGFnZTogUGFnZURlZmluaXRpb24sXG4gICAgdG9rZW5zOiBEZXNpZ25Ub2tlbnMsXG4gICAgb3B0aW9uczogRXhwb3J0T3B0aW9uc1xuICApOiBFeHBvcnRlZEZpbGUge1xuICAgIGNvbnN0IGNvbnRlbnQgPSBgaW1wb3J0IFJlYWN0IGZyb20gJ3JlYWN0JztcbmltcG9ydCB7ICR7cGFnZS5jb21wb25lbnRzLm1hcChjID0+IGMubmFtZSkuam9pbignLCAnKX0gfSBmcm9tICcuLi9jb21wb25lbnRzJztcblxuZXhwb3J0IGZ1bmN0aW9uICR7cGFnZS5uYW1lLnJlcGxhY2UoL1xccysvZywgJycpfUxheW91dCgpIHtcbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cImxheW91dFwiPlxuICAgICAgJHtwYWdlLmNvbXBvbmVudHMubWFwKGMgPT4gYDwke2MubmFtZX0gLz5gKS5qb2luKCdcXG4gICAgICAnKX1cbiAgICA8L2Rpdj5cbiAgKTtcbn1cbmA7XG5cbiAgICByZXR1cm4ge1xuICAgICAgcGF0aDogYCR7b3B0aW9ucy5vdXRwdXREaXJ9L2xheW91dHMvJHtwYWdlLm5hbWUucmVwbGFjZSgvXFxzKy9nLCAnJyl9TGF5b3V0LnRzeGAsXG4gICAgICBjb250ZW50LFxuICAgICAgdHlwZTogJ2NvbXBvbmVudCcsXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2VuZXJhdGVUb2tlbnNGaWxlKHRva2VuczogRGVzaWduVG9rZW5zLCBvcHRpb25zOiBFeHBvcnRPcHRpb25zKTogRXhwb3J0ZWRGaWxlIHtcbiAgICBjb25zdCBjb250ZW50ID0gYGV4cG9ydCBjb25zdCBkZXNpZ25Ub2tlbnMgPSAke0pTT04uc3RyaW5naWZ5KHRva2VucywgbnVsbCwgMil9O1xuXG5leHBvcnQgdHlwZSBEZXNpZ25Ub2tlbnMgPSB0eXBlb2YgZGVzaWduVG9rZW5zO1xuYDtcblxuICAgIHJldHVybiB7XG4gICAgICBwYXRoOiBgJHtvcHRpb25zLm91dHB1dERpcn0vdG9rZW5zL2Rlc2lnbi10b2tlbnMudHNgLFxuICAgICAgY29udGVudCxcbiAgICAgIHR5cGU6ICd0eXBlJyxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBnZW5lcmF0ZUluZGV4RmlsZShmaWxlczogRXhwb3J0ZWRGaWxlW10sIG9wdGlvbnM6IEV4cG9ydE9wdGlvbnMpOiBFeHBvcnRlZEZpbGUge1xuICAgIGNvbnN0IGNvbXBvbmVudEV4cG9ydHMgPSBmaWxlc1xuICAgICAgLmZpbHRlcihmID0+IGYudHlwZSA9PT0gJ2NvbXBvbmVudCcgJiYgIWYucGF0aC5pbmNsdWRlcygnTGF5b3V0JykpXG4gICAgICAubWFwKGYgPT4ge1xuICAgICAgICBjb25zdCBuYW1lID0gZi5wYXRoLnNwbGl0KCcvJykucG9wKCk/LnJlcGxhY2UoJy50c3gnLCAnJyk7XG4gICAgICAgIHJldHVybiBgZXhwb3J0IHsgJHtuYW1lfSB9IGZyb20gJy4vY29tcG9uZW50cy8ke25hbWV9JztgO1xuICAgICAgfSlcbiAgICAgIC5qb2luKCdcXG4nKTtcblxuICAgIGNvbnN0IGNvbnRlbnQgPSBgLy8gQXV0by1nZW5lcmF0ZWQgaW5kZXggZmlsZVxuJHtjb21wb25lbnRFeHBvcnRzfVxuXG5leHBvcnQgeyBkZXNpZ25Ub2tlbnMgfSBmcm9tICcuL3Rva2Vucy9kZXNpZ24tdG9rZW5zJztcbmA7XG5cbiAgICByZXR1cm4ge1xuICAgICAgcGF0aDogYCR7b3B0aW9ucy5vdXRwdXREaXJ9L2luZGV4LnRzYCxcbiAgICAgIGNvbnRlbnQsXG4gICAgICB0eXBlOiAndHlwZScsXG4gICAgfTtcbiAgfVxuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gUHJpdmF0ZSBNZXRob2RzIC0gVXRpbGl0aWVzXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICBwcml2YXRlIGdldERlZmF1bHRDb25maWcoKTogR2VuZXJhdGlvbkNvbmZpZyB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGZyYW1ld29yazogJ3JlYWN0JyxcbiAgICAgIHVpTGlicmFyeTogJ2FudGQnLFxuICAgICAgc3R5bGluZzogJ3RhaWx3aW5kJyxcbiAgICAgIHJlc3BvbnNpdmU6IHRydWUsXG4gICAgICBhY2Nlc3NpYmxlOiB0cnVlLFxuICAgICAgdGhlbWU6ICdsaWdodCcsXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgY29udmVydENvbmZpZyhjb25maWc6IEdlbmVyYXRpb25Db25maWcpIHtcbiAgICByZXR1cm4ge1xuICAgICAgZnJhbWV3b3JrOiBjb25maWcuZnJhbWV3b3JrLFxuICAgICAgdWlMaWJyYXJ5OiBjb25maWcudWlMaWJyYXJ5LFxuICAgICAgc3R5bGluZzogY29uZmlnLnN0eWxpbmcsXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2VuZXJhdGVQYWdlUGF0aCh1c2VyRmxvdzogYW55KTogc3RyaW5nIHtcbiAgICByZXR1cm4gYC8ke3VzZXJGbG93Lm5hbWUudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC9cXHMrL2csICctJyl9YDtcbiAgfVxuXG4gIHByaXZhdGUgZ2VuZXJhdGVQcmV2aWV3VXJsKHByZDogUFJEKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYGh0dHBzOi8vcHJvdG90eXBlLmFuZnNmLmRldi9wcmV2aWV3LyR7cHJkLmlkfWA7XG4gIH1cblxuICBwcml2YXRlIGdlbmVyYXRlU2hhcmVVcmwocHJkOiBQUkQpOiBzdHJpbmcge1xuICAgIHJldHVybiBgaHR0cHM6Ly9wcm90b3R5cGUuYW5mc2YuZGV2L3NoYXJlLyR7cHJkLmlkfWA7XG4gIH1cblxuICBwcml2YXRlIHByb3BzVG9PYmplY3QocHJvcHM6IGFueVtdKTogUmVjb3JkPHN0cmluZywgYW55PiB7XG4gICAgcmV0dXJuIHByb3BzLnJlZHVjZSgoYWNjLCBwcm9wKSA9PiB7XG4gICAgICBhY2NbcHJvcC5uYW1lXSA9IHByb3AuZGVmYXVsdFZhbHVlIHx8IG51bGw7XG4gICAgICByZXR1cm4gYWNjO1xuICAgIH0sIHt9IGFzIFJlY29yZDxzdHJpbmcsIGFueT4pO1xuICB9XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEZhY3RvcnkgRnVuY3Rpb25cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVByb3RvdHlwZUdlbmVyYXRvcihjb25maWc/OiBHZW5lcmF0aW9uQ29uZmlnKTogUHJvdG90eXBlR2VuZXJhdG9yIHtcbiAgcmV0dXJuIG5ldyBQcm90b3R5cGVHZW5lcmF0b3IoY29uZmlnKTtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gVXRpbGl0eSBGdW5jdGlvbnNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBHZW5lcmF0ZSBwcm90b3R5cGUgc3VtbWFyeVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVQcm90b3R5cGVTdW1tYXJ5KHByb3RvdHlwZTogUHJvdG90eXBlRGVmaW5pdGlvbik6IHN0cmluZyB7XG4gIHJldHVybiBgXG4jIFByb3RvdHlwZSBTdW1tYXJ5XG5cbioqSUQqKjogJHtwcm90b3R5cGUuaWR9XG4qKlBhZ2VzKio6ICR7cHJvdG90eXBlLnBhZ2VzLmxlbmd0aH1cbioqRmxvd3MqKjogJHtwcm90b3R5cGUuZmxvd3MubGVuZ3RofVxuKipQcmV2aWV3Kio6ICR7cHJvdG90eXBlLnByZXZpZXdVcmx9XG4qKlNoYXJlKio6ICR7cHJvdG90eXBlLnNoYXJlVXJsfVxuXG4jIyBQYWdlc1xuXG4ke3Byb3RvdHlwZS5wYWdlcy5tYXAocCA9PiBgLSAke3AubmFtZX0gKCR7cC5wYXRofSkgLSAke3AuY29tcG9uZW50cy5sZW5ndGh9IGNvbXBvbmVudHNgKS5qb2luKCdcXG4nKX1cblxuIyMgRGVzaWduIFRva2Vuc1xuXG4tIENvbG9yczogUHJpbWFyeSwgU2Vjb25kYXJ5LCBOZXV0cmFsLCBTZW1hbnRpY1xuLSBUeXBvZ3JhcGh5OiAke3Byb3RvdHlwZS5kZXNpZ25Ub2tlbnMudHlwb2dyYXBoeS5mb250RmFtaWx5fVxuLSBTcGFjaW5nIFNjYWxlOiAke09iamVjdC5rZXlzKHByb3RvdHlwZS5kZXNpZ25Ub2tlbnMuc3BhY2luZykubGVuZ3RofSB2YWx1ZXNcbi0gU2hhZG93czogJHtPYmplY3Qua2V5cyhwcm90b3R5cGUuZGVzaWduVG9rZW5zLnNoYWRvd3MpLmxlbmd0aH0gdmFyaWFudHNcbi0gQm9yZGVyIFJhZGl1czogJHtPYmplY3Qua2V5cyhwcm90b3R5cGUuZGVzaWduVG9rZW5zLnJhZGlpKS5sZW5ndGh9IHZhcmlhbnRzXG5gLnRyaW0oKTtcbn1cblxuLyoqXG4gKiBDYWxjdWxhdGUgcHJvdG90eXBlIGNvbXBsZXhpdHkgc2NvcmVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNhbGN1bGF0ZVByb3RvdHlwZUNvbXBsZXhpdHkocHJvdG90eXBlOiBQcm90b3R5cGVEZWZpbml0aW9uKTogbnVtYmVyIHtcbiAgbGV0IHNjb3JlID0gMDtcblxuICAvLyBQYWdlIGNvbXBsZXhpdHlcbiAgc2NvcmUgKz0gcHJvdG90eXBlLnBhZ2VzLmxlbmd0aCAqIDIwO1xuXG4gIC8vIENvbXBvbmVudCBjb21wbGV4aXR5XG4gIGNvbnN0IHRvdGFsQ29tcG9uZW50cyA9IHByb3RvdHlwZS5wYWdlcy5yZWR1Y2UoKHN1bSwgcCkgPT4gc3VtICsgcC5jb21wb25lbnRzLmxlbmd0aCwgMCk7XG4gIHNjb3JlICs9IHRvdGFsQ29tcG9uZW50cyAqIDEwO1xuXG4gIC8vIEZsb3cgY29tcGxleGl0eVxuICBzY29yZSArPSBwcm90b3R5cGUuZmxvd3MubGVuZ3RoICogMTU7XG5cbiAgLy8gRGVzaWduIHN5c3RlbSBjb21wbGV4aXR5XG4gIHNjb3JlICs9IE9iamVjdC5rZXlzKHByb3RvdHlwZS5kZXNpZ25Ub2tlbnMuY29sb3JzKS5sZW5ndGggKiA1O1xuICBzY29yZSArPSBPYmplY3Qua2V5cyhwcm90b3R5cGUuZGVzaWduVG9rZW5zLnR5cG9ncmFwaHkpLmxlbmd0aCAqIDM7XG5cbiAgcmV0dXJuIE1hdGgubWluKDEwMCwgc2NvcmUpO1xufVxuXG4vKipcbiAqIFZhbGlkYXRlIHByb3RvdHlwZSBjb21wbGV0ZW5lc3NcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHZhbGlkYXRlUHJvdG90eXBlKHByb3RvdHlwZTogUHJvdG90eXBlRGVmaW5pdGlvbik6IHsgdmFsaWQ6IGJvb2xlYW47IGlzc3Vlczogc3RyaW5nW10gfSB7XG4gIGNvbnN0IGlzc3Vlczogc3RyaW5nW10gPSBbXTtcblxuICAvLyBDaGVjayBwYWdlc1xuICBpZiAocHJvdG90eXBlLnBhZ2VzLmxlbmd0aCA9PT0gMCkge1xuICAgIGlzc3Vlcy5wdXNoKCdQcm90b3R5cGUgbXVzdCBoYXZlIGF0IGxlYXN0IG9uZSBwYWdlJyk7XG4gIH1cblxuICAvLyBDaGVjayBjb21wb25lbnRzXG4gIGZvciAoY29uc3QgcGFnZSBvZiBwcm90b3R5cGUucGFnZXMpIHtcbiAgICBpZiAocGFnZS5jb21wb25lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgaXNzdWVzLnB1c2goYFBhZ2UgXCIke3BhZ2UubmFtZX1cIiBoYXMgbm8gY29tcG9uZW50c2ApO1xuICAgIH1cbiAgfVxuXG4gIC8vIENoZWNrIGZsb3dzXG4gIGlmIChwcm90b3R5cGUuZmxvd3MubGVuZ3RoID09PSAwKSB7XG4gICAgaXNzdWVzLnB1c2goJ1Byb3RvdHlwZSBzaG91bGQgaGF2ZSBhdCBsZWFzdCBvbmUgaW50ZXJhY3Rpb24gZmxvdycpO1xuICB9XG5cbiAgLy8gQ2hlY2sgZGVzaWduIHRva2Vuc1xuICBpZiAoIXByb3RvdHlwZS5kZXNpZ25Ub2tlbnMuY29sb3JzKSB7XG4gICAgaXNzdWVzLnB1c2goJ01pc3NpbmcgY29sb3IgdG9rZW5zJyk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIHZhbGlkOiBpc3N1ZXMubGVuZ3RoID09PSAwLFxuICAgIGlzc3VlcyxcbiAgfTtcbn1cbiJdfQ==