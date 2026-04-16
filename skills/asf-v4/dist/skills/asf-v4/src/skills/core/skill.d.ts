/**
 *Skill Base Interface
 *
 * @module asf-v4/skills/core/skill
 */
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
    options?: Record<string, any>;
}
export interface SkillContext {
    workspace: string;
    options?: Record<string, any>;
    courseOfAction?: string;
}
export interface SkillResult<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    metadata?: Record<string, any>;
}
export interface SkillExecutor {
    execute(context: SkillContext, config: SkillConfig): Promise<SkillResult>;
}
export declare class BaseSkill implements SkillExecutor {
    name: string;
    version: string;
    description: string;
    constructor(config: {
        name: string;
        version: string;
        description: string;
    });
    execute(context: SkillContext, config: SkillConfig): Promise<SkillResult>;
}
export interface SkillRegistry {
    skills: Record<string, Skill>;
    register(skill: Skill): void;
    get(name: string): Skill | undefined;
    list(): Skill[];
}
export declare class DefaultSkillRegistry implements SkillRegistry {
    skills: Record<string, Skill>;
    register(skill: Skill): void;
    get(name: string): Skill | undefined;
    list(): Skill[];
}
export declare function createSkillRegistry(): SkillRegistry;
