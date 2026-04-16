/**
 * MCP Server Implementation - ANFSF v2.0
 *
 * Model Context Protocol (MCP) v2.0 服务器实现
 * 支持 tools/resources/prompts 能力
 *
 * @module asf-v4/mcp/server
 */
import { MCPServer, MCPCapabilities, MCPTool } from './index';
export declare class ANFSFMCPUserver implements MCPServer {
    name: string;
    version: string;
    capabilities: MCPCapabilities;
    tools: Record<string, MCPTool>;
    constructor();
    private initializeTools;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    getResource(uri: string): Promise<any>;
    getPrompt(name: string, args?: Record<string, any>): Promise<any>;
}
export declare function createANFSFMCPUserver(): ANFSFMCPUserver;
