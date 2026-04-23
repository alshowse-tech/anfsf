/**
 * Domain Knowledge Base - 领域知识库
 * 
 * 提供 PRD 智能校验与补全引擎所需的知识模板
 * 包括：组织架构、角色权限、流程模式、字段标准、查询模板、历史 PRD
 * 
 * @module asf-v4/knowledge/domain-knowledge-base
 * @version 1.0.0
 */

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 组织架构模板
 */
export interface OrgStructure {
  id: string;
  industry: string; // 行业：education, finance, manufacturing, government
  name: string;
  departments: Department[];
  defaultRelations: Relation[];
}

/**
 * 部门定义
 */
export interface Department {
  name: string;
  level: number;
  parent?: string;
  responsibilities: string[];
}

/**
 * 部门关系
 */
export interface Relation {
  from: string;
  to: string;
  type: 'reports_to' | 'collaborates_with' | 'approves';
}

/**
 * 角色权限模型
 */
export interface RolePermission {
  id: string;
  industry: string;
  roles: Role[];
  defaultPermissions: Permission[];
  inheritanceRules: InheritanceRule[];
}

/**
 * 角色定义
 */
export interface Role {
  name: string;
  description: string;
  permissions: string[];
  inherits?: string[];
}

/**
 * 权限定义
 */
export interface Permission {
  resource: string;
  actions: string[]; // ['create', 'read', 'update', 'delete']
}

/**
 * 权限继承规则
 */
export interface InheritanceRule {
  fromRole: string;
  toRole: string;
  inheritedPermissions: string[];
}

/**
 * 流程模式
 */
export interface FlowPattern {
  id: string;
  domain: string; // 领域：立项，采购，审批，验收
  name: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  commonBranches: Branch[];
  errorHandlers: ErrorHandler[];
}

/**
 * 流程节点
 */
export interface FlowNode {
  id: string;
  name: string;
  type: 'start' | 'end' | 'approval' | 'action' | 'condition' | 'notification';
  actor?: string; // 执行角色
  description?: string;
}

/**
 * 流程边
 */
export interface FlowEdge {
  from: string;
  to: string;
  condition?: string;
  label?: string;
}

/**
 * 流程分支
 */
export interface Branch {
  condition: string;
  path: string[];
}

/**
 * 错误处理器
 */
export interface ErrorHandler {
  errorType: string;
  handler: string;
  fallback?: string;
}

/**
 * 字段标准
 */
export interface FieldStandard {
  id: string;
  entityType: string; // 实体类型：项目，合同，订单
  requiredFields: Field[];
  optionalFields: Field[];
  fieldRelations: FieldRelation[];
}

/**
 * 字段定义
 */
export interface Field {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'enum' | 'array' | 'object';
  required: boolean;
  description?: string;
  constraints?: FieldConstraint[];
  defaultValue?: any;
}

/**
 * 字段约束
 */
export interface FieldConstraint {
  type: 'min' | 'max' | 'pattern' | 'enum' | 'unique';
  value: any;
}

/**
 * 字段关系
 */
export interface FieldRelation {
  field: string;
  relatedField: string;
  relationType: 'depends_on' | 'implies' | 'excludes';
}

/**
 * 查询条件模板
 */
export interface QueryTemplate {
  id: string;
  scene: string; // 场景：列表查询，报表查询，筛选
  defaultConditions: Condition[];
  commonFilters: Filter[];
}

/**
 * 查询条件
 */
export interface Condition {
  name: string;
  type: 'text' | 'number' | 'date' | 'enum' | 'range';
  label: string;
  default?: any;
  required?: boolean;
}

/**
 * 查询过滤器
 */
export interface Filter {
  name: string;
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'like' | 'in';
  value?: any;
}

/**
 * 历史 PRD 模板
 */
export interface HistoricalTemplate {
  id: string;
  projectType: string;
  name: string;
  structure: PRDStructure;
  commonIssues: Issue[];
  fixes: Fix[];
  successRate: number;
}

/**
 * PRD 结构
 */
export interface PRDStructure {
  sections: Section[];
  requiredSections: string[];
  optionalSections: string[];
}

/**
 * PRD 章节
 */
export interface Section {
  id: string;
  name: string;
  description: string;
  required: boolean;
  template?: string;
}

/**
 * 常见问题
 */
export interface Issue {
  id: string;
  type: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
}

/**
 * 问题修复
 */
export interface Fix {
  issueId: string;
  solution: string;
  example?: string;
}

// ============================================================================
// 领域知识库主接口
// ============================================================================

export interface DomainKnowledgeBaseData {
  orgStructures: OrgStructure[];
  rolePermissions: RolePermission[];
  flowPatterns: FlowPattern[];
  fieldStandards: FieldStandard[];
  queryTemplates: QueryTemplate[];
  historicalTemplates: HistoricalTemplate[];
}

// ============================================================================
// 领域知识库实现
// ============================================================================

export class DomainKnowledgeBase {
  private data: DomainKnowledgeBaseData;
  private static instance: DomainKnowledgeBase | null = null;

  private constructor() {
    this.data = this.initializeDefaultKnowledge();
  }

  /**
   * 单例获取
   */
  static getInstance(): DomainKnowledgeBase {
    if (!DomainKnowledgeBase.instance) {
      DomainKnowledgeBase.instance = new DomainKnowledgeBase();
    }
    return DomainKnowledgeBase.instance;
  }

  /**
   * 初始化默认知识库
   */
  private initializeDefaultKnowledge(): DomainKnowledgeBaseData {
    return {
      orgStructures: this.getDefaultOrgStructures(),
      rolePermissions: this.getDefaultRolePermissions(),
      flowPatterns: this.getDefaultFlowPatterns(),
      fieldStandards: this.getDefaultFieldStandards(),
      queryTemplates: this.getDefaultQueryTemplates(),
      historicalTemplates: this.getDefaultHistoricalTemplates()
    };
  }

  /**
   * 获取默认组织架构模板
   */
  private getDefaultOrgStructures(): OrgStructure[] {
    return [
      {
        id: 'org_edu_001',
        industry: 'education',
        name: '教育行业标准组织架构',
        departments: [
          { name: '投资管理部', level: 1, responsibilities: ['项目立项', '投资计划', '预算审批'] },
          { name: '工程部', level: 1, responsibilities: ['工程实施', '合同管理', '进度控制'] },
          { name: '审计部', level: 1, responsibilities: ['结算审计', '合规检查', '风险控制'] },
          { name: '财务部', level: 1, responsibilities: ['资金拨付', '账务处理', '成本核算'] },
          { name: '计划部', level: 1, responsibilities: ['计划编制', '汇总审核', '绩效评估'] }
        ],
        defaultRelations: [
          { from: '工程部', to: '投资管理部', type: 'reports_to' },
          { from: '审计部', to: '投资管理部', type: 'collaborates_with' },
          { from: '财务部', to: '投资管理部', type: 'collaborates_with' },
          { from: '计划部', to: '投资管理部', type: 'collaborates_with' }
        ]
      },
      {
        id: 'org_finance_001',
        industry: 'finance',
        name: '金融行业标准组织架构',
        departments: [
          { name: '风险管理部', level: 1, responsibilities: ['风险评估', '合规管理', '内控审计'] },
          { name: '业务部', level: 1, responsibilities: ['客户开发', '业务办理', '贷后管理'] },
          { name: '审批部', level: 1, responsibilities: ['贷款审批', '授信审批', '风险评估'] },
          { name: '财务部', level: 1, responsibilities: ['会计核算', '资金管理', '财务报告'] },
          { name: '科技部', level: 1, responsibilities: ['系统开发', '运维支持', '数据安全'] }
        ],
        defaultRelations: [
          { from: '业务部', to: '审批部', type: 'reports_to' },
          { from: '风险管理部', to: '审批部', type: 'collaborates_with' },
          { from: '财务部', to: '风险管理部', type: 'collaborates_with' }
        ]
      },
      {
        id: 'org_gov_001',
        industry: 'government',
        name: '政务行业标准组织架构',
        departments: [
          { name: '办公室', level: 1, responsibilities: ['综合协调', '文秘工作', '后勤保障'] },
          { name: '业务科室', level: 1, responsibilities: ['业务办理', '政策执行', '服务群众'] },
          { name: '财务科', level: 1, responsibilities: ['预算管理', '会计核算', '资产管理'] },
          { name: '人事科', level: 1, responsibilities: ['人员管理', '考核培训', '工资福利'] },
          { name: '监察室', level: 1, responsibilities: ['纪律检查', '效能监察', '信访处理'] }
        ],
        defaultRelations: [
          { from: '业务科室', to: '办公室', type: 'reports_to' },
          { from: '财务科', to: '办公室', type: 'collaborates_with' },
          { from: '人事科', to: '办公室', type: 'collaborates_with' },
          { from: '监察室', to: '办公室', type: 'collaborates_with' }
        ]
      }
    ];
  }

  /**
   * 获取默认角色权限模型
   */
  private getDefaultRolePermissions(): RolePermission[] {
    return [
      {
        id: 'role_edu_001',
        industry: 'education',
        roles: [
          { name: '系统管理员', description: '系统最高权限', permissions: ['*'] },
          { name: '项目经理', description: '项目负责人', permissions: ['project:create', 'project:update', 'project:delete', 'doc:upload'] },
          { name: '部门经理', description: '部门负责人', permissions: ['project:approve', 'budget:review', 'doc:approve'] },
          { name: '审计员', description: '审计人员', permissions: ['project:view', 'audit:submit', 'audit:approve', 'report:view'] },
          { name: '财务', description: '财务人员', permissions: ['payment:execute', 'payment:view', 'report:view', 'budget:review'] },
          { name: '普通员工', description: '普通用户', permissions: ['project:view', 'doc:view', 'doc:upload'] }
        ],
        defaultPermissions: [
          { resource: 'project', actions: ['read'] },
          { resource: 'doc', actions: ['read'] }
        ],
        inheritanceRules: [
          { fromRole: '部门经理', toRole: '项目经理', inheritedPermissions: ['project:view', 'doc:view'] },
          { fromRole: '项目经理', toRole: '普通员工', inheritedPermissions: ['project:view'] }
        ]
      },
      {
        id: 'role_finance_001',
        industry: 'finance',
        roles: [
          { name: '系统管理员', description: '系统最高权限', permissions: ['*'] },
          { name: '风控总监', description: '风险管理负责人', permissions: ['risk:approve', 'risk:view', 'report:view', 'policy:update'] },
          { name: '客户经理', description: '客户关系管理', permissions: ['customer:create', 'customer:update', 'loan:apply', 'loan:view'] },
          { name: '审批员', description: '贷款审批', permissions: ['loan:approve', 'loan:view', 'risk:assess'] },
          { name: '贷后管理员', description: '贷后管理', permissions: ['loan:track', 'payment:record', 'alert:handle'] }
        ],
        defaultPermissions: [
          { resource: 'customer', actions: ['read'] },
          { resource: 'loan', actions: ['read'] }
        ],
        inheritanceRules: [
          { fromRole: '风控总监', toRole: '审批员', inheritedPermissions: ['risk:view', 'report:view'] }
        ]
      }
    ];
  }

  /**
   * 获取默认流程模式
   */
  private getDefaultFlowPatterns(): FlowPattern[] {
    return [
      {
        id: 'flow_procure_001',
        domain: 'procurement',
        name: '标准采购流程',
        nodes: [
          { id: 'start', name: '发起采购申请', type: 'start', actor: '申请人' },
          { id: 'dept_approve', name: '部门审批', type: 'approval', actor: '部门经理' },
          { id: 'finance_approve', name: '财务审批', type: 'approval', actor: '财务' },
          { id: 'leader_approve', name: '领导审批', type: 'approval', actor: '分管领导' },
          { id: 'execute', name: '执行采购', type: 'action', actor: '采购员' },
          { id: 'accept', name: '验收', type: 'action', actor: '申请人' },
          { id: 'end', name: '结束', type: 'end' }
        ],
        edges: [
          { from: 'start', to: 'dept_approve' },
          { from: 'dept_approve', to: 'finance_approve', condition: 'approved' },
          { from: 'finance_approve', to: 'leader_approve', condition: 'approved' },
          { from: 'leader_approve', to: 'execute', condition: 'approved' },
          { from: 'execute', to: 'accept' },
          { from: 'accept', to: 'end' }
        ],
        commonBranches: [
          { condition: '金额>10 万', path: ['leader_approve', 'execute'] },
          { condition: '金额<=10 万', path: ['execute'] }
        ],
        errorHandlers: [
          { errorType: 'approval_rejected', handler: 'notify_applicant', fallback: 'start' },
          { errorType: 'budget_insufficient', handler: 'notify_finance', fallback: 'finance_approve' }
        ]
      },
      {
        id: 'flow_project_001',
        domain: 'project',
        name: '项目立项流程',
        nodes: [
          { id: 'start', name: '提交立项申请', type: 'start', actor: '申请人' },
          { id: 'preliminary_review', name: '初审', type: 'approval', actor: '投资管理部' },
          { id: 'feasibility_study', name: '可行性研究', type: 'action', actor: '专家组' },
          { id: 'budget_review', name: '预算审核', type: 'approval', actor: '财务部' },
          { id: 'final_approval', name: '最终审批', type: 'approval', actor: '领导班子' },
          { id: 'register', name: '项目登记', type: 'action', actor: '投资管理部' },
          { id: 'end', name: '立项完成', type: 'end' }
        ],
        edges: [
          { from: 'start', to: 'preliminary_review' },
          { from: 'preliminary_review', to: 'feasibility_study', condition: 'approved' },
          { from: 'feasibility_study', to: 'budget_review' },
          { from: 'budget_review', to: 'final_approval', condition: 'approved' },
          { from: 'final_approval', to: 'register', condition: 'approved' },
          { from: 'register', to: 'end' }
        ],
        commonBranches: [
          { condition: '投资>100 万', path: ['feasibility_study', 'budget_review', 'final_approval'] },
          { condition: '投资<=100 万', path: ['budget_review', 'final_approval'] }
        ],
        errorHandlers: [
          { errorType: 'rejected', handler: 'notify_applicant', fallback: 'start' },
          { errorType: 'budget_exceeded', handler: 'request_revision', fallback: 'budget_review' }
        ]
      },
      {
        id: 'flow_contract_001',
        domain: 'contract',
        name: '合同审批流程',
        nodes: [
          { id: 'start', name: '起草合同', type: 'start', actor: '经办人' },
          { id: 'legal_review', name: '法务审核', type: 'approval', actor: '法务' },
          { id: 'finance_review', name: '财务审核', type: 'approval', actor: '财务' },
          { id: 'dept_review', name: '部门审核', type: 'approval', actor: '部门经理' },
          { id: 'leader_sign', name: '领导签署', type: 'approval', actor: '分管领导' },
          { id: 'seal', name: '盖章', type: 'action', actor: '办公室' },
          { id: 'archive', name: '归档', type: 'action', actor: '档案管理员' },
          { id: 'end', name: '完成', type: 'end' }
        ],
        edges: [
          { from: 'start', to: 'legal_review' },
          { from: 'legal_review', to: 'finance_review', condition: 'approved' },
          { from: 'finance_review', to: 'dept_review', condition: 'approved' },
          { from: 'dept_review', to: 'leader_sign', condition: 'approved' },
          { from: 'leader_sign', to: 'seal', condition: 'approved' },
          { from: 'seal', to: 'archive' },
          { from: 'archive', to: 'end' }
        ],
        commonBranches: [
          { condition: '合同金额>50 万', path: ['leader_sign', 'seal'] },
          { condition: '合同金额<=50 万', path: ['dept_review', 'seal'] }
        ],
        errorHandlers: [
          { errorType: 'legal_issue', handler: 'request_revision', fallback: 'legal_review' },
          { errorType: 'finance_issue', handler: 'request_revision', fallback: 'finance_review' }
        ]
      }
    ];
  }

  /**
   * 获取默认字段标准
   */
  private getDefaultFieldStandards(): FieldStandard[] {
    return [
      {
        id: 'field_project_001',
        entityType: 'project',
        requiredFields: [
          { name: 'projectCode', type: 'string', required: true, description: '项目编号', constraints: [{ type: 'pattern', value: '^PRJ[0-9]{6}$' }] },
          { name: 'projectName', type: 'string', required: true, description: '项目名称' },
          { name: 'projectType', type: 'enum', required: true, description: '项目类型', constraints: [{ type: 'enum', value: ['固定资产投资', '技术改造', '基建工程', '设备采购'] }] },
          { name: 'budget', type: 'number', required: true, description: '预算金额', constraints: [{ type: 'min', value: 0 }] },
          { name: 'startDate', type: 'date', required: true, description: '计划开始日期' },
          { name: 'endDate', type: 'date', required: true, description: '计划结束日期' },
          { name: 'responsibleDept', type: 'string', required: true, description: '责任部门' },
          { name: 'projectManager', type: 'string', required: true, description: '项目负责人' }
        ],
        optionalFields: [
          { name: 'description', type: 'string', required: false, description: '项目描述' },
          { name: 'attachments', type: 'array', required: false, description: '附件列表' },
          { name: 'tags', type: 'array', required: false, description: '标签' },
          { name: 'priority', type: 'enum', required: false, description: '优先级', defaultValue: 'medium', constraints: [{ type: 'enum', value: ['low', 'medium', 'high', 'urgent'] }] }
        ],
        fieldRelations: [
          { field: 'endDate', relatedField: 'startDate', relationType: 'depends_on' }
        ]
      },
      {
        id: 'field_contract_001',
        entityType: 'contract',
        requiredFields: [
          { name: 'contractCode', type: 'string', required: true, description: '合同编号' },
          { name: 'contractName', type: 'string', required: true, description: '合同名称' },
          { name: 'contractType', type: 'enum', required: true, description: '合同类型', constraints: [{ type: 'enum', value: ['采购合同', '施工合同', '服务合同', '其他'] }] },
          { name: 'partyA', type: 'string', required: true, description: '甲方' },
          { name: 'partyB', type: 'string', required: true, description: '乙方' },
          { name: 'amount', type: 'number', required: true, description: '合同金额', constraints: [{ type: 'min', value: 0 }] },
          { name: 'signDate', type: 'date', required: true, description: '签署日期' },
          { name: 'effectiveDate', type: 'date', required: true, description: '生效日期' }
        ],
        optionalFields: [
          { name: 'description', type: 'string', required: false, description: '合同描述' },
          { name: 'attachments', type: 'array', required: false, description: '附件' },
          { name: 'paymentTerms', type: 'string', required: false, description: '付款条款' },
          { name: 'validityPeriod', type: 'string', required: false, description: '有效期' }
        ],
        fieldRelations: [
          { field: 'effectiveDate', relatedField: 'signDate', relationType: 'depends_on' }
        ]
      },
      {
        id: 'field_order_001',
        entityType: 'order',
        requiredFields: [
          { name: 'orderCode', type: 'string', required: true, description: '订单编号' },
          { name: 'orderName', type: 'string', required: true, description: '订单名称' },
          { name: 'orderType', type: 'enum', required: true, description: '订单类型' },
          { name: 'amount', type: 'number', required: true, description: '订单金额' },
          { name: 'createDate', type: 'datetime', required: true, description: '创建日期' },
          { name: 'status', type: 'enum', required: true, description: '订单状态', defaultValue: 'pending' }
        ],
        optionalFields: [
          { name: 'description', type: 'string', required: false, description: '订单描述' },
          { name: 'remark', type: 'string', required: false, description: '备注' }
        ],
        fieldRelations: []
      }
    ];
  }

  /**
   * 获取默认查询模板
   */
  private getDefaultQueryTemplates(): QueryTemplate[] {
    return [
      {
        id: 'query_project_list',
        scene: '项目列表查询',
        defaultConditions: [
          { name: 'projectName', type: 'text', label: '项目名称', required: false },
          { name: 'projectType', type: 'enum', label: '项目类型', required: false },
          { name: 'responsibleDept', type: 'enum', label: '责任部门', required: false },
          { name: 'status', type: 'enum', label: '项目状态', required: false },
          { name: 'startDateRange', type: 'range', label: '开始日期范围', required: false },
          { name: 'budgetRange', type: 'range', label: '预算范围', required: false }
        ],
        commonFilters: [
          { name: 'status_filter', field: 'status', operator: 'eq' },
          { name: 'dept_filter', field: 'responsibleDept', operator: 'in' }
        ]
      },
      {
        id: 'query_contract_list',
        scene: '合同列表查询',
        defaultConditions: [
          { name: 'contractName', type: 'text', label: '合同名称', required: false },
          { name: 'contractType', type: 'enum', label: '合同类型', required: false },
          { name: 'partyB', type: 'text', label: '乙方', required: false },
          { name: 'signDateRange', type: 'range', label: '签署日期范围', required: false },
          { name: 'amountRange', type: 'range', label: '金额范围', required: false },
          { name: 'status', type: 'enum', label: '合同状态', required: false }
        ],
        commonFilters: [
          { name: 'status_filter', field: 'status', operator: 'eq' },
          { name: 'type_filter', field: 'contractType', operator: 'eq' }
        ]
      },
      {
        id: 'query_report',
        scene: '报表查询',
        defaultConditions: [
          { name: 'reportType', type: 'enum', label: '报表类型', required: true },
          { name: 'dateRange', type: 'range', label: '统计日期范围', required: true },
          { name: 'dept', type: 'enum', label: '部门', required: false },
          { name: 'groupBy', type: 'enum', label: '分组维度', required: false }
        ],
        commonFilters: []
      }
    ];
  }

  /**
   * 获取默认历史 PRD 模板
   */
  private getDefaultHistoricalTemplates(): HistoricalTemplate[] {
    return [
      {
        id: 'hist_fixed_asset_001',
        projectType: '固定资产投资',
        name: '固定资产投资管理系统',
        structure: {
          sections: [
            { id: 'overview', name: '项目概述', description: '项目背景、目标、范围', required: true },
            { id: 'org_structure', name: '组织架构', description: '涉及部门及职责', required: true },
            { id: 'roles', name: '角色权限', description: '用户角色及权限定义', required: true },
            { id: 'flows', name: '业务流程', description: '核心业务流程图', required: true },
            { id: 'features', name: '功能需求', description: '详细功能列表', required: true },
            { id: 'data', name: '数据需求', description: '数据实体及字段', required: true },
            { id: 'reports', name: '报表需求', description: '统计报表要求', required: false },
            { id: 'integration', name: '集成需求', description: '外部系统对接', required: false },
            { id: 'nonfunc', name: '非功能需求', description: '性能、安全等要求', required: true }
          ],
          requiredSections: ['overview', 'org_structure', 'roles', 'flows', 'features', 'data', 'nonfunc'],
          optionalSections: ['reports', 'integration']
        },
        commonIssues: [
          { id: 'issue_001', type: 'org_missing', description: '缺少组织架构描述', severity: 'high' },
          { id: 'issue_002', type: 'permission_incomplete', description: '权限定义不完整', severity: 'high' },
          { id: 'issue_003', type: 'flow_unclear', description: '流程描述不清晰', severity: 'medium' }
        ],
        fixes: [
          { issueId: 'issue_001', solution: '参考行业标准组织架构模板补充', example: '投资管理部、工程部、审计部、财务部、计划部' },
          { issueId: 'issue_002', solution: '定义完整角色列表及权限矩阵', example: '系统管理员、项目经理、部门经理、审计员、财务、普通员工' }
        ],
        successRate: 0.92
      },
      {
        id: 'hist_project_mgmt_001',
        projectType: '项目管理',
        name: '项目管理系统',
        structure: {
          sections: [
            { id: 'overview', name: '项目概述', description: '项目背景、目标', required: true },
            { id: 'features', name: '功能需求', description: '任务管理、进度跟踪、资源分配', required: true },
            { id: 'roles', name: '角色权限', description: '项目经理、成员、观察者', required: true },
            { id: 'flows', name: '工作流程', description: '任务创建、分配、完成流程', required: true },
            { id: 'data', name: '数据模型', description: '项目、任务、用户实体', required: true }
          ],
          requiredSections: ['overview', 'features', 'roles', 'flows', 'data'],
          optionalSections: []
        },
        commonIssues: [
          { id: 'issue_004', type: 'task_flow_missing', description: '任务流转流程缺失', severity: 'high' }
        ],
        fixes: [
          { issueId: 'issue_004', solution: '补充任务状态机及流转规则', example: '待办→进行中→已完成' }
        ],
        successRate: 0.88
      }
    ];
  }

  // ============================================================================
  // 公共方法
  // ============================================================================

  /**
   * 获取组织架构模板
   */
  getOrgStructure(industry: string): OrgStructure | undefined {
    return this.data.orgStructures.find(o => o.industry === industry);
  }

  /**
   * 获取所有组织架构模板
   */
  getAllOrgStructures(): OrgStructure[] {
    return this.data.orgStructures;
  }

  /**
   * 获取角色权限模型
   */
  getRolePermission(industry: string): RolePermission | undefined {
    return this.data.rolePermissions.find(r => r.industry === industry);
  }

  /**
   * 获取流程模式
   */
  getFlowPattern(domain: string): FlowPattern | undefined {
    return this.data.flowPatterns.find(f => f.domain === domain);
  }

  /**
   * 获取所有流程模式
   */
  getAllFlowPatterns(): FlowPattern[] {
    return this.data.flowPatterns;
  }

  /**
   * 获取字段标准
   */
  getFieldStandard(entityType: string): FieldStandard | undefined {
    return this.data.fieldStandards.find(f => f.entityType === entityType);
  }

  /**
   * 获取查询模板
   */
  getQueryTemplate(scene: string): QueryTemplate | undefined {
    return this.data.queryTemplates.find(q => q.scene === scene);
  }

  /**
   * 获取历史 PRD 模板
   */
  getHistoricalTemplate(projectType: string): HistoricalTemplate | undefined {
    return this.data.historicalTemplates.find(h => h.projectType === projectType);
  }

  /**
   * 基于相似度匹配历史模板
   */
  findSimilarTemplates(content: string, threshold: number = 0.7): Array<{ template: HistoricalTemplate; similarity: number }> {
    const results: Array<{ template: HistoricalTemplate; similarity: number }> = [];
    
    for (const template of this.data.historicalTemplates) {
      let matchCount = 0;
      const keywords = this.extractKeywords(template.projectType);
      
      for (const keyword of keywords) {
        if (content.includes(keyword)) {
          matchCount++;
        }
      }
      
      const similarity = keywords.length > 0 ? matchCount / keywords.length : 0;
      
      if (similarity >= threshold) {
        results.push({ template, similarity });
      }
    }
    
    return results.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * 提取项目类型关键词
   */
  private extractKeywords(projectType: string): string[] {
    const keywordMap: Record<string, string[]> = {
      '固定资产投资': ['固定资产', '投资', '资产', '投资计划', '资金计划'],
      '项目管理': ['项目', '任务', '进度', '资源', '里程碑'],
      '合同管理': ['合同', '签署', '审批', '台账'],
      '采购管理': ['采购', '招标', '供应商', '订单'],
      '财务管理': ['财务', '预算', '资金', '核算', '报表']
    };
    return keywordMap[projectType] || [];
  }

  /**
   * 添加新的知识条目
   */
  addPattern(pattern: any): void {
    // 根据类型添加到相应的知识库
    if (pattern.type === 'org_structure') {
      this.data.orgStructures.push(pattern.content);
    } else if (pattern.type === 'permission') {
      this.data.rolePermissions.push(pattern.content);
    } else if (pattern.type === 'flow') {
      this.data.flowPatterns.push(pattern.content);
    }
    // 可扩展其他类型
  }

  /**
   * 获取知识库统计
   */
  getStats(): Record<string, number> {
    return {
      orgStructures: this.data.orgStructures.length,
      rolePermissions: this.data.rolePermissions.length,
      flowPatterns: this.data.flowPatterns.length,
      fieldStandards: this.data.fieldStandards.length,
      queryTemplates: this.data.queryTemplates.length,
      historicalTemplates: this.data.historicalTemplates.length
    };
  }
}

// ============================================================================
// 导出
// ============================================================================

export function createDomainKnowledgeBase(): DomainKnowledgeBase {
  return DomainKnowledgeBase.getInstance();
}
