/**
 * Core Skill Interface
 *
 * @module asf-v4/core/skill
 */
export interface SkillContext {
    logger?: any;
    mempalace?: any;
    [key: string]: any;
}
export declare abstract class Skill {
    protected name: string;
    protected context: SkillContext;
    constructor(name: string, context: SkillContext);
}
