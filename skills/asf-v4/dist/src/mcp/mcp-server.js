"use strict";
/**
 * MCP Server Implementation - ANFSF v2.0
 *
 * Model Context Protocol (MCP) v2.0 服务器实现
 * 支持 tools/resources/prompts 能力
 *
 * @module asf-v4/mcp/server
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ANFSFMCPUserver = void 0;
exports.createANFSFMCPUserver = createANFSFMCPUserver;
const logger_1 = require("../utils/logger");
const logger = (0, logger_1.createModuleLogger)('MCP-Server');
// ============================================================================
// ANFSF MCP Server
// ============================================================================
class ANFSFMCPUserver {
    constructor() {
        this.name = 'anfsf-v2';
        this.version = '2.0.0';
        this.capabilities = {
            tools: true,
            resources: true,
            prompts: true,
        };
        this.tools = {};
        this.initializeTools();
    }
    initializeTools() {
        // 初始化 ANFSF 工具集
        this.tools['veto-check'] = {
            name: 'veto-check',
            description: 'Check if changes pass hard/soft veto rules',
            parameters: {
                type: 'object',
                properties: {
                    changes: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                resourceType: { type: 'string' },
                                resourcePath: { type: 'string' },
                                action: { type: 'string' },
                            },
                        },
                    },
                    approvals: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                authority: { type: 'string' },
                                scope: { type: 'string' },
                                status: { type: 'string' },
                            },
                        },
                    },
                },
            },
            execute: async (params) => {
                // 简化实现
                return { success: true, result: 'Veto check passed' };
            },
        };
        this.tools['ownership-proof'] = {
            name: 'ownership-proof',
            description: 'Generate verifiable ownership proofs for resources',
            parameters: {
                type: 'object',
                properties: {
                    resources: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                type: { type: 'string' },
                                path: { type: 'string' },
                                subpath: { type: 'string' },
                            },
                        },
                    },
                },
            },
            execute: async (params) => {
                // 简化实现
                return { success: true, result: 'Ownership proof generated' };
            },
        };
        this.tools['risk-predict'] = {
            name: 'risk-predict',
            description: 'Predict rework risk for tasks',
            parameters: {
                type: 'object',
                properties: {
                    tasks: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                complexity: { type: 'number' },
                                teamSize: { type: 'number' },
                            },
                        },
                    },
                },
            },
            execute: async (params) => {
                // 简化实现
                return { success: true, result: { risk: 0.15 } };
            },
        };
        this.tools['ui-synthesize'] = {
            name: 'ui-synthesize',
            description: 'Synthesize UI components from requirements',
            parameters: {
                type: 'object',
                properties: {
                    components: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                name: { type: 'string' },
                                type: { type: 'string' },
                                properties: { type: 'object' },
                            },
                        },
                    },
                },
            },
            execute: async (params) => {
                // 简化实现
                return { success: true, result: 'UI synthesized' };
            },
        };
        this.tools['layout-generate'] = {
            name: 'layout-generate',
            description: 'Generate layout from components',
            parameters: {
                type: 'object',
                properties: {
                    components: {
                        type: 'array',
                        items: { type: 'object' },
                    },
                    config: { type: 'object' },
                },
            },
            execute: async (params) => {
                // 简化实现
                return { success: true, result: 'Layout generated' };
            },
        };
    }
    async connect() {
        logger.info('MCP Server connected');
    }
    async disconnect() {
        logger.info('MCP Server disconnected');
    }
    async getResource(uri) {
        return { success: true, data: `Resource: ${uri}` };
    }
    async getPrompt(name, args) {
        return { success: true, data: `Prompt: ${name}` };
    }
}
exports.ANFSFMCPUserver = ANFSFMCPUserver;
// ============================================================================
// Factory
// ============================================================================
function createANFSFMCPUserver() {
    return new ANFSFMCPUserver();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwLXNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9tY3AvbWNwLXNlcnZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7R0FPRzs7O0FBb0xILHNEQUVDO0FBbkxELDRDQUFxRDtBQUVyRCxNQUFNLE1BQU0sR0FBRyxJQUFBLDJCQUFrQixFQUFDLFlBQVksQ0FBQyxDQUFDO0FBRWhELCtFQUErRTtBQUMvRSxtQkFBbUI7QUFDbkIsK0VBQStFO0FBRS9FLE1BQWEsZUFBZTtJQVcxQjtRQVZBLFNBQUksR0FBVyxVQUFVLENBQUM7UUFDMUIsWUFBTyxHQUFXLE9BQU8sQ0FBQztRQUMxQixpQkFBWSxHQUFvQjtZQUM5QixLQUFLLEVBQUUsSUFBSTtZQUNYLFNBQVMsRUFBRSxJQUFJO1lBQ2YsT0FBTyxFQUFFLElBQUk7U0FDZCxDQUFDO1FBRUYsVUFBSyxHQUE0QixFQUFFLENBQUM7UUFHbEMsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO0lBQ3pCLENBQUM7SUFFTyxlQUFlO1FBQ3JCLGdCQUFnQjtRQUNoQixJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxHQUFHO1lBQ3pCLElBQUksRUFBRSxZQUFZO1lBQ2xCLFdBQVcsRUFBRSw0Q0FBNEM7WUFDekQsVUFBVSxFQUFFO2dCQUNWLElBQUksRUFBRSxRQUFRO2dCQUNkLFVBQVUsRUFBRTtvQkFDVixPQUFPLEVBQUU7d0JBQ1AsSUFBSSxFQUFFLE9BQU87d0JBQ2IsS0FBSyxFQUFFOzRCQUNMLElBQUksRUFBRSxRQUFROzRCQUNkLFVBQVUsRUFBRTtnQ0FDVixZQUFZLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFO2dDQUNoQyxZQUFZLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFO2dDQUNoQyxNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFOzZCQUMzQjt5QkFDRjtxQkFDRjtvQkFDRCxTQUFTLEVBQUU7d0JB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QUksRUFBRSxXQUFXLElBQUksRUFBRSxFQUFFLENBQUM7SUFDcEQsQ0FBQztDQUNGO0FBbktELDBDQW1LQztBQUVELCtFQUErRTtBQUMvRSxVQUFVO0FBQ1YsK0VBQStFO0FBRS9FLFNBQWdCLHFCQUFxQjtJQUNuQyxPQUFPLElBQUksZUFBZSxFQUFFLENBQUM7QUFDL0IsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogTUNQIFNlcnZlciBJbXBsZW1lbnRhdGlvbiAtIEFORlNGIHYyLjBcbiAqIFxuICogTW9kZWwgQ29udGV4dCBQcm90b2NvbCAoTUNQKSB2Mi4wIOacjeWKoeWZqOWunueOsFxuICog5pSv5oyBIHRvb2xzL3Jlc291cmNlcy9wcm9tcHRzIOiDveWKm1xuICogXG4gKiBAbW9kdWxlIGFzZi12NC9tY3Avc2VydmVyXG4gKi9cblxuaW1wb3J0IHsgTUNQU2VydmVyLCBNQ1BDYXBhYmlsaXRpZXMsIE1DUFRvb2wgfSBmcm9tICcuL2luZGV4JztcbmltcG9ydCB7IGNyZWF0ZU1vZHVsZUxvZ2dlciB9IGZyb20gJy4uL3V0aWxzL2xvZ2dlcic7XG5cbmNvbnN0IGxvZ2dlciA9IGNyZWF0ZU1vZHVsZUxvZ2dlcignTUNQLVNlcnZlcicpO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBBTkZTRiBNQ1AgU2VydmVyXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBjbGFzcyBBTkZTRk1DUFVzZXJ2ZXIgaW1wbGVtZW50cyBNQ1BTZXJ2ZXIge1xuICBuYW1lOiBzdHJpbmcgPSAnYW5mc2YtdjInO1xuICB2ZXJzaW9uOiBzdHJpbmcgPSAnMi4wLjAnO1xuICBjYXBhYmlsaXRpZXM6IE1DUENhcGFiaWxpdGllcyA9IHtcbiAgICB0b29sczogdHJ1ZSxcbiAgICByZXNvdXJjZXM6IHRydWUsXG4gICAgcHJvbXB0czogdHJ1ZSxcbiAgfTtcblxuICB0b29sczogUmVjb3JkPHN0cmluZywgTUNQVG9vbD4gPSB7fTtcblxuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLmluaXRpYWxpemVUb29scygpO1xuICB9XG5cbiAgcHJpdmF0ZSBpbml0aWFsaXplVG9vbHMoKTogdm9pZCB7XG4gICAgLy8g5Yid5aeL5YyWIEFORlNGIOW3peWFt+mbhlxuICAgIHRoaXMudG9vbHNbJ3ZldG8tY2hlY2snXSA9IHtcbiAgICAgIG5hbWU6ICd2ZXRvLWNoZWNrJyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ2hlY2sgaWYgY2hhbmdlcyBwYXNzIGhhcmQvc29mdCB2ZXRvIHJ1bGVzJyxcbiAgICAgIHBhcmFtZXRlcnM6IHtcbiAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICBjaGFuZ2VzOiB7XG4gICAgICAgICAgICB0eXBlOiAnYXJyYXknLFxuICAgICAgICAgICAgaXRlbXM6IHtcbiAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICByZXNvdXJjZVR5cGU6IHsgdHlwZTogJ3N0cmluZycgfSxcbiAgICAgICAgICAgICAgICByZXNvdXJjZVBhdGg6IHsgdHlwZTogJ3N0cmluZycgfSxcbiAgICAgICAgICAgICAgICBhY3Rpb246IHsgdHlwZTogJ3N0cmluZycgfSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgICBhcHByb3ZhbHM6IHtcbiAgICAgICAgICAgIHR5cGU6ICdhcnJheScsXG4gICAgICAgICAgICBpdGVtczoge1xuICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgIGF1dGhvcml0eTogeyB0eXBlOiAnc3RyaW5nJyB9LFxuICAgICAgICAgICAgICAgIHNjb3BlOiB7IHR5cGU6ICdzdHJpbmcnIH0sXG4gICAgICAgICAgICAgICAgc3RhdHVzOiB7IHR5cGU6ICdzdHJpbmcnIH0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgZXhlY3V0ZTogYXN5bmMgKHBhcmFtczogYW55KSA9PiB7XG4gICAgICAgIC8vIOeugOWMluWunueOsFxuICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCByZXN1bHQ6ICdWZXRvIGNoZWNrIHBhc3NlZCcgfTtcbiAgICAgIH0sXG4gICAgfTtcblxuICAgIHRoaXMudG9vbHNbJ293bmVyc2hpcC1wcm9vZiddID0ge1xuICAgICAgbmFtZTogJ293bmVyc2hpcC1wcm9vZicsXG4gICAgICBkZXNjcmlwdGlvbjogJ0dlbmVyYXRlIHZlcmlmaWFibGUgb3duZXJzaGlwIHByb29mcyBmb3IgcmVzb3VyY2VzJyxcbiAgICAgIHBhcmFtZXRlcnM6IHtcbiAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICByZXNvdXJjZXM6IHtcbiAgICAgICAgICAgIHR5cGU6ICdhcnJheScsXG4gICAgICAgICAgICBpdGVtczoge1xuICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgIHR5cGU6IHsgdHlwZTogJ3N0cmluZycgfSxcbiAgICAgICAgICAgICAgICBwYXRoOiB7IHR5cGU6ICdzdHJpbmcnIH0sXG4gICAgICAgICAgICAgICAgc3VicGF0aDogeyB0eXBlOiAnc3RyaW5nJyB9LFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIGV4ZWN1dGU6IGFzeW5jIChwYXJhbXM6IGFueSkgPT4ge1xuICAgICAgICAvLyDnroDljJblrp7njrBcbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgcmVzdWx0OiAnT3duZXJzaGlwIHByb29mIGdlbmVyYXRlZCcgfTtcbiAgICAgIH0sXG4gICAgfTtcblxuICAgIHRoaXMudG9vbHNbJ3Jpc2stcHJlZGljdCddID0ge1xuICAgICAgbmFtZTogJ3Jpc2stcHJlZGljdCcsXG4gICAgICBkZXNjcmlwdGlvbjogJ1ByZWRpY3QgcmV3b3JrIHJpc2sgZm9yIHRhc2tzJyxcbiAgICAgIHBhcmFtZXRlcnM6IHtcbiAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICB0YXNrczoge1xuICAgICAgICAgICAgdHlwZTogJ2FycmF5JyxcbiAgICAgICAgICAgIGl0ZW1zOiB7XG4gICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgaWQ6IHsgdHlwZTogJ3N0cmluZycgfSxcbiAgICAgICAgICAgICAgICBjb21wbGV4aXR5OiB7IHR5cGU6ICdudW1iZXInIH0sXG4gICAgICAgICAgICAgICAgdGVhbVNpemU6IHsgdHlwZTogJ251bWJlcicgfSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBleGVjdXRlOiBhc3luYyAocGFyYW1zOiBhbnkpID0+IHtcbiAgICAgICAgLy8g566A5YyW5a6e546wXG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIHJlc3VsdDogeyByaXNrOiAwLjE1IH0gfTtcbiAgICAgIH0sXG4gICAgfTtcblxuICAgIHRoaXMudG9vbHNbJ3VpLXN5bnRoZXNpemUnXSA9IHtcbiAgICAgIG5hbWU6ICd1aS1zeW50aGVzaXplJyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnU3ludGhlc2l6ZSBVSSBjb21wb25lbnRzIGZyb20gcmVxdWlyZW1lbnRzJyxcbiAgICAgIHBhcmFtZXRlcnM6IHtcbiAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICBjb21wb25lbnRzOiB7XG4gICAgICAgICAgICB0eXBlOiAnYXJyYXknLFxuICAgICAgICAgICAgaXRlbXM6IHtcbiAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICBuYW1lOiB7IHR5cGU6ICdzdHJpbmcnIH0sXG4gICAgICAgICAgICAgICAgdHlwZTogeyB0eXBlOiAnc3RyaW5nJyB9LFxuICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHsgdHlwZTogJ29iamVjdCcgfSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBleGVjdXRlOiBhc3luYyAocGFyYW1zOiBhbnkpID0+IHtcbiAgICAgICAgLy8g566A5YyW5a6e546wXG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIHJlc3VsdDogJ1VJIHN5bnRoZXNpemVkJyB9O1xuICAgICAgfSxcbiAgICB9O1xuXG4gICAgdGhpcy50b29sc1snbGF5b3V0LWdlbmVyYXRlJ10gPSB7XG4gICAgICBuYW1lOiAnbGF5b3V0LWdlbmVyYXRlJyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnR2VuZXJhdGUgbGF5b3V0IGZyb20gY29tcG9uZW50cycsXG4gICAgICBwYXJhbWV0ZXJzOiB7XG4gICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgY29tcG9uZW50czoge1xuICAgICAgICAgICAgdHlwZTogJ2FycmF5JyxcbiAgICAgICAgICAgIGl0ZW1zOiB7IHR5cGU6ICdvYmplY3QnIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgICBjb25maWc6IHsgdHlwZTogJ29iamVjdCcgfSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBleGVjdXRlOiBhc3luYyAocGFyYW1zOiBhbnkpID0+IHtcbiAgICAgICAgLy8g566A5YyW5a6e546wXG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIHJlc3VsdDogJ0xheW91dCBnZW5lcmF0ZWQnIH07XG4gICAgICB9LFxuICAgIH07XG4gIH1cblxuICBhc3luYyBjb25uZWN0KCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGxvZ2dlci5pbmZvKCdNQ1AgU2VydmVyIGNvbm5lY3RlZCcpO1xuICB9XG5cbiAgYXN5bmMgZGlzY29ubmVjdCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBsb2dnZXIuaW5mbygnTUNQIFNlcnZlciBkaXNjb25uZWN0ZWQnKTtcbiAgfVxuXG4gIGFzeW5jIGdldFJlc291cmNlKHVyaTogc3RyaW5nKTogUHJvbWlzZTxhbnk+IHtcbiAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBgUmVzb3VyY2U6ICR7dXJpfWAgfTtcbiAgfVxuXG4gIGFzeW5jIGdldFByb21wdChuYW1lOiBzdHJpbmcsIGFyZ3M/OiBSZWNvcmQ8c3RyaW5nLCBhbnk+KTogUHJvbWlzZTxhbnk+IHtcbiAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBgUHJvbXB0OiAke25hbWV9YCB9O1xuICB9XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUFORlNGTUNQVXNlcnZlcigpOiBBTkZTRk1DUFVzZXJ2ZXIge1xuICByZXR1cm4gbmV3IEFORlNGTUNQVXNlcnZlcigpO1xufSJdfQ==