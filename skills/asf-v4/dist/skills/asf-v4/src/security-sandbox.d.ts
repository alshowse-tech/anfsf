/**
 * Security Sandbox - ANFSF v2.0
 *
 * 安全沙箱实现，提供代码执行、资源访问和网络调用的安全隔离
 *
 * @module asf-v4/sandbox
 */
export interface SandboxConfig {
    memoryLimitMB: number;
    timeoutSeconds: number;
    cpuQuota: number;
    allowedPaths: string[];
    readOnlyPaths: string[];
    denyPaths: string[];
    allowedHosts: string[];
    allowedPorts: number[];
    networkTimeout: number;
    allowedEnvVars: string[];
    maskedEnvVars: string[];
    enableSeccomp: boolean;
    enableCapabilities: boolean;
    dropCapabilities: string[];
}
export declare const DEFAULT_SANDBOX_CONFIG: SandboxConfig;
export interface SandboxContext {
    id: string;
    config: SandboxConfig;
    startTime: number;
    memoryUsage: number;
    cpuUsage: number;
    networkCalls: number;
    fileOperations: number;
    violations: string[];
}
export declare class SecuritySandbox {
    private context;
    private config;
    constructor(config?: Partial<SandboxConfig>);
    /**
     * 执行代码在沙箱中
     */
    executeCode(code: string, context?: Record<string, any>): Promise<{
        success: boolean;
        result?: any;
        error?: string;
        violations?: string[];
    }>;
    /**
     * 检查文件路径访问权限
     */
    checkFileAccess(path: string, operation: 'read' | 'write' | 'delete'): boolean;
    /**
     * 检查网络访问权限
     */
    checkNetworkAccess(host: string, port: number): boolean;
    /**
     * 检查环境变量访问
     */
    checkEnvVarAccess(varName: string): string | null;
    /**
     * 获取沙箱状态
     */
    getStatus(): SandboxContext;
    /**
     * 模拟代码执行（实际实现会更复杂）
     */
    private simulateCodeExecution;
}
export declare function createSecuritySandbox(config?: Partial<SandboxConfig>): SecuritySandbox;
export declare class SandboxMonitor {
    private sandboxes;
    registerSandbox(sandbox: SecuritySandbox): void;
    getActiveSandboxes(): number;
    getSandbox(id: string): SecuritySandbox | undefined;
    killSandbox(id: string): boolean;
}
export declare const globalSandboxMonitor: SandboxMonitor;
