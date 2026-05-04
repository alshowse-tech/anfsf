/**
 * ANFSF V1.5.0 — Industry Templates
 *
 * Domain-specific project templates that pre-configure architecture decisions,
 * tech stack, compliance requirements, and common feature patterns.
 * Reduces PRD-to-code friction for known industry verticals.
 */

export type IndustryTemplateId = 'ecommerce' | 'finance' | 'government' | 'saas' | 'healthcare';

export interface TemplateDependency {
  name: string;
  version: string;
  purpose: string;
}

export interface TemplateFeature {
  id: string;
  name: string;
  description: string;
  /** LLM prompt fragment to inject into the PRD for this feature */
  prdBoost: string;
}

export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  check: string;
}

export interface IndustryTemplate {
  id: IndustryTemplateId;
  name: string;
  description: string;
  /** Default tech stack choices */
  techStack: {
    frontend: string;
    backend: string;
    database: string;
    cache: string;
    auth: string;
  };
  /** Industry-specific dependencies */
  dependencies: TemplateDependency[];
  /** Pre-configured features common to this industry */
  features: TemplateFeature[];
  /** Compliance/regulatory rules to enforce */
  complianceRules: ComplianceRule[];
  /** Architecture constraints specific to this industry */
  architectureConstraints: string[];
  /** File-level scaffolding to generate */
  scaffolding: Array<{ path: string; content: string }>;
}

// ============================================================================
// E-commerce Template
// ============================================================================

const ECOMMERCE_TEMPLATE: IndustryTemplate = {
  id: 'ecommerce',
  name: '电商平台',
  description: 'B2C/B2B 电商系统模板，包含商品管理、购物车、订单、支付、库存等核心模块',
  techStack: {
    frontend: 'nextjs',
    backend: 'fastify',
    database: 'postgresql',
    cache: 'redis',
    auth: 'jwt+session',
  },
  dependencies: [
    { name: '@stripe/stripe-js', version: '^3.0.0', purpose: 'Payment processing' },
    { name: 'i18next', version: '^23.0.0', purpose: 'Multi-language support' },
    { name: 'zustand', version: '^4.5.0', purpose: 'Cart state management' },
  ],
  features: [
    {
      id: 'product-catalog',
      name: '商品目录',
      description: '商品分类、搜索、筛选、详情页',
      prdBoost: '系统需要支持商品分类层级（至少3级）、全文搜索（名称/描述/SKU）、多维度筛选（价格/品牌/规格）、商品详情（图文/视频/评价/规格选择）',
    },
    {
      id: 'shopping-cart',
      name: '购物车',
      description: '添加商品、数量调整、库存校验、价格计算',
      prdBoost: '购物车需支持离线暂存（localStorage + 服务端同步）、库存实时校验、促销价格自动计算、跨店铺结算',
    },
    {
      id: 'order-management',
      name: '订单管理',
      description: '下单、支付、发货、退款、售后',
      prdBoost: '订单系统需支持状态机（待支付→已支付→发货中→已签收→已完成/已退款）、超时自动取消（30分钟未支付）、部分退款、售后工单',
    },
    {
      id: 'payment',
      name: '支付集成',
      description: '支付宝、微信支付、银行卡',
      prdBoost: '支付模块需对接支付宝/微信支付/银行卡，支持异步回调、对账、退款、手续费计算',
    },
  ],
  complianceRules: [
    {
      id: 'pci-dss',
      name: 'PCI-DSS 支付安全',
      description: '支付数据不得存储在应用服务器',
      check: 'No card numbers or CVV stored in database or logs',
    },
    {
      id: 'consumer-protection',
      name: '消费者权益保护',
      description: '7天无理由退货政策',
      check: 'Refund policy displayed on checkout page',
    },
  ],
  architectureConstraints: [
    '购物车必须支持分布式锁防止超卖',
    '订单创建必须使用事务保证一致性',
    '商品搜索必须使用全文索引',
    '价格计算必须由服务端完成，前端仅做展示',
  ],
  scaffolding: [
    {
      path: 'src/domain/product/entity.ts',
      content: 'export interface Product { id: string; name: string; sku: string; price: number; stock: number; categoryIds: string[]; images: string[]; status: "active" | "draft" | "archived"; }\n',
    },
    {
      path: 'src/domain/order/entity.ts',
      content: 'export type OrderStatus = "pending" | "paid" | "shipping" | "delivered" | "completed" | "cancelled" | "refunded";\nexport interface Order { id: string; userId: string; items: Array<{ productId: string; quantity: number; unitPrice: number }>; status: OrderStatus; totalAmount: number; createdAt: Date; }\n',
    },
  ],
};

// ============================================================================
// Finance Template
// ============================================================================

const FINANCE_TEMPLATE: IndustryTemplate = {
  id: 'finance',
  name: '金融科技',
  description: '金融理财系统模板，包含账户管理、交易、风控、审计日志等核心模块',
  techStack: {
    frontend: 'react',
    backend: 'fastify',
    database: 'postgresql',
    cache: 'redis',
    auth: 'oauth2+2fa',
  },
  dependencies: [
    { name: 'crypto-js', version: '^4.2.0', purpose: 'Encryption for sensitive data' },
    { name: 'zod', version: '^3.23.0', purpose: 'Schema validation for all inputs' },
    { name: 'winston', version: '^3.13.0', purpose: 'Structured audit logging' },
  ],
  features: [
    {
      id: 'account-management',
      name: '账户管理',
      description: '开户、KYC、账户分级、权限管理',
      prdBoost: '账户系统需支持多级账户（主账户/子账户）、KYC 实名认证流程、账户权限分级（查看/操作/审批）、登录二次验证（TOTP/SMS）',
    },
    {
      id: 'trading',
      name: '交易引擎',
      description: '下单、撮合、结算、持仓',
      prdBoost: '交易系统需支持限价单/市价单/条件单、订单撮合（价格优先/时间优先）、T+1 结算、持仓实时计算、盈亏统计',
    },
    {
      id: 'risk-control',
      name: '风控系统',
      description: '实时风控、限额、异常检测',
      prdBoost: '风控模块需支持实时交易限额（单笔/日累计）、异常交易检测（频繁撤单/大额异常）、黑名单/灰名单、风控规则可配置',
    },
  ],
  complianceRules: [
    {
      id: 'aml',
      name: '反洗钱 (AML)',
      description: '大额交易上报、可疑交易监控',
      check: 'All transactions > 50K flagged for review',
    },
    {
      id: 'data-retention',
      name: '数据留存',
      description: '交易数据至少保留 5 年',
      check: 'No hard deletes on transaction tables',
    },
    {
      id: 'encryption',
      name: '数据加密',
      description: '敏感数据必须加密存储和传输',
      check: 'All PII fields encrypted at rest and in transit',
    },
  ],
  architectureConstraints: [
    '所有金额计算必须使用 decimal 类型，禁止使用 float',
    '交易操作必须使用数据库事务 + 审计日志双写',
    '风控规则必须可热更新，无需重启服务',
    '所有写操作必须有幂等性保证',
  ],
  scaffolding: [
    {
      path: 'src/domain/account/entity.ts',
      content: 'export interface Account { id: string; userId: string; type: "main" | "sub"; status: "active" | "frozen" | "closed"; kycStatus: "pending" | "verified" | "rejected"; createdAt: Date; }\n',
    },
    {
      path: 'src/domain/trading/entity.ts',
      content: 'export type OrderType = "limit" | "market" | "stop";\nexport type OrderSide = "buy" | "sell";\nexport interface Order { id: string; accountId: string; type: OrderType; side: OrderSide; price: string; quantity: string; filledQty: string; status: "pending" | "filled" | "cancelled" | "partial"; }\n',
    },
  ],
};

// ============================================================================
// Government Template
// ============================================================================

const GOVERNMENT_TEMPLATE: IndustryTemplate = {
  id: 'government',
  name: '政务服务',
  description: '政务管理系统模板，包含审批流程、公文管理、权限隔离、审计追踪等核心模块',
  techStack: {
    frontend: 'react',
    backend: 'koa',
    database: 'postgresql',
    cache: 'redis',
    auth: 'saml+rbac',
  },
  dependencies: [
    { name: 'winston', version: '^3.13.0', purpose: 'Audit trail logging' },
    { name: 'jsonschema', version: '^1.4.0', purpose: 'Document schema validation' },
    { name: 'pdf-lib', version: '^1.17.0', purpose: 'Official document generation' },
  ],
  features: [
    {
      id: 'approval-workflow',
      name: '审批流程',
      description: '多级审批、会签、转办、退回',
      prdBoost: '审批系统需支持多级审批流程（自定义流程模板）、会签/或签、转办/委托、退回重审、审批意见必填、超时自动升级',
    },
    {
      id: 'document-management',
      name: '公文管理',
      description: '公文起草、审核、签发、归档、红头文件',
      prdBoost: '公文管理需支持标准公文格式（红头文件/发文编号）、版本控制、电子签章、归档检索、公文模板管理',
    },
    {
      id: 'data-isolation',
      name: '数据隔离',
      description: '部门级数据隔离、跨部门审批可见',
      prdBoost: '数据隔离需支持部门级数据隔离（部门只能查看本部门数据）、跨部门审批时自动授权临时访问、数据导出审批',
    },
  ],
  complianceRules: [
    {
      id: 'grade-protection',
      name: '等保三级',
      description: '符合网络安全等级保护三级要求',
      check: 'All data access logged with actor identity and timestamp',
    },
    {
      id: 'archive-retention',
      name: '档案留存',
      description: '公文档案永久保存',
      check: 'No deletes on archived documents, only soft-delete',
    },
  ],
  architectureConstraints: [
    '所有操作必须有完整的审计日志（谁、什么时间、做了什么）',
    '数据删除必须使用软删除，禁止物理删除',
    '权限模型必须基于 RBAC，支持角色继承',
    '敏感操作必须双人复核',
  ],
  scaffolding: [
    {
      path: 'src/domain/workflow/entity.ts',
      content: 'export type ApprovalAction = "approve" | "reject" | "return" | "transfer";\nexport interface ApprovalNode { id: string; approverId: string; level: number; action: ApprovalAction | null; comment: string; completedAt: Date | null; }\nexport interface WorkflowInstance { id: string; templateId: string; initiatorId: string; nodes: ApprovalNode[]; status: "running" | "approved" | "rejected" | "returned"; }\n',
    },
  ],
};

// ============================================================================
// Registry
// ============================================================================

const TEMPLATE_REGISTRY: Record<IndustryTemplateId, IndustryTemplate> = {
  ecommerce: ECOMMERCE_TEMPLATE,
  finance: FINANCE_TEMPLATE,
  government: GOVERNMENT_TEMPLATE,
  saas: {
    id: 'saas',
    name: 'SaaS 平台',
    description: '多租户 SaaS 系统模板',
    techStack: { frontend: 'nextjs', backend: 'fastify', database: 'postgresql', cache: 'redis', auth: 'jwt+oauth2' },
    dependencies: [
      { name: 'stripe', version: '^15.0.0', purpose: 'Subscription billing' },
      { name: 'resend', version: '^3.2.0', purpose: 'Transactional emails' },
    ],
    features: [
      { id: 'tenant-isolation', name: '多租户隔离', description: '租户数据隔离', prdBoost: '系统需支持多租户数据隔离（schema-per-tenant 或 row-level security）、租户自定义域名、租户级配置' },
      { id: 'subscription', name: '订阅计费', description: '套餐管理、计费、续费', prdBoost: '订阅模块需支持多套餐（免费/专业/企业）、自动续费、用量限制、升级降级' },
    ],
    complianceRules: [
      { id: 'gdpr', name: 'GDPR', description: '数据可携带和可删除', check: 'User data export and deletion endpoints available' },
    ],
    architectureConstraints: ['多租户数据必须严格隔离', '计费数据必须精确到秒'],
    scaffolding: [],
  },
  healthcare: {
    id: 'healthcare',
    name: '医疗健康',
    description: '医疗信息系统模板',
    techStack: { frontend: 'react', backend: 'fastify', database: 'postgresql', cache: 'redis', auth: 'oauth2+2fa' },
    dependencies: [
      { name: 'crypto-js', version: '^4.2.0', purpose: 'PHI encryption' },
      { name: 'winston', version: '^3.13.0', purpose: 'Audit logging' },
    ],
    features: [
      { id: 'patient-records', name: '患者档案', description: '患者信息管理、病历', prdBoost: '患者档案需支持基本信息、病史、检查报告、处方记录、隐私分级访问控制' },
      { id: 'appointment', name: '预约挂号', description: '排班、预约、取消', prdBoost: '预约系统需支持医生排班、在线预约、候诊队列、预约提醒、爽约记录' },
    ],
    complianceRules: [
      { id: 'hipaa', name: 'HIPAA', description: '健康信息隐私保护', check: 'All PHI encrypted and access logged' },
    ],
    architectureConstraints: ['患者健康信息必须加密存储', '所有数据访问必须有审计追踪'],
    scaffolding: [],
  },
};

// ============================================================================
// API
// ============================================================================

export function getTemplate(id: IndustryTemplateId): IndustryTemplate {
  return TEMPLATE_REGISTRY[id];
}

export function listTemplates(): IndustryTemplate[] {
  return Object.values(TEMPLATE_REGISTRY);
}

export function getTemplateIds(): IndustryTemplateId[] {
  return Object.keys(TEMPLATE_REGISTRY) as IndustryTemplateId[];
}

export function matchTemplateByKeywords(prdText: string): IndustryTemplate | null {
  const lower = prdText.toLowerCase();
  const keywords: Record<IndustryTemplateId, string[]> = {
    ecommerce: ['电商', '商品', '购物车', '订单', '支付', '库存', 'shop', 'cart', 'checkout', 'ecommerce'],
    finance: ['金融', '交易', '风控', '账户', '理财', '证券', 'finance', 'trading', 'risk control', 'investment'],
    government: ['政务', '审批', '公文', '档案', '政府', 'government', 'approval', 'document management'],
    saas: ['saas', '多租户', '订阅', '套餐', 'tenant', 'subscription', 'billing'],
    healthcare: ['医疗', '患者', '病历', '预约', 'health', 'patient', 'hospital', 'medical', 'appointment'],
  };

  let bestMatch: IndustryTemplateId | null = null;
  let bestScore = 0;

  for (const [id, kws] of Object.entries(keywords)) {
    const score = kws.reduce((sum, kw) => sum + (lower.includes(kw) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = id as IndustryTemplateId;
    }
  }

  // Require at least 2 keyword matches to auto-select
  return bestScore >= 2 ? TEMPLATE_REGISTRY[bestMatch!] : null;
}

/**
 * Generate a PRD boost from a template's features and constraints.
 * Injects industry-specific requirements into the raw PRD.
 */
export function boostPRD(prdText: string, template: IndustryTemplate): string {
  const boosts = template.features.map(f => `\n[行业模板要求 - ${f.name}]\n${f.prdBoost}`).join('\n\n');
  const constraints = template.architectureConstraints.map(c => `- ${c}`).join('\n');
  const compliance = template.complianceRules.map(r => `- ${r.name}: ${r.description}`).join('\n');

  return `${prdText}\n\n=== 行业模板增强 (${template.name}) ===\n\n功能要求:${boosts}\n\n架构约束:\n${constraints}\n\n合规要求:\n${compliance}`;
}

export function createIndustryTemplates(): Record<IndustryTemplateId, IndustryTemplate> {
  return { ...TEMPLATE_REGISTRY };
}
