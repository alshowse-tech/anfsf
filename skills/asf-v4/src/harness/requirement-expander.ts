/**
 * ANFSF V2.0 - Requirement Expander
 * 
 * 增强 RequirementRefiner 的需求展开能力，将简单 prompt 展开为完整功能清单。
 * 基于 Anthropic Planner Agent 最佳实践，适配 ANFSF 架构。
 */

import {
  PlannerConfig,
  PlannerOutput,
  FeatureListItem,
  ProductSpec,
  TechnicalDesign,
  FeatureCategory,
  FeaturePriority
} from './types';
import { createModuleLogger } from '../utils/logger';

const logger = createModuleLogger('RequirementExpander');

// ============================================================================
// 默认配置
// ============================================================================

const DEFAULT_CONFIG: PlannerConfig = {
  maxInputSentences: 4,
  targetFeatureCount: 50,  // 务实目标：50 个功能点（而非 200+）
  includeAIFeatures: true,
  enableModuleDecomposition: true
};

// ============================================================================
// 功能展开规则
// ============================================================================

interface ExpansionRule {
  category: FeatureCategory;
  patterns: RegExp[];
  features: Array<Omit<FeatureListItem, 'id' | 'status' | 'passes'> & { category?: FeatureCategory }>;
}

const EXPANSION_RULES: ExpansionRule[] = [
  {
    category: 'functional',
    patterns: [/用户 | 登录 | 注册 | 账户 | 权限/i],
    features: [
      { category: 'functional', description: '用户可以注册新账户', steps: ['导航到注册页面', '填写用户名/邮箱', '设置密码', '提交注册', '验证邮箱'], priority: 'P0' },
      { category: 'functional', description: '用户可以登录账户', steps: ['导航到登录页面', '输入用户名/邮箱', '输入密码', '点击登录', '验证登录状态'], priority: 'P0' },
      { category: 'functional', description: '用户可以重置密码', steps: ['点击忘记密码', '输入邮箱', '接收重置邮件', '点击重置链接', '设置新密码'], priority: 'P1' },
      { category: 'functional', description: '用户可以修改个人资料', steps: ['进入个人设置', '修改信息', '保存更改', '验证更新'], priority: 'P2' }
    ]
  },
  {
    category: 'functional',
    patterns: [/数据 | 列表 | 表格 | 搜索 | 筛选/i],
    features: [
      { category: 'functional', description: '用户可以查看数据列表', steps: ['导航到列表页面', '加载数据', '显示列表', '支持分页'], priority: 'P0' },
      { category: 'functional', description: '用户可以搜索数据', steps: ['输入搜索关键词', '执行搜索', '显示搜索结果', '高亮关键词'], priority: 'P0' },
      { category: 'functional', description: '用户可以筛选数据', steps: ['选择筛选条件', '应用筛选', '显示筛选结果', '清除筛选'], priority: 'P1' },
      { category: 'functional', description: '用户可以排序数据', steps: ['点击排序按钮', '选择排序方式', '重新加载数据', '显示排序结果'], priority: 'P1' }
    ]
  },
  {
    category: 'integration',
    patterns: [/API|接口 | 集成 | 第三方 | 数据导入 | 数据导出/i],
    features: [
      { category: 'integration', description: '系统可以调用外部 API', steps: ['配置 API 端点', '发送请求', '处理响应', '错误处理'], priority: 'P0' },
      { category: 'integration', description: '系统可以导入数据', steps: ['选择导入文件', '解析文件', '验证数据', '导入数据库'], priority: 'P1' },
      { category: 'integration', description: '系统可以导出数据', steps: ['选择导出格式', '生成导出文件', '下载文件'], priority: 'P1' }
    ]
  },
  {
    category: 'ui',
    patterns: [/界面 | 设计 | 样式 | 主题 | 响应式/i],
    features: [
      { category: 'ui', description: '界面支持响应式布局', steps: ['检测屏幕尺寸', '应用响应式样式', '验证各尺寸显示'], priority: 'P0' },
      { category: 'ui', description: '界面支持主题切换', steps: ['选择主题', '应用主题样式', '保存主题偏好'], priority: 'P1' },
      { category: 'ui', description: '界面符合无障碍标准', steps: ['添加 ARIA 标签', '支持键盘导航', '验证对比度'], priority: 'P2' }
    ]
  },
  {
    category: 'security',
    patterns: [/安全 | 权限 | 认证 | 授权 | 加密/i],
    features: [
      { category: 'security', description: '系统实现用户认证', steps: ['实现登录验证', '生成 JWT/Session', '验证请求 token'], priority: 'P0' },
      { category: 'security', description: '系统实现权限控制', steps: ['定义角色权限', '检查用户权限', '拒绝未授权访问'], priority: 'P0' },
      { category: 'security', description: '敏感数据加密存储', steps: ['识别敏感字段', '应用加密算法', '安全存储密钥'], priority: 'P1' }
    ]
  },
  {
    category: 'performance',
    patterns: [/性能 | 缓存 | 优化 | 快速 | 延迟/i],
    features: [
      { category: 'performance', description: '页面加载时间 <2 秒', steps: ['优化资源加载', '启用缓存', '压缩资源', '性能测试'], priority: 'P1' },
      { category: 'performance', description: 'API 响应时间 <500ms', steps: ['优化数据库查询', '启用缓存', '异步处理', '性能监控'], priority: 'P1' }
    ]
  }
];

// ============================================================================
// Requirement Expander Class
// ============================================================================

export class RequirementExpander {
  private config: PlannerConfig;

  constructor(config?: Partial<PlannerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 将简单 prompt 展开为完整产品规格和功能清单
   */
  async expand(simplePrompt: string): Promise<PlannerOutput> {
    logger.info(`🚀 开始需求展开：${simplePrompt.substring(0, 100)}...`);

    // 1. 生成产品规格
    const productSpec = await this.generateProductSpec(simplePrompt);
    logger.info(`📋 产品规格生成完成：${productSpec.title}`);

    // 2. 展开功能清单
    const featureList = await this.generateFeatureList(simplePrompt, productSpec);
    logger.info(`📦 功能清单生成完成：${featureList.length} 个功能点`);

    // 3. 生成技术设计
    const technicalDesign = await this.generateTechnicalDesign(productSpec);
    logger.info(`🏗️ 技术设计生成完成`);

    // 4. 识别 AI 功能机会
    const aiFeatures = this.config.includeAIFeatures
      ? await this.identifyAIFeatures(simplePrompt, productSpec)
      : [];
    logger.info(`🤖 AI 功能机会：${aiFeatures.length} 个`);

    // 5. 模块化拆分（如启用）
    const modularGraph = this.config.enableModuleDecomposition
      ? await this.decomposeIntoModules(featureList)
      : undefined;

    return {
      productSpec,
      featureList,
      technicalDesign,
      aiFeatureOpportunities: aiFeatures,
      modularGraph
    };
  }

  /**
   * 生成产品规格
   */
  private async generateProductSpec(prompt: string): Promise<ProductSpec> {
    // 基于 prompt 提取关键信息
    const title = this.extractTitle(prompt);
    const description = this.generateDescription(prompt);
    const targetUsers = this.identifyTargetUsers(prompt);
    const coreValue = this.defineCoreValue(prompt);
    const successCriteria = this.defineSuccessCriteria(prompt);
    const constraints = this.identifyConstraints(prompt);

    return {
      title,
      description,
      targetUsers,
      coreValue,
      successCriteria,
      constraints,
      aiFeatureOpportunities: []
    };
  }

  /**
   * 生成功能清单
   */
  private async generateFeatureList(prompt: string, spec: ProductSpec): Promise<FeatureListItem[]> {
    const features: FeatureListItem[] = [];
    let featureIndex = 0;

    // 应用展开规则
    for (const rule of EXPANSION_RULES) {
      const matchesRule = rule.patterns.some(pattern => pattern.test(prompt));
      
      if (matchesRule) {
        for (const featureTemplate of rule.features) {
          const feature: FeatureListItem = {
            id: `feat-${String(featureIndex++).padStart(3, '0')}`,
            category: rule.category,
            description: featureTemplate.description,
            steps: featureTemplate.steps,
            status: 'pending',
            passes: false,
            priority: featureTemplate.priority
          };
          features.push(feature);
        }
      }
    }

    // 确保达到目标功能点数量
    while (features.length < this.config.targetFeatureCount) {
      features.push(this.generateGenericFeature(featureIndex++, features.length));
    }

    // 限制最大功能点数量
    return features.slice(0, this.config.targetFeatureCount * 1.5);
  }

  /**
   * 生成技术设计
   */
  private async generateTechnicalDesign(spec: ProductSpec): Promise<TechnicalDesign> {
    // 基于产品规格推断技术栈
    return {
      frontend: {
        framework: 'React + Vite',
        keyComponents: ['App', 'Layout', 'Pages', 'Components']
      },
      backend: {
        framework: 'FastAPI',
        keyServices: ['API Service', 'Database Service', 'Auth Service']
      },
      database: {
        type: 'SQLite (开发) / PostgreSQL (生产)',
        keyTables: ['users', 'data', 'logs']
      },
      architecture: '前后端分离，RESTful API'
    };
  }

  /**
   * 识别 AI 功能机会
   */
  private async identifyAIFeatures(prompt: string, spec: ProductSpec): Promise<string[]> {
    const aiFeatures: string[] = [];

    // 基于产品类型推荐 AI 功能
    if (prompt.includes('搜索') || prompt.includes('数据')) {
      aiFeatures.push('AI 智能搜索（语义搜索）');
    }
    if (prompt.includes('报表') || prompt.includes('分析')) {
      aiFeatures.push('AI 数据分析与洞察');
    }
    if (prompt.includes('用户') || prompt.includes('客户')) {
      aiFeatures.push('AI 用户行为分析');
    }

    aiFeatures.push('AI 辅助输入（自动完成）');
    aiFeatures.push('AI 异常检测');

    return aiFeatures;
  }

  /**
   * 模块化拆分
   */
  private async decomposeIntoModules(features: FeatureListItem[]): Promise<PlannerOutput['modularGraph']> {
    const modules: Array<{ name: string; scope: string; features: string[] }> = [];
    const crossModuleDeps: Array<{ from: string; to: string; type: string }> = [];

    // 按类别分组
    const byCategory = new Map<FeatureCategory, string[]>();
    for (const feature of features) {
      const categoryFeatures = byCategory.get(feature.category) || [];
      categoryFeatures.push(feature.id);
      byCategory.set(feature.category, categoryFeatures);
    }

    // 创建模块
    for (const [category, featureIds] of byCategory.entries()) {
      modules.push({
        name: this.categoryToModuleName(category),
        scope: `${category} 模块`,
        features: featureIds
      });
    }

    // 识别跨模块依赖
    for (let i = 0; i < modules.length; i++) {
      for (let j = i + 1; j < modules.length; j++) {
        if (modules[i].features.length > 0 && modules[j].features.length > 0) {
          crossModuleDeps.push({
            from: modules[i].name,
            to: modules[j].name,
            type: 'data-flow'
          });
        }
      }
    }

    return { modules, crossModuleDeps };
  }

  // ============================================================================
  // 辅助方法
  // ============================================================================

  private extractTitle(prompt: string): string {
    // 从 prompt 提取标题
    const match = prompt.match(/(?:构建 | 创建 | 开发 | 实现)\s*(.+?)(?:系统 | 平台 | 应用|APP|网站|$)/i);
    if (match && match[1].trim()) {
      return match[1].trim();
    }
    // 如果没有匹配，返回整个 prompt 作为标题
    return prompt.length > 30 ? prompt.substring(0, 30) + '...' : prompt;
  }

  private generateDescription(prompt: string): string {
    return `基于用户需求构建的完整系统：${prompt}`;
  }

  private identifyTargetUsers(prompt: string): string[] {
    // 基于 prompt 推断目标用户
    if (prompt.includes('企业') || prompt.includes('公司')) {
      return ['企业管理员', '企业员工'];
    }
    if (prompt.includes('个人')) {
      return ['个人用户'];
    }
    return ['普通用户', '管理员'];
  }

  private defineCoreValue(prompt: string): string {
    return '提供高效、易用的解决方案，满足用户核心需求';
  }

  private defineSuccessCriteria(prompt: string): string[] {
    return [
      '核心功能 100% 实现',
      '用户体验流畅',
      '系统稳定可靠',
      '性能满足要求'
    ];
  }

  private identifyConstraints(prompt: string): string[] {
    return [
      '开发周期限制',
      '技术栈约束',
      '资源限制'
    ];
  }

  private generateGenericFeature(index: number, currentCount: number): FeatureListItem {
    const categories: FeatureCategory[] = ['functional', 'ui', 'integration', 'security', 'performance'];
    const category = categories[index % categories.length];
    const priorities: FeaturePriority[] = ['P0', 'P1', 'P2'];
    const priority = priorities[index % 3];  // 循环分配 P0/P1/P2

    return {
      id: `feat-${String(index).padStart(3, '0')}`,
      category,
      description: `通用功能 ${index + 1}`,
      steps: ['实现功能', '测试验证', '文档更新'],
      status: 'pending',
      passes: false,
      priority
    };
  }

  private categoryToModuleName(category: FeatureCategory): string {
    const nameMap: Record<FeatureCategory, string> = {
      functional: '核心功能模块',
      ui: '用户界面模块',
      integration: '集成模块',
      security: '安全模块',
      performance: '性能优化模块'
    };
    return nameMap[category] || category;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createRequirementExpander(config?: Partial<PlannerConfig>): RequirementExpander {
  return new RequirementExpander(config);
}
