/**
 * MCP Protocol Implementation - ANFSF v2.0
 *
 * Model Context Protocol (MCP) v2.0 兼容层
 * 实现 Code Execution + Filesystem API + Skills 标准化
 *
 * @module asf-v4/mcp
 */
export interface MCPServer {
    name: string;
    version: string;
    capabilities: MCPCapabilities;
    tools: Record<string, MCPTool>;
}
export interface MCPCapabilities {
    resources?: boolean;
    prompts?: boolean;
    tools?: boolean;
}
export interface MCPTool {
    name: string;
    description: string;
    parameters: Record<string, any>;
    execute: (params: Record<string, any>) => Promise<any>;
}
export interface FileSystemAPI {
    readFile: (path: string) => Promise<string>;
    writeFile: (path: string, content: string) => Promise<void>;
    listDir: (path: string) => Promise<string[]>;
    exists: (path: string) => Promise<boolean>;
    deleteFile: (path: string) => Promise<void>;
}
export declare class LocalFileSystem implements FileSystemAPI {
    private workspace;
    constructor(workspace?: string);
    readFile(path: string): Promise<string>;
    writeFile(path: string, content: string): Promise<void>;
    listDir(path: string): Promise<string[]>;
    exists(path: string): Promise<boolean>;
    deleteFile(path: string): Promise<void>;
}
export interface SKILLmd {
    name: string;
    version: string;
    description: string;
    usage: string[];
    examples: Array<{
        query: string;
        result: string;
    }>;
}
export interface StandardizedSkill {
    name: string;
    version: string;
    description: string;
    skillPath: string;
    skillMd?: SKILLmd;
}
export interface CodeExecutionConfig {
    sandbox: boolean;
    resourceLimits: {
        memoryMB: number;
        timeoutSeconds: number;
    };
}
export declare class CodeExecutionEnvironment {
    private config;
    constructor(config?: Partial<CodeExecutionConfig>);
    execute(code: string, context?: Record<string, any>): Promise<any>;
    executeFile(filePath: string, context?: Record<string, any>): Promise<any>;
}
export interface MCPClient {
    connect(server: MCPServer): Promise<void>;
    disconnect(server: MCPServer): Promise<void>;
    callTool(server: MCPServer, toolName: string, params: Record<string, any>): Promise<any>;
}
export declare class SimpleMCPClient implements MCPClient {
    private connectedServers;
    connect(server: MCPServer): Promise<void>;
    disconnect(server: MCPServer): Promise<void>;
    callTool(server: MCPServer, toolName: string, params: Record<string, any>): Promise<any>;
}
export interface TokenEfficiencyMetrics {
    tokensBefore: number;
    tokensAfter: number;
    savings: number;
}
export declare function calculateTokenEfficiency(oldMethod: number, newMethod: number): TokenEfficiencyMetrics;
export declare function createMCPClient(): MCPClient;
export declare function createFileSystem(workspace?: string): FileSystemAPI;
export declare function createCodeExecutionEnvironment(config?: Partial<CodeExecutionConfig>): CodeExecutionEnvironment;
