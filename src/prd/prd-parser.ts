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

/**
 * AI-Native PRD Parser
 */
export class AINativePRDParser {
  /**
   * 解析 PRD 文档
   */
  parse(prdText: string): AINativePRD {
    // TODO: 实现 AI 驱动的 PRD 解析
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
