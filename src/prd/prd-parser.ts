/**
 * AI Native Full-Stack Software Factory
 * Layer 1: AI-Native PRD Parser (全栈增强版)
 * 
 * @version 1.0.0
 * @date 2026-03-29
 */

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
  type: 'technical' | 'business' | 'regulatory';
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
  request: any;
  response: any;
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
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

/**
 * AI-Native PRD Parser
 */
export class AINativePRDParser {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(config?: PRDParserConfig) {
    this.apiKey = config?.apiKey || process.env.DASHSCOPE_API_KEY || '';
    this.baseUrl = config?.baseUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
    this.model = config?.model || 'qwen3.5-plus';
  }

  /**
   * 解析 PRD 文档
   */
  async parse(prdText: string): Promise<AINativePRD> {
    if (!prdText || !prdText.trim()) {
      return this.emptyPRD();
    }

    if (!this.apiKey) {
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

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prdText },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`百炼 API 调用失败: ${response.status} ${error}`);
    }

    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    const content = data.choices[0]?.message?.content || '';

    try {
      const parsed = JSON.parse(content) as Partial<AINativePRD>;
      return {
        features: parsed.features || [],
        userFlows: parsed.userFlows || [],
        uiRequirements: parsed.uiRequirements || [],
        data: parsed.data || [],
        constraints: parsed.constraints || [],
        acceptanceCriteria: parsed.acceptanceCriteria || [],
        dependencies: parsed.dependencies || [],
        nonFunctionalSpecs: parsed.nonFunctionalSpecs || [],
        workflow: parsed.workflow || [],
        backendSpecs: parsed.backendSpecs || [],
        infrastructureSpecs: parsed.infrastructureSpecs || [],
        qaSpecs: parsed.qaSpecs || [],
      };
    } catch {
      return this.emptyPRD();
    }
  }

  private emptyPRD(): AINativePRD {
    return {
      features: [],
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

    if (!prd.features || prd.features.length === 0) {
      report.missing.push('features');
      report.valid = false;
    }

    if (!prd.acceptanceCriteria || prd.acceptanceCriteria.length === 0) {
      report.warnings.push('No acceptance criteria defined');
    }

    return report;
  }
}

export interface ValidationReport {
  valid: boolean;
  missing: string[];
  warnings: string[];
}

export default AINativePRDParser;
