/**
 * ANFSF V1.5.0 — Why-What-How Reasoning Engine
 *
 * Performs structured reasoning on PRD: Why (purpose), What (scope), How (approach).
 * Uses DashScope LLM for single-turn structured analysis.
 */

import { LLMClient, type LLMClientConfig } from '../integrations/llm-client';

export interface ReasoningResult {
  why: {
    coreGoal: string;
    businessValue: string;
    successMetrics: string[];
    fiveWhys: Array<{ why: string; answer: string }>;
  };
  what: {
    coreFeatures: string[];
    constraints: string[];
    boundaries: string[];
  };
  how: {
    technicalPaths: string[];
    keyDecisions: string[];
    risks: string[];
  };
}

export interface ReasonerConfig {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  llmClient?: LLMClient;
  llmConfig?: Partial<LLMClientConfig>;
}

const DEFAULT_MODEL = 'qwen3.5-plus';

export class WhyWhatHowReasoner {
  private llm: LLMClient;
  private model: string;

  constructor(config: ReasonerConfig) {
    if (config.llmClient) {
      this.llm = config.llmClient;
    } else {
      this.llm = new LLMClient({
        apiKey: config.apiKey || process.env.DASHSCOPE_API_KEY || '',
        baseUrl: config.baseUrl,
        defaultModel: config.model || DEFAULT_MODEL,
        ...config.llmConfig,
      });
    }
    this.model = config.model || DEFAULT_MODEL;
  }

  /**
   * Perform Why-What-How reasoning on a PRD.
   */
  async reason(prdText: string): Promise<ReasoningResult> {
    const systemPrompt = `你是一个需求分析专家。请对以下 PRD 进行 Why-What-How 推理分析。

分析要求：
1. WHY — 为什么做：通过 5Whys 方法追问本质（至少 3 层），识别核心目标、业务价值、成功指标
2. WHAT — 做什么：识别核心功能、约束条件、系统边界
3. HOW — 怎么做：分析技术路径、关键决策点、潜在风险

输出纯 JSON，严格遵循以下格式：
{
  "why": {
    "coreGoal": "一句话核心目标",
    "businessValue": "业务价值说明",
    "successMetrics": ["成功指标1", "成功指标2"],
    "fiveWhys": [
      {"why": "为什么需要X?", "answer": "因为..."},
      {"why": "为什么这很重要?", "answer": "因为..."},
      {"why": "更深层的原因?", "answer": "因为..."}
    ]
  },
  "what": {
    "coreFeatures": ["核心功能1", "核心功能2"],
    "constraints": ["约束1", "约束2"],
    "boundaries": ["边界1", "边界2"]
  },
  "how": {
    "technicalPaths": ["技术方案1", "技术方案2"],
    "keyDecisions": ["关键决策1", "关键决策2"],
    "risks": ["风险1", "风险2"]
  }
}

不要输出 JSON 以外的任何内容。`;

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
        return this.fallbackResult(prdText);
      }

      try {
        const parsed = JSON.parse(result.content) as Partial<ReasoningResult>;
        return this.normalizeResult(parsed);
      } catch {
        return this.fallbackResult(prdText);
      }
    } catch {
      return this.fallbackResult(prdText);
    }
  }

  private normalizeResult(parsed: Partial<ReasoningResult>): ReasoningResult {
    return {
      why: {
        coreGoal: parsed.why?.coreGoal || '',
        businessValue: parsed.why?.businessValue || '',
        successMetrics: Array.isArray(parsed.why?.successMetrics) ? parsed.why.successMetrics : [],
        fiveWhys: Array.isArray(parsed.why?.fiveWhys) ? parsed.why.fiveWhys : [],
      },
      what: {
        coreFeatures: Array.isArray(parsed.what?.coreFeatures) ? parsed.what.coreFeatures : [],
        constraints: Array.isArray(parsed.what?.constraints) ? parsed.what.constraints : [],
        boundaries: Array.isArray(parsed.what?.boundaries) ? parsed.what.boundaries : [],
      },
      how: {
        technicalPaths: Array.isArray(parsed.how?.technicalPaths) ? parsed.how.technicalPaths : [],
        keyDecisions: Array.isArray(parsed.how?.keyDecisions) ? parsed.how.keyDecisions : [],
        risks: Array.isArray(parsed.how?.risks) ? parsed.how.risks : [],
      },
    };
  }

  private fallbackResult(prdText: string): ReasoningResult {
    const preview = prdText.slice(0, 200);
    return {
      why: {
        coreGoal: 'Unable to perform LLM reasoning — API unavailable',
        businessValue: 'Fallback analysis only',
        successMetrics: [],
        fiveWhys: [{ why: 'Why analysis skipped', answer: 'LLM API not available' }],
      },
      what: {
        coreFeatures: [],
        constraints: [],
        boundaries: [],
      },
      how: {
        technicalPaths: [],
        keyDecisions: [],
        risks: [],
      },
    };
  }
}
