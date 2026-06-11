/**
 * AI Native Full-Stack Software Factory
 * Layer 1: AI-Native PRD Parser (全栈增强版)
 *
 * @version 1.0.0
 * @date 2026-03-29
 */

import { LLMClient, type LLMClientConfig, type LLMResponse } from '../integrations/llm-client';

export interface AINativePRD {
  // 基础需求
  features: Feature[];
  userFlows: UserFlow[];
  uiRequirements: UIRequirement[];
  
  // 数据层
  data: DataSpec[];
  
  // 约束条件
  constraints: Constraint[];
  acceptanceCriteria: AcceptanceCriterion[];
  
  // 依赖关系
  dependencies: Dependency[];
  
  // 非功能需求
  nonFunctionalSpecs: NonFunctionalSpec[];
  
  // 工作流
  workflow: Workflow[];
  
  // 后端规格
  backendSpecs: BackendSpec[];
  
  // 基础设施规格
  infrastructureSpecs: InfrastructureSpec[];
  
  // QA 规格
  qaSpecs: QASpec[];
}

export interface Feature {
  id: string;
  name: string;
  description: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  status: 'draft' | 'approved' | 'in-progress' | 'completed';
  dependencies?: string[];
}

export interface UserFlow {
  id: string;
  name: string;
  steps: FlowStep[];
}

export interface FlowStep {
  step: number;
  action: string;
  expected: string;
}

export interface UIRequirement {
  id: string;
  component: string;
  description: string;
  interactions: string[];
}

export interface DataSpec {
  entity: string;
  fields: Field[];
  relationships: Relationship[];
}

export interface Field {
  name: string;
  type: string;
  required: boolean;
  constraints?: string[];
}

export interface Relationship {
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  target: string;
}

export interface Constraint {
  id: string;
  type: 'technical' | 'business' | 'regulatory' | 'performance' | 'security' | 'compliance' | 'dependency' | 'quality' | 'budget';
  description: string;
}

export interface AcceptanceCriterion {
  id: string;
  featureId: string;
  description: string;
  testable: boolean;
}

export interface Dependency {
  id: string;
  type: 'internal' | 'external';
  description: string;
  critical: boolean;
}

export interface NonFunctionalSpec {
  category: 'performance' | 'security' | 'scalability' | 'reliability';
  requirement: string;
  metric: string;
  target: string;
}

export interface Workflow {
  id: string;
  name: string;
  triggers: string[];
  actions: string[];
}

export interface BackendSpec {
  api: APISpec[];
  services: ServiceSpec[];
}

export interface APISpec {
  path: string;
  method: string;
  request?: Record<string, unknown>;
  response?: Record<string, unknown>;
}

export interface ServiceSpec {
  name: string;
  responsibility: string;
  dependencies: string[];
}

export interface InfrastructureSpec {
  environment: 'dev' | 'staging' | 'prod';
  resources: Resource[];
  scaling: ScalingSpec;
}

export interface Resource {
  type: 'compute' | 'storage' | 'network';
  spec: string;
  quantity: number;
}

export interface ScalingSpec {
  min: number;
  max: number;
  trigger: string;
}

export interface QASpec {
  testTypes: string[];
  coverage: number;
  automation: number;
}

export interface PRDParserConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  llmClient?: LLMClient;
  llmConfig?: Partial<LLMClientConfig>;
}

/**
 * AI-Native PRD Parser
 */
export class AINativePRDParser {
  private llm: LLMClient;
  private model: string;

  constructor(config?: PRDParserConfig) {
    if (config?.llmClient) {
      this.llm = config.llmClient;
    } else {
      this.llm = new LLMClient({
        apiKey: config?.apiKey || process.env.DASHSCOPE_API_KEY || '',
        baseUrl: config?.baseUrl,
        defaultModel: config?.model,
        ...config?.llmConfig,
      });
    }
    this.model = config?.model || 'qwen3.5-plus';
  }

  /**
   * 解析 PRD 文档
   */
  async parse(prdText: string): Promise<AINativePRD> {
    if (!prdText || !prdText.trim()) {
      return this.emptyPRD();
    }

    const systemPrompt = `你是一个专业的 PRD 解析器。将输入的 PRD 文本解析为结构化的 JSON 格式。

严格按照以下 JSON Schema 输出，不要输出任何其他内容：
- features: 功能特性数组，每个特征包含 id, name, description, priority(P0/P1/P2/P3), status(draft/approved/in-progress/completed)
- userFlows: 用户流程数组，每个流程包含 id, name, steps(步骤数组，每步含 step序号, action, expected)
- uiRequirements: UI需求数组，每个包含 id, component, description, interactions(字符串数组)
- data: 数据实体规格数组，每个包含 entity, fields(字段数组), relationships(关系数组)
- constraints: 约束条件数组，每个包含 id, type(technical/business/regulatory), description
- acceptanceCriteria: 验收标准数组，每个包含 id, featureId, description, testable(布尔)
- dependencies: 依赖关系数组，每个包含 id, type(internal/external), description, critical(布尔)
- nonFunctionalSpecs: 非功能需求数组，每个包含 category(performance/security/scalability/reliability), requirement, metric, target
- workflow: 工作流数组，每个包含 id, name, triggers(数组), actions(数组)
- backendSpecs: 后端规格，包含 api(path/method/request/response) 和 services(name/responsibility/dependencies)
- infrastructureSpecs: 基础设施规格数组，每个包含 environment(dev/staging/prod), resources, scaling
- qaSpecs: QA规格，包含 testTypes, coverage, automation

如果某部分信息在输入中不存在，设为空数组，不要编造。`;

    const result = await this.llm.chat({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prdText },
      ],
      temperature: 0.1,
      max_tokens: 8192,
      timeoutMs: 600000,
    });

    if (!result.ok) {
      return this.emptyPRD();
    }

    try {
      const parsed = JSON.parse(result.content) as Partial<AINativePRD>;
      // Handle qaSpecs which may be a single object or array
      let qaSpecs: QASpec[] = [];
      if (Array.isArray(parsed.qaSpecs)) {
        qaSpecs = parsed.qaSpecs;
      } else if (parsed.qaSpecs && typeof parsed.qaSpecs === 'object') {
        qaSpecs = [parsed.qaSpecs as unknown as QASpec];
      }
      return {
        features: Array.isArray(parsed.features) ? parsed.features : [],
        userFlows: Array.isArray(parsed.userFlows) ? parsed.userFlows : [],
        uiRequirements: Array.isArray(parsed.uiRequirements) ? parsed.uiRequirements : [],
        data: Array.isArray(parsed.data) ? parsed.data : [],
        constraints: Array.isArray(parsed.constraints) ? parsed.constraints : [],
        acceptanceCriteria: Array.isArray(parsed.acceptanceCriteria) ? parsed.acceptanceCriteria : [],
        dependencies: Array.isArray(parsed.dependencies) ? parsed.dependencies : [],
        nonFunctionalSpecs: Array.isArray(parsed.nonFunctionalSpecs) ? parsed.nonFunctionalSpecs : [],
        workflow: Array.isArray(parsed.workflow) ? parsed.workflow : [],
        backendSpecs: Array.isArray(parsed.backendSpecs) ? parsed.backendSpecs : [],
        infrastructureSpecs: Array.isArray(parsed.infrastructureSpecs) ? parsed.infrastructureSpecs : [],
        qaSpecs,
      };
    } catch {
      return this.emptyPRD();
    }
  }

  private emptyPRD(): AINativePRD {
    return {
      features: [
        { id: 'default', name: 'Default Feature', description: 'Fallback feature from empty PRD', priority: 'P0', status: 'draft' },
      ],
      userFlows: [],
      uiRequirements: [],
      data: [],
      constraints: [],
      acceptanceCriteria: [],
      dependencies: [],
      nonFunctionalSpecs: [],
      workflow: [],
      backendSpecs: [],
      infrastructureSpecs: [],
      qaSpecs: [],
    };
  }

  /**
   * 提取 Feature
   */
  extractFeatures(prd: AINativePRD): Feature[] {
    return prd.features;
  }

  /**
   * 提取 User Flow
   */
  extractUserFlows(prd: AINativePRD): UserFlow[] {
    return prd.userFlows;
  }

  /**
   * 提取 UI Requirements
   */
  extractUIRequirements(prd: AINativePRD): UIRequirement[] {
    return prd.uiRequirements;
  }

  /**
   * 提取 Data Spec
   */
  extractDataSpecs(prd: AINativePRD): DataSpec[] {
    return prd.data;
  }

  /**
   * 提取 Constraints
   */
  extractConstraints(prd: AINativePRD): Constraint[] {
    return prd.constraints;
  }

  /**
   * 验证 PRD 完整性
   */
  validateCompleteness(prd: AINativePRD): ValidationReport {
    const report: ValidationReport = {
      valid: true,
      missing: [],
      warnings: [],
    };

    // Only features is strictly required
    if (!prd.features || prd.features.length === 0) {
      report.missing.push('features');
      report.valid = false;
    }

    // All other sections are optional — warn but don't fail
    if (!prd.userFlows || prd.userFlows.length === 0) {
      report.warnings.push('userFlows: no user flows defined');
    }
    if (!prd.backendSpecs || prd.backendSpecs.length === 0) {
      report.warnings.push('backendSpecs: no backend specs defined');
    }
    if (!prd.acceptanceCriteria || prd.acceptanceCriteria.length === 0) {
      report.warnings.push('acceptanceCriteria: none defined');
    }
    if (!prd.constraints || prd.constraints.length === 0) {
      report.warnings.push('constraints: none defined');
    }
    if (!prd.nonFunctionalSpecs || prd.nonFunctionalSpecs.length === 0) {
      report.warnings.push('nonFunctionalSpecs: none defined');
    }
    if (!prd.data || prd.data.length === 0) {
      report.warnings.push('data: no data specs defined');
    }

    // Optional sections — just warn
    if (!prd.dependencies || prd.dependencies.length === 0) {
      report.warnings.push('No dependencies defined');
    }
    if (!prd.workflow || prd.workflow.length === 0) {
      report.warnings.push('No workflow defined');
    }
    if (!prd.infrastructureSpecs || prd.infrastructureSpecs.length === 0) {
      report.warnings.push('No infrastructure specs defined');
    }
    if (!prd.qaSpecs || (prd.qaSpecs.length === 0)) {
      report.warnings.push('No QA specs defined');
    }

    return report;
  }

  /**
   * Assess PRD quality using LLM — ambiguity, conflicts, missing sections, scoring 0-100
   */
  async assessQuality(prd: AINativePRD, prdText: string): Promise<PRDQualityReport> {
    const systemPrompt = `你是一个专业的 PRD 质量评估专家。请对以下 PRD 进行全面质量评估。

评估维度：
1. 歧义性：识别模糊、不明确的描述
2. 冲突：检测需求之间的相互矛盾
3. 缺失关键信息：用户角色、验收标准、非功能需求、边界条件
4. 可测试性：验收标准是否可量化、可测试

输出纯 JSON，格式如下：
{
  "score": 0-100的数字,
  "ambiguities": [{"location": "位置描述", "text": "模糊文本", "suggestion": "改进建议"}],
  "conflicts": [{"description": "冲突描述", "severity": "critical或warning"}],
  "missingSections": ["缺失的关键部分名称"],
  "suggestions": ["改进建议"]
}

评分标准：
- 90-100: 完整、清晰、无歧义、可测试
- 70-89: 基本完整，有少量模糊描述
- 50-69: 有关键信息缺失，需要补充
- 0-49: 严重不完整，无法用于开发

如果原文本中没有歧义/冲突，对应数组设为空。不要编造问题。`;

    try {
      const result = await this.llm.chat({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prdText },
        ],
        temperature: 0.1,
      });

      if (!result.ok) {
        return this.defaultQualityReport(prd);
      }

      try {
        const parsed = JSON.parse(result.content) as Partial<PRDQualityReport>;
        return {
          score: typeof parsed.score === 'number' ? parsed.score : 50,
          ambiguities: Array.isArray(parsed.ambiguities) ? parsed.ambiguities : [],
          conflicts: Array.isArray(parsed.conflicts) ? parsed.conflicts : [],
          missingSections: Array.isArray(parsed.missingSections) ? parsed.missingSections : [],
          suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
        };
      } catch {
        return this.defaultQualityReport(prd);
      }
    } catch {
      return this.defaultQualityReport(prd);
    }
  }

  private defaultQualityReport(prd: AINativePRD): PRDQualityReport {
    const missing: string[] = [];
    const suggestions: string[] = [];

    if (!prd.features?.length) missing.push('功能特性');
    if (!prd.acceptanceCriteria?.length) { missing.push('验收标准'); suggestions.push('添加可量化的验收标准'); }
    if (!prd.constraints?.length) { missing.push('约束条件'); suggestions.push('补充技术/业务约束'); }
    if (!prd.nonFunctionalSpecs?.length) { missing.push('非功能需求'); suggestions.push('补充性能、安全等非功能需求'); }
    if (!prd.userFlows?.length) { missing.push('用户流程'); suggestions.push('补充核心用户流程'); }

    const score = missing.length === 0 ? 85 : Math.max(20, 85 - missing.length * 15);

    return {
      score,
      ambiguities: [],
      conflicts: [],
      missingSections: missing,
      suggestions,
    };
  }
}

export interface ValidationReport {
  valid: boolean;
  missing: string[];
  warnings: string[];
}

export interface PRDQualityReport {
  score: number;
  ambiguities: { location: string; text: string; suggestion: string }[];
  conflicts: { description: string; severity: 'critical' | 'warning' }[];
  missingSections: string[];
  suggestions: string[];
}

/**
 * Auto-enhance a low-quality PRD by using LLM to fill missing sections
 * based on the quality report's suggestions and missing sections.
 */
export async function autoEnhancePRD(
  prdText: string,
  qualityReport: PRDQualityReport,
  llm: LLMClient,
  model: string,
): Promise<string> {
  const systemPrompt = `你是一个专业的 PRD 撰写助手。请根据以下 PRD 原文和质量评估报告，补充缺失的关键信息。

质量评估发现：
- 缺失部分：${qualityReport.missingSections.join('、') || '无'}
- 改进建议：${qualityReport.suggestions.join('；') || '无'}

请在原文基础上补充以下内容（如原文中已有则跳过）：
1. 验收标准（acceptanceCriteria）：为每个核心功能补充 1-2 条可量化、可测试的验收标准
2. 约束条件（constraints）：补充技术约束（如框架版本、语言）、业务约束
3. 非功能需求（nonFunctionalSpecs）：补充性能指标（响应时间、并发量）、安全性要求
4. 用户流程（userFlows）：补充核心用户操作流程

要求：
- 保持原文所有已有内容不变
- 在文末追加补充内容，格式清晰
- 不要编造与原文冲突的内容
- 输出纯文本，不要使用 JSON`;

  const result = await llm.chat({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `PRD 原文：\n\n${prdText}` },
    ],
    temperature: 0.3,
    timeoutMs: 120000,
  });

  if (!result.ok) {
    // Fallback: append a structured placeholder so downstream parsers can still work
    return `${prdText}\n\n--- Auto-Enhanced Sections (generated) ---\n${qualityReport.suggestions.map((s, i) => `[建议 ${i + 1}] ${s}`).join('\n')}`;
  }

  return result.content;
}

export default AINativePRDParser;
