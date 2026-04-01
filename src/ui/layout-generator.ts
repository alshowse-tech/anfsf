/**
 * Layout Generator
 * 
 * Intelligent page layout generation from user flows and requirements.
 * Supports responsive design and visual hierarchy optimization.
 * 
 * @version 1.4.0
 */

import type {
  LayoutDefinition,
  LayoutSection,
  Breakpoint,
  HierarchyNode,
  UserFlow,
  UIRequirement,
} from './types';
import {
  BREAKPOINTS,
  LAYOUT_PATTERNS,
  SPACING_SCALE,
} from './constants';

// ============================================================================
// Layout Generator Class
// ============================================================================

export class LayoutGenerator {
  private defaultBreakpoints: Breakpoint[] = [
    { name: 'mobile', minWidth: 0, maxWidth: 639, columns: 4, gutter: 16 },
    { name: 'tablet', minWidth: 640, maxWidth: 1023, columns: 8, gutter: 24 },
    { name: 'desktop', minWidth: 1024, maxWidth: Infinity, columns: 12, gutter: 32 },
  ];

  /**
   * Generate layout from user flow and requirements
   */
  async generateFromFlow(
    userFlow: UserFlow[],
    requirements: UIRequirement[]
  ): Promise<LayoutDefinition> {
    const layoutType = this.detectLayoutType(userFlow, requirements);
    const sections = this.generateSections(userFlow, requirements, layoutType);
    const breakpoints = this.generateBreakpoints();
    const visualHierarchy = this.buildVisualHierarchy(sections);

    return {
      id: this.generateLayoutId(userFlow),
      type: layoutType,
      sections,
      breakpoints,
      visualHierarchy,
    };
  }

  /**
   * Adapt layout to specific breakpoint
   */
  adaptToBreakpoint(
    layout: LayoutDefinition,
    breakpoint: 'mobile' | 'tablet' | 'desktop'
  ): LayoutDefinition {
    const bpConfig = BREAKPOINTS[breakpoint];
    
    // Adapt sections for the breakpoint
    const adaptedSections = this.adaptSections(layout.sections, breakpoint);
    
    // Adjust visual hierarchy
    const adaptedHierarchy = this.adaptHierarchy(layout.visualHierarchy, breakpoint);

    return {
      ...layout,
      sections: adaptedSections,
      visualHierarchy: adaptedHierarchy,
      breakpoints: [layout.breakpoints.find(b => b.name === breakpoint) || bpConfig],
    };
  }

  /**
   * Optimize visual hierarchy
   */
  optimizeVisualHierarchy(layout: LayoutDefinition): LayoutDefinition {
    const optimizedHierarchy = this.optimizeHierarchy(layout.visualHierarchy);
    const optimizedSections = this.optimizeSectionOrder(layout.sections, optimizedHierarchy);

    return {
      ...layout,
      sections: optimizedSections,
      visualHierarchy: optimizedHierarchy,
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private detectLayoutType(
    userFlow: UserFlow[],
    requirements: UIRequirement[]
  ): 'grid' | 'flex' | 'masonry' {
    const flowText = JSON.stringify(userFlow).toLowerCase();
    const reqText = JSON.stringify(requirements).toLowerCase();

    // Detect dashboard pattern
    if (flowText.includes('dashboard') || reqText.includes('dashboard')) {
      return 'grid';
    }

    // Detect content-heavy layout
    if (flowText.includes('gallery') || reqText.includes('gallery') || reqText.includes('cards')) {
      return 'masonry';
    }

    // Default to flex for most cases
    return 'flex';
  }

  private generateLayoutId(userFlow: UserFlow[]): string {
    const flowNames = userFlow.map(f => f.name).join('-');
    return `layout-${flowNames.toLowerCase().replace(/\s+/g, '-')}`;
  }

  private generateSections(
    userFlow: UserFlow[],
    requirements: UIRequirement[],
    layoutType: string
  ): LayoutSection[] {
    const pattern = LAYOUT_PATTERNS[this.detectLayoutPattern(userFlow)];
    const sections: LayoutSection[] = [];

    // Generate sections based on pattern
    for (const sectionName of pattern.sections) {
      sections.push(this.createSection(sectionName, layoutType));
    }

    // Add sections from requirements
    for (const req of requirements) {
      if (req.description.includes('sidebar')) {
        sections.push(this.createSection('sidebar', layoutType));
      }
      if (req.description.includes('navigation') || req.description.includes('nav')) {
        sections.push(this.createSection('nav', layoutType));
      }
    }

    return this.deduplicateSections(sections);
  }

  private detectLayoutPattern(userFlow: UserFlow[]): keyof typeof LAYOUT_PATTERNS {
    const flowText = JSON.stringify(userFlow).toLowerCase();

    if (flowText.includes('dashboard')) return 'dashboard';
    if (flowText.includes('landing') || flowText.includes('home')) return 'landing';
    if (flowText.includes('form') || flowText.includes('submit')) return 'form';
    if (flowText.includes('list') || flowText.includes('items')) return 'list';
    if (flowText.includes('detail') || flowText.includes('view')) return 'detail';

    return 'landing'; // Default
  }

  private createSection(name: string, layoutType: string): LayoutSection {
    const section: LayoutSection = {
      id: `section-${name}`,
      name,
      type: this.getSectionType(name),
      styles: this.generateSectionStyles(name, layoutType),
    };

    // Add grid area for grid layouts
    if (layoutType === 'grid') {
      section.gridArea = this.getGridArea(name);
    }

    return section;
  }

  private getSectionType(name: string): LayoutSection['type'] {
    const typeMap: Record<string, LayoutSection['type']> = {
      header: 'header',
      footer: 'footer',
      sidebar: 'sidebar',
      main: 'main',
      nav: 'nav',
      content: 'content',
      hero: 'main',
      features: 'content',
      filter: 'content',
      list: 'content',
      pagination: 'content',
      breadcrumb: 'nav',
    };

    return typeMap[name] || 'content';
  }

  private getGridArea(name: string): string {
    const gridAreas: Record<string, string> = {
      header: 'header',
      footer: 'footer',
      sidebar: 'sidebar',
      main: 'main',
      nav: 'nav',
      content: 'content',
    };

    return gridAreas[name] || name;
  }

  private generateSectionStyles(name: string, layoutType: string): Record<string, string> {
    const baseStyles: Record<string, string> = {
      padding: SPACING_SCALE[4],
      display: layoutType === 'grid' ? 'grid' : 'flex',
    };

    const specificStyles: Record<string, Record<string, string>> = {
      header: { minHeight: '64px', borderBottom: '1px solid #e5e5e5' },
      footer: { minHeight: '48px', borderTop: '1px solid #e5e5e5', marginTop: SPACING_SCALE[8] },
      sidebar: { width: '256px', flexShrink: '0' },
      main: { flex: '1' },
      nav: { display: 'flex', gap: SPACING_SCALE[4] },
      content: { flex: '1' },
    };

    return { ...baseStyles, ...(specificStyles[name] || {}) };
  }

  private deduplicateSections(sections: LayoutSection[]): LayoutSection[] {
    const seen = new Set<string>();
    return sections.filter(section => {
      if (seen.has(section.name)) return false;
      seen.add(section.name);
      return true;
    });
  }

  private generateBreakpoints(): Breakpoint[] {
    return this.defaultBreakpoints.map(bp => ({
      name: bp.name,
      minWidth: bp.minWidth,
      maxWidth: bp.maxWidth,
      columns: bp.columns,
      gutter: bp.gutter,
    }));
  }

  private buildVisualHierarchy(sections: LayoutSection[]): HierarchyNode[] {
    const hierarchy: HierarchyNode[] = [];
    let level = 0;

    for (const section of sections) {
      const weight = this.calculateSectionWeight(section);
      hierarchy.push({
        id: section.id,
        level,
        weight,
      });
      level++;
    }

    return hierarchy;
  }

  private calculateSectionWeight(section: LayoutSection): number {
    const weightMap: Record<string, number> = {
      header: 90,
      nav: 80,
      main: 100,
      content: 85,
      sidebar: 70,
      footer: 50,
      hero: 95,
      features: 80,
      list: 75,
      filter: 60,
      pagination: 40,
      breadcrumb: 55,
    };

    return weightMap[section.name] || 50;
  }

  private adaptSections(sections: LayoutSection[], breakpoint: string): LayoutSection[] {
    return sections.map(section => {
      const adapted = { ...section };

      // Mobile adaptations
      if (breakpoint === 'mobile') {
        if (section.type === 'sidebar') {
          adapted.styles = { ...adapted.styles, display: 'none' }; // Hide sidebar on mobile
        }
        if (section.styles?.width) {
          adapted.styles = { ...adapted.styles, width: '100%' };
        }
      }

      // Tablet adaptations
      if (breakpoint === 'tablet') {
        if (section.type === 'sidebar') {
          adapted.styles = { ...adapted.styles, width: '200px' };
        }
      }

      return adapted;
    });
  }

  private adaptHierarchy(hierarchy: HierarchyNode[], breakpoint: string): HierarchyNode[] {
    return hierarchy.map(node => {
      const adapted = { ...node };

      // Mobile: reduce hierarchy depth
      if (breakpoint === 'mobile') {
        adapted.weight = Math.floor(node.weight * 0.8);
      }

      return adapted;
    });
  }

  private optimizeHierarchy(hierarchy: HierarchyNode[]): HierarchyNode[] {
    // Sort by weight (descending)
    return [...hierarchy].sort((a, b) => b.weight - a.weight);
  }

  private optimizeSectionOrder(
    sections: LayoutSection[],
    hierarchy: HierarchyNode[]
  ): LayoutSection[] {
    const hierarchyOrder = hierarchy.map(h => h.id);
    
    return [...sections].sort((a, b) => {
      const aIndex = hierarchyOrder.indexOf(a.id);
      const bIndex = hierarchyOrder.indexOf(b.id);
      return aIndex - bIndex;
    });
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createLayoutGenerator(): LayoutGenerator {
  return new LayoutGenerator();
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate CSS Grid template from layout
 */
export function generateGridTemplate(layout: LayoutDefinition, breakpoint: string): string {
  const bp = layout.breakpoints.find(b => b.name === breakpoint);
  if (!bp) return '';

  const columns = `repeat(${bp.columns}, 1fr)`;
  const rows = 'auto';

  return `grid-template-columns: ${columns}; grid-template-rows: ${rows}; gap: ${bp.gutter}px;`;
}

/**
 * Generate media queries for breakpoints
 */
export function generateMediaQueries(layout: LayoutDefinition): string {
  return layout.breakpoints
    .map(bp => {
      const maxWidth = bp.maxWidth === Infinity ? '' : ` and (max-width: ${bp.maxWidth}px)`;
      return `@media (min-width: ${bp.minWidth}px${maxWidth}) {
  /* ${bp.name} styles */
}`;
    })
    .join('\n\n');
}

/**
 * Calculate layout complexity score
 */
export function calculateLayoutComplexity(layout: LayoutDefinition): number {
  let score = 0;

  // Base score from sections
  score += layout.sections.length * 10;

  // Complexity from type
  const typeComplexity = { grid: 1.5, flex: 1.0, masonry: 2.0 };
  score *= typeComplexity[layout.type] || 1.0;

  // Complexity from breakpoints
  score += layout.breakpoints.length * 5;

  // Complexity from hierarchy depth
  const maxDepth = Math.max(...layout.visualHierarchy.map(h => h.level));
  score += maxDepth * 3;

  return Math.round(score);
}
