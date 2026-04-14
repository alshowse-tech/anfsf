/**
 * 用户流程可视化器
 *
 * 层级：Layer 6 - System Architecture Layer
 * 功能：将用户操作流程转换为可视化视频
 * 版本：V1.0.0
 * 状态：🟡 开发中
 */
import { VideoGenerationSkill } from './video-generation-skill';
import { MCPVideoBus } from './mcp-video-bus';
/**
 * 用户流程步骤
 */
export interface UserFlowStep {
    /** 步骤序号 */
    sequence: number;
    /** 步骤名称 */
    name: string;
    /** 步骤描述 */
    description: string;
    /** 用户操作 */
    userAction: string;
    /** 系统响应 */
    systemResponse: string;
    /** UI 截图路径 (可选) */
    screenshotPath?: string;
    /** 预计时长 (秒) */
    durationSeconds: number;
}
/**
 * 用户流程
 */
export interface UserFlow {
    /** 流程 ID */
    flowId: string;
    /** 流程名称 */
    flowName: string;
    /** 流程描述 */
    description: string;
    /** 目标用户 */
    targetUser: string;
    /** 流程步骤 */
    steps: UserFlowStep[];
    /** 预期结果 */
    expectedOutcome: string;
}
/**
 * 可视化配置
 */
export interface FlowVisualizationConfig {
    /** 视频风格 */
    style: 'tutorial' | 'demo' | 'animation' | 'screencast';
    /** 显示鼠标点击 */
    showClicks: boolean;
    /** 显示键盘输入 */
    showTyping: boolean;
    /** 高亮 UI 元素 */
    highlightUI: boolean;
    /** 添加标注 */
    addAnnotations: boolean;
    /** 旁白语速 */
    narrationSpeed: 'slow' | 'normal' | 'fast';
    /** 分辨率 */
    resolution: '480P' | '720P' | '1080P';
    /** 宽高比 */
    aspectRatio: '16:9' | '9:16';
}
/**
 * 可视化结果
 */
export interface FlowVisualizationResult {
    /** 流程 ID */
    flowId: string;
    /** 状态 */
    status: 'success' | 'failed' | 'partial';
    /** 生成的视频路径 */
    videoPath?: string;
    /** 步骤视频路径 */
    stepVideoPaths: string[];
    /** 生成耗时 (秒) */
    durationSeconds: number;
    /** 错误信息 */
    errors?: string[];
    /** 元数据 */
    metadata: {
        totalSteps: number;
        visualizedSteps: number;
        totalDuration: number;
    };
}
/**
 * 用户流程可视化器
 */
export declare class UserFlowVisualizer {
    private videoSkill;
    private mcpBus;
    constructor(videoSkill: VideoGenerationSkill, mcpBus: MCPVideoBus);
    /**
     * 将用户流程转换为可视化视频
     */
    visualizeFlow(flow: UserFlow, config?: Partial<FlowVisualizationConfig>): Promise<FlowVisualizationResult>;
    /**
     * 创建步骤视觉提示
     */
    private createStepVisualPrompt;
    /**
     * 描述用户操作
     */
    private describeAction;
    /**
     * 生成步骤视频
     */
    private generateStepVideos;
    /**
     * 发送完成通知
     */
    private notifyVisualizationComplete;
    /**
     * 从流程定义生成流程图 (静态)
     */
    generateFlowDiagram(flow: UserFlow): string;
}
export default UserFlowVisualizer;
