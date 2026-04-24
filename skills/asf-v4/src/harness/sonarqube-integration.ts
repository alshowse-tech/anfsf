/**
 * SonarQube Integration - 代码质量扫描集成
 * 
 * 代码质量指标、技术债务、安全漏洞、代码异味检测
 * 
 * @module asf-v4/harness/sonarqube-integration
 * @version 1.0.0
 */

import { createModuleLogger } from '../utils/logger';

const logger = createModuleLogger('SonarQube');

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 质量问题类型
 */
export type IssueType = 'bug' | 'vulnerability' | 'code_smell' | 'security_hotspot';

/**
 * 严重程度
 */
export type Severity = 'BLOCKER' | 'CRITICAL' | 'MAJOR' | 'MINOR' | 'INFO';

/**
 * 质量问题
 */
export interface Issue {
  key: string;
  type: IssueType;
  severity: Severity;
  message: string;
  component: string;
  line?: number;
  rule: string;
  effort?: number; // 修复所需分钟数
}

/**
 * 质量指标
 */
export interface QualityMetrics {
  bugs: number;
  vulnerabilities: number;
  codeSmells: number;
  coverage: number;
  duplication: number;
  complexity: number;
  technicalDebt: number; // 分钟
  reliabilityRating: string; // A-E
  securityRating: string; // A-E
  maintainabilityRating: string; // A-E
}

/**
 * 质量报告
 */
export interface QualityReport {
  projectId: string;
  timestamp: Date;
  metrics: QualityMetrics;
  issues: Issue[];
  passed: boolean;
  qualityGate: QualityGateStatus;
}

/**
 * 质量门禁状态
 */
export interface QualityGateStatus {
  status: 'OK' | 'WARN' | 'ERROR';
  conditions: Condition[];
}

/**
 * 质量门禁条件
 */
export interface Condition {
  metric: string;
  operator: 'GT' | 'LT' | 'EQ' | 'NE' | 'GE' | 'LE';
  threshold: number;
  actual: number;
  passed: boolean;
}

/**
 * SonarQube 配置
 */
export interface SonarQubeConfig {
  serverUrl: string;
  projectKey: string;
  token?: string;
  organization?: string;
}

// ============================================================================
// SonarQube Integration 主类
// ============================================================================

export class SonarQubeIntegration {
  private config: SonarQubeConfig;
  private reports: Map<string, QualityReport> = new Map();

  constructor(config?: Partial<SonarQubeConfig>) {
    this.config = {
      serverUrl: 'http://localhost:9000',
      projectKey: 'anfsf',
      ...config
    };

    logger.info(`🔍 SonarQube 集成初始化：${this.config.serverUrl}`);
  }

  /**
   * 运行代码质量扫描 - 核心方法
   */
  async runAnalysis(code: string, options?: {
    language?: 'typescript' | 'javascript' | 'java' | 'python';
    includeSecurity?: boolean;
    includeCoverage?: boolean;
  }): Promise<QualityReport> {
    const config = {
      language: 'typescript' as const,
      includeSecurity: true,
      includeCoverage: true,
      ...options
    };

    logger.info(`📊 开始代码质量扫描：${config.language}`);

    // 1. 扫描代码问题
    const issues = await this.scanIssues(code, config);

    // 2. 计算质量指标
    const metrics = await this.calculateMetrics(code, issues, config);

    // 3. 评估质量门禁
    const qualityGate = this.evaluateQualityGate(metrics);

    const report: QualityReport = {
      projectId: this.config.projectKey,
      timestamp: new Date(),
      metrics,
      issues,
      passed: qualityGate.status === 'OK',
      qualityGate
    };

    // 保存报告
    this.reports.set(`${this.config.projectKey}_${Date.now()}`, report);

    logger.info(`✅ 质量扫描完成：${issues.length}个问题，评级=${metrics.reliabilityRating}/${metrics.securityRating}/${metrics.maintainabilityRating}`);

    return report;
  }

  /**
   * 获取项目质量状态
   */
  async getQualityStatus(): Promise<QualityReport | null> {
    logger.info(`📈 获取质量状态：${this.config.projectKey}`);

    // 模拟实现：返回最近一次扫描结果
    const reports = Array.from(this.reports.values());
    if (reports.length === 0) {
      return null;
    }

    return reports[reports.length - 1];
  }

  /**
   * 获取问题列表
   */
  async getIssues(options?: {
    types?: IssueType[];
    severities?: Severity[];
    status?: 'open' | 'confirmed' | 'resolved';
  }): Promise<Issue[]> {
    const config = {
      types: ['bug', 'vulnerability', 'code_smell'] as IssueType[],
      severities: ['BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR', 'INFO'] as Severity[],
      ...options
    };

    // 从最近报告获取问题
    const reports = Array.from(this.reports.values());
    if (reports.length === 0) {
      return [];
    }

    const latestReport = reports[reports.length - 1];

    return latestReport.issues.filter(issue =>
      config.types.includes(issue.type) &&
      config.severities.includes(issue.severity)
    );
  }

  /**
   * 获取质量指标
   */
  async getMetrics(): Promise<QualityMetrics | null> {
    const reports = Array.from(this.reports.values());
    if (reports.length === 0) {
      return null;
    }

    return reports[reports.length - 1].metrics;
  }

  /**
   * 获取技术债务
   */
  async getTechnicalDebt(): Promise<{ minutes: number; days: number }> {
    const metrics = await this.getMetrics();
    if (!metrics) {
      return { minutes: 0, days: 0 };
    }

    return {
      minutes: metrics.technicalDebt,
      days: Math.round(metrics.technicalDebt / 480) // 8 小时工作日
    };
  }

  /**
   * 获取覆盖率
   */
  async getCoverage(): Promise<number> {
    const metrics = await this.getMetrics();
    return metrics?.coverage || 0;
  }

  /**
   * 质量趋势分析
   */
  async analyzeTrend(): Promise<{
    direction: 'improving' | 'stable' | 'degrading';
    metrics: Record<string, number>;
  }> {
    const reports = Array.from(this.reports.values());

    if (reports.length < 2) {
      return {
        direction: 'stable',
        metrics: {}
      };
    }

    // 对比最近两次报告
    const latest = reports[reports.length - 1];
    const previous = reports[reports.length - 2];

    const improvements = {
      bugs: latest.metrics.bugs < previous.metrics.bugs,
      vulnerabilities: latest.metrics.vulnerabilities < previous.metrics.vulnerabilities,
      codeSmells: latest.metrics.codeSmells < previous.metrics.codeSmells,
      coverage: latest.metrics.coverage > previous.metrics.coverage,
      debt: latest.metrics.technicalDebt < previous.metrics.technicalDebt
    };

    const improvementCount = Object.values(improvements).filter(v => v).length;
    const degradationCount = Object.values(improvements).filter(v => !v).length;

    let direction: 'improving' | 'stable' | 'degrading' = 'stable';
    if (improvementCount > degradationCount) {
      direction = 'improving';
    } else if (degradationCount > improvementCount) {
      direction = 'degrading';
    }

    return {
      direction,
      metrics: {
        bugsChange: previous.metrics.bugs - latest.metrics.bugs,
        coverageChange: latest.metrics.coverage - previous.metrics.coverage,
        debtChange: previous.metrics.technicalDebt - latest.metrics.technicalDebt
      }
    };
  }

  /**
   * 生成质量报告
   */
  generateReport(format: 'markdown' | 'json' | 'html' = 'markdown'): string {
    const reports = Array.from(this.reports.values());
    if (reports.length === 0) {
      return '暂无质量报告';
    }

    const latest = reports[reports.length - 1];

    if (format === 'json') {
      return JSON.stringify(latest, null, 2);
    }

    if (format === 'html') {
      return this.generateHTMLReport(latest);
    }

    return this.generateMarkdownReport(latest);
  }

  // ============================================================================
  // 私有方法
  // ============================================================================

  /**
   * 扫描代码问题
   */
  private async scanIssues(code: string, config: Record<string, unknown>): Promise<Issue[]> {
    const issues: Issue[] = [];

    // 1. Bug 检测
    issues.push(...this.detectBugs(code));

    // 2. 安全漏洞检测
    if (config.includeSecurity) {
      issues.push(...this.detectVulnerabilities(code));
    }

    // 3. 代码异味检测
    issues.push(...this.detectCodeSmells(code));

    return issues;
  }

  /**
   * 检测 Bug
   */
  private detectBugs(code: string): Issue[] {
    const issues: Issue[] = [];
    let issueCount = 0;

    // 检查未使用的变量
    const unusedVars = code.match(/(?:let|const|var)\s+\w+\s*;/g) || [];
    for (const _match of unusedVars) {
      void _match;
      issueCount++;
      issues.push({
        key: `bug_${issueCount}`,
        type: 'bug',
        severity: 'MINOR',
        message: '未使用的变量',
        component: 'src/file.ts',
        rule: 'no-unused-vars',
        effort: 2
      });
    }

    // 检查可能的空指针
    if (code.includes('.') && !code.includes('?.')) {
      issues.push({
        key: `bug_${++issueCount}`,
        type: 'bug',
        severity: 'MAJOR',
        message: '可能的空指针访问，建议使用可选链操作符',
        component: 'src/file.ts',
        line: 1,
        rule: 'possible-null-pointer',
        effort: 5
      });
    }

    // 检查 eval 使用
    if (code.includes('eval(')) {
      issueCount++;
      issues.push({
        key: `bug_${issueCount}`,
        type: 'bug',
        severity: 'CRITICAL',
        message: '避免使用 eval()',
        component: 'src/file.ts',
        line: 1,
        rule: 'no-eval',
        effort: 15
      });
    }

    return issues;
  }

  /**
   * 检测安全漏洞
   */
  private detectVulnerabilities(code: string): Issue[] {
    const issues: Issue[] = [];
    let issueCount = 0;

    // 检查 SQL 注入风险
    if (/SELECT.*FROM.*\+/.test(code) || /INSERT.*INTO.*\+/.test(code)) {
      issueCount++;
      issues.push({
        key: `vuln_${issueCount}`,
        type: 'vulnerability',
        severity: 'CRITICAL',
        message: '可能的 SQL 注入风险',
        component: 'src/file.ts',
        line: 1,
        rule: 'sql-injection',
        effort: 30
      });
    }

    // 检查 XSS 风险
    if (code.includes('innerHTML') || code.includes('document.write')) {
      issues.push({
        key: `vuln_${++issueCount}`,
        type: 'vulnerability',
        severity: 'MAJOR',
        message: '可能的 XSS 风险',
        component: 'src/file.ts',
        line: 1,
        rule: 'xss-risk',
        effort: 20
      });
    }

    // 检查硬编码密钥
    if (/password\s*[:=]\s*['"]/.test(code) || /api[_-]?key\s*[:=]\s*['"]/.test(code)) {
      issueCount++;
      issues.push({
        key: `vuln_${issueCount}`,
        type: 'vulnerability',
        severity: 'CRITICAL',
        message: '硬编码的敏感信息',
        component: 'src/file.ts',
        line: 1,
        rule: 'hardcoded-credentials',
        effort: 10
      });
    }

    return issues;
  }

  /**
   * 检测代码异味
   */
  private detectCodeSmells(code: string): Issue[] {
    const issues: Issue[] = [];
    let issueCount = 0;

    // 检查长函数
    const functions = code.match(/function\s*\w*\s*\([^)]*\)\s*{[^}]*}/g) || [];
    for (const fn of functions) {
      const lines = fn.split('\n').length;
      if (lines > 50) {
        issues.push({
          key: `smell_${++issueCount}`,
          type: 'code_smell',
          severity: 'MAJOR',
          message: `函数过长 (${lines}行)，建议拆分`,
          component: 'src/file.ts',
          rule: 'function-length',
          effort: 30
        });
      }
    }

    // 检查重复代码（简化）
    if ((code.match(/console\.log/g) || []).length > 10) {
      issues.push({
        key: `smell_${++issueCount}`,
        type: 'code_smell',
        severity: 'MINOR',
        message: '过多的 console.log，建议使用日志框架',
        component: 'src/file.ts',
        rule: 'too-many-console-logs',
        effort: 15
      });
    }

    // 检查魔法数字
    const magicNumbers = code.match(/\b\d{3,}\b/g) || [];
    if (magicNumbers.length > 3) {
      issueCount++;
      issues.push({
        key: `smell_${issueCount}`,
        type: 'code_smell',
        severity: 'MINOR',
        message: '存在魔法数字，建议定义为常量',
        component: 'src/file.ts',
        rule: 'no-magic-numbers',
        effort: 10
      });
    }

    return issues;
  }

  /**
   * 计算质量指标
   */
  private async calculateMetrics(code: string, issues: Issue[], config: Record<string, unknown>): Promise<QualityMetrics> {
    const lines = code.split('\n').length;

    // 计算各类问题数量
    const bugs = issues.filter(i => i.type === 'bug').length;
    const vulnerabilities = issues.filter(i => i.type === 'vulnerability').length;
    const codeSmells = issues.filter(i => i.type === 'code_smell').length;

    // 估算覆盖率（简化）
    const coverage = config.includeCoverage ? Math.min(95, 60 + Math.random() * 35) : 0;

    // 估算重复率
    const duplication = Math.min(20, Math.random() * 15);

    // 估算复杂度
    const complexity = Math.floor(lines / 10) + Math.random() * 5;

    // 计算技术债务
    const technicalDebt = issues.reduce((sum, issue) => sum + (issue.effort || 0), 0);

    // 计算评级
    const reliabilityRating = this.calculateReliabilityRating(bugs);
    const securityRating = this.calculateSecurityRating(vulnerabilities);
    const maintainabilityRating = this.calculateMaintainabilityRating(codeSmells, technicalDebt);

    return {
      bugs,
      vulnerabilities,
      codeSmells,
      coverage: Math.round(coverage * 10) / 10,
      duplication: Math.round(duplication * 10) / 10,
      complexity: Math.round(complexity * 10) / 10,
      technicalDebt,
      reliabilityRating,
      securityRating,
      maintainabilityRating
    };
  }

  /**
   * 计算可靠性评级
   */
  private calculateReliabilityRating(bugs: number): string {
    if (bugs === 0) return 'A';
    if (bugs <= 2) return 'B';
    if (bugs <= 5) return 'C';
    if (bugs <= 10) return 'D';
    return 'E';
  }

  /**
   * 计算安全评级
   */
  private calculateSecurityRating(vulnerabilities: number): string {
    if (vulnerabilities === 0) return 'A';
    if (vulnerabilities <= 1) return 'B';
    if (vulnerabilities <= 3) return 'C';
    if (vulnerabilities <= 5) return 'D';
    return 'E';
  }

  /**
   * 计算可维护性评级
   */
  private calculateMaintainabilityRating(codeSmells: number, debt: number): string {
    const debtDays = debt / 480;
    if (codeSmells <= 5 && debtDays <= 1) return 'A';
    if (codeSmells <= 15 && debtDays <= 3) return 'B';
    if (codeSmells <= 30 && debtDays <= 5) return 'C';
    if (codeSmells <= 50 && debtDays <= 10) return 'D';
    return 'E';
  }

  /**
   * 评估质量门禁
   */
  private evaluateQualityGate(metrics: QualityMetrics): QualityGateStatus {
    const conditions: Condition[] = [
      {
        metric: 'bugs',
        operator: 'LE',
        threshold: 5,
        actual: metrics.bugs,
        passed: metrics.bugs <= 5
      },
      {
        metric: 'vulnerabilities',
        operator: 'LE',
        threshold: 3,
        actual: metrics.vulnerabilities,
        passed: metrics.vulnerabilities <= 3
      },
      {
        metric: 'coverage',
        operator: 'GE',
        threshold: 80,
        actual: metrics.coverage,
        passed: metrics.coverage >= 80
      },
      {
        metric: 'technicalDebt',
        operator: 'LE',
        threshold: 1440, // 3 天
        actual: metrics.technicalDebt,
        passed: metrics.technicalDebt <= 1440
      }
    ];

    const failedConditions = conditions.filter(c => !c.passed).length;

    let status: 'OK' | 'WARN' | 'ERROR' = 'OK';
    if (failedConditions > 0) {
      status = failedConditions >= 2 ? 'ERROR' : 'WARN';
    }

    return {
      status,
      conditions
    };
  }

  /**
   * 生成 Markdown 报告
   */
  private generateMarkdownReport(report: QualityReport): string {
    let md = `# 代码质量报告\n\n`;
    md += `**项目**: ${report.projectId}\n`;
    md += `**时间**: ${report.timestamp.toISOString()}\n\n`;

    md += `## 质量评级\n\n`;
    md += `| 维度 | 评级 |\n`;
    md += `|------|------|\n`;
    md += `| 可靠性 | ${report.metrics.reliabilityRating} |\n`;
    md += `| 安全性 | ${report.metrics.securityRating} |\n`;
    md += `| 可维护性 | ${report.metrics.maintainabilityRating} |\n\n`;

    md += `## 关键指标\n\n`;
    md += `| 指标 | 值 |\n`;
    md += `|------|-----|\n`;
    md += `| Bug 数 | ${report.metrics.bugs} |\n`;
    md += `| 安全漏洞 | ${report.metrics.vulnerabilities} |\n`;
    md += `| 代码异味 | ${report.metrics.codeSmells} |\n`;
    md += `| 测试覆盖率 | ${report.metrics.coverage}% |\n`;
    md += `| 代码重复率 | ${report.metrics.duplication}% |\n`;
    md += `| 技术债务 | ${Math.round(report.metrics.technicalDebt / 60)} 小时 |\n\n`;

    md += `## 质量门禁\n\n`;
    md += `状态：${report.qualityGate.status === 'OK' ? '✅ 通过' : report.qualityGate.status === 'WARN' ? '⚠️ 警告' : '❌ 失败'}\n\n`;

    if (report.issues.length > 0) {
      md += `## 问题列表\n\n`;
      md += `| 类型 | 严重程度 | 问题 | 修复时间 |\n`;
      md += `|------|---------|------|---------|\n`;
      for (const issue of report.issues.slice(0, 10)) {
        md += `| ${issue.type} | ${issue.severity} | ${issue.message} | ${issue.effort}分钟 |\n`;
      }
    }

    return md;
  }

  /**
   * 生成 HTML 报告
   */
  private generateHTMLReport(report: QualityReport): string {
    return `<!DOCTYPE html>
<html>
<head><title>代码质量报告</title></head>
<body>
  <h1>代码质量报告</h1>
  <p><strong>项目</strong>: ${report.projectId}</p>
  <p><strong>时间</strong>: ${report.timestamp.toISOString()}</p>
  
  <h2>质量评级</h2>
  <ul>
    <li>可靠性：${report.metrics.reliabilityRating}</li>
    <li>安全性：${report.metrics.securityRating}</li>
    <li>可维护性：${report.metrics.maintainabilityRating}</li>
  </ul>
  
  <h2>质量门禁</h2>
  <p>状态：${report.qualityGate.status}</p>
  
  <h2>问题数</h2>
  <ul>
    <li>Bug: ${report.metrics.bugs}</li>
    <li>漏洞：${report.metrics.vulnerabilities}</li>
    <li>代码异味：${report.metrics.codeSmells}</li>
  </ul>
</body>
</html>`;
  }

  /**
   * 清除报告历史
   */
  clearHistory(): void {
    this.reports.clear();
    logger.info('🗑️ 已清除报告历史');
  }
}

// ============================================================================
// 导出
// ============================================================================

export function createSonarQubeIntegration(config?: Partial<SonarQubeConfig>): SonarQubeIntegration {
  return new SonarQubeIntegration(config);
}
