/**
 * Prototype Generator
 * 
 * Integrates all UI modules to generate complete interactive prototypes
 * from PRD. Supports export to Figma and code.
 * 
 * @version 1.4.0
 */

import type {
  PrototypeDefinition,
  PageDefinition,
  GenerationConfig,
  ExportResult,
  ExportOptions,
  CodeExport,
  ExportedFile,
  ExportSummary,
  Feedback,
  PRD,
  DesignTokens,
  InteractionFlow,
  LayoutDefinition,
  ComponentSynthesisResult,
} from './types';
import { UIComponentSynthesizer, createComponentSynthesizer, DEFAULT_UI_CONFIG } from './ui-component-synthesizer';
import { LayoutGenerator, createLayoutGenerator } from './layout-generator';
import { DesignSystemMapper, createDesignSystemMapper } from './design-system-mapper';
import { InteractionFlowEngine, createInteractionFlowEngine } from './interaction-flow-engine';

// ============================================================================
// Prototype Generator Class
// ============================================================================

export class PrototypeGenerator {
  private componentSynthesizer: UIComponentSynthesizer;
  private layoutGenerator: LayoutGenerator;
  private designSystemMapper: DesignSystemMapper;
  private interactionFlowEngine: InteractionFlowEngine;
  private prototypeCache: Map<string, PrototypeDefinition> = new Map();

  constructor(config?: GenerationConfig) {
    const uiConfig = config ? this.convertConfig(config) : DEFAULT_UI_CONFIG;
    this.componentSynthesizer = createComponentSynthesizer(uiConfig);
    this.layoutGenerator = createLayoutGenerator();
    this.designSystemMapper = createDesignSystemMapper();
    this.interactionFlowEngine = createInteractionFlowEngine();
  }

  /**
   * Generate complete prototype from PRD
   */
  async generate(prd: PRD, config?: GenerationConfig): Promise<PrototypeDefinition> {
    // Check cache
    const cached = this.prototypeCache.get(prd.id);
    if (cached) return cached;

    const effectiveConfig = config || this.getDefaultConfig();

    // 1. Extract design tokens
    const designTokens = await this.designSystemMapper.extractFromPRD(prd);

    // 2. Generate pages
    const pages = await this.generatePages(prd, effectiveConfig, designTokens);

    // 3. Generate interaction flows
    const flows = await this.generateFlows(prd);

    // 4. Create prototype definition
    const prototype: PrototypeDefinition = {
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
  async exportToFigma(prototype: PrototypeDefinition): Promise<ExportResult> {
    try {
      // Simulate Figma export
      const components = prototype.pages.flatMap(p => 
        p.components.map(c => c.name)
      );

      return {
        success: true,
        figmaFileId: `figma-${prototype.id}-${Date.now()}`,
        figmaUrl: `https://figma.com/file/${prototype.id}`,
        components,
      };
    } catch (error) {
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
  async exportToCode(
    prototype: PrototypeDefinition,
    options: ExportOptions
  ): Promise<CodeExport> {
    const files: ExportedFile[] = [];
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
  async collectFeedback(prototype: PrototypeDefinition): Promise<Feedback[]> {
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

  private async generatePages(
    prd: PRD,
    config: GenerationConfig,
    designTokens: DesignTokens
  ): Promise<PageDefinition[]> {
    const pages: PageDefinition[] = [];

    // Generate page for each user flow
    for (const userFlow of prd.userFlows) {
      // Generate layout
      const layout = await this.layoutGenerator.generateFromFlow(
        [userFlow],
        prd.uiRequirements
      );

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

  private async generateComponentsForFlow(
    userFlow: any,
    config: GenerationConfig
  ): Promise<any[]> {
    const components: any[] = [];
    
    // Generate components based on flow steps
    for (const step of userFlow.steps) {
      const component = await this.componentSynthesizer.synthesize(
        {
          id: `req-${step.id}`,
          description: step.action,
          priority: 'medium',
          acceptanceCriteria: [],
        },
        this.convertConfig(config)
      );

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

  private async generateFlows(prd: PRD): Promise<InteractionFlow[]> {
    const allFlows: InteractionFlow[] = [];

    for (const userFlow of prd.userFlows) {
      const flows = await this.interactionFlowEngine.generateFromUserFlow(userFlow);
      
      // Add error handling to all flows
      const flowsWithErrorHandling = flows.map(flow =>
        this.interactionFlowEngine.addErrorHandling(flow)
      );
      
      allFlows.push(...flowsWithErrorHandling);
    }

    return allFlows;
  }

  // ============================================================================
  // Private Methods - Code Generation
  // ============================================================================

  private generateComponentFile(
    component: any,
    page: PageDefinition,
    options: ExportOptions
  ): ExportedFile {
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

  private generateTestFile(
    component: any,
    page: PageDefinition,
    options: ExportOptions
  ): ExportedFile {
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

  private generateStoryFile(
    component: any,
    page: PageDefinition,
    options: ExportOptions
  ): ExportedFile {
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

  private generateLayoutFile(
    page: PageDefinition,
    tokens: DesignTokens,
    options: ExportOptions
  ): ExportedFile {
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

  private generateTokensFile(tokens: DesignTokens, options: ExportOptions): ExportedFile {
    const content = `export const designTokens = ${JSON.stringify(tokens, null, 2)};

export type DesignTokens = typeof designTokens;
`;

    return {
      path: `${options.outputDir}/tokens/design-tokens.ts`,
      content,
      type: 'type',
    };
  }

  private generateIndexFile(files: ExportedFile[], options: ExportOptions): ExportedFile {
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

  private getDefaultConfig(): GenerationConfig {
    return {
      framework: 'react',
      uiLibrary: 'antd',
      styling: 'tailwind',
      responsive: true,
      accessible: true,
      theme: 'light',
    };
  }

  private convertConfig(config: GenerationConfig) {
    return {
      framework: config.framework,
      uiLibrary: config.uiLibrary,
      styling: config.styling,
    };
  }

  private generatePagePath(userFlow: any): string {
    return `/${userFlow.name.toLowerCase().replace(/\s+/g, '-')}`;
  }

  private generatePreviewUrl(prd: PRD): string {
    return `https://prototype.anfsf.dev/preview/${prd.id}`;
  }

  private generateShareUrl(prd: PRD): string {
    return `https://prototype.anfsf.dev/share/${prd.id}`;
  }

  private propsToObject(props: any[]): Record<string, any> {
    return props.reduce((acc, prop) => {
      acc[prop.name] = prop.defaultValue || null;
      return acc;
    }, {} as Record<string, any>);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createPrototypeGenerator(config?: GenerationConfig): PrototypeGenerator {
  return new PrototypeGenerator(config);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate prototype summary
 */
export function generatePrototypeSummary(prototype: PrototypeDefinition): string {
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
export function calculatePrototypeComplexity(prototype: PrototypeDefinition): number {
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
export function validatePrototype(prototype: PrototypeDefinition): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

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
