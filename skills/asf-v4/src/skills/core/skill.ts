/**
 *Skill Base Interface
 * 
 * @module asf-v4/skills/core/skill
 */

// ============================================================================
// Skill Base Interface
// ============================================================================

export interface Skill {
  name: string;
  version: string;
  description: string;
  author?: string;
  license?: string;
}

export interface SkillConfig {
  name: string;
  version: string;
  type: string;
  options?: Record<string, unknown>;
}

export interface SkillContext {
  workspace: string;
  options?: Record<string, unknown>;
  courseOfAction?: string;
}

export interface SkillResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Skill Execution
// ============================================================================

export interface SkillExecutor {
  execute(context: SkillContext, config: SkillConfig): Promise<SkillResult>;
}

export class BaseSkill implements SkillExecutor {
  name: string;
  version: string;
  description: string;
  
  constructor(config: { name: string; version: string; description: string }) {
    this.name = config.name;
    this.version = config.version;
    this.description = config.description;
  }
  
  async execute(_context: SkillContext, _config: SkillConfig): Promise<SkillResult> {
    void _context;
    void _config;
    return {
      success: true,
      data: null,
      metadata: {
        skill: this.name,
        version: this.version
      }
    };
  }
}

// ============================================================================
// Skill Registry
// ============================================================================

export interface SkillRegistry {
  skills: Record<string, Skill>;
  register(skill: Skill): void;
  get(name: string): Skill | undefined;
  list(): Skill[];
}

export class DefaultSkillRegistry implements SkillRegistry {
  public skills: Record<string, Skill> = {};
  
  register(skill: Skill): void {
    this.skills[skill.name] = skill;
  }
  
  get(name: string): Skill | undefined {
    return this.skills[name];
  }
  
  list(): Skill[] {
    return Object.values(this.skills);
  }
}

export function createSkillRegistry(): SkillRegistry {
  return new DefaultSkillRegistry();
}