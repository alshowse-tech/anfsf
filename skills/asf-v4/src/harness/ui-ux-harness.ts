/**
 * UI/UX Harness - 设计系统对齐与原型生成
 * 
 * 需求→UI 组件映射、设计 Token 匹配、原型生成、设计一致性检查
 * 
 * @module asf-v4/harness/ui-ux-harness
 * @version 1.0.0
 */

import { createModuleLogger } from '../utils/logger';

const logger = createModuleLogger('UIUXHarness');

// ============================================================================
// 类型定义
// ============================================================================

/**
 * UI 组件类型
 */
export type UIComponentType =
  | 'button' | 'input' | 'select' | 'checkbox' | 'radio'
  | 'table' | 'list' | 'card' | 'modal' | 'form'
  | 'navigation' | 'sidebar' | 'header' | 'footer'
  | 'chart' | 'timeline' | 'stepper' | 'tabs';

/**
 * UI 组件定义
 */
export interface UIComponent {
  id: string;
  type: UIComponentType;
  name: string;
  description?: string;
  props: ComponentProp[];
  children?: UIComponent[];
  layout?: 'horizontal' | 'vertical' | 'grid';
  responsive?: boolean;
}

/**
 * 组件属性
 */
export interface ComponentProp {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'function';
  required: boolean;
  defaultValue?: unknown;
  description?: string;
}

/**
 * 设计 Token
 */
export interface DesignToken {
  name: string;
  category: 'color' | 'typography' | 'spacing' | 'border' | 'shadow' | 'animation';
  value: string;
  description?: string;
}

/**
 * 设计系统
 */
export interface DesignSystem {
  id: string;
  name: string;
  version: string;
  tokens: DesignToken[];
  components: Map<string, UIComponent>;
}

/**
 * 设计映射结果
 */
export interface DesignMapping {
  components: UIComponent[];
  tokens: DesignToken[];
  layout: LayoutConfig;
  consistencyScore: number;
  recommendations: string[];
}

/**
 * 布局配置
 */
export interface LayoutConfig {
  type: 'single-column' | 'two-column' | 'three-column' | 'grid' | 'dashboard';
  breakpoints: Breakpoint[];
  spacing: string;
}

/**
 * 断点配置
 */
export interface Breakpoint {
  name: 'mobile' | 'tablet' | 'desktop' | 'wide';
  minWidth: number;
  columns: number;
  gutter: number;
}

// ============================================================================
// UI/UX Harness 主类
// ============================================================================

export class UIUXHarness {
  private designSystems: Map<string, DesignSystem> = new Map();
  private componentLibrary: Map<string, UIComponent> = new Map();

  constructor() {
    this.initializeDefaultDesignSystem();
    this.initializeComponentLibrary();
    logger.info('🎨 UI/UX Harness 初始化完成');
  }

  /**
   * 需求→UI 组件映射 - 核心方法
   */
  async mapDesignSystem(requirement: string): Promise<DesignMapping> {
    logger.info(`🗺️ 映射设计系统：${requirement.substring(0, 50)}...`);

    // 1. 提取组件需求
    const components = await this.extractComponents(requirement);

    // 2. 匹配设计 Token
    const tokens = await this.matchDesignTokens(components);

    // 3. 生成布局配置
    const layout = this.generateLayout(components);

    // 4. 计算一致性分数
    const consistencyScore = this.calculateConsistencyScore(components, tokens);

    // 5. 生成优化建议
    const recommendations = this.generateRecommendations(components, tokens, layout);

    const mapping: DesignMapping = {
      components,
      tokens,
      layout,
      consistencyScore,
      recommendations
    };

    logger.info(`✅ 设计映射完成：${components.length}个组件，一致性分数=${(consistencyScore * 100).toFixed(0)}%`);

    return mapping;
  }

  /**
   * 生成 HTML 原型
   */
  async generatePrototype(mapping: DesignMapping, options?: {
    framework?: 'react' | 'vue' | 'html';
    includeStyles?: boolean;
    includeScripts?: boolean;
  }): Promise<string> {
    const config = {
      framework: 'html',
      includeStyles: true,
      includeScripts: false,
      ...options
    };

    logger.info(`🏗️ 生成原型：${config.framework}`);

    if (config.framework === 'react') {
      return this.generateReactPrototype(mapping);
    } else if (config.framework === 'vue') {
      return this.generateVuePrototype(mapping);
    } else {
      return this.generateHTMLPrototype(mapping, config.includeStyles);
    }
  }

  /**
   * 设计一致性检查
   */
  async checkDesignConsistency(prototype: string, designSystem: string): Promise<Record<string, unknown>> {
    logger.info(`🔍 检查设计一致性：${designSystem}`);

    const ds = this.designSystems.get(designSystem);
    if (!ds) {
      throw new Error(`设计系统不存在：${designSystem}`);
    }

    const issues: Array<Record<string, unknown>> = [];

    // 检查颜色使用
    const colorUsage = this.checkColorUsage(prototype, ds.tokens);
    if (colorUsage.inconsistencies.length > 0) {
      issues.push({
        type: 'color',
        severity: 'medium',
        message: '发现未使用设计 Token 的颜色',
        details: colorUsage.inconsistencies
      });
    }

    // 检查间距
    const spacingUsage = this.checkSpacingUsage(prototype, ds.tokens);
    if (spacingUsage.inconsistencies.length > 0) {
      issues.push({
        type: 'spacing',
        severity: 'low',
        message: '发现不规范的间距值',
        details: spacingUsage.inconsistencies
      });
    }

    // 检查组件使用
    const componentUsage = this.checkComponentUsage(prototype, ds.components);
    if (componentUsage.unusedComponents.length > 0) {
      issues.push({
        type: 'component',
        severity: 'low',
        message: '有组件未使用',
        details: componentUsage.unusedComponents
      });
    }

    const score = this.calculateConsistencyFromIssues(issues);

    return {
      score,
      issues,
      passed: score >= 0.8,
      summary: this.generateConsistencySummary(score, issues)
    };
  }

  /**
   * 注册设计系统
   */
  registerDesignSystem(designSystem: DesignSystem): void {
    this.designSystems.set(designSystem.id, designSystem);
    logger.info(`📚 注册设计系统：${designSystem.name} v${designSystem.version}`);
  }

  /**
   * 获取设计系统
   */
  getDesignSystem(id: string): DesignSystem | undefined {
    return this.designSystems.get(id);
  }

  /**
   * 获取统计
   */
  getStats(): Record<string, unknown> {
    return {
      designSystems: this.designSystems.size,
      components: this.componentLibrary.size,
      totalTokens: Array.from(this.designSystems.values())
        .reduce((sum, ds) => sum + ds.tokens.length, 0)
    };
  }

  // ============================================================================
  // 私有方法
  // ============================================================================

  /**
   * 初始化默认设计系统
   */
  private initializeDefaultDesignSystem(): void {
    const defaultDS: DesignSystem = {
      id: 'default',
      name: 'ANFSF Design System',
      version: '1.0.0',
      tokens: [
        // 颜色 Token
        { name: 'primary', category: 'color', value: '#1976d2', description: '主色调' },
        { name: 'secondary', category: 'color', value: '#424242', description: '次色调' },
        { name: 'success', category: 'color', value: '#388e3c', description: '成功色' },
        { name: 'warning', category: 'color', value: '#f57c00', description: '警告色' },
        { name: 'error', category: 'color', value: '#d32f2f', description: '错误色' },
        
        // 间距 Token
        { name: 'spacing-xs', category: 'spacing', value: '4px' },
        { name: 'spacing-sm', category: 'spacing', value: '8px' },
        { name: 'spacing-md', category: 'spacing', value: '16px' },
        { name: 'spacing-lg', category: 'spacing', value: '24px' },
        { name: 'spacing-xl', category: 'spacing', value: '32px' },
        
        // 字体 Token
        { name: 'font-family', category: 'typography', value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto' },
        { name: 'font-size-sm', category: 'typography', value: '12px' },
        { name: 'font-size-md', category: 'typography', value: '14px' },
        { name: 'font-size-lg', category: 'typography', value: '16px' }
      ],
      components: new Map()
    };

    this.designSystems.set('default', defaultDS);
  }

  /**
   * 初始化组件库
   */
  private initializeComponentLibrary(): void {
    const components: UIComponent[] = [
      {
        id: 'btn_primary',
        type: 'button',
        name: 'Primary Button',
        props: [
          { name: 'label', type: 'string', required: true },
          { name: 'onClick', type: 'function', required: true },
          { name: 'disabled', type: 'boolean', required: false, defaultValue: false }
        ]
      },
      {
        id: 'input_text',
        type: 'input',
        name: 'Text Input',
        props: [
          { name: 'value', type: 'string', required: true },
          { name: 'onChange', type: 'function', required: true },
          { name: 'placeholder', type: 'string', required: false },
          { name: 'required', type: 'boolean', required: false, defaultValue: false }
        ]
      },
      {
        id: 'table_data',
        type: 'table',
        name: 'Data Table',
        props: [
          { name: 'data', type: 'array', required: true },
          { name: 'columns', type: 'array', required: true },
          { name: 'pagination', type: 'boolean', required: false, defaultValue: true }
        ]
      },
      {
        id: 'card_basic',
        type: 'card',
        name: 'Basic Card',
        props: [
          { name: 'title', type: 'string', required: false },
          { name: 'content', type: 'string', required: true },
          { name: 'actions', type: 'array', required: false }
        ]
      },
      {
        id: 'modal_dialog',
        type: 'modal',
        name: 'Dialog Modal',
        props: [
          { name: 'open', type: 'boolean', required: true },
          { name: 'onClose', type: 'function', required: true },
          { name: 'title', type: 'string', required: false },
          { name: 'children', type: 'object', required: true }
        ]
      }
    ];

    for (const comp of components) {
      this.componentLibrary.set(comp.id, comp);
    }
  }

  /**
   * 从需求提取组件
   */
  private async extractComponents(requirement: string): Promise<UIComponent[]> {
    const components: UIComponent[] = [];

    // 关键词匹配（简化实现）
    const componentKeywords: Record<string, UIComponentType> = {
      '按钮': 'button',
      '输入': 'input',
      '表格': 'table',
      '列表': 'list',
      '卡片': 'card',
      '弹窗': 'modal',
      '表单': 'form',
      '导航': 'navigation',
      '图表': 'chart'
    };

    for (const [keyword, type] of Object.entries(componentKeywords)) {
      if (requirement.includes(keyword)) {
        const template = this.getComponentTemplate(type);
        if (template) {
          components.push({
            ...template,
            id: `${template.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          });
        }
      }
    }

    // 如果没有匹配到组件，返回默认组件
    if (components.length === 0) {
      components.push(
        this.getComponentTemplate('card') || this.createDefaultComponent('card')
      );
    }

    return components;
  }

  /**
   * 获取组件模板
   */
  private getComponentTemplate(type: UIComponentType): UIComponent | null {
    for (const component of this.componentLibrary.values()) {
      if (component.type === type) {
        return { ...component };
      }
    }
    return null;
  }

  /**
   * 创建默认组件
   */
  private createDefaultComponent(type: UIComponentType): UIComponent {
    return {
      id: `default_${type}_${Date.now()}`,
      type,
      name: `${type} Component`,
      props: [
        { name: 'className', type: 'string', required: false },
        { name: 'style', type: 'object', required: false }
      ]
    };
  }

  /**
   * 匹配设计 Token
   */
  private async matchDesignTokens(_components: UIComponent[]): Promise<DesignToken[]> {
    void _components;
    const ds = this.designSystems.get('default');
    if (!ds) return [];

    // 根据组件类型选择相关 Token
    const tokens: DesignToken[] = [];
    
    // 总是包含颜色和间距 Token
    tokens.push(...ds.tokens.filter(t => t.category === 'color' || t.category === 'spacing'));

    return tokens;
  }

  /**
   * 生成布局配置
   */
  private generateLayout(components: UIComponent[]): LayoutConfig {
    const componentCount = components.length;

    // 根据组件数量选择布局类型
    let type: LayoutConfig['type'] = 'single-column';
    if (componentCount >= 3 && componentCount <= 5) {
      type = 'two-column';
    } else if (componentCount > 5) {
      type = 'grid';
    }

    return {
      type,
      breakpoints: [
        { name: 'mobile', minWidth: 320, columns: 1, gutter: 16 },
        { name: 'tablet', minWidth: 768, columns: 2, gutter: 24 },
        { name: 'desktop', minWidth: 1024, columns: 3, gutter: 24 },
        { name: 'wide', minWidth: 1440, columns: 4, gutter: 32 }
      ],
      spacing: '16px'
    };
  }

  /**
   * 计算一致性分数
   */
  private calculateConsistencyScore(components: UIComponent[], tokens: DesignToken[]): number {
    // 简化实现：基于组件和 Token 的匹配度
    const baseScore = 0.85;
    const componentBonus = Math.min(0.1, components.length * 0.02);
    const tokenBonus = Math.min(0.05, tokens.length * 0.005);

    return Math.min(1.0, baseScore + componentBonus + tokenBonus);
  }

  /**
   * 生成优化建议
   */
  private generateRecommendations(
    components: UIComponent[],
    tokens: DesignToken[],
    layout: LayoutConfig
  ): string[] {
    const recommendations: string[] = [];

    if (components.length < 3) {
      recommendations.push('考虑增加更多交互组件以提升用户体验');
    }

    if (tokens.length < 10) {
      recommendations.push('建议使用更多设计 Token 以保持设计一致性');
    }

    if (layout.type === 'single-column') {
      recommendations.push('当前为单列布局，考虑在桌面端使用多列布局以优化空间利用');
    }

    return recommendations;
  }

  /**
   * 生成 HTML 原型
   */
  private generateHTMLPrototype(mapping: DesignMapping, includeStyles: boolean): string {
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ANFSF Prototype</title>
  ${includeStyles ? this.generateStyles(mapping.tokens) : ''}
</head>
<body>
  <div class="container">
    ${this.generateComponentsHTML(mapping.components)}
  </div>
</body>
</html>`;

    return html;
  }

  /**
   * 生成 React 原型
   */
  private generateReactPrototype(mapping: DesignMapping): string {
    const code = `import React from 'react';

export default function Prototype() {
  return (
    <div className="container">
      ${mapping.components.map(c => this.generateReactComponent(c)).join('\n      ')}
    </div>
  );
}`;

    return code;
  }

  /**
   * 生成 Vue 原型
   */
  private generateVuePrototype(mapping: DesignMapping): string {
    const code = `<template>
  <div class="container">
    ${mapping.components.map(c => this.generateVueComponent(c)).join('\n    ')}
  </div>
</template>

<script>
export default {
  name: 'Prototype'
};
</script>`;

    return code;
  }

  /**
   * 生成组件 HTML
   */
  private generateComponentsHTML(components: UIComponent[]): string {
    return components.map(comp => {
      switch (comp.type) {
        case 'button':
          return `<button class="btn btn-primary">${comp.name}</button>`;
        case 'input':
          return `<input type="text" class="input" placeholder="${comp.name}" />`;
        case 'card':
          return `<div class="card"><h3>${comp.name}</h3><p>Content here...</p></div>`;
        default:
          return `<div class="${comp.type}">${comp.name}</div>`;
      }
    }).join('\n    ');
  }

  /**
   * 生成 React 组件
   */
  private generateReactComponent(comp: UIComponent): string {
    switch (comp.type) {
      case 'button':
        return `<button className="btn btn-primary">${comp.name}</button>`;
      case 'input':
        return `<input type="text" className="input" placeholder="${comp.name}" />`;
      case 'card':
        return `<Card title="${comp.name}"><p>Content here...</p></Card>`;
      default:
        return `<${comp.name} />`;
    }
  }

  /**
   * 生成 Vue 组件
   */
  private generateVueComponent(comp: UIComponent): string {
    switch (comp.type) {
      case 'button':
        return `<el-button type="primary">${comp.name}</el-button>`;
      case 'input':
        return `<el-input placeholder="${comp.name}" />`;
      case 'card':
        return `<el-card><template #header>${comp.name}</template><p>Content here...</p></el-card>`;
      default:
        return `<${comp.name} />`;
    }
  }

  /**
   * 生成样式
   */
  private generateStyles(tokens: DesignToken[]): string {
    const primary = tokens.find(t => t.name === 'primary')?.value || '#1976d2';
    const spacing = tokens.find(t => t.name === 'spacing-md')?.value || '16px';

    return `<style>
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    padding: ${spacing};
  }
  
  .container {
    max-width: 1200px;
    margin: 0 auto;
  }
  
  .btn {
    padding: ${spacing};
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .btn-primary {
    background: ${primary};
    color: white;
  }
  
  .input {
    padding: ${spacing};
    border: 1px solid #ddd;
    border-radius: 4px;
    width: 100%;
  }
  
  .card {
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: ${spacing};
    margin-bottom: ${spacing};
  }
</style>`;
  }

  /**
   * 检查颜色使用
   */
  private checkColorUsage(prototype: string, tokens: DesignToken[]): { inconsistencies: string[] } {
    const inconsistencies: string[] = [];
    
    // 查找硬编码颜色（简化实现）
    const colorPattern = /#[0-9a-fA-F]{3,6}/g;
    const matches = prototype.match(colorPattern);
    
    const tokenColors = tokens
      .filter(t => t.category === 'color')
      .map(t => t.value);
    
    if (matches) {
      for (const color of matches) {
        if (!tokenColors.includes(color)) {
          inconsistencies.push(`未使用 Token 的颜色：${color}`);
        }
      }
    }
    
    return { inconsistencies };
  }

  /**
   * 检查间距使用
   */
  private checkSpacingUsage(prototype: string, tokens: DesignToken[]): { inconsistencies: string[] } {
    const inconsistencies: string[] = [];
    
    // 查找硬编码间距（简化实现）
    const spacingPattern = /\d+px/g;
    const matches = prototype.match(spacingPattern);
    
    const tokenSpacings = tokens
      .filter(t => t.category === 'spacing')
      .map(t => t.value.replace('px', ''));
    
    if (matches) {
      for (const spacing of matches) {
        const value = spacing.replace('px', '');
        if (!tokenSpacings.includes(value)) {
          inconsistencies.push(`不规范的间距值：${spacing}`);
        }
      }
    }
    
    return { inconsistencies };
  }

  /**
   * 检查组件使用
   */
  private checkComponentUsage(prototype: string, components: Map<string, UIComponent>): { unusedComponents: string[] } {
    const unusedComponents: string[] = [];
    
    for (const [id, comp] of components.entries()) {
      if (!prototype.includes(comp.name) && !prototype.includes(id)) {
        unusedComponents.push(comp.name);
      }
    }
    
    return { unusedComponents };
  }

  /**
   * 从问题计算一致性分数
   */
  private calculateConsistencyFromIssues(issues: Array<Record<string, unknown>>): number {
    const baseScore = 1.0;
    const deductions = issues.reduce((sum, issue) => {
      switch (issue.severity) {
        case 'high': return sum + 0.2;
        case 'medium': return sum + 0.1;
        case 'low': return sum + 0.05;
        default: return sum;
      }
    }, 0);
    
    return Math.max(0, baseScore - deductions);
  }

  /**
   * 生成一致性摘要
   */
  private generateConsistencySummary(score: number, issues: Array<Record<string, unknown>>): string {
    if (score >= 0.9) {
      return '✅ 设计一致性优秀';
    } else if (score >= 0.8) {
      return '✅ 设计一致性良好';
    } else if (score >= 0.7) {
      return `⚠️ 设计一致性一般，发现 ${issues.length} 个问题`;
    } else {
      return `❌ 设计一致性较差，发现 ${issues.length} 个问题，建议修复`;
    }
  }
}

// ============================================================================
// 导出
// ============================================================================

export function createUIUXHarness(): UIUXHarness {
  return new UIUXHarness();
}
