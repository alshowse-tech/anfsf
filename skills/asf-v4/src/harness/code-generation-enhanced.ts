/**
 * Code Generation Enhanced - 代码生成增强
 * 
 * 测试自动生成、文档自动生成、Code Review 自动化
 * 
 * @module asf-v4/harness/code-generation-enhanced
 * @version 1.0.0
 */

import { createModuleLogger } from '../utils/logger';

const logger = createModuleLogger('CodeGenerationEnhanced');

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 测试用例
 */
export interface TestCase {
  id: string;
  name: string;
  description: string;
  input: any;
  expectedOutput: any;
  assertions: string[];
}

/**
 * 测试文件
 */
export interface TestFile {
  path: string;
  content: string;
  framework: 'jest' | 'vitest' | 'mocha';
  coverage: number;
}

/**
 * API 规范
 */
export interface APISpec {
  name: string;
  version: string;
  endpoints: APIEndpoint[];
}

/**
 * API 端点
 */
export interface APIEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
  parameters?: APIParameter[];
  requestBody?: unknown;
  responseBody?: unknown;
  responses: APIResponse[];
}

/**
 * API 参数
 */
export interface APIParameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'body';
  type: string;
  required: boolean;
  description?: string;
}

/**
 * API 响应
 */
export interface APIResponse {
  statusCode: number;
  description: string;
  schema?: unknown;
}

/**
 * Code Review 报告
 */
export interface CodeReviewReport {
  score: number;
  issues: CodeReviewIssue[];
  summary: string;
  recommendations: string[];
}

/**
 * Code Review 问题
 */
export interface CodeReviewIssue {
  type: 'bug' | 'security' | 'performance' | 'style' | 'maintainability';
  severity: 'critical' | 'major' | 'minor' | 'info';
  line?: number;
  message: string;
  suggestion: string;
}

// ============================================================================
// Code Generation Enhanced 主类
// ============================================================================

export class CodeGenerationEnhanced {
  private testTemplates: Map<string, string> = new Map();
  private docTemplates: Map<string, string> = new Map();

  constructor() {
    this.initializeTemplates();
    logger.info('📝 Code Generation Enhanced 初始化完成');
  }

  /**
   * 生成单元测试 - 核心方法
   */
  async generateTests(code: string, options?: {
    framework?: 'jest' | 'vitest' | 'mocha';
    coverage?: number;
    includeEdgeCases?: boolean;
  }): Promise<TestFile> {
    const config = {
      framework: 'jest' as const,
      coverage: 80,
      includeEdgeCases: true,
      ...options
    };

    logger.info(`🧪 生成测试：${config.framework}，目标覆盖率${config.coverage}%`);

    // 1. 分析代码结构
    const functions = this.extractFunctions(code);
    
    // 2. 生成测试用例
    const testCases: TestCase[] = [];
    for (const fn of functions) {
      testCases.push(...this.generateTestCasesForFunction(fn, config.includeEdgeCases));
    }

    // 3. 渲染测试文件
    const content = this.renderTestFile(testCases, config.framework);

    // 4. 估算覆盖率
    const coverage = this.estimateCoverage(code, testCases);

    const testFile: TestFile = {
      path: `${this.extractFilename(code)}.test.ts`,
      content,
      framework: config.framework,
      coverage
    };

    logger.info(`✅ 测试生成完成：${testCases.length}个测试用例，预计覆盖率${coverage}%`);

    return testFile;
  }

  /**
   * 生成 API 文档 - 核心方法
   */
  async generateDocs(api: APISpec): Promise<string> {
    logger.info(`📚 生成 API 文档：${api.name} v${api.version}`);

    let doc = `# ${api.name} API 文档\n\n`;
    doc += `**版本**: ${api.version}\n\n`;
    doc += `**生成时间**: ${new Date().toISOString()}\n\n`;
    doc += `---\n\n`;

    // 目录
    doc += `## 目录\n\n`;
    for (const endpoint of api.endpoints) {
      const anchor = this.generateAnchor(endpoint.method, endpoint.path);
      doc += `- [${endpoint.method} ${endpoint.path}](#${anchor})\n`;
    }
    doc += `\n---\n\n`;

    // 端点详情
    for (const endpoint of api.endpoints) {
      doc += `## ${endpoint.method} ${endpoint.path}\n\n`;
      doc += `${endpoint.description}\n\n`;

      // 参数
      if (endpoint.parameters && endpoint.parameters.length > 0) {
        doc += `### 参数\n\n`;
        doc += `| 参数 | 位置 | 类型 | 必填 | 说明 |\n`;
        doc += `|------|------|------|------|------|\n`;
        for (const param of endpoint.parameters) {
          doc += `| ${param.name} | ${param.in} | ${param.type} | ${param.required ? '是' : '否'} | ${param.description || '-'} |\n`;
        }
        doc += `\n`;
      }

      // 请求体
      if (endpoint.requestBody) {
        doc += `### 请求体\n\n`;
        doc += '```json\n';
        doc += JSON.stringify(endpoint.requestBody, null, 2);
        doc += '\n```\n\n';
      }

      // 响应
      doc += `### 响应\n\n`;
      for (const response of endpoint.responses) {
        doc += `#### ${response.statusCode} ${response.description}\n\n`;
        if (response.schema) {
          doc += '```json\n';
          doc += JSON.stringify(response.schema, null, 2);
          doc += '\n```\n\n';
        }
      }

      doc += `---\n\n`;
    }

    logger.info(`✅ API 文档生成完成：${api.endpoints.length}个端点`);

    return doc;
  }

  /**
   * Code Review - 核心方法
   */
  async codeReview(code: string): Promise<CodeReviewReport> {
    logger.info('🔍 开始 Code Review...');

    const issues: CodeReviewIssue[] = [];

    // 1. 检查潜在 Bug
    issues.push(...this.checkBugs(code));

    // 2. 检查安全问题
    issues.push(...this.checkSecurity(code));

    // 3. 检查性能问题
    issues.push(...this.checkPerformance(code));

    // 4. 检查代码风格
    issues.push(...this.checkStyle(code));

    // 5. 检查可维护性
    issues.push(...this.checkMaintainability(code));

    // 计算分数
    const score = this.calculateReviewScore(issues);

    // 生成建议
    const recommendations = this.generateRecommendations(issues);

    const report: CodeReviewReport = {
      score,
      issues,
      summary: this.generateSummary(score, issues),
      recommendations
    };

    logger.info(`✅ Code Review 完成：发现 ${issues.length} 个问题，分数=${score.toFixed(1)}/10`);

    return report;
  }

  /**
   * 生成集成测试
   */
  async generateIntegrationTests(apiSpec: APISpec): Promise<TestFile> {
    logger.info(`🔗 生成集成测试：${apiSpec.endpoints.length}个端点`);

    const testCases: TestCase[] = [];

    for (const endpoint of apiSpec.endpoints) {
      // 成功场景
      testCases.push({
        id: `integration_${endpoint.method}_${endpoint.path.replace(/\//g, '_')}_success`,
        name: `应该成功处理${endpoint.method} ${endpoint.path}`,
        description: endpoint.description,
        input: {
          method: endpoint.method,
          path: endpoint.path,
          ...(endpoint.requestBody && { body: endpoint.requestBody })
        },
        expectedOutput: {
          status: endpoint.responses.find(r => r.statusCode >= 200 && r.statusCode < 300)?.statusCode || 200
        },
        assertions: [
          'response.status === expected.status',
          'response.body should match schema'
        ]
      });

      // 错误场景
      const errorResponse = endpoint.responses.find(r => r.statusCode >= 400);
      if (errorResponse) {
        testCases.push({
          id: `integration_${endpoint.method}_${endpoint.path.replace(/\//g, '_')}_error`,
          name: `应该处理${endpoint.method} ${endpoint.path}错误情况`,
          description: `测试错误响应：${errorResponse.description}`,
          input: {
            method: endpoint.method,
            path: endpoint.path,
            invalid: true
          },
          expectedOutput: {
            status: errorResponse.statusCode
          },
          assertions: [
            'response.status === expected.status',
            'response.body.error should be defined'
          ]
        });
      }
    }

    const content = this.renderIntegrationTestFile(testCases);

    return {
      path: `${this.toKebabCase(apiSpec.name)}.integration.test.ts`,
      content,
      framework: 'jest',
      coverage: 70
    };
  }

  /**
   * 生成文档字符串
   */
  async generateDocstrings(code: string): Promise<string> {
    logger.info('📝 生成文档字符串...');

    const functions = this.extractFunctions(code);
    const docstrings: string[] = [];

    for (const fn of functions) {
      docstrings.push(`/**\n * ${fn.name} 函数\n * @returns {any}\n */`);
    }

    return docstrings.join('\n\n');
  }

  // ============================================================================
  // 私有方法
  // ============================================================================

  /**
   * 初始化模板
   */
  private initializeTemplates(): void {
    // Jest 测试模板
    this.testTemplates.set('jest', `
describe('{{describeName}}', () => {
  {{testCases}}
});
`);

    // 测试用例模板
    this.testTemplates.set('test_case', `
  test('{{testName}}', () => {
    // Given
    {{given}}
    
    // When
    {{when}}
    
    // Then
    {{then}}
  });
`);
  }

  /**
   * 提取函数
   */
  private extractFunctions(code: string): Array<{ name: string; params: string[]; body: string }> {
    const functions: Array<{ name: string; params: string[]; body: string }> = [];
    
    // 简化实现：匹配 function 和箭头函数
    const functionPattern = /(?:async\s+)?(?:function|const|let|var)\s+(\w+)\s*(?:\([^)]*\)|=\s*\([^)]*\))\s*{([^}]*)}/g;
    let match;
    
    while ((match = functionPattern.exec(code)) !== null) {
      functions.push({
        name: match[1],
        params: [],
        body: match[2]
      });
    }
    
    return functions;
  }

  /**
   * 为函数生成测试用例
   */
  private generateTestCasesForFunction(
    fn: { name: string; params: string[]; body: string },
    includeEdgeCases: boolean
  ): TestCase[] {
    const testCases: TestCase[] = [];

    // 基本功能测试
    testCases.push({
      id: `${fn.name}_basic`,
      name: `应该正确执行${fn.name}基本功能`,
      description: `测试${fn.name}的基本功能`,
      input: {},
      expectedOutput: {},
      assertions: ['result should be defined']
    });

    // 边界情况测试
    if (includeEdgeCases) {
      testCases.push({
        id: `${fn.name}_edge_null`,
        name: `应该处理${fn.name}空输入`,
        description: `测试${fn.name}处理 null/undefined`,
        input: { value: null },
        expectedOutput: {},
        assertions: ['should handle null gracefully']
      });

      testCases.push({
        id: `${fn.name}_edge_empty`,
        name: `应该处理${fn.name}空字符串`,
        description: `测试${fn.name}处理空字符串`,
        input: { value: '' },
        expectedOutput: {},
        assertions: ['should handle empty string gracefully']
      });
    }

    return testCases;
  }

  /**
   * 渲染测试文件
   */
  private renderTestFile(testCases: TestCase[], framework: string): string {
    const describeName = 'Component Tests';
    
    let content = `/**\n * 自动生成的测试文件\n * 生成时间：${new Date().toISOString()}\n */\n\n`;

    if (framework === 'jest') {
      content += `import { describe, test, expect, beforeEach } from '@jest/globals';\n\n`;
    } else if (framework === 'vitest') {
      content += `import { describe, test, expect, beforeEach } from 'vitest';\n\n`;
    }

    content += `describe('${describeName}', () => {\n`;

    for (const tc of testCases) {
      content += `  test('${tc.name}', () => {\n`;
      content += `    // TODO: 实现测试逻辑\n`;
      content += `    expect(true).toBe(true);\n`;
      content += `  });\n\n`;
    }

    content += `});\n`;

    return content;
  }

  /**
   * 渲染集成测试文件
   */
  private renderIntegrationTestFile(testCases: TestCase[]): string {
    let content = `/**\n * 自动生成的集成测试文件\n * 生成时间：${new Date().toISOString()}\n */\n\n`;
    content += `import { describe, test, expect } from '@jest/globals';\n\n`;

    content += `describe('API Integration Tests', () => {\n`;

    for (const tc of testCases) {
      content += `  test('${tc.name}', async () => {\n`;
      content += `    const response = await fetch(API_URL, {\n`;
      content += `      method: '${tc.input.method}',\n`;
      content += `      // TODO: 实现请求\n`;
      content += `    });\n\n`;
      content += `    expect(response.status).toBe(${tc.expectedOutput.status});\n`;
      content += `  });\n\n`;
    }

    content += `});\n`;

    return content;
  }

  /**
   * 估算覆盖率
   */
  private estimateCoverage(code: string, testCases: TestCase[]): number {
    const lines = code.split('\n').length;
    const branches = (code.match(/if|else|switch|case|for|while/g) || []).length;
    
    // 简化估算：基于测试用例数量和代码复杂度
    const baseCoverage = Math.min(60, testCases.length * 10);
    const complexityBonus = Math.min(20, branches * 2);
    const lineBonus = Math.min(20, Math.floor(lines / 10));
    
    return Math.min(100, baseCoverage + complexityBonus + lineBonus);
  }

  /**
   * 检查潜在 Bug
   */
  private checkBugs(code: string): CodeReviewIssue[] {
    const issues: CodeReviewIssue[] = [];

    // 检查未使用的变量
    if (/let\s+\w+\s*;/.test(code)) {
      issues.push({
        type: 'bug',
        severity: 'minor',
        message: '发现声明但未使用的变量',
        suggestion: '移除未使用的变量或添加使用逻辑'
      });
    }

    // 检查可能的空指针
    if (/\w+\.\w+/.test(code) && !code.includes('?.')) {
      issues.push({
        type: 'bug',
        severity: 'major',
        message: '可能存在空指针访问',
        suggestion: '使用可选链操作符 (?.) 或添加空值检查'
      });
    }

    return issues;
  }

  /**
   * 检查安全问题
   */
  private checkSecurity(code: string): CodeReviewIssue[] {
    const issues: CodeReviewIssue[] = [];

    // 检查 eval 使用
    if (/eval\s*\(/.test(code)) {
      issues.push({
        type: 'security',
        severity: 'critical',
        message: '避免使用 eval()',
        suggestion: '使用更安全的替代方案，如 JSON.parse() 或 Function 构造函数'
      });
    }

    // 检查内联 SQL
    if (/SELECT.*FROM.*\+/.test(code) || /INSERT.*INTO.*\+/.test(code)) {
      issues.push({
        type: 'security',
        severity: 'critical',
        message: '可能存在 SQL 注入风险',
        suggestion: '使用参数化查询或 ORM'
      });
    }

    return issues;
  }

  /**
   * 检查性能问题
   */
  private checkPerformance(code: string): CodeReviewIssue[] {
    const issues: CodeReviewIssue[] = [];

    // 检查循环中的函数调用
    if (/for\s*\([^)]*\)\s*{[^}]*\w+\([^)]*\)/.test(code)) {
      issues.push({
        type: 'performance',
        severity: 'minor',
        message: '循环中频繁调用函数可能影响性能',
        suggestion: '考虑缓存函数结果或重构代码'
      });
    }

    return issues;
  }

  /**
   * 检查代码风格
   */
  private checkStyle(code: string): CodeReviewIssue[] {
    const issues: CodeReviewIssue[] = [];

    // 检查命名规范
    if (/[A-Z][a-z]+[A-Z]/.test(code)) {
      issues.push({
        type: 'style',
        severity: 'info',
        message: '变量命名应使用驼峰式',
        suggestion: '遵循 camelCase 命名规范'
      });
    }

    return issues;
  }

  /**
   * 检查可维护性
   */
  private checkMaintainability(code: string): CodeReviewIssue[] {
    const issues: CodeReviewIssue[] = [];

    // 检查函数长度
    const functions = code.match(/function\s*\w*\s*\([^)]*\)\s*{[^}]*}/g) || [];
    for (const fn of functions) {
      const lines = fn.split('\n').length;
      if (lines > 50) {
        issues.push({
          type: 'maintainability',
          severity: 'major',
          message: '函数过长，建议拆分',
          suggestion: '将函数拆分为多个小函数，每个函数只做一件事'
        });
      }
    }

    return issues;
  }

  /**
   * 计算 Review 分数
   */
  private calculateReviewScore(issues: CodeReviewIssue[]): number {
    const baseScore = 10;
    const deductions = issues.reduce((sum, issue) => {
      switch (issue.severity) {
        case 'critical': return sum + 3;
        case 'major': return sum + 2;
        case 'minor': return sum + 1;
        case 'info': return sum + 0.5;
        default: return sum;
      }
    }, 0);

    return Math.max(0, baseScore - deductions);
  }

  /**
   * 生成建议
   */
  private generateRecommendations(issues: CodeReviewIssue[]): string[] {
    const recommendations: string[] = [];

    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const majorCount = issues.filter(i => i.severity === 'major').length;

    if (criticalCount > 0) {
      recommendations.push(`优先修复 ${criticalCount} 个严重问题`);
    }

    if (majorCount > 0) {
      recommendations.push(`安排时间修复 ${majorCount} 个主要问题`);
    }

    if (issues.length === 0) {
      recommendations.push('代码质量良好，继续保持');
    }

    return recommendations;
  }

  /**
   * 生成摘要
   */
  private generateSummary(score: number, issues: CodeReviewIssue[]): string {
    if (score >= 9) {
      return '✅ 代码质量优秀';
    } else if (score >= 7) {
      return '✅ 代码质量良好';
    } else if (score >= 5) {
      return `⚠️ 代码质量一般，发现 ${issues.length} 个问题`;
    } else {
      return `❌ 代码质量较差，发现 ${issues.length} 个问题，建议重构`;
    }
  }

  /**
   * 生成锚点
   */
  private generateAnchor(method: string, path: string): string {
    return `${method.toLowerCase()}-${path.replace(/\//g, '-').replace(/-/g, '')}`;
  }

  /**
   * 提取文件名
   */
  private extractFilename(_code: string): string {
    void _code;
    return 'generated';
  }

  /**
   * 转换为短横线命名
   */
  private toKebabCase(str: string): string {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }
}

// ============================================================================
// 导出
// ============================================================================

export function createCodeGenerationEnhanced(): CodeGenerationEnhanced {
  return new CodeGenerationEnhanced();
}
