/**
 * SparkPath Experience Generator
 * 
 * 体验生成引擎
 * 实时生成教学内容 + TTS 同步 + 三阶段界面切换
 */

import { Stage, Subject } from './types';

// ============================================================================
// 类型定义
// ============================================================================

export type Stage = 'elementary' | 'middle' | 'high';
export type Subject = 'chinese' | 'math' | 'english' | 'physics' | 'chemistry' | 'biology' | 'history' | 'geography' | 'politics';

export interface TeachingContent {
  /** 知识点 ID */
  knowledgeId: string;
  
  /** 主题 */
  topic: string;
  
  /** 阶段 */
  stage: Stage;
  
  /** 科目 */
  subject: Subject;
  
  /** 方法步骤 */
  methodSteps: Step[];
  
  /** 生活应用 */
  lifeApplication: string;
  
  /** 变式练习 */
  variantPractice: Exercise;
  
  /** 阶段包装 */
  stagePackaging: StagePackaging;
  
  /** TTS 音频 URL */
  ttsAudio?: string;
  
  /** 逐词高亮数据 */
  highlights?: Highlight[];
  
  /** 生成时间 */
  generatedAt: Date;
}

export interface Step {
  /** 步骤标题 */
  title: string;
  
  /** 步骤描述 */
  description: string;
  
  /** 示例 */
  example?: string;
  
  /** 注意事项 */
  tips?: string;
}

export interface Exercise {
  /** 题目 */
  question: string;
  
  /** 答案 */
  answer: string;
  
  /** 解析 */
  explanation: string;
  
  /** 难度 */
  difficulty: number;
  
  /** 变式类型 */
  variantType: 'basic' | 'advanced' | 'comprehensive';
}

export interface StagePackaging {
  /** 小学漫画版 */
  elementary?: {
    style: 'comic';
    characters: string[];
    storyLine: string;
    visualElements: string[];
  };
  
  /** 初中逻辑版 */
  middle?: {
    style: 'logic';
    conceptMap: string;
    derivationSteps: string[];
    crossLinks: string[];
  };
  
  /** 高中策略版 */
  high?: {
    style: 'strategy';
    problemSolvingApproach: string;
    examFocus: string[];
    commonTraps: string[];
  };
}

export interface Highlight {
  /** 文字内容 */
  text: string;
  
  /** 开始时间 (ms) */
  startTime: number;
  
  /** 结束时间 (ms) */
  endTime: number;
  
  /** 类型 */
  type: 'word' | 'phrase' | 'sentence';
}

export interface TTSConfig {
  /** TTS 服务 URL */
  ttsServiceUrl: string;
  
  /** API 密钥 */
  apiKey: string;
  
  /** 语音类型 */
  voiceType: 'child' | 'teen' | 'adult';
  
  /** 语速 */
  speed: number;
  
  /** 音调 */
  pitch: number;
}

export interface ExperienceGeneratorConfig {
  /** TTS 配置 */
  ttsConfig?: TTSConfig;
  
  /** 是否启用缓存 */
  enableCache: boolean;
  
  /** 缓存 TTL (秒) */
  cacheTTL: number;
  
  /** 默认阶段 */
  defaultStage: Stage;
}

// ============================================================================
// 默认配置
// ============================================================================

const DEFAULT_CONFIG: ExperienceGeneratorConfig = {
  ttsConfig: {
    ttsServiceUrl: 'https://api.azure.com/tts',
    apiKey: '',
    voiceType: 'teen',
    speed: 1.0,
    pitch: 1.0,
  },
  enableCache: true,
  cacheTTL: 3600,  // 1 小时
  defaultStage: 'middle',
};

// ============================================================================
// 阶段适配内容模板
// ============================================================================

const STAGE_TEMPLATES: Record<Stage, {
  greeting: string;
  encouragement: string;
  transition: string;
  summary: string;
}> = {
  // 小学：亲切、鼓励、游戏化
  elementary: {
    greeting: '嗨，小朋友！今天我们来学习{topic}吧！✨',
    encouragement: '你真棒！继续加油哦！🌟',
    transition: '接下来，我们来看看{next}～',
    summary: '今天我们学会了{topic}，你太厉害了！🎉',
  },
  
  // 初中：友好、逻辑、引导
  middle: {
    greeting: '你好！今天我们一起探索{topic}。',
    encouragement: '很好，继续保持这个状态！',
    transition: '下面我们来学习{next}。',
    summary: '总结一下，今天我们掌握了{topic}的关键点。',
  },
  
  // 高中：专业、效率、目标
  high: {
    greeting: '开始今天的{topic}学习。',
    encouragement: '思路清晰，继续保持。',
    transition: '进入{next}部分。',
    summary: '{topic}核心要点已掌握，下一步...',
  },
};

// ============================================================================
// Experience Generator Engine
// ============================================================================

export class ExperienceGeneratorEngine {
  private config: ExperienceGeneratorConfig;
  private contentCache: Map<string, TeachingContent> = new Map();

  constructor(config?: Partial<ExperienceGeneratorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    console.log('[ExperienceGenerator] 初始化完成', this.config);
  }

  // ============================================================================
  // 内容生成
  // ============================================================================

  /**
   * 生成教学内容
   */
  async generateContent(
    knowledgeId: string,
    topic: string,
    subject: Subject,
    stage: Stage
  ): Promise<TeachingContent> {
    // 检查缓存
    const cacheKey = `${knowledgeId}-${stage}`;
    const cached = this.contentCache.get(cacheKey);
    if (cached) {
      console.log('[ExperienceGenerator] 使用缓存内容');
      return cached;
    }

    // 生成方法步骤
    const methodSteps = this.generateMethodSteps(knowledgeId, topic, stage);
    
    // 生成生活应用
    const lifeApplication = this.generateLifeApplication(topic, stage);
    
    // 生成变式练习
    const variantPractice = this.generateVariantPractice(topic, stage);
    
    // 生成阶段包装
    const stagePackaging = this.generateStagePackaging(topic, stage);

    const content: TeachingContent = {
      knowledgeId,
      topic,
      subject,
      stage,
      methodSteps,
      lifeApplication,
      variantPractice,
      stagePackaging,
      generatedAt: new Date(),
    };

    // 缓存内容
    if (this.config.enableCache) {
      this.contentCache.set(cacheKey, content);
    }

    console.log(`[ExperienceGenerator] 生成内容：${topic} (${stage})`);
    return content;
  }

  /**
   * 生成方法步骤
   */
  private generateMethodSteps(knowledgeId: string, topic: string, stage: Stage): Step[] {
    const baseSteps: Step[] = [
      {
        title: '理解概念',
        description: `首先，我们来理解${topic}的核心概念。`,
        tips: '不要着急，慢慢理解',
      },
      {
        title: '学习方法',
        description: `掌握解决${topic}相关问题的方法。`,
        example: '例题演示',
      },
      {
        title: '练习巩固',
        description: '通过练习来巩固所学知识。',
        tips: '做错没关系，重要的是理解',
      },
      {
        title: '总结反思',
        description: '回顾今天的学习内容，总结要点。',
      },
    ];

    // 阶段适配
    if (stage === 'elementary') {
      return baseSteps.map(step => ({
        ...step,
        title: this.addEmoji(step.title),
        description: this.simplifyLanguage(step.description),
      }));
    }

    if (stage === 'high') {
      return [
        ...baseSteps,
        {
          title: '拓展提升',
          description: `深入学习${topic}的高阶应用。`,
          example: '高考真题',
        },
      ];
    }

    return baseSteps;
  }

  /**
   * 生成生活应用
   */
  private generateLifeApplication(topic: string, stage: Stage): string {
    const applications: Record<Stage, string> = {
      elementary: `想想生活中哪里会用到${topic}？比如购物、玩游戏的时候...`,
      middle: `${topic}在实际生活中有很多应用，比如科学实验、数据分析等。`,
      high: `${topic}是高考重点考点，也是大学相关专业的基础，务必熟练掌握。`,
    };

    return applications[stage];
  }

  /**
   * 生成变式练习
   */
  private generateVariantPractice(topic: string, stage: Stage): Exercise {
    const exercises: Record<Stage, Exercise> = {
      elementary: {
        question: `基础练习：关于${topic}的简单应用题`,
        answer: '参考答案',
        explanation: '解析：一步一步来',
        difficulty: 0.3,
        variantType: 'basic',
      },
      middle: {
        question: `进阶练习：${topic}的变式应用`,
        answer: '参考答案',
        explanation: '解析：注意条件变化',
        difficulty: 0.5,
        variantType: 'advanced',
      },
      high: {
        question: `综合练习：${topic}与相关知识点的综合应用`,
        answer: '参考答案',
        explanation: '解析：考察综合能力',
        difficulty: 0.7,
        variantType: 'comprehensive',
      },
    };

    return exercises[stage];
  }

  /**
   * 生成阶段包装
   */
  private generateStagePackaging(topic: string, stage: Stage): StagePackaging {
    const packaging: Record<Stage, StagePackaging> = {
      elementary: {
        style: 'comic',
        characters: ['知识小精灵', '学习小伙伴'],
        storyLine: `${topic}的冒险故事`,
        visualElements: ['漫画插图', '动画效果', '彩色标注'],
      },
      middle: {
        style: 'logic',
        conceptMap: `${topic}概念图`,
        derivationSteps: ['定义', '性质', '应用'],
        crossLinks: ['相关知识点 1', '相关知识点 2'],
      },
      high: {
        style: 'strategy',
        problemSolvingApproach: `${topic}解题策略`,
        examFocus: ['高考考点 1', '高考考点 2'],
        commonTraps: ['常见陷阱 1', '常见陷阱 2'],
      },
    };

    return packaging[stage];
  }

  // ============================================================================
  // TTS 生成与同步
  // ============================================================================

  /**
   * 生成 TTS 音频
   */
  async generateTTS(text: string, stage: Stage): Promise<{
    audioUrl: string;
    duration: number;
  }> {
    const voiceType = this.getVoiceTypeForStage(stage);
    
    // 调用 TTS 服务 (模拟)
    console.log(`[ExperienceGenerator] 生成 TTS: ${text.substring(0, 20)}... (${voiceType})`);
    
    // 模拟 TTS 生成
    return {
      audioUrl: `https://tts.sparkpath.com/audio/${Date.now()}.mp3`,
      duration: text.length * 50,  // 估算：每字 50ms
    };
  }

  /**
   * 生成逐词高亮数据
   */
  generateHighlights(text: string, audioDuration: number): Highlight[] {
    const words = text.split(/(?<=[,。.!?;:，。！？；：\s])/);
    const highlights: Highlight[] = [];
    
    const avgWordDuration = audioDuration / words.length;
    let currentTime = 0;

    for (const word of words) {
      if (word.trim()) {
        highlights.push({
          text: word.trim(),
          startTime: Math.round(currentTime),
          endTime: Math.round(currentTime + avgWordDuration),
          type: word.length > 4 ? 'phrase' : 'word',
        });
        currentTime += avgWordDuration;
      }
    }

    return highlights;
  }

  /**
   * 根据阶段选择语音类型
   */
  private getVoiceTypeForStage(stage: Stage): 'child' | 'teen' | 'adult' {
    switch (stage) {
      case 'elementary':
        return 'child';
      case 'middle':
        return 'teen';
      case 'high':
        return 'adult';
    }
  }

  // ============================================================================
  // 阶段适配界面
  // ============================================================================

  /**
   * 获取阶段问候语
   */
  getGreeting(topic: string, stage: Stage): string {
    const template = STAGE_TEMPLATES[stage].greeting;
    return template.replace('{topic}', topic);
  }

  /**
   * 获取阶段鼓励语
   */
  getEncouragement(stage: Stage): string {
    return STAGE_TEMPLATES[stage].encouragement;
  }

  /**
   * 获取阶段过渡语
   */
  getTransition(next: string, stage: Stage): string {
    const template = STAGE_TEMPLATES[stage].transition;
    return template.replace('{next}', next);
  }

  /**
   * 获取阶段总结语
   */
  getSummary(topic: string, stage: Stage): string {
    const template = STAGE_TEMPLATES[stage].summary;
    return template.replace('{topic}', topic);
  }

  // ============================================================================
  // 实时调整
  // ============================================================================

  /**
   * 根据用户反馈调整内容
   */
  adjustContent(
    content: TeachingContent,
    feedback: {
      tooFast?: boolean;
      tooHard?: boolean;
      needMoreExamples?: boolean;
    }
  ): TeachingContent {
    const adjusted = { ...content };

    if (feedback.tooFast) {
      // 减慢节奏
      adjusted.methodSteps = adjusted.methodSteps.map(step => ({
        ...step,
        description: step.description + ' 我们慢慢来，理解每一个步骤。',
      }));
    }

    if (feedback.tooHard) {
      // 降低难度
      adjusted.variantPractice.difficulty *= 0.7;
    }

    if (feedback.needMoreExamples) {
      // 添加更多示例
      adjusted.methodSteps.forEach(step => {
        if (!step.example) {
          step.example = '补充示例';
        }
      });
    }

    return adjusted;
  }

  // ============================================================================
  // 缓存管理
  // ============================================================================

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.contentCache.clear();
    console.log('[ExperienceGenerator] 缓存已清除');
  }

  /**
   * 预生成内容
   */
  async pregenerateContent(
    topics: Array<{ knowledgeId: string; topic: string; subject: Subject; stage: Stage }>
  ): Promise<void> {
    for (const item of topics) {
      await this.generateContent(
        item.knowledgeId,
        item.topic,
        item.subject,
        item.stage
      );
    }
    console.log(`[ExperienceGenerator] 预生成 ${topics.length} 个内容`);
  }

  // ============================================================================
  // 辅助方法
  // ============================================================================

  private addEmoji(text: string): string {
    const emojis: Record<string, string> = {
      '理解': '🤔',
      '学习': '📚',
      '练习': '✏️',
      '总结': '✅',
      '拓展': '🚀',
    };

    for (const [key, emoji] of Object.entries(emojis)) {
      if (text.includes(key)) {
        return `${emoji} ${text}`;
      }
    }

    return text;
  }

  private simplifyLanguage(text: string): string {
    // 简化语言，适合小学生理解
    return text
      .replace('核心概念', '最重要的想法')
      .replace('掌握', '学会')
      .replace('巩固', '加强记忆')
      .replace('回顾', '再看看');
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

export function createExperienceGeneratorEngine(
  config?: Partial<ExperienceGeneratorConfig>
): ExperienceGeneratorEngine {
  return new ExperienceGeneratorEngine(config);
}

export default ExperienceGeneratorEngine;
