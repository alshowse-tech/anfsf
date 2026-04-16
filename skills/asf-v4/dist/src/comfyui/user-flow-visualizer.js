"use strict";
/**
 * 用户流程可视化器
 *
 * 层级：Layer 6 - System Architecture Layer
 * 功能：将用户操作流程转换为可视化视频
 * 版本：V1.0.0
 * 状态：🟡 开发中
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserFlowVisualizer = void 0;
// ============== 默认配置 ==============
const DEFAULT_VISUALIZATION_CONFIG = {
    style: 'tutorial',
    showClicks: true,
    showTyping: true,
    highlightUI: true,
    addAnnotations: true,
    narrationSpeed: 'normal',
    resolution: '1080P',
    aspectRatio: '16:9',
};
const STYLE_PROMPTS = {
    tutorial: 'step-by-step tutorial, clear instructions, educational, beginner-friendly',
    demo: 'product demo, smooth transitions, professional presentation',
    animation: 'animated walkthrough, motion graphics, engaging visuals',
    screencast: 'screen recording, real UI, authentic user experience',
};
// ============== 核心类 ==============
/**
 * 用户流程可视化器
 */
class UserFlowVisualizer {
    constructor(videoSkill, mcpBus) {
        this.videoSkill = videoSkill;
        this.mcpBus = mcpBus;
    }
    /**
     * 将用户流程转换为可视化视频
     */
    async visualizeFlow(flow, config = {}) {
        const startTime = Date.now();
        const fullConfig = {
            ...DEFAULT_VISUALIZATION_CONFIG,
            ...config,
        };
        try {
            // 1. 为每个步骤生成视觉提示
            const stepPrompts = flow.steps.map(step => this.createStepVisualPrompt(step, flow, fullConfig));
            // 2. 生成步骤视频
            const stepResults = await this.generateStepVideos(flow.flowId, stepPrompts, flow.steps, fullConfig);
            // 3. 合并步骤视频
            const successfulSteps = stepResults.filter(r => r.status === 'success');
            const mergedVideoPath = successfulSteps.length > 0
                ? `/videos/flow_${flow.flowId}_merged.mp4`
                : undefined;
            // 4. 返回结果
            const result = {
                flowId: flow.flowId,
                status: successfulSteps.length === flow.steps.length
                    ? 'success'
                    : successfulSteps.length > 0
                        ? 'partial'
                        : 'failed',
                videoPath: mergedVideoPath,
                stepVideoPaths: successfulSteps.map(r => r.videoPath),
                durationSeconds: (Date.now() - startTime) / 1000,
                errors: stepResults
                    .filter(r => r.status === 'failed')
                    .map(r => r.error)
                    .filter(Boolean),
                metadata: {
                    totalSteps: flow.steps.length,
                    visualizedSteps: successfulSteps.length,
                    totalDuration: successfulSteps.reduce((sum, r) => sum + r.duration, 0),
                },
            };
            // 5. 发送完成通知
            await this.notifyVisualizationComplete(result);
            return result;
        }
        catch (error) {
            return {
                flowId: flow.flowId,
                status: 'failed',
                stepVideoPaths: [],
                durationSeconds: (Date.now() - startTime) / 1000,
                errors: [error instanceof Error ? error.message : 'Unknown error'],
                metadata: {
                    totalSteps: flow.steps.length,
                    visualizedSteps: 0,
                    totalDuration: 0,
                },
            };
        }
    }
    /**
     * 创建步骤视觉提示
     */
    createStepVisualPrompt(step, flow, config) {
        const stylePrompt = STYLE_PROMPTS[config.style];
        const actionPrompt = this.describeAction(step.userAction, config);
        let prompt = `User flow: ${flow.flowName}, Step ${step.sequence}: ${step.name}. `;
        prompt += `${step.description} `;
        prompt += `${actionPrompt}. `;
        prompt += `${stylePrompt}. `;
        if (config.highlightUI) {
            prompt += 'Highlight UI elements, clear visual focus. ';
        }
        if (config.addAnnotations) {
            prompt += 'Add text annotations, arrows, and callouts. ';
        }
        return prompt;
    }
    /**
     * 描述用户操作
     */
    describeAction(action, config) {
        const actionLower = action.toLowerCase();
        if (actionLower.includes('click')) {
            return config.showClicks
                ? 'Show mouse cursor clicking on button, visual click effect'
                : 'User clicks on element';
        }
        if (actionLower.includes('type') || actionLower.includes('input')) {
            return config.showTyping
                ? 'Show keyboard typing animation, text appearing character by character'
                : 'User types input';
        }
        if (actionLower.includes('scroll')) {
            return 'Smooth scroll animation, content moving vertically';
        }
        if (actionLower.includes('swipe')) {
            return 'Swipe gesture animation, horizontal movement';
        }
        return `User action: ${action}`;
    }
    /**
     * 生成步骤视频
     */
    async generateStepVideos(flowId, prompts, steps, config) {
        const results = [];
        for (let i = 0; i < prompts.length; i++) {
            try {
                const request = {
                    prompt: prompts[i],
                    durationSeconds: steps[i].durationSeconds,
                    resolution: config.resolution,
                    aspectRatio: config.aspectRatio,
                };
                const task = {
                    id: `flow_${flowId}_step_${i + 1}`,
                    description: steps[i].name,
                    priority: 5,
                    request,
                    clientId: 'user-flow-visualizer',
                    createdAt: Date.now(),
                    retryCount: 0,
                    maxRetries: 2,
                };
                const submitResult = this.videoSkill.submitTask(task);
                if (submitResult.success) {
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    results.push({
                        status: 'success',
                        videoPath: `/videos/flow_${flowId}_step_${i + 1}.mp4`,
                        duration: steps[i].durationSeconds,
                    });
                }
                else {
                    results.push({
                        status: 'failed',
                        videoPath: '',
                        duration: 0,
                        error: submitResult.message,
                    });
                }
            }
            catch (error) {
                results.push({
                    status: 'failed',
                    videoPath: '',
                    duration: 0,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }
        return results;
    }
    /**
     * 发送完成通知
     */
    async notifyVisualizationComplete(result) {
        console.log(`[User Flow Visualizer] ✅ Visualization completed: ${result.flowId}, ` +
            `${result.metadata.visualizedSteps}/${result.metadata.totalSteps} steps visualized`);
        // 通过 MCP 总线发送通知
        const message = this.mcpBus.createGenerateResponse({
            status: result.status === 'success' ? 'success' : 'failed',
            videoPath: result.videoPath,
            durationMs: result.durationSeconds * 1000,
        }, `flow_${result.flowId}`, 'user-flow-visualizer', 'interaction-agent');
        await this.mcpBus.send(message);
    }
    /**
     * 从流程定义生成流程图 (静态)
     */
    generateFlowDiagram(flow) {
        let diagram = `flowchart TD\n`;
        diagram += `    Start([开始])\n`;
        flow.steps.forEach((step, index) => {
            const nodeId = `Step${index + 1}`;
            diagram += `    ${nodeId}[${step.sequence}. ${step.name}]\n`;
            if (index === 0) {
                diagram += `    Start --> ${nodeId}\n`;
            }
            else {
                const prevNodeId = `Step${index}`;
                diagram += `    ${prevNodeId} --> ${nodeId}\n`;
            }
        });
        const endNodeId = `End${flow.steps.length}`;
        diagram += `    ${endNodeId} --> End([${flow.expectedOutcome}])\n`;
        return diagram;
    }
}
exports.UserFlowVisualizer = UserFlowVisualizer;
// ============== 导出 ==============
exports.default = UserFlowVisualizer;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlci1mbG93LXZpc3VhbGl6ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvY29tZnl1aS91c2VyLWZsb3ctdmlzdWFsaXplci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7R0FPRzs7O0FBNEZILHFDQUFxQztBQUVyQyxNQUFNLDRCQUE0QixHQUE0QjtJQUM1RCxLQUFLLEVBQUUsVUFBVTtJQUNqQixVQUFVLEVBQUUsSUFBSTtJQUNoQixVQUFVLEVBQUUsSUFBSTtJQUNoQixXQUFXLEVBQUUsSUFBSTtJQUNqQixjQUFjLEVBQUUsSUFBSTtJQUNwQixjQUFjLEVBQUUsUUFBUTtJQUN4QixVQUFVLEVBQUUsT0FBTztJQUNuQixXQUFXLEVBQUUsTUFBTTtDQUNwQixDQUFDO0FBRUYsTUFBTSxhQUFhLEdBQXFEO0lBQ3RFLFFBQVEsRUFBRSwyRUFBMkU7SUFDckYsSUFBSSxFQUFFLDZEQUE2RDtJQUNuRSxTQUFTLEVBQUUseURBQXlEO0lBQ3BFLFVBQVUsRUFBRSxzREFBc0Q7Q0FDbkUsQ0FBQztBQUVGLG9DQUFvQztBQUVwQzs7R0FFRztBQUNILE1BQWEsa0JBQWtCO0lBSTdCLFlBQVksVUFBZ0MsRUFBRSxNQUFtQjtRQUMvRCxJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQztRQUM3QixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztJQUN2QixDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsYUFBYSxDQUNqQixJQUFjLEVBQ2QsU0FBMkMsRUFBRTtRQUU3QyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFFN0IsTUFBTSxVQUFVLEdBQTRCO1lBQzFDLEdBQUcsNEJBQTRCO1lBQy9CLEdBQUcsTUFBTTtTQUNWLENBQUM7UUFFRixJQUFJLENBQUM7WUFDSCxpQkFBaUI7WUFDakIsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENB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Q0FBQyxDQUFDLENBQUM7UUFFSCxNQUFNLFNBQVMsR0FBRyxNQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDNUMsT0FBTyxJQUFJLE9BQU8sU0FBUyxhQUFhLElBQUksQ0FBQyxlQUFlLE1BQU0sQ0FBQztRQUVuRSxPQUFPLE9BQU8sQ0FBQztJQUNqQixDQUFDO0NBQ0Y7QUF4UUQsZ0RBd1FDO0FBRUQsbUNBQW1DO0FBRW5DLGtCQUFlLGtCQUFrQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiDnlKjmiLfmtYHnqIvlj6/op4bljJblmahcbiAqIFxuICog5bGC57qn77yaTGF5ZXIgNiAtIFN5c3RlbSBBcmNoaXRlY3R1cmUgTGF5ZXJcbiAqIOWKn+iDve+8muWwhueUqOaIt+aTjeS9nOa1geeoi+i9rOaNouS4uuWPr+inhuWMluinhumikVxuICog54mI5pys77yaVjEuMC4wXG4gKiDnirbmgIHvvJrwn5+hIOW8gOWPkeS4rVxuICovXG5cbmltcG9ydCB7IFZpZGVvR2VuZXJhdGlvblJlcXVlc3QgfSBmcm9tICcuL2NvbWZ5dWktd29ya2Zsb3ctb3JjaGVzdHJhdG9yJztcbmltcG9ydCB7IFZpZGVvR2VuZXJhdGlvblNraWxsIH0gZnJvbSAnLi92aWRlby1nZW5lcmF0aW9uLXNraWxsJztcbmltcG9ydCB7IE1DUFZpZGVvQnVzIH0gZnJvbSAnLi9tY3AtdmlkZW8tYnVzJztcblxuLy8gPT09PT09PT09PT09PT0g57G75Z6L5a6a5LmJID09PT09PT09PT09PT09XG5cbi8qKlxuICog55So5oi35rWB56iL5q2l6aqkXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVXNlckZsb3dTdGVwIHtcbiAgLyoqIOatpemqpOW6j+WPtyAqL1xuICBzZXF1ZW5jZTogbnVtYmVyO1xuICAvKiog5q2l6aqk5ZCN56ewICovXG4gIG5hbWU6IHN0cmluZztcbiAgLyoqIOatpemqpOaPj+i/sCAqL1xuICBkZXNjcmlwdGlvbjogc3RyaW5nO1xuICAvKiog55So5oi35pON5L2cICovXG4gIHVzZXJBY3Rpb246IHN0cmluZztcbiAgLyoqIOezu+e7n+WTjeW6lCAqL1xuICBzeXN0ZW1SZXNwb25zZTogc3RyaW5nO1xuICAvKiogVUkg5oiq5Zu+6Lev5b6EICjlj6/pgIkpICovXG4gIHNjcmVlbnNob3RQYXRoPzogc3RyaW5nO1xuICAvKiog6aKE6K6h5pe26ZW/ICjnp5IpICovXG4gIGR1cmF0aW9uU2Vjb25kczogbnVtYmVyO1xufVxuXG4vKipcbiAqIOeUqOaIt+a1geeoi1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFVzZXJGbG93IHtcbiAgLyoqIOa1geeoiyBJRCAqL1xuICBmbG93SWQ6IHN0cmluZztcbiAgLyoqIOa1geeoi+WQjeensCAqL1xuICBmbG93TmFtZTogc3RyaW5nO1xuICAvKiog5rWB56iL5o+P6L+wICovXG4gIGRlc2NyaXB0aW9uOiBzdHJpbmc7XG4gIC8qKiDnm67moIfnlKjmiLcgKi9cbiAgdGFyZ2V0VXNlcjogc3RyaW5nO1xuICAvKiog5rWB56iL5q2l6aqkICovXG4gIHN0ZXBzOiBVc2VyRmxvd1N0ZXBbXTtcbiAgLyoqIOmihOacn+e7k+aenCAqL1xuICBleHBlY3RlZE91dGNvbWU6IHN0cmluZztcbn1cblxuLyoqXG4gKiDlj6/op4bljJbphY3nva5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBGbG93VmlzdWFsaXphdGlvbkNvbmZpZyB7XG4gIC8qKiDop4bpopHpo47moLwgKi9cbiAgc3R5bGU6ICd0dXRvcmlhbCcgfCAnZGVtbycgfCAnYW5pbWF0aW9uJyB8ICdzY3JlZW5jYXN0JztcbiAgLyoqIOaYvuekuum8oOagh+eCueWHuyAqL1xuICBzaG93Q2xpY2tzOiBib29sZWFuO1xuICAvKiog5pi+56S66ZSu55uY6L6T5YWlICovXG4gIHNob3dUeXBpbmc6IGJvb2xlYW47XG4gIC8qKiDpq5jkuq4gVUkg5YWD57SgICovXG4gIGhpZ2hsaWdodFVJOiBib29sZWFuO1xuICAvKiog5re75Yqg5qCH5rOoICovXG4gIGFkZEFubm90YXRpb25zOiBib29sZWFuO1xuICAvKiog5peB55m96K+t6YCfICovXG4gIG5hcnJhdGlvblNwZWVkOiAnc2xvdycgfCAnbm9ybWFsJyB8ICdmYXN0JztcbiAgLyoqIOWIhui+qOeOhyAqL1xuICByZXNvbHV0aW9uOiAnNDgwUCcgfCAnNzIwUCcgfCAnMTA4MFAnO1xuICAvKiog5a696auY5q+UICovXG4gIGFzcGVjdFJhdGlvOiAnMTY6OScgfCAnOToxNic7XG59XG5cbi8qKlxuICog5Y+v6KeG5YyW57uT5p6cXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRmxvd1Zpc3VhbGl6YXRpb25SZXN1bHQge1xuICAvKiog5rWB56iLIElEICovXG4gIGZsb3dJZDogc3RyaW5nO1xuICAvKiog54q25oCBICovXG4gIHN0YXR1czogJ3N1Y2Nlc3MnIHwgJ2ZhaWxlZCcgfCAncGFydGlhbCc7XG4gIC8qKiDnlJ/miJDnmoTop4bpopHot6/lvoQgKi9cbiAgdmlkZW9QYXRoPzogc3RyaW5nO1xuICAvKiog5q2l6aqk6KeG6aKR6Lev5b6EICovXG4gIHN0ZXBWaWRlb1BhdGhzOiBzdHJpbmdbXTtcbiAgLyoqIOeUn+aIkOiAl+aXtiAo56eSKSAqL1xuICBkdXJhdGlvblNlY29uZHM6IG51bWJlcjtcbiAgLyoqIOmUmeivr+S/oeaBryAqL1xuICBlcnJvcnM/OiBzdHJpbmdbXTtcbiAgLyoqIOWFg+aVsOaNriAqL1xuICBtZXRhZGF0YToge1xuICAgIHRvdGFsU3RlcHM6IG51bWJlcjtcbiAgICB2aXN1YWxpemVkU3RlcHM6IG51bWJlcjtcbiAgICB0b3RhbER1cmF0aW9uOiBudW1iZXI7XG4gIH07XG59XG5cbi8vID09PT09PT09PT09PT09IOm7mOiupOmFjee9riA9PT09PT09PT09PT09PVxuXG5jb25zdCBERUZBVUxUX1ZJU1VBTElaQVRJT05fQ09ORklHOiBGbG93VmlzdWFsaXphdGlvbkNvbmZpZyA9IHtcbiAgc3R5bGU6ICd0dXRvcmlhbCcsXG4gIHNob3dDbGlja3M6IHRydWUsXG4gIHNob3dUeXBpbmc6IHRydWUsXG4gIGhpZ2hsaWdodFVJOiB0cnVlLFxuICBhZGRBbm5vdGF0aW9uczogdHJ1ZSxcbiAgbmFycmF0aW9uU3BlZWQ6ICdub3JtYWwnLFxuICByZXNvbHV0aW9uOiAnMTA4MFAnLFxuICBhc3BlY3RSYXRpbzogJzE2OjknLFxufTtcblxuY29uc3QgU1RZTEVfUFJPTVBUUzogUmVjb3JkPEZsb3dWaXN1YWxpemF0aW9uQ29uZmlnWydzdHlsZSddLCBzdHJpbmc+ID0ge1xuICB0dXRvcmlhbDogJ3N0ZXAtYnktc3RlcCB0dXRvcmlhbCwgY2xlYXIgaW5zdHJ1Y3Rpb25zLCBlZHVjYXRpb25hbCwgYmVnaW5uZXItZnJpZW5kbHknLFxuICBkZW1vOiAncHJvZHVjdCBkZW1vLCBzbW9vdGggdHJhbnNpdGlvbnMsIHByb2Zlc3Npb25hbCBwcmVzZW50YXRpb24nLFxuICBhbmltYXRpb246ICdhbmltYXRlZCB3YWxrdGhyb3VnaCwgbW90aW9uIGdyYXBoaWNzLCBlbmdhZ2luZyB2aXN1YWxzJyxcbiAgc2NyZWVuY2FzdDogJ3NjcmVlbiByZWNvcmRpbmcsIHJlYWwgVUksIGF1dGhlbnRpYyB1c2VyIGV4cGVyaWVuY2UnLFxufTtcblxuLy8gPT09PT09PT09PT09PT0g5qC45b+D57G7ID09PT09PT09PT09PT09XG5cbi8qKlxuICog55So5oi35rWB56iL5Y+v6KeG5YyW5ZmoXG4gKi9cbmV4cG9ydCBjbGFzcyBVc2VyRmxvd1Zpc3VhbGl6ZXIge1xuICBwcml2YXRlIHZpZGVvU2tpbGw6IFZpZGVvR2VuZXJhdGlvblNraWxsO1xuICBwcml2YXRlIG1jcEJ1czogTUNQVmlkZW9CdXM7XG5cbiAgY29uc3RydWN0b3IodmlkZW9Ta2lsbDogVmlkZW9HZW5lcmF0aW9uU2tpbGwsIG1jcEJ1czogTUNQVmlkZW9CdXMpIHtcbiAgICB0aGlzLnZpZGVvU2tpbGwgPSB2aWRlb1NraWxsO1xuICAgIHRoaXMubWNwQnVzID0gbWNwQnVzO1xuICB9XG5cbiAgLyoqXG4gICAqIOWwhueUqOaIt+a1geeoi+i9rOaNouS4uuWPr+inhuWMluinhumikVxuICAgKi9cbiAgYXN5bmMgdmlzdWFsaXplRmxvdyhcbiAgICBmbG93OiBVc2VyRmxvdyxcbiAgICBjb25maWc6IFBhcnRpYWw8Rmxvd1Zpc3VhbGl6YXRpb25Db25maWc+ID0ge31cbiAgKTogUHJvbWlzZTxGbG93VmlzdWFsaXphdGlvblJlc3VsdD4ge1xuICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XG5cbiAgICBjb25zdCBmdWxsQ29uZmlnOiBGbG93VmlzdWFsaXphdGlvbkNvbmZpZyA9IHtcbiAgICAgIC4uLkRFRkFVTFRfVklTVUFMSVpBVElPTl9DT05GSUcsXG4gICAgICAuLi5jb25maWcsXG4gICAgfTtcblxuICAgIHRyeSB7XG4gICAgICAvLyAxLiDkuLrmr4/kuKrmraXpqqTnlJ/miJDop4bop4nmj5DnpLpcbiAgICAgIGNvbnN0IHN0ZXBQcm9tcHRzID0gZmxvdy5zdGVwcy5tYXAoc3RlcCA9PlxuICAgICAgICB0aGlzLmNyZWF0ZVN0ZXBWaXN1YWxQcm9tcHQoc3RlcCwgZmxvdywgZnVsbENvbmZpZylcbiAgICAgICk7XG5cbiAgICAgIC8vIDIuIOeUn+aIkOatpemqpOinhumikVxuICAgICAgY29uc3Qgc3RlcFJlc3VsdHMgPSBhd2FpdCB0aGlzLmdlbmVyYXRlU3RlcFZpZGVvcyhcbiAgICAgICAgZmxvdy5mbG93SWQsXG4gICAgICAgIHN0ZXBQcm9tcHRzLFxuICAgICAgICBmbG93LnN0ZXBzLFxuICAgICAgICBmdWxsQ29uZmlnXG4gICAgICApO1xuXG4gICAgICAvLyAzLiDlkIjlubbmraXpqqTop4bpopFcbiAgICAgIGNvbnN0IHN1Y2Nlc3NmdWxTdGVwcyA9IHN0ZXBSZXN1bHRzLmZpbHRlcihyID0+IHIuc3RhdHVzID09PSAnc3VjY2VzcycpO1xuICAgICAgY29uc3QgbWVyZ2VkVmlkZW9QYXRoID1cbiAgICAgICAgc3VjY2Vzc2Z1bFN0ZXBzLmxlbmd0aCA+IDBcbiAgICAgICAgICA/IGAvdmlkZW9zL2Zsb3dfJHtmbG93LmZsb3dJZH1fbWVyZ2VkLm1wNGBcbiAgICAgICAgICA6IHVuZGVmaW5lZDtcblxuICAgICAgLy8gNC4g6L+U5Zue57uT5p6cXG4gICAgICBjb25zdCByZXN1bHQ6IEZsb3dWaXN1YWxpemF0aW9uUmVzdWx0ID0ge1xuICAgICAgICBmbG93SWQ6IGZsb3cuZmxvd0lkLFxuICAgICAgICBzdGF0dXM6XG4gICAgICAgICAgc3VjY2Vzc2Z1bFN0ZXBzLmxlbmd0aCA9PT0gZmxvdy5zdGVwcy5sZW5ndGhcbiAgICAgICAgICAgID8gJ3N1Y2Nlc3MnXG4gICAgICAgICAgICA6IHN1Y2Nlc3NmdWxTdGVwcy5sZW5ndGggPiAwXG4gICAgICAgICAgICA/ICdwYXJ0aWFsJ1xuICAgICAgICAgICAgOiAnZmFpbGVkJyxcbiAgICAgICAgdmlkZW9QYXRoOiBtZXJnZWRWaWRlb1BhdGgsXG4gICAgICAgIHN0ZXBWaWRlb1BhdGhzOiBzdWNjZXNzZnVsU3RlcHMubWFwKHIgPT4gci52aWRlb1BhdGgpLFxuICAgICAgICBkdXJhdGlvblNlY29uZHM6IChEYXRlLm5vdygpIC0gc3RhcnRUaW1lKSAvIDEwMDAsXG4gICAgICAgIGVycm9yczogc3RlcFJlc3VsdHNcbiAgICAgICAgICAuZmlsdGVyKHIgPT4gci5zdGF0dXMgPT09ICdmYWlsZWQnKVxuICAgICAgICAgIC5tYXAociA9PiByLmVycm9yISlcbiAgICAgICAgICAuZmlsdGVyKEJvb2xlYW4pLFxuICAgICAgICBtZXRhZGF0YToge1xuICAgICAgICAgIHRvdGFsU3RlcHM6IGZsb3cuc3RlcHMubGVuZ3RoLFxuICAgICAgICAgIHZpc3VhbGl6ZWRTdGVwczogc3VjY2Vzc2Z1bFN0ZXBzLmxlbmd0aCxcbiAgICAgICAgICB0b3RhbER1cmF0aW9uOiBzdWNjZXNzZnVsU3RlcHMucmVkdWNlKChzdW0sIHIpID0+IHN1bSArIHIuZHVyYXRpb24sIDApLFxuICAgICAgICB9LFxuICAgICAgfTtcblxuICAgICAgLy8gNS4g5Y+R6YCB5a6M5oiQ6YCa55+lXG4gICAgICBhd2FpdCB0aGlzLm5vdGlmeVZpc3VhbGl6YXRpb25Db21wbGV0ZShyZXN1bHQpO1xuXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBmbG93SWQ6IGZsb3cuZmxvd0lkLFxuICAgICAgICBzdGF0dXM6ICdmYWlsZWQnLFxuICAgICAgICBzdGVwVmlkZW9QYXRoczogW10sXG4gICAgICAgIGR1cmF0aW9uU2Vjb25kczogKERhdGUubm93KCkgLSBzdGFydFRpbWUpIC8gMTAwMCxcbiAgICAgICAgZXJyb3JzOiBbZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvciddLFxuICAgICAgICBtZXRhZGF0YToge1xuICAgICAgICAgIHRvdGFsU3RlcHM6IGZsb3cuc3RlcHMubGVuZ3RoLFxuICAgICAgICAgIHZpc3VhbGl6ZWRTdGVwczogMCxcbiAgICAgICAgICB0b3RhbER1cmF0aW9uOiAwLFxuICAgICAgICB9LFxuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICog5Yib5bu65q2l6aqk6KeG6KeJ5o+Q56S6XG4gICAqL1xuICBwcml2YXRlIGNyZWF0ZVN0ZXBWaXN1YWxQcm9tcHQoXG4gICAgc3RlcDogVXNlckZsb3dTdGVwLFxuICAgIGZsb3c6IFVzZXJGbG93LFxuICAgIGNvbmZpZzogRmxvd1Zpc3VhbGl6YXRpb25Db25maWdcbiAgKTogc3RyaW5nIHtcbiAgICBjb25zdCBzdHlsZVByb21wdCA9IFNUWUxFX1BST01QVFNbY29uZmlnLnN0eWxlXTtcbiAgICBjb25zdCBhY3Rpb25Qcm9tcHQgPSB0aGlzLmRlc2NyaWJlQWN0aW9uKHN0ZXAudXNlckFjdGlvbiwgY29uZmlnKTtcblxuICAgIGxldCBwcm9tcHQgPSBgVXNlciBmbG93OiAke2Zsb3cuZmxvd05hbWV9LCBTdGVwICR7c3RlcC5zZXF1ZW5jZX06ICR7c3RlcC5uYW1lfS4gYDtcbiAgICBwcm9tcHQgKz0gYCR7c3RlcC5kZXNjcmlwdGlvbn0gYDtcbiAgICBwcm9tcHQgKz0gYCR7YWN0aW9uUHJvbXB0fS4gYDtcbiAgICBwcm9tcHQgKz0gYCR7c3R5bGVQcm9tcHR9LiBgO1xuXG4gICAgaWYgKGNvbmZpZy5oaWdobGlnaHRVSSkge1xuICAgICAgcHJvbXB0ICs9ICdIaWdobGlnaHQgVUkgZWxlbWVudHMsIGNsZWFyIHZpc3VhbCBmb2N1cy4gJztcbiAgICB9XG5cbiAgICBpZiAoY29uZmlnLmFkZEFubm90YXRpb25zKSB7XG4gICAgICBwcm9tcHQgKz0gJ0FkZCB0ZXh0IGFubm90YXRpb25zLCBhcnJvd3MsIGFuZCBjYWxsb3V0cy4gJztcbiAgICB9XG5cbiAgICByZXR1cm4gcHJvbXB0O1xuICB9XG5cbiAgLyoqXG4gICAqIOaPj+i/sOeUqOaIt+aTjeS9nFxuICAgKi9cbiAgcHJpdmF0ZSBkZXNjcmliZUFjdGlvbihcbiAgICBhY3Rpb246IHN0cmluZyxcbiAgICBjb25maWc6IEZsb3dWaXN1YWxpemF0aW9uQ29uZmlnXG4gICk6IHN0cmluZyB7XG4gICAgY29uc3QgYWN0aW9uTG93ZXIgPSBhY3Rpb24udG9Mb3dlckNhc2UoKTtcblxuICAgIGlmIChhY3Rpb25Mb3dlci5pbmNsdWRlcygnY2xpY2snKSkge1xuICAgICAgcmV0dXJuIGNvbmZpZy5zaG93Q2xpY2tzXG4gICAgICAgID8gJ1Nob3cgbW91c2UgY3Vyc29yIGNsaWNraW5nIG9uIGJ1dHRvbiwgdmlzdWFsIGNsaWNrIGVmZmVjdCdcbiAgICAgICAgOiAnVXNlciBjbGlja3Mgb24gZWxlbWVudCc7XG4gICAgfVxuXG4gICAgaWYgKGFjdGlvbkxvd2VyLmluY2x1ZGVzKCd0eXBlJykgfHwgYWN0aW9uTG93ZXIuaW5jbHVkZXMoJ2lucHV0JykpIHtcbiAgICAgIHJldHVybiBjb25maWcuc2hvd1R5cGluZ1xuICAgICAgICA/ICdTaG93IGtleWJvYXJkIHR5cGluZyBhbmltYXRpb24sIHRleHQgYXBwZWFyaW5nIGNoYXJhY3RlciBieSBjaGFyYWN0ZXInXG4gICAgICAgIDogJ1VzZXIgdHlwZXMgaW5wdXQnO1xuICAgIH1cblxuICAgIGlmIChhY3Rpb25Mb3dlci5pbmNsdWRlcygnc2Nyb2xsJykpIHtcbiAgICAgIHJldHVybiAnU21vb3RoIHNjcm9sbCBhbmltYXRpb24sIGNvbnRlbnQgbW92aW5nIHZlcnRpY2FsbHknO1xuICAgIH1cblxuICAgIGlmIChhY3Rpb25Mb3dlci5pbmNsdWRlcygnc3dpcGUnKSkge1xuICAgICAgcmV0dXJuICdTd2lwZSBnZXN0dXJlIGFuaW1hdGlvbiwgaG9yaXpvbnRhbCBtb3ZlbWVudCc7XG4gICAgfVxuXG4gICAgcmV0dXJuIGBVc2VyIGFjdGlvbjogJHthY3Rpb259YDtcbiAgfVxuXG4gIC8qKlxuICAgKiDnlJ/miJDmraXpqqTop4bpopFcbiAgICovXG4gIHByaXZhdGUgYXN5bmMgZ2VuZXJhdGVTdGVwVmlkZW9zKFxuICAgIGZsb3dJZDogc3RyaW5nLFxuICAgIHByb21wdHM6IHN0cmluZ1tdLFxuICAgIHN0ZXBzOiBVc2VyRmxvd1N0ZXBbXSxcbiAgICBjb25maWc6IEZsb3dWaXN1YWxpemF0aW9uQ29uZmlnXG4gICk6IFByb21pc2U8XG4gICAgQXJyYXk8eyBzdGF0dXM6ICdzdWNjZXNzJyB8ICdmYWlsZWQnOyB2aWRlb1BhdGg6IHN0cmluZzsgZHVyYXRpb246IG51bWJlcjsgZXJyb3I/OiBzdHJpbmcgfT5cbiAgPiB7XG4gICAgY29uc3QgcmVzdWx0czogQXJyYXk8e1xuICAgICAgc3RhdHVzOiAnc3VjY2VzcycgfCAnZmFpbGVkJztcbiAgICAgIHZpZGVvUGF0aDogc3RyaW5nO1xuICAgICAgZHVyYXRpb246IG51bWJlcjtcbiAgICAgIGVycm9yPzogc3RyaW5nO1xuICAgIH0+ID0gW107XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHByb21wdHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHJlcXVlc3Q6IFZpZGVvR2VuZXJhdGlvblJlcXVlc3QgPSB7XG4gICAgICAgICAgcHJvbXB0OiBwcm9tcHRzW2ldLFxuICAgICAgICAgIGR1cmF0aW9uU2Vjb25kczogc3RlcHNbaV0uZHVyYXRpb25TZWNvbmRzLFxuICAgICAgICAgIHJlc29sdXRpb246IGNvbmZpZy5yZXNvbHV0aW9uLFxuICAgICAgICAgIGFzcGVjdFJhdGlvOiBjb25maWcuYXNwZWN0UmF0aW8sXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgdGFzayA9IHtcbiAgICAgICAgICBpZDogYGZsb3dfJHtmbG93SWR9X3N0ZXBfJHtpICsgMX1gLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiBzdGVwc1tpXS5uYW1lLFxuICAgICAgICAgIHByaW9yaXR5OiA1LFxuICAgICAgICAgIHJlcXVlc3QsXG4gICAgICAgICAgY2xpZW50SWQ6ICd1c2VyLWZsb3ctdmlzdWFsaXplcicsXG4gICAgICAgICAgY3JlYXRlZEF0OiBEYXRlLm5vdygpLFxuICAgICAgICAgIHJldHJ5Q291bnQ6IDAsXG4gICAgICAgICAgbWF4UmV0cmllczogMixcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBzdWJtaXRSZXN1bHQgPSB0aGlzLnZpZGVvU2tpbGwuc3VibWl0VGFzayh0YXNrKTtcblxuICAgICAgICBpZiAoc3VibWl0UmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMTUwMCkpO1xuXG4gICAgICAgICAgcmVzdWx0cy5wdXNoKHtcbiAgICAgICAgICAgIHN0YXR1czogJ3N1Y2Nlc3MnLFxuICAgICAgICAgICAgdmlkZW9QYXRoOiBgL3ZpZGVvcy9mbG93XyR7Zmxvd0lkfV9zdGVwXyR7aSArIDF9Lm1wNGAsXG4gICAgICAgICAgICBkdXJhdGlvbjogc3RlcHNbaV0uZHVyYXRpb25TZWNvbmRzLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc3VsdHMucHVzaCh7XG4gICAgICAgICAgICBzdGF0dXM6ICdmYWlsZWQnLFxuICAgICAgICAgICAgdmlkZW9QYXRoOiAnJyxcbiAgICAgICAgICAgIGR1cmF0aW9uOiAwLFxuICAgICAgICAgICAgZXJyb3I6IHN1Ym1pdFJlc3VsdC5tZXNzYWdlLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICByZXN1bHRzLnB1c2goe1xuICAgICAgICAgIHN0YXR1czogJ2ZhaWxlZCcsXG4gICAgICAgICAgdmlkZW9QYXRoOiAnJyxcbiAgICAgICAgICBkdXJhdGlvbjogMCxcbiAgICAgICAgICBlcnJvcjogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcicsXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXN1bHRzO1xuICB9XG5cbiAgLyoqXG4gICAqIOWPkemAgeWujOaIkOmAmuefpVxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBub3RpZnlWaXN1YWxpemF0aW9uQ29tcGxldGUoXG4gICAgcmVzdWx0OiBGbG93VmlzdWFsaXphdGlvblJlc3VsdFxuICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zb2xlLmxvZyhcbiAgICAgIGBbVXNlciBGbG93IFZpc3VhbGl6ZXJdIOKchSBWaXN1YWxpemF0aW9uIGNvbXBsZXRlZDogJHtyZXN1bHQuZmxvd0lkfSwgYCArXG4gICAgICAgIGAke3Jlc3VsdC5tZXRhZGF0YS52aXN1YWxpemVkU3RlcHN9LyR7cmVzdWx0Lm1ldGFkYXRhLnRvdGFsU3RlcHN9IHN0ZXBzIHZpc3VhbGl6ZWRgXG4gICAgKTtcblxuICAgIC8vIOmAmui/hyBNQ1Ag5oC757q/5Y+R6YCB6YCa55+lXG4gICAgY29uc3QgbWVzc2FnZSA9IHRoaXMubWNwQnVzLmNyZWF0ZUdlbmVyYXRlUmVzcG9uc2UoXG4gICAgICB7XG4gICAgICAgIHN0YXR1czogcmVzdWx0LnN0YXR1cyA9PT0gJ3N1Y2Nlc3MnID8gJ3N1Y2Nlc3MnIDogJ2ZhaWxlZCcsXG4gICAgICAgIHZpZGVvUGF0aDogcmVzdWx0LnZpZGVvUGF0aCxcbiAgICAgICAgZHVyYXRpb25NczogcmVzdWx0LmR1cmF0aW9uU2Vjb25kcyAqIDEwMDAsXG4gICAgICB9LFxuICAgICAgYGZsb3dfJHtyZXN1bHQuZmxvd0lkfWAsXG4gICAgICAndXNlci1mbG93LXZpc3VhbGl6ZXInLFxuICAgICAgJ2ludGVyYWN0aW9uLWFnZW50J1xuICAgICk7XG4gICAgYXdhaXQgdGhpcy5tY3BCdXMuc2VuZChtZXNzYWdlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiDku47mtYHnqIvlrprkuYnnlJ/miJDmtYHnqIvlm74gKOmdmeaAgSlcbiAgICovXG4gIGdlbmVyYXRlRmxvd0RpYWdyYW0oZmxvdzogVXNlckZsb3cpOiBzdHJpbmcge1xuICAgIGxldCBkaWFncmFtID0gYGZsb3djaGFydCBURFxcbmA7XG4gICAgZGlhZ3JhbSArPSBgICAgIFN0YXJ0KFvlvIDlp4tdKVxcbmA7XG5cbiAgICBmbG93LnN0ZXBzLmZvckVhY2goKHN0ZXAsIGluZGV4KSA9PiB7XG4gICAgICBjb25zdCBub2RlSWQgPSBgU3RlcCR7aW5kZXggKyAxfWA7XG4gICAgICBkaWFncmFtICs9IGAgICAgJHtub2RlSWR9WyR7c3RlcC5zZXF1ZW5jZX0uICR7c3RlcC5uYW1lfV1cXG5gO1xuXG4gICAgICBpZiAoaW5kZXggPT09IDApIHtcbiAgICAgICAgZGlhZ3JhbSArPSBgICAgIFN0YXJ0IC0tPiAke25vZGVJZH1cXG5gO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgcHJldk5vZGVJZCA9IGBTdGVwJHtpbmRleH1gO1xuICAgICAgICBkaWFncmFtICs9IGAgICAgJHtwcmV2Tm9kZUlkfSAtLT4gJHtub2RlSWR9XFxuYDtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGNvbnN0IGVuZE5vZGVJZCA9IGBFbmQke2Zsb3cuc3RlcHMubGVuZ3RofWA7XG4gICAgZGlhZ3JhbSArPSBgICAgICR7ZW5kTm9kZUlkfSAtLT4gRW5kKFske2Zsb3cuZXhwZWN0ZWRPdXRjb21lfV0pXFxuYDtcblxuICAgIHJldHVybiBkaWFncmFtO1xuICB9XG59XG5cbi8vID09PT09PT09PT09PT09IOWvvOWHuiA9PT09PT09PT09PT09PVxuXG5leHBvcnQgZGVmYXVsdCBVc2VyRmxvd1Zpc3VhbGl6ZXI7XG4iXX0=