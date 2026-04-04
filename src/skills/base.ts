/**
 * ANFSF V1.5.0 - Skill Base Classes
 */

export interface SkillResult {
  executionTime?: number;
  metadata?: Record<string, any>;
}

export interface SkillContext {
  [key: string]: any;
}

export abstract class Skill {
  abstract name: string;
  abstract version: string;
  abstract description: string;

  abstract execute(ctx: SkillContext): Promise<SkillResult>;

  getMetadata(): Record<string, any> {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
    };
  }
}
