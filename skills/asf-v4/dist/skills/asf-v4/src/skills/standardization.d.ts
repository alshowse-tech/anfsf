/**
 * Skills Standardization Module - ANFSF v2.0
 *
 * @module asf-v4/skills/standardization
 */
export interface StandardizedSkillConfig {
    name: string;
    version: string;
    description: string;
    usage: string[];
    examples: Array<{
        query: string;
        result: string;
    }>;
}
export declare class StandardizedSkill {
    name: string;
    version: string;
    description: string;
    usage: string[];
    examples: Array<{
        query: string;
        result: string;
    }>;
    constructor(config: StandardizedSkillConfig);
    addUsage(usage: string): void;
    addExample(query: string, result: string): void;
    formatSKILLmd(): string;
}
export interface SkillsRegistry {
    skills: Record<string, StandardizedSkill>;
    register(skill: StandardizedSkill): void;
    get(name: string): StandardizedSkill | undefined;
    list(): StandardizedSkill[];
    generateSKILLmds(): Record<string, string>;
}
export declare class DefaultSkillsRegistry implements SkillsRegistry {
    skills: Record<string, StandardizedSkill>;
    register(skill: StandardizedSkill): void;
    get(name: string): StandardizedSkill | undefined;
    list(): StandardizedSkill[];
    generateSKILLmds(): Record<string, string>;
}
export declare function createSkillsRegistry(): SkillsRegistry;
