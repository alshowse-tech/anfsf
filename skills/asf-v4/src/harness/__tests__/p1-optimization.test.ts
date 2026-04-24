/**
 * P1 Optimization Tests - P1 优化测试
 * 
 * 测试 Playwright MCP、GraphRAG、UI/UX Harness、代码生成增强、多模态解析、SonarQube 集成
 */

import { PlaywrightExecutor, createPlaywrightExecutor } from '../playwright-mcp';
import { GraphRAGVisualizer, createGraphRAGVisualizer } from '../graph-rag-visualizer';
import { UIUXHarness, createUIUXHarness } from '../ui-ux-harness';
import { CodeGenerationEnhanced, createCodeGenerationEnhanced } from '../code-generation-enhanced';
import { MultimodalParser, createMultimodalParser } from '../multimodal-parser';
import { SonarQubeIntegration, createSonarQubeIntegration } from '../sonarqube-integration';

describe('P1 Optimization', () => {
  describe('Playwright MCP', () => {
    let executor: PlaywrightExecutor;

    beforeEach(() => {
      executor = createPlaywrightExecutor();
    });

    test('应获取统计', () => {
      const stats = executor.getStats();
      expect(stats.totalReports).toBeDefined();
      expect(stats.passRate).toBeDefined();
    });

    test('应分析跨浏览器一致性', async () => {
      const mockReport = {
        id: 'test',
        timestamp: new Date(),
        url: 'http://test',
        totalTests: 3,
        passed: 3,
        failed: 0,
        results: [
          { browser: 'chromium' as const, passed: true, duration: 1000, errors: [], metrics: { loadTime: 800, domContentLoaded: 500, firstContentfulPaint: 600, totalRequests: 20, failedRequests: 0, consoleErrors: 0 } },
          { browser: 'firefox' as const, passed: true, duration: 1000, errors: [], metrics: { loadTime: 850, domContentLoaded: 520, firstContentfulPaint: 620, totalRequests: 22, failedRequests: 0, consoleErrors: 0 } },
          { browser: 'webkit' as const, passed: true, duration: 1000, errors: [], metrics: { loadTime: 900, domContentLoaded: 550, firstContentfulPaint: 650, totalRequests: 25, failedRequests: 0, consoleErrors: 0 } }
        ],
        summary: 'All passed'
      };
      const analysis = executor.analyzeCrossBrowser(mockReport as Record<string, unknown>);

      expect(analysis.consistent).toBeDefined();
      expect(analysis.differences).toBeDefined();
    });

    test('应获取统计', () => {
      const stats = executor.getStats();

      expect(stats.totalReports).toBeDefined();
      expect(stats.passRate).toBeDefined();
    });
  });

  describe('GraphRAG Visualizer', () => {
    let visualizer: GraphRAGVisualizer;

    beforeEach(() => {
      visualizer = createGraphRAGVisualizer();
    });

    test('应导出 Mermaid 流程图', async () => {
      const graph = {
        nodes: [
          { id: 'n1', label: '需求 1', type: 'requirement' as const },
          { id: 'n2', label: '功能 1', type: 'feature' as const }
        ],
        edges: [
          { from: 'n1', to: 'n2', type: 'implements' as const }
        ]
      };

      const mermaid = await visualizer.exportToMermaid(graph);

      expect(mermaid).toContain('flowchart');
      expect(mermaid).toContain('n1');
      expect(mermaid).toContain('n2');
    });

    test('应分析影响范围', async () => {
      const graph = {
        nodes: [
          { id: 'n1', label: '节点 1', type: 'requirement' as const },
          { id: 'n2', label: '节点 2', type: 'feature' as const },
          { id: 'n3', label: '节点 3', type: 'module' as const }
        ],
        edges: [
          { from: 'n1', to: 'n2', type: 'depends_on' as const },
          { from: 'n2', to: 'n3', type: 'contains' as const }
        ]
      };

      const report = await visualizer.analyzeImpact(graph, 'n1');

      expect(report.nodeId).toBe('n1');
      expect(report.direct).toBeDefined();
      expect(report.severity).toBeDefined();
    });

    test('应分析依赖关系', async () => {
      const graph = {
        nodes: [
          { id: 'n1', label: '节点 1', type: 'requirement' as const },
          { id: 'n2', label: '节点 2', type: 'feature' as const }
        ],
        edges: [
          { from: 'n1', to: 'n2', type: 'depends_on' as const }
        ]
      };

      const report = await visualizer.analyzeDependencies(graph, 'n1');

      expect(report.nodeId).toBe('n1');
      expect(report.dependencies).toBeDefined();
      expect(report.depth).toBeDefined();
    });

    test('应检测循环依赖', async () => {
      const graph = {
        nodes: [
          { id: 'n1', label: '节点 1', type: 'requirement' as const },
          { id: 'n2', label: '节点 2', type: 'feature' as const }
        ],
        edges: [
          { from: 'n1', to: 'n2', type: 'depends_on' as const },
          { from: 'n2', to: 'n1', type: 'depends_on' as const }
        ]
      };

      const report = await visualizer.analyzeDependencies(graph, 'n1');

      expect(report.cycles.length).toBeGreaterThan(0);
    });

    test('应对比图谱相似度', async () => {
      const graph1 = {
        nodes: [
          { id: 'n1', label: '节点 1', type: 'requirement' as const },
          { id: 'n2', label: '节点 2', type: 'feature' as const }
        ],
        edges: []
      };

      const graph2 = {
        nodes: [
          { id: 'n1', label: '节点 1', type: 'requirement' as const },
          { id: 'n3', label: '节点 3', type: 'module' as const }
        ],
        edges: []
      };

      const comparison = await visualizer.compareGraphs(graph1, graph2);

      expect(comparison.nodesAdded).toBe(1);
      expect(comparison.nodesRemoved).toBe(1);
      expect(comparison.similarity).toBeGreaterThan(0);
    });
  });

  describe('UI/UX Harness', () => {
    let harness: UIUXHarness;

    beforeEach(() => {
      harness = createUIUXHarness();
    });

    test('应映射设计系统', async () => {
      const requirement = '需要一个用户管理功能，包含用户列表、添加用户按钮和用户详情卡片';

      const mapping = await harness.mapDesignSystem(requirement);

      expect(mapping.components.length).toBeGreaterThan(0);
      expect(mapping.tokens.length).toBeGreaterThan(0);
      expect(mapping.consistencyScore).toBeGreaterThan(0);
    });

    test('应生成 HTML 原型', async () => {
      const mapping = await harness.mapDesignSystem('创建一个按钮和输入框');

      const prototype = await harness.generatePrototype(mapping, { framework: 'html' });

      expect(prototype).toContain('<!DOCTYPE html>');
      expect(prototype).toContain('<button');
    });

    test('应生成 React 原型', async () => {
      const mapping = await harness.mapDesignSystem('创建一个卡片组件');

      const prototype = await harness.generatePrototype(mapping, { framework: 'react' });

      expect(prototype).toContain('import React');
      expect(prototype).toContain('export default');
    });

    test('应生成 Vue原型', async () => {
      const mapping = await harness.mapDesignSystem('创建一个表格');

      const prototype = await harness.generatePrototype(mapping, { framework: 'vue' });

      expect(prototype).toContain('<template>');
      expect(prototype).toContain('</template>');
    });

    test('应检查设计一致性', async () => {
      const prototype = '<div style="color: #ff0000; margin: 15px;">Test</div>';

      const result = await harness.checkDesignConsistency(prototype, 'default');

      expect(result.score).toBeDefined();
      expect(result.issues).toBeDefined();
    });

    test('应获取统计', () => {
      const stats = harness.getStats();

      expect(stats.designSystems).toBeDefined();
      expect(stats.components).toBeDefined();
    });
  });

  describe('Code Generation Enhanced', () => {
    let generator: CodeGenerationEnhanced;

    beforeEach(() => {
      generator = createCodeGenerationEnhanced();
    });

    test('应生成单元测试', async () => {
      const code = `
        export function add(a: number, b: number): number {
          return a + b;
        }
        
        export function subtract(a: number, b: number): number {
          return a - b;
        }
      `;

      const testFile = await generator.generateTests(code, { framework: 'jest' });

      expect(testFile.path).toContain('.test.ts');
      expect(testFile.content).toContain('describe');
      expect(testFile.content).toContain('test');
      expect(testFile.coverage).toBeGreaterThanOrEqual(0);
    });

    test('应生成 API 文档', async () => {
      const apiSpec = {
        name: 'User API',
        version: '1.0.0',
        endpoints: [
          {
            method: 'GET' as const,
            path: '/users',
            description: '获取用户列表',
            parameters: [
              { name: 'page', in: 'query' as const, type: 'number', required: false }
            ],
            responses: [
              { statusCode: 200, description: '成功' }
            ]
          }
        ]
      };

      const doc = await generator.generateDocs(apiSpec);

      expect(doc).toContain('# User API API 文档');
      expect(doc).toContain('GET /users');
    });

    test('应进行 Code Review', async () => {
      const code = `
        function processData(data) {
          eval(data.code);
          let unusedVar;
          return data.result;
        }
      `;

      const report = await generator.codeReview(code);

      expect(report.score).toBeDefined();
      expect(report.issues.length).toBeGreaterThan(0);
      expect(report.summary).toBeDefined();
    });

    test('应生成集成测试', async () => {
      const apiSpec = {
        name: 'Test API',
        version: '1.0.0',
        endpoints: [
          {
            method: 'POST' as const,
            path: '/users',
            description: '创建用户',
            requestBody: { name: 'string' },
            responses: [
              { statusCode: 201, description: '创建成功' },
              { statusCode: 400, description: '请求错误' }
            ]
          }
        ]
      };

      const testFile = await generator.generateIntegrationTests(apiSpec);

      expect(testFile.path).toContain('.integration.test.ts');
      expect(testFile.content).toContain('describe');
    });

    test('应生成文档字符串', async () => {
      const code = `
        async function fetchUsers(page: number) {
          const response = await fetch(\`/api/users?page=\${page}\`);
          return response.json();
        }
      `;

      const docstrings = await generator.generateDocstrings(code);

      expect(docstrings).toBeDefined();
    });
  });

  describe('Multimodal Parser', () => {
    let parser: MultimodalParser;

    beforeEach(() => {
      parser = createMultimodalParser();
    });

    test('应解析图片', async () => {
      const imageBuffer = Buffer.from('fake-image-data');

      const result = await parser.parseImage(imageBuffer);

      expect(result.type).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.elements).toBeDefined();
    });

    test('应解析流程图', async () => {
      const imageBuffer = Buffer.from('fake-flowchart-image');

      const result = await parser.parseFlowchart(imageBuffer);

      expect(['flowchart', 'wireframe', 'mockup', 'diagram']).toContain(result.type);
      expect(result.structuredData).toBeDefined();
    });

    test('应识别意图', async () => {
      const text = '创建一个用户管理功能，支持添加、修改和删除用户';

      const result = await parser.extractIntent(text);

      expect(result.primaryIntent).toBeDefined();
      expect(result.entities.length).toBeGreaterThan(0);
    });

    test('应预测风险', async () => {
      const requirement = '需要一个实时高并发的支付系统，涉及敏感资金数据';

      const result = await parser.predictRisk(requirement);

      expect(result.overallRisk).toBeDefined();
      expect(result.risks.length).toBeGreaterThan(0);
      expect(result.mitigation.length).toBeGreaterThan(0);
    });

    test('应生成使用场景', async () => {
      const requirement = '用户管理功能，支持 CRUD 操作';

      const scenarios = await parser.generateScenarios(requirement);

      expect(scenarios.length).toBeGreaterThan(0);
      expect(scenarios[0].steps).toBeDefined();
    });

    test('应发现隐性需求', async () => {
      const requirement = '用户登录注册功能';

      const hidden = await parser.discoverHiddenRequirements(requirement);

      expect(hidden.length).toBeGreaterThan(0);
      expect(hidden).toContain('密码找回功能');
    });
  });

  describe('SonarQube Integration', () => {
    let sonarqube: SonarQubeIntegration;

    beforeEach(() => {
      sonarqube = createSonarQubeIntegration();
    });

    test('应运行代码质量扫描', async () => {
      const code = `
        export function add(a: number, b: number): number {
          return a + b;
        }
      `;

      const report = await sonarqube.runAnalysis(code);

      expect(report.projectId).toBeDefined();
      expect(report.metrics).toBeDefined();
      expect(report.qualityGate).toBeDefined();
    });

    test('应检测 Bug', async () => {
      const code = `
        function test() {
          let unusedVar;
          eval('dangerous code');
          return null.possibleNullPointer;
        }
      `;

      const report = await sonarqube.runAnalysis(code);

      expect(report.issues.some(i => i.type === 'bug')).toBe(true);
    });

    test('应检测安全漏洞', async () => {
      const code = `
        function query(sql) {
          return db.execute('SELECT * FROM ' + sql);
        }
        element.innerHTML = userInput;
      `;

      const report = await sonarqube.runAnalysis(code, { includeSecurity: true });

      expect(report.issues.some(i => i.type === 'vulnerability')).toBe(true);
    });

    test('应检测代码异味', async () => {
      const code = `
        function longFunction() {
          // 模拟长函数
          ${Array(60).fill('console.log("line");').join('\n')}
        }
      `;

      const report = await sonarqube.runAnalysis(code);

      expect(report.issues.some(i => i.type === 'code_smell')).toBe(true);
    });

    test('应获取质量指标', async () => {
      const code = `export const x = 1;`;
      await sonarqube.runAnalysis(code);

      const metrics = await sonarqube.getMetrics();

      expect(metrics).toBeDefined();
      expect(metrics?.coverage).toBeDefined();
    });

    test('应获取技术债务', async () => {
      const code = `export const x = 1;`;
      await sonarqube.runAnalysis(code);

      const debt = await sonarqube.getTechnicalDebt();

      expect(debt.minutes).toBeDefined();
      expect(debt.days).toBeDefined();
    });

    test('应分析质量趋势', async () => {
      // 运行多次扫描
      await sonarqube.runAnalysis('export const a = 1;');
      await sonarqube.runAnalysis('export const b = 2;');

      const trend = await sonarqube.analyzeTrend();

      expect(trend.direction).toBeDefined();
      expect(trend.metrics).toBeDefined();
    });

    test('应生成 Markdown 报告', async () => {
      const code = `export function test() { return 42; }`;
      await sonarqube.runAnalysis(code);

      const report = sonarqube.generateReport('markdown');

      expect(report).toContain('# 代码质量报告');
      expect(report).toContain('## 质量评级');
    });

    test('应生成 JSON 报告', async () => {
      const code = `export function test() { return 42; }`;
      await sonarqube.runAnalysis(code);

      const report = sonarqube.generateReport('json');

      expect(() => JSON.parse(report)).not.toThrow();
    });
  });
});
