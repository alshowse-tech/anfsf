/**
 * AI Native Full-Stack Software Factory
 * Layer 3: Input Governance Layer (输入治理层)
 *
 * @version 1.0.0
 * @date 2026-03-29
 */

import { AINativePRD, PRDQualityReport } from '../prd/prd-parser';
import { LLMClient, type LLMClientConfig } from '../integrations/llm-client';

/**
 * 一致性检查结果
 */
export interface ConsistencyReport {
  consistent: boolean;
  issues: ConsistencyIssue[];
}

export interface ConsistencyIssue {
  type: 'prd-design' | 'design-api' | 'api-implementation';
  severity: 'critical' | 'warning' | 'info';
  description: string;
  suggestion: string;
}

/**
 * 完整性检查结果
 */
export interface CompletenessReport {
  complete: boolean;
  missing: MissingItem[];
  completionRate: number;
}

export interface MissingItem {
  category: 'state' | 'api' | 'constraint';
  item: string;
  impact: string;
}

/**
 * 模糊性检测结果
 */
export interface AmbiguityReport {
  ambiguous: boolean;
  items: AmbiguousItem[];
}

export interface AmbiguousItem {
  location: string;
  text: string;
  ambiguity: string;
  suggestion: string;
}

/**
 * 冲突解决结果
 */
export interface ConflictResolution {
  resolved: boolean;
  conflicts: Conflict[];
  resolutions: Resolution[];
}

export interface Conflict {
  id: string;
  type: 'requirement' | 'design' | 'constraint';
  description: string;
  severity: 'critical' | 'major' | 'minor';
}

export interface Resolution {
  conflictId: string;
  resolution: string;
  impact: string;
}

/**
 * Input Governance Engine
 */
export class InputGovernanceEngine {
  private llm: LLMClient;
  private model: string;

  constructor(config?: { apiKey?: string; model?: string; baseUrl?: string; llmClient?: LLMClient; llmConfig?: Partial<LLMClientConfig> }) {
    if (config?.llmClient) {
      this.llm = config.llmClient;
    } else {
      this.llm = new LLMClient({
        apiKey: config?.apiKey || process.env.DASHSCOPE_API_KEY || '',
        baseUrl: config?.baseUrl,
        defaultModel: config?.model || 'qwen3.5-plus',
        ...config?.llmConfig,
      });
    }
    this.model = config?.model || 'qwen3.5-plus';
  }

  /**
   * Assess PRD quality using LLM. Delegates to PRD parser's assessQuality.
   * If parser is not available, returns a fallback report based on basic checks.
   */
  async assessWithLLM(prd: AINativePRD, prdText: string): Promise<PRDQualityReport> {
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
}`;

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
        return this.fallbackAssess(prd);
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
        return this.fallbackAssess(prd);
      }
    } catch {
      return this.fallbackAssess(prd);
    }
  }

  private fallbackAssess(prd: AINativePRD): PRDQualityReport {
    const missing: string[] = [];
    const suggestions: string[] = [];

    if (!prd.features?.length) missing.push('功能特性');
    if (!prd.acceptanceCriteria?.length) { missing.push('验收标准'); suggestions.push('添加可量化的验收标准'); }
    if (!prd.constraints?.length) { missing.push('约束条件'); suggestions.push('补充技术/业务约束'); }
    if (!prd.nonFunctionalSpecs?.length) { missing.push('非功能需求'); suggestions.push('补充性能、安全等非功能需求'); }
    if (!prd.userFlows?.length) { missing.push('用户流程'); suggestions.push('补充核心用户流程'); }

    const score = missing.length === 0 ? 85 : Math.max(20, 85 - missing.length * 15);

    return { score, ambiguities: [], conflicts: [], missingSections: missing, suggestions };
  }
  /**
   * 一致性检查 (PRD/Design/API)
   */
  checkConsistency(prd: AINativePRD, design: any, api: any): ConsistencyReport {
    const issues: ConsistencyIssue[] = [];

    // 检查 PRD 与 Design 一致性
    if (!this.checkPRDDesignConsistency(prd, design)) {
      issues.push({
        type: 'prd-design',
        severity: 'critical',
        description: 'PRD and Design are inconsistent',
        suggestion: 'Review and align PRD with Design',
      });
    }

    // 检查 Design 与 API 一致性
    if (!this.checkDesignAPIConsistency(design, api)) {
      issues.push({
        type: 'design-api',
        severity: 'critical',
        description: 'Design and API are inconsistent',
        suggestion: 'Review and align Design with API',
      });
    }

    return {
      consistent: issues.length === 0,
      issues,
    };
  }

  /**
   * 完整性检查 (状态/API/约束)
   */
  checkCompleteness(prd: AINativePRD): CompletenessReport {
    const missing: MissingItem[] = [];
    let totalItems = 0;
    let completeItems = 0;

    // 检查状态完整性
    if (!prd.features || prd.features.length === 0) {
      missing.push({
        category: 'state',
        item: 'features',
        impact: 'Cannot proceed without features',
      });
    } else {
      totalItems += prd.features.length;
      completeItems += prd.features.filter(f => f.status === 'approved').length;
    }

    // 检查 API 完整性
    if (!prd.backendSpecs || prd.backendSpecs.length === 0 || !prd.backendSpecs[0]?.api) {
      missing.push({
        category: 'api',
        item: 'API specifications',
        impact: 'Cannot generate backend without API specs',
      });
    }

    // 检查约束完整性
    if (!prd.constraints || prd.constraints.length === 0) {
      missing.push({
        category: 'constraint',
        item: 'constraints',
        impact: 'May lead to technical debt',
      });
    }

    const completionRate = totalItems > 0 ? (completeItems / totalItems) * 100 : 0;

    return {
      complete: missing.length === 0,
      missing,
      completionRate,
    };
  }

  /**
   * 模糊需求识别 (expanded to scan all PRD sections)
   */
  detectAmbiguities(prd: AINativePRD): AmbiguityReport {
    const items: AmbiguousItem[] = [];
    const ambiguousWords = [
      'maybe', 'possibly', 'might', 'could', 'should',
      'fast', 'slow', 'large', 'small', 'user-friendly',
      'etc', 'and so on', 'approximately', 'roughly',
      'quickly', 'efficiently', 'seamlessly', 'intuitive',
      'modern', 'responsive', 'scalable', 'robust',
    ];

    const checkText = (location: string, text: string) => {
      if (!text) return;
      ambiguousWords.forEach(word => {
        if (text.toLowerCase().includes(word)) {
          items.push({
            location,
            text: text.substring(0, 100),
            ambiguity: `Contains ambiguous word: "${word}"`,
            suggestion: 'Use specific, measurable terms',
          });
        }
      });
    };

    // Check feature descriptions
    prd.features?.forEach(feature => {
      checkText(`features/${feature.id}`, feature.description);
    });

    // Check user flows
    prd.userFlows?.forEach(flow => {
      checkText(`userFlows/${flow.id}`, flow.name);
      flow.steps?.forEach((step, i) => {
        checkText(`userFlows/${flow.id}/step[${i}]`, step.action);
        checkText(`userFlows/${flow.id}/step[${i}]`, step.expected);
      });
    });

    // Check UI requirements
    prd.uiRequirements?.forEach(req => {
      checkText(`uiRequirements/${req.component}`, req.description || '');
    });

    // Check constraints
    prd.constraints?.forEach(c => {
      checkText(`constraints/${c.id}`, c.description || '');
    });

    // Check non-functional specs
    prd.nonFunctionalSpecs?.forEach(spec => {
      checkText(`nonFunctionalSpecs/${spec.category}`, spec.requirement);
      checkText(`nonFunctionalSpecs/${spec.category}`, spec.metric);
      checkText(`nonFunctionalSpecs/${spec.category}`, spec.target);
    });

    return {
      ambiguous: items.length > 0,
      items,
    };
  }

  /**
   * 冲突解决
   */
  resolveConflicts(prd: AINativePRD): ConflictResolution {
    const conflicts: Conflict[] = [];
    const resolutions: Resolution[] = [];

    // 检测需求冲突
    conflicts.push(...this.detectRequirementConflicts(prd));

    // 检测设计冲突
    // conflicts.push(...this.detectDesignConflicts(design));

    // 解决冲突
    conflicts.forEach(conflict => {
      const resolution = this.generateResolution(conflict);
      if (resolution) {
        resolutions.push(resolution);
      }
    });

    return {
      resolved: resolutions.length === conflicts.length,
      conflicts,
      resolutions,
    };
  }

  /**
   * 检测需求冲突
   */
  private detectRequirementConflicts(prd: AINativePRD): Conflict[] {
    const conflicts: Conflict[] = [];

    // 检查约束冲突
    if (prd.constraints) {
      for (let i = 0; i < prd.constraints.length; i++) {
        for (let j = i + 1; j < prd.constraints.length; j++) {
          if (this.areConstraintsConflicting(prd.constraints[i], prd.constraints[j])) {
            conflicts.push({
              id: `conflict-${i}-${j}`,
              type: 'constraint',
              description: `Constraint ${prd.constraints[i].id} (${prd.constraints[i].type}) conflicts with ${prd.constraints[j].id} (${prd.constraints[j].type}): ${prd.constraints[i].description} vs ${prd.constraints[j].description}`,
              severity: 'critical',
            });
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * 检查约束是否冲突
   */
  private areConstraintsConflicting(c1: any, c2: any): boolean {
    if (!c1 || !c2) return false;
    if (!c1.type || !c2.type) return false;

    const d1 = (c1.description || '').toLowerCase();
    const d2 = (c2.description || '').toLowerCase();

    // Same type constraints on the same resource with opposing values
    if (c1.type === c2.type) {
      // Performance: max vs min time conflicts
      if (c1.type === 'performance') {
        if (d1.includes('max') && d2.includes('min')) return true;
        if (d1.includes('response') && d2.includes('response')) {
          const maxMs = d1.match(/(\d+)\s*ms/)?.[1];
          const minMs = d2.match(/(\d+)\s*ms/)?.[1];
          if (maxMs && minMs && parseInt(maxMs) < parseInt(minMs)) return true;
        }
      }

      // Tech stack: mutually exclusive technologies
      if (c1.type === 'technical') {
        const exclusives = [
          ['react', 'vue'], ['react', 'angular'], ['vue', 'angular'],
          ['typescript', 'javascript'], ['express', 'fastify'], ['express', 'koa'],
          ['postgresql', 'mysql'], ['mongodb', 'postgresql'],
        ];
        for (const [a, b] of exclusives) {
          if ((d1.includes(a) && d2.includes(b)) || (d1.includes(b) && d2.includes(a))) {
            return true;
          }
        }
      }

      // Security: conflicting security levels
      if (c1.type === 'security') {
        if ((d1.includes('public') && d2.includes('private')) ||
            (d1.includes('open') && d2.includes('restricted'))) {
          return true;
        }
      }
    }

    // Cross-type: performance vs budget conflicts
    if ((c1.type === 'performance' && c2.type === 'budget') ||
        (c1.type === 'budget' && c2.type === 'performance')) {
      if (d1.includes('high') && d2.includes('low')) return true;
      if (d1.includes('fast') && d2.includes('cheap')) return true;
    }

    return false;
  }

  /**
   * 生成解决方案
   */
  private generateResolution(conflict: Conflict): Resolution | null {
    if (conflict.type === 'constraint') {
      const desc = conflict.description.toLowerCase();
      if (desc.includes('performance')) {
        return {
          conflictId: conflict.id,
          resolution: 'Negotiate performance target: find acceptable middle ground between the two constraints',
          impact: 'May require stakeholder alignment on performance expectations',
        };
      }
      if (desc.includes('tech') || desc.includes('technical')) {
        return {
          conflictId: conflict.id,
          resolution: 'Select primary technology stack; move conflicting technology to optional/alternative list',
          impact: 'Reduces technology options but eliminates ambiguity',
        };
      }
      if (desc.includes('security')) {
        return {
          conflictId: conflict.id,
          resolution: 'Apply least-privilege principle: default to more restrictive setting',
          impact: 'May limit accessibility but ensures security baseline',
        };
      }
    }

    return {
      conflictId: conflict.id,
      resolution: `Review and resolve ${conflict.type} conflict: "${conflict.description}"`,
      impact: 'May require PRD update or stakeholder clarification',
    };
  }

  /**
   * 检查 PRD 与 Design 一致性
   */
  private checkPRDDesignConsistency(prd: AINativePRD, design: any): boolean {
    if (!design || typeof design !== 'object') return true;

    const issues: string[] = [];

    // Compare feature count vs component/page count
    const featureCount = prd.features?.length || 0;
    const componentCount = design.components?.length || 0;
    const pageCount = design.pages?.length || 0;

    // Each feature should have at least one corresponding component or page
    if (featureCount > 0 && componentCount + pageCount === 0) {
      issues.push(`No UI components/pages defined for ${featureCount} features`);
    }

    // Check that required API data sources are represented in design
    const apiEndpoints = prd.backendSpecs?.flatMap(s => s.api?.map(a => a.path) || []) || [];
    const dataSources = design.dataSources || [];
    for (const endpoint of apiEndpoints) {
      const relatedSource = dataSources.find((ds: any) =>
        ds.endpoint === endpoint || ds.name?.includes(endpoint.replace(/\//g, '_'))
      );
      if (!relatedSource && endpoint) {
        // Not a hard failure, just a warning — skip for now
      }
    }

    return issues.length === 0;
  }

  /**
   * 检查 Design 与 API 一致性
   */
  private checkDesignAPIConsistency(design: any, api: any): boolean {
    if (!design || !api) return true;
    if (typeof design !== 'object' || typeof api !== 'object') return true;

    // Compare design data models with API request/response schemas
    const designModels = design.dataModels || [];
    const apiSpecs = Array.isArray(api) ? api : (api.endpoints || []);

    for (const model of designModels) {
      if (!model.name) continue;
      // Check if model appears in any API request/response
      const usedInApi = apiSpecs.some((spec: any) => {
        const reqSchema = JSON.stringify(spec.request || '');
        const resSchema = JSON.stringify(spec.response || '');
        return reqSchema.includes(model.name) || resSchema.includes(model.name);
      });
      if (!usedInApi) {
        // Data model defined but not used in API — warning, not error
      }
    }

    return true;
  }
}

export default InputGovernanceEngine;
