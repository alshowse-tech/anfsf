"use strict";
/**
 * 产品演示视频生成器
 *
 * 层级：Layer 6 - System Architecture Layer
 * 功能：从 PRD/产品描述自动生成产品演示视频
 * 版本：V1.0.0
 * 状态：🟡 开发中
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductDemoGenerator = void 0;
// ============== 默认配置 ==============
const DEFAULT_VIDEO_CONFIG = {
    durationSeconds: 30,
    style: 'professional',
    language: 'zh-CN',
    backgroundMusic: true,
    showSubtitles: true,
    aspectRatio: '16:9',
    resolution: '1080P',
};
const STYLE_PROMPTS = {
    professional: 'professional, clean, corporate style, high quality, polished',
    casual: 'casual, friendly, approachable, warm colors, relaxed',
    energetic: 'energetic, dynamic, vibrant, fast-paced, exciting',
    minimalist: 'minimalist, simple, elegant, clean lines, subtle',
};
// ============== 核心类 ==============
/**
 * 产品演示视频生成器
 */
class ProductDemoGenerator {
    constructor(videoSkill, mcpBus) {
        this.videoSkill = videoSkill;
        this.mcpBus = mcpBus;
    }
    /**
     * 从产品信息生成演示视频
     */
    async generateDemo(product, config = {}) {
        const startTime = Date.now();
        const taskId = `demo_${product.name.replace(/\s+/g, '_')}_${Date.now()}`;
        const fullConfig = {
            ...DEFAULT_VIDEO_CONFIG,
            ...config,
        };
        try {
            // 1. 分析产品并生成场景
            const scenes = this.analyzeProductAndGenerateScenes(product, fullConfig);
            // 2. 创建生成任务
            const task = {
                taskId,
                product,
                config: fullConfig,
                scenes,
                createdAt: Date.now(),
                status: 'generating',
            };
            // 3. 发送任务开始通知
            await this.notifyTaskStart(task);
            // 4. 并行生成所有场景视频
            const sceneResults = await this.generateScenes(task);
            // 5. 合并场景视频 (模拟)
            const mergedPath = await this.mergeSceneVideos(sceneResults);
            // 6. 计算结果
            const successfulScenes = sceneResults.filter(r => r.status === 'success');
            const failedScenes = sceneResults.filter(r => r.status === 'failed');
            const result = {
                taskId,
                status: failedScenes.length === 0 ? 'success' : 'partial',
                videoPaths: successfulScenes.map(r => r.videoPath),
                mergedVideoPath: mergedPath,
                durationSeconds: (Date.now() - startTime) / 1000,
                errors: failedScenes.map(r => r.error).filter(Boolean),
                metadata: {
                    totalScenes: scenes.length,
                    successfulScenes: successfulScenes.length,
                    failedScenes: failedScenes.length,
                    totalDuration: successfulScenes.reduce((sum, r) => sum + r.duration, 0),
                },
            };
            // 7. 发送完成通知
            await this.notifyTaskComplete(result);
            return result;
        }
        catch (error) {
            return {
                taskId,
                status: 'failed',
                videoPaths: [],
                durationSeconds: (Date.now() - startTime) / 1000,
                errors: [error instanceof Error ? error.message : 'Unknown error'],
                metadata: {
                    totalScenes: 0,
                    successfulScenes: 0,
                    failedScenes: 0,
                    totalDuration: 0,
                },
            };
        }
    }
    /**
     * 分析产品并生成场景
     */
    analyzeProductAndGenerateScenes(product, config) {
        const scenes = [];
        const totalDuration = config.durationSeconds;
        const featureCount = product.features.length;
        const durationPerFeature = Math.floor(totalDuration / (featureCount + 2)); // +2 for intro/outro
        // 场景 1: 开场介绍
        scenes.push({
            sequence: 1,
            description: `介绍${product.name}，${product.description.substring(0, 50)}...`,
            visualPrompt: this.createVisualPrompt(`Product introduction: ${product.name}, ${product.description}`, config.style, 'intro'),
            durationSeconds: durationPerFeature,
        });
        // 场景 2-N: 功能展示
        product.features.forEach((feature, index) => {
            scenes.push({
                sequence: index + 2,
                description: `展示功能：${feature}`,
                feature,
                visualPrompt: this.createVisualPrompt(`Feature demonstration: ${feature} for ${product.name}`, config.style, 'feature'),
                durationSeconds: durationPerFeature,
            });
        });
        // 场景 N+1: 结尾呼吁
        scenes.push({
            sequence: product.features.length + 2,
            description: '结尾：呼吁行动',
            visualPrompt: this.createVisualPrompt(`Call to action: Try ${product.name} today`, config.style, 'outro'),
            durationSeconds: durationPerFeature,
        });
        return scenes;
    }
    /**
     * 创建视觉提示
     */
    createVisualPrompt(basePrompt, style, sceneType) {
        const stylePrompt = STYLE_PROMPTS[style];
        const typePrompts = {
            intro: 'opening scene, title card, professional introduction',
            feature: 'screen recording, UI demonstration, feature highlight',
            outro: 'closing scene, contact information, call to action',
        };
        return `${basePrompt}, ${stylePrompt}, ${typePrompts[sceneType]}, high quality, 4k`;
    }
    /**
     * 生成所有场景
     */
    async generateScenes(task) {
        const results = [];
        for (const scene of task.scenes) {
            try {
                // 创建视频生成请求
                const request = {
                    prompt: scene.visualPrompt,
                    durationSeconds: scene.durationSeconds,
                    resolution: task.config.resolution,
                    aspectRatio: task.config.aspectRatio,
                };
                // 提交任务到视频生成技能
                const skillTask = {
                    id: `${task.taskId}_scene_${scene.sequence}`,
                    description: scene.description,
                    priority: 5,
                    request,
                    clientId: 'product-demo-generator',
                    createdAt: Date.now(),
                    retryCount: 0,
                    maxRetries: 2,
                };
                const submitResult = this.videoSkill.submitTask(skillTask);
                if (submitResult.success) {
                    // 模拟等待生成完成
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    results.push({
                        status: 'success',
                        videoPath: `/videos/${task.taskId}_scene_${scene.sequence}.mp4`,
                        duration: scene.durationSeconds,
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
     * 合并场景视频 (模拟)
     */
    async mergeSceneVideos(sceneResults) {
        const successfulPaths = sceneResults
            .filter(r => r.status === 'success')
            .map(r => r.videoPath);
        if (successfulPaths.length === 0) {
            return undefined;
        }
        // 模拟视频合并 (实际应调用视频处理服务)
        return `/videos/merged_${Date.now()}.mp4`;
    }
    /**
     * 发送任务开始通知
     */
    async notifyTaskStart(task) {
        const message = this.mcpBus.createGenerateRequest({
            prompt: `Generate product demo for ${task.product.name}`,
            durationSeconds: task.config.durationSeconds,
        }, 'product-demo-generator', 'video-production-agent');
        await this.mcpBus.send(message);
    }
    /**
     * 发送任务完成通知
     */
    async notifyTaskComplete(result) {
        console.log(`[Product Demo Generator] ✅ Task completed: ${result.taskId}, ` +
            `${result.metadata.successfulScenes}/${result.metadata.totalScenes} scenes successful`);
    }
}
exports.ProductDemoGenerator = ProductDemoGenerator;
// ============== 导出 ==============
exports.default = ProductDemoGenerator;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZHVjdC1kZW1vLWdlbmVyYXRvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9jb21meXVpL3Byb2R1Y3QtZGVtby1nZW5lcmF0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7O0dBT0c7OztBQTJHSCxxQ0FBcUM7QUFFckMsTUFBTSxvQkFBb0IsR0FBb0I7SUFDNUMsZUFBZSxFQUFFLEVBQUU7SUFDbkIsS0FBSyxFQUFFLGNBQWM7SUFDckIsUUFBUSxFQUFFLE9BQU87SUFDakIsZUFBZSxFQUFFLElBQUk7SUFDckIsYUFBYSxFQUFFLElBQUk7SUFDbkIsV0FBVyxFQUFFLE1BQU07SUFDbkIsVUFBVSxFQUFFLE9BQU87Q0FDcEIsQ0FBQztBQUVGLE1BQU0sYUFBYSxHQUE2QztJQUM5RCxZQUFZLEVBQUUsOERBQThEO0lBQzVFLE1BQU0sRUFBRSxzREFBc0Q7SUFDOUQsU0FBUyxFQUFFLG1EQUFtRDtJQUM5RCxVQUFVLEVBQUUsa0RBQWtEO0NBQy9ELENBQUM7QUFFRixvQ0FBb0M7QUFFcEM7O0dBRUc7QUFDSCxNQUFhLG9CQUFvQjtJQUkvQixZQUFZLFVBQWdDLEVBQUUsTUFBbUI7UUFDL0QsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7UUFDN0IsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7SUFDdkIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLFlBQVksQ0FDaEIsT0FBb0IsRUFDcEIsU0FBbUMsRUFBRTtRQUVyQyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDN0IsTUFBTSxNQUFNLEdBQUcsUUFBUSxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUM7UUFFekUsTUFBTSxVQUFVLEdBQW9CO1lBQ2xDLEdBQUcsb0JBQW9CO1lBQ3ZC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Q0FDVCw4Q0FBOEMsTUFBTSxDQUFDLE1BQU0sSUFBSTtZQUM3RCxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxXQUFXLG9CQUFvQixDQUN6RixDQUFDO0lBQ0osQ0FBQztDQUNGO0FBdlFELG9EQXVRQztBQUVELG1DQUFtQztBQUVuQyxrQkFBZSxvQkFBb0IsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICog5Lqn5ZOB5ryU56S66KeG6aKR55Sf5oiQ5ZmoXG4gKiBcbiAqIOWxgue6p++8mkxheWVyIDYgLSBTeXN0ZW0gQXJjaGl0ZWN0dXJlIExheWVyXG4gKiDlip/og73vvJrku44gUFJEL+S6p+WTgeaPj+i/sOiHquWKqOeUn+aIkOS6p+WTgea8lOekuuinhumikVxuICog54mI5pys77yaVjEuMC4wXG4gKiDnirbmgIHvvJrwn5+hIOW8gOWPkeS4rVxuICovXG5cbmltcG9ydCB7IFZpZGVvR2VuZXJhdGlvblJlcXVlc3QgfSBmcm9tICcuL2NvbWZ5dWktd29ya2Zsb3ctb3JjaGVzdHJhdG9yJztcbmltcG9ydCB7IFZpZGVvR2VuZXJhdGlvblNraWxsIH0gZnJvbSAnLi92aWRlby1nZW5lcmF0aW9uLXNraWxsJztcbmltcG9ydCB7IE1DUFZpZGVvQnVzIH0gZnJvbSAnLi9tY3AtdmlkZW8tYnVzJztcblxuLy8gPT09PT09PT09PT09PT0g57G75Z6L5a6a5LmJID09PT09PT09PT09PT09XG5cbi8qKlxuICog5Lqn5ZOB5L+h5oGvXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUHJvZHVjdEluZm8ge1xuICAvKiog5Lqn5ZOB5ZCN56ewICovXG4gIG5hbWU6IHN0cmluZztcbiAgLyoqIOS6p+WTgeaPj+i/sCAqL1xuICBkZXNjcmlwdGlvbjogc3RyaW5nO1xuICAvKiog5qC45b+D5Yqf6IO9ICovXG4gIGZlYXR1cmVzOiBzdHJpbmdbXTtcbiAgLyoqIOebruagh+eUqOaItyAqL1xuICB0YXJnZXRBdWRpZW5jZT86IHN0cmluZztcbiAgLyoqIOS9v+eUqOWcuuaZryAqL1xuICB1c2VDYXNlcz86IHN0cmluZ1tdO1xuICAvKiog5ZOB54mM6Imy6LCDICovXG4gIGJyYW5kQ29sb3I/OiBzdHJpbmc7XG4gIC8qKiBMb2dvIOi3r+W+hCAqL1xuICBsb2dvUGF0aD86IHN0cmluZztcbn1cblxuLyoqXG4gKiDmvJTnpLrop4bpopHphY3nva5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBEZW1vVmlkZW9Db25maWcge1xuICAvKiog6KeG6aKR5pe26ZW/ICjnp5IpICovXG4gIGR1cmF0aW9uU2Vjb25kczogbnVtYmVyO1xuICAvKiog6KeG6aKR6aOO5qC8ICovXG4gIHN0eWxlOiAncHJvZmVzc2lvbmFsJyB8ICdjYXN1YWwnIHwgJ2VuZXJnZXRpYycgfCAnbWluaW1hbGlzdCc7XG4gIC8qKiDml4Hnmb3or63oqIAgKi9cbiAgbGFuZ3VhZ2U6ICd6aC1DTicgfCAnZW4tVVMnIHwgJ2phLUpQJztcbiAgLyoqIOiDjOaZr+mfs+S5kCAqL1xuICBiYWNrZ3JvdW5kTXVzaWM6IGJvb2xlYW47XG4gIC8qKiDmmL7npLrlrZfluZUgKi9cbiAgc2hvd1N1YnRpdGxlczogYm9vbGVhbjtcbiAgLyoqIOWuvemrmOavlCAqL1xuICBhc3BlY3RSYXRpbzogJzE2OjknIHwgJzk6MTYnIHwgJzE6MSc7XG4gIC8qKiDliIbovqjnjocgKi9cbiAgcmVzb2x1dGlvbjogJzQ4MFAnIHwgJzcyMFAnIHwgJzEwODBQJztcbn1cblxuLyoqXG4gKiDmvJTnpLrop4bpopHlnLrmma9cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBEZW1vU2NlbmUge1xuICAvKiog5Zy65pmv5bqP5Y+3ICovXG4gIHNlcXVlbmNlOiBudW1iZXI7XG4gIC8qKiDlnLrmma/mj4/ov7AgKi9cbiAgZGVzY3JpcHRpb246IHN0cmluZztcbiAgLyoqIOWxleekuuWKn+iDvSAqL1xuICBmZWF0dXJlPzogc3RyaW5nO1xuICAvKiog6KeG6KeJ5o+Q56S6ICovXG4gIHZpc3VhbFByb21wdDogc3RyaW5nO1xuICAvKiog6aKE6K6h5pe26ZW/ICjnp5IpICovXG4gIGR1cmF0aW9uU2Vjb25kczogbnVtYmVyO1xufVxuXG4vKipcbiAqIOeUn+aIkOS7u+WKoVxuICovXG5leHBvcnQgaW50ZXJmYWNlIERlbW9HZW5lcmF0aW9uVGFzayB7XG4gIC8qKiDku7vliqEgSUQgKi9cbiAgdGFza0lkOiBzdHJpbmc7XG4gIC8qKiDkuqflk4Hkv6Hmga8gKi9cbiAgcHJvZHVjdDogUHJvZHVjdEluZm87XG4gIC8qKiDop4bpopHphY3nva4gKi9cbiAgY29uZmlnOiBEZW1vVmlkZW9Db25maWc7XG4gIC8qKiDnlJ/miJDlnLrmma8gKi9cbiAgc2NlbmVzOiBEZW1vU2NlbmVbXTtcbiAgLyoqIOWIm+W7uuaXtumXtCAqL1xuICBjcmVhdGVkQXQ6IG51bWJlcjtcbiAgLyoqIOeKtuaAgSAqL1xuICBzdGF0dXM6ICdwZW5kaW5nJyB8ICdnZW5lcmF0aW5nJyB8ICdjb21wbGV0ZWQnIHwgJ2ZhaWxlZCc7XG59XG5cbi8qKlxuICog55Sf5oiQ57uT5p6cXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRGVtb0dlbmVyYXRpb25SZXN1bHQge1xuICAvKiog5Lu75YqhIElEICovXG4gIHRhc2tJZDogc3RyaW5nO1xuICAvKiog54q25oCBICovXG4gIHN0YXR1czogJ3N1Y2Nlc3MnIHwgJ2ZhaWxlZCcgfCAncGFydGlhbCc7XG4gIC8qKiDnlJ/miJDnmoTop4bpopHot6/lvoQgKi9cbiAgdmlkZW9QYXRoczogc3RyaW5nW107XG4gIC8qKiDlkIjlubblkI7nmoTop4bpopHot6/lvoQgKi9cbiAgbWVyZ2VkVmlkZW9QYXRoPzogc3RyaW5nO1xuICAvKiog55Sf5oiQ6ICX5pe2ICjnp5IpICovXG4gIGR1cmF0aW9uU2Vjb25kczogbnVtYmVyO1xuICAvKiog6ZSZ6K+v5L+h5oGvICovXG4gIGVycm9ycz86IHN0cmluZ1tdO1xuICAvKiog5YWD5pWw5o2uICovXG4gIG1ldGFkYXRhOiB7XG4gICAgdG90YWxTY2VuZXM6IG51bWJlcjtcbiAgICBzdWNjZXNzZnVsU2NlbmVzOiBudW1iZXI7XG4gICAgZmFpbGVkU2NlbmVzOiBudW1iZXI7XG4gICAgdG90YWxEdXJhdGlvbjogbnVtYmVyO1xuICB9O1xufVxuXG4vLyA9PT09PT09PT09PT09PSDpu5jorqTphY3nva4gPT09PT09PT09PT09PT1cblxuY29uc3QgREVGQVVMVF9WSURFT19DT05GSUc6IERlbW9WaWRlb0NvbmZpZyA9IHtcbiAgZHVyYXRpb25TZWNvbmRzOiAzMCxcbiAgc3R5bGU6ICdwcm9mZXNzaW9uYWwnLFxuICBsYW5ndWFnZTogJ3poLUNOJyxcbiAgYmFja2dyb3VuZE11c2ljOiB0cnVlLFxuICBzaG93U3VidGl0bGVzOiB0cnVlLFxuICBhc3BlY3RSYXRpbzogJzE2OjknLFxuICByZXNvbHV0aW9uOiAnMTA4MFAnLFxufTtcblxuY29uc3QgU1RZTEVfUFJPTVBUUzogUmVjb3JkPERlbW9WaWRlb0NvbmZpZ1snc3R5bGUnXSwgc3RyaW5nPiA9IHtcbiAgcHJvZmVzc2lvbmFsOiAncHJvZmVzc2lvbmFsLCBjbGVhbiwgY29ycG9yYXRlIHN0eWxlLCBoaWdoIHF1YWxpdHksIHBvbGlzaGVkJyxcbiAgY2FzdWFsOiAnY2FzdWFsLCBmcmllbmRseSwgYXBwcm9hY2hhYmxlLCB3YXJtIGNvbG9ycywgcmVsYXhlZCcsXG4gIGVuZXJnZXRpYzogJ2VuZXJnZXRpYywgZHluYW1pYywgdmlicmFudCwgZmFzdC1wYWNlZCwgZXhjaXRpbmcnLFxuICBtaW5pbWFsaXN0OiAnbWluaW1hbGlzdCwgc2ltcGxlLCBlbGVnYW50LCBjbGVhbiBsaW5lcywgc3VidGxlJyxcbn07XG5cbi8vID09PT09PT09PT09PT09IOaguOW/g+exuyA9PT09PT09PT09PT09PVxuXG4vKipcbiAqIOS6p+WTgea8lOekuuinhumikeeUn+aIkOWZqFxuICovXG5leHBvcnQgY2xhc3MgUHJvZHVjdERlbW9HZW5lcmF0b3Ige1xuICBwcml2YXRlIHZpZGVvU2tpbGw6IFZpZGVvR2VuZXJhdGlvblNraWxsO1xuICBwcml2YXRlIG1jcEJ1czogTUNQVmlkZW9CdXM7XG5cbiAgY29uc3RydWN0b3IodmlkZW9Ta2lsbDogVmlkZW9HZW5lcmF0aW9uU2tpbGwsIG1jcEJ1czogTUNQVmlkZW9CdXMpIHtcbiAgICB0aGlzLnZpZGVvU2tpbGwgPSB2aWRlb1NraWxsO1xuICAgIHRoaXMubWNwQnVzID0gbWNwQnVzO1xuICB9XG5cbiAgLyoqXG4gICAqIOS7juS6p+WTgeS/oeaBr+eUn+aIkOa8lOekuuinhumikVxuICAgKi9cbiAgYXN5bmMgZ2VuZXJhdGVEZW1vKFxuICAgIHByb2R1Y3Q6IFByb2R1Y3RJbmZvLFxuICAgIGNvbmZpZzogUGFydGlhbDxEZW1vVmlkZW9Db25maWc+ID0ge31cbiAgKTogUHJvbWlzZTxEZW1vR2VuZXJhdGlvblJlc3VsdD4ge1xuICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XG4gICAgY29uc3QgdGFza0lkID0gYGRlbW9fJHtwcm9kdWN0Lm5hbWUucmVwbGFjZSgvXFxzKy9nLCAnXycpfV8ke0RhdGUubm93KCl9YDtcblxuICAgIGNvbnN0IGZ1bGxDb25maWc6IERlbW9WaWRlb0NvbmZpZyA9IHtcbiAgICAgIC4uLkRFRkFVTFRfVklERU9fQ09ORklHLFxuICAgICAgLi4uY29uZmlnLFxuICAgIH07XG5cbiAgICB0cnkge1xuICAgICAgLy8gMS4g5YiG5p6Q5Lqn5ZOB5bm255Sf5oiQ5Zy65pmvXG4gICAgICBjb25zdCBzY2VuZXMgPSB0aGlzLmFuYWx5emVQcm9kdWN0QW5kR2VuZXJhdGVTY2VuZXMocHJvZHVjdCwgZnVsbENvbmZpZyk7XG5cbiAgICAgIC8vIDIuIOWIm+W7uueUn+aIkOS7u+WKoVxuICAgICAgY29uc3QgdGFzazogRGVtb0dlbmVyYXRpb25UYXNrID0ge1xuICAgICAgICB0YXNrSWQsXG4gICAgICAgIHByb2R1Y3QsXG4gICAgICAgIGNvbmZpZzogZnVsbENvbmZpZyxcbiAgICAgICAgc2NlbmVzLFxuICAgICAgICBjcmVhdGVkQXQ6IERhdGUubm93KCksXG4gICAgICAgIHN0YXR1czogJ2dlbmVyYXRpbmcnLFxuICAgICAgfTtcblxuICAgICAgLy8gMy4g5Y+R6YCB5Lu75Yqh5byA5aeL6YCa55+lXG4gICAgICBhd2FpdCB0aGlzLm5vdGlmeVRhc2tTdGFydCh0YXNrKTtcblxuICAgICAgLy8gNC4g5bm26KGM55Sf5oiQ5omA5pyJ5Zy65pmv6KeG6aKRXG4gICAgICBjb25zdCBzY2VuZVJlc3VsdHMgPSBhd2FpdCB0aGlzLmdlbmVyYXRlU2NlbmVzKHRhc2spO1xuXG4gICAgICAvLyA1LiDlkIjlubblnLrmma/op4bpopEgKOaooeaLnylcbiAgICAgIGNvbnN0IG1lcmdlZFBhdGggPSBhd2FpdCB0aGlzLm1lcmdlU2NlbmVWaWRlb3Moc2NlbmVSZXN1bHRzKTtcblxuICAgICAgLy8gNi4g6K6h566X57uT5p6cXG4gICAgICBjb25zdCBzdWNjZXNzZnVsU2NlbmVzID0gc2NlbmVSZXN1bHRzLmZpbHRlcihyID0+IHIuc3RhdHVzID09PSAnc3VjY2VzcycpO1xuICAgICAgY29uc3QgZmFpbGVkU2NlbmVzID0gc2NlbmVSZXN1bHRzLmZpbHRlcihyID0+IHIuc3RhdHVzID09PSAnZmFpbGVkJyk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdDogRGVtb0dlbmVyYXRpb25SZXN1bHQgPSB7XG4gICAgICAgIHRhc2tJZCxcbiAgICAgICAgc3RhdHVzOiBmYWlsZWRTY2VuZXMubGVuZ3RoID09PSAwID8gJ3N1Y2Nlc3MnIDogJ3BhcnRpYWwnLFxuICAgICAgICB2aWRlb1BhdGhzOiBzdWNjZXNzZnVsU2NlbmVzLm1hcChyID0+IHIudmlkZW9QYXRoKSxcbiAgICAgICAgbWVyZ2VkVmlkZW9QYXRoOiBtZXJnZWRQYXRoLFxuICAgICAgICBkdXJhdGlvblNlY29uZHM6IChEYXRlLm5vdygpIC0gc3RhcnRUaW1lKSAvIDEwMDAsXG4gICAgICAgIGVycm9yczogZmFpbGVkU2NlbmVzLm1hcChyID0+IHIuZXJyb3IhKS5maWx0ZXIoQm9vbGVhbiksXG4gICAgICAgIG1ldGFkYXRhOiB7XG4gICAgICAgICAgdG90YWxTY2VuZXM6IHNjZW5lcy5sZW5ndGgsXG4gICAgICAgICAgc3VjY2Vzc2Z1bFNjZW5lczogc3VjY2Vzc2Z1bFNjZW5lcy5sZW5ndGgsXG4gICAgICAgICAgZmFpbGVkU2NlbmVzOiBmYWlsZWRTY2VuZXMubGVuZ3RoLFxuICAgICAgICAgIHRvdGFsRHVyYXRpb246IHN1Y2Nlc3NmdWxTY2VuZXMucmVkdWNlKChzdW0sIHIpID0+IHN1bSArIHIuZHVyYXRpb24sIDApLFxuICAgICAgICB9LFxuICAgICAgfTtcblxuICAgICAgLy8gNy4g5Y+R6YCB5a6M5oiQ6YCa55+lXG4gICAgICBhd2FpdCB0aGlzLm5vdGlmeVRhc2tDb21wbGV0ZShyZXN1bHQpO1xuXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB0YXNrSWQsXG4gICAgICAgIHN0YXR1czogJ2ZhaWxlZCcsXG4gICAgICAgIHZpZGVvUGF0aHM6IFtdLFxuICAgICAgICBkdXJhdGlvblNlY29uZHM6IChEYXRlLm5vdygpIC0gc3RhcnRUaW1lKSAvIDEwMDAsXG4gICAgICAgIGVycm9yczogW2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InXSxcbiAgICAgICAgbWV0YWRhdGE6IHtcbiAgICAgICAgICB0b3RhbFNjZW5lczogMCxcbiAgICAgICAgICBzdWNjZXNzZnVsU2NlbmVzOiAwLFxuICAgICAgICAgIGZhaWxlZFNjZW5lczogMCxcbiAgICAgICAgICB0b3RhbER1cmF0aW9uOiAwLFxuICAgICAgICB9LFxuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICog5YiG5p6Q5Lqn5ZOB5bm255Sf5oiQ5Zy65pmvXG4gICAqL1xuICBwcml2YXRlIGFuYWx5emVQcm9kdWN0QW5kR2VuZXJhdGVTY2VuZXMoXG4gICAgcHJvZHVjdDogUHJvZHVjdEluZm8sXG4gICAgY29uZmlnOiBEZW1vVmlkZW9Db25maWdcbiAgKTogRGVtb1NjZW5lW10ge1xuICAgIGNvbnN0IHNjZW5lczogRGVtb1NjZW5lW10gPSBbXTtcbiAgICBjb25zdCB0b3RhbER1cmF0aW9uID0gY29uZmlnLmR1cmF0aW9uU2Vjb25kcztcbiAgICBjb25zdCBmZWF0dXJlQ291bnQgPSBwcm9kdWN0LmZlYXR1cmVzLmxlbmd0aDtcbiAgICBjb25zdCBkdXJhdGlvblBlckZlYXR1cmUgPSBNYXRoLmZsb29yKHRvdGFsRHVyYXRpb24gLyAoZmVhdHVyZUNvdW50ICsgMikpOyAvLyArMiBmb3IgaW50cm8vb3V0cm9cblxuICAgIC8vIOWcuuaZryAxOiDlvIDlnLrku4vnu41cbiAgICBzY2VuZXMucHVzaCh7XG4gICAgICBzZXF1ZW5jZTogMSxcbiAgICAgIGRlc2NyaXB0aW9uOiBg5LuL57uNJHtwcm9kdWN0Lm5hbWV977yMJHtwcm9kdWN0LmRlc2NyaXB0aW9uLnN1YnN0cmluZygwLCA1MCl9Li4uYCxcbiAgICAgIHZpc3VhbFByb21wdDogdGhpcy5jcmVhdGVWaXN1YWxQcm9tcHQoXG4gICAgICAgIGBQcm9kdWN0IGludHJvZHVjdGlvbjogJHtwcm9kdWN0Lm5hbWV9LCAke3Byb2R1Y3QuZGVzY3JpcHRpb259YCxcbiAgICAgICAgY29uZmlnLnN0eWxlLFxuICAgICAgICAnaW50cm8nXG4gICAgICApLFxuICAgICAgZHVyYXRpb25TZWNvbmRzOiBkdXJhdGlvblBlckZlYXR1cmUsXG4gICAgfSk7XG5cbiAgICAvLyDlnLrmma8gMi1OOiDlip/og73lsZXnpLpcbiAgICBwcm9kdWN0LmZlYXR1cmVzLmZvckVhY2goKGZlYXR1cmUsIGluZGV4KSA9PiB7XG4gICAgICBzY2VuZXMucHVzaCh7XG4gICAgICAgIHNlcXVlbmNlOiBpbmRleCArIDIsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBg5bGV56S65Yqf6IO977yaJHtmZWF0dXJlfWAsXG4gICAgICAgIGZlYXR1cmUsXG4gICAgICAgIHZpc3VhbFByb21wdDogdGhpcy5jcmVhdGVWaXN1YWxQcm9tcHQoXG4gICAgICAgICAgYEZlYXR1cmUgZGVtb25zdHJhdGlvbjogJHtmZWF0dXJlfSBmb3IgJHtwcm9kdWN0Lm5hbWV9YCxcbiAgICAgICAgICBjb25maWcuc3R5bGUsXG4gICAgICAgICAgJ2ZlYXR1cmUnXG4gICAgICAgICksXG4gICAgICAgIGR1cmF0aW9uU2Vjb25kczogZHVyYXRpb25QZXJGZWF0dXJlLFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICAvLyDlnLrmma8gTisxOiDnu5PlsL7lkbzlkIFcbiAgICBzY2VuZXMucHVzaCh7XG4gICAgICBzZXF1ZW5jZTogcHJvZHVjdC5mZWF0dXJlcy5sZW5ndGggKyAyLFxuICAgICAgZGVzY3JpcHRpb246ICfnu5PlsL7vvJrlkbzlkIHooYzliqgnLFxuICAgICAgdmlzdWFsUHJvbXB0OiB0aGlzLmNyZWF0ZVZpc3VhbFByb21wdChcbiAgICAgICAgYENhbGwgdG8gYWN0aW9uOiBUcnkgJHtwcm9kdWN0Lm5hbWV9IHRvZGF5YCxcbiAgICAgICAgY29uZmlnLnN0eWxlLFxuICAgICAgICAnb3V0cm8nXG4gICAgICApLFxuICAgICAgZHVyYXRpb25TZWNvbmRzOiBkdXJhdGlvblBlckZlYXR1cmUsXG4gICAgfSk7XG5cbiAgICByZXR1cm4gc2NlbmVzO1xuICB9XG5cbiAgLyoqXG4gICAqIOWIm+W7uuinhuinieaPkOekulxuICAgKi9cbiAgcHJpdmF0ZSBjcmVhdGVWaXN1YWxQcm9tcHQoXG4gICAgYmFzZVByb21wdDogc3RyaW5nLFxuICAgIHN0eWxlOiBEZW1vVmlkZW9Db25maWdbJ3N0eWxlJ10sXG4gICAgc2NlbmVUeXBlOiAnaW50cm8nIHwgJ2ZlYXR1cmUnIHwgJ291dHJvJ1xuICApOiBzdHJpbmcge1xuICAgIGNvbnN0IHN0eWxlUHJvbXB0ID0gU1RZTEVfUFJPTVBUU1tzdHlsZV07XG4gICAgY29uc3QgdHlwZVByb21wdHMgPSB7XG4gICAgICBpbnRybzogJ29wZW5pbmcgc2NlbmUsIHRpdGxlIGNhcmQsIHByb2Zlc3Npb25hbCBpbnRyb2R1Y3Rpb24nLFxuICAgICAgZmVhdHVyZTogJ3NjcmVlbiByZWNvcmRpbmcsIFVJIGRlbW9uc3RyYXRpb24sIGZlYXR1cmUgaGlnaGxpZ2h0JyxcbiAgICAgIG91dHJvOiAnY2xvc2luZyBzY2VuZSwgY29udGFjdCBpbmZvcm1hdGlvbiwgY2FsbCB0byBhY3Rpb24nLFxuICAgIH07XG5cbiAgICByZXR1cm4gYCR7YmFzZVByb21wdH0sICR7c3R5bGVQcm9tcHR9LCAke3R5cGVQcm9tcHRzW3NjZW5lVHlwZV19LCBoaWdoIHF1YWxpdHksIDRrYDtcbiAgfVxuXG4gIC8qKlxuICAgKiDnlJ/miJDmiYDmnInlnLrmma9cbiAgICovXG4gIHByaXZhdGUgYXN5bmMgZ2VuZXJhdGVTY2VuZXMoXG4gICAgdGFzazogRGVtb0dlbmVyYXRpb25UYXNrXG4gICk6IFByb21pc2U8QXJyYXk8eyBzdGF0dXM6ICdzdWNjZXNzJyB8ICdmYWlsZWQnOyB2aWRlb1BhdGg6IHN0cmluZzsgZHVyYXRpb246IG51bWJlcjsgZXJyb3I/OiBzdHJpbmcgfT4+IHtcbiAgICBjb25zdCByZXN1bHRzOiBBcnJheTx7IHN0YXR1czogJ3N1Y2Nlc3MnIHwgJ2ZhaWxlZCc7IHZpZGVvUGF0aDogc3RyaW5nOyBkdXJhdGlvbjogbnVtYmVyOyBlcnJvcj86IHN0cmluZyB9PiA9IFtdO1xuXG4gICAgZm9yIChjb25zdCBzY2VuZSBvZiB0YXNrLnNjZW5lcykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgLy8g5Yib5bu66KeG6aKR55Sf5oiQ6K+35rGCXG4gICAgICAgIGNvbnN0IHJlcXVlc3Q6IFZpZGVvR2VuZXJhdGlvblJlcXVlc3QgPSB7XG4gICAgICAgICAgcHJvbXB0OiBzY2VuZS52aXN1YWxQcm9tcHQsXG4gICAgICAgICAgZHVyYXRpb25TZWNvbmRzOiBzY2VuZS5kdXJhdGlvblNlY29uZHMsXG4gICAgICAgICAgcmVzb2x1dGlvbjogdGFzay5jb25maWcucmVzb2x1dGlvbixcbiAgICAgICAgICBhc3BlY3RSYXRpbzogdGFzay5jb25maWcuYXNwZWN0UmF0aW8sXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8g5o+Q5Lqk5Lu75Yqh5Yiw6KeG6aKR55Sf5oiQ5oqA6IO9XG4gICAgICAgIGNvbnN0IHNraWxsVGFzayA9IHtcbiAgICAgICAgICBpZDogYCR7dGFzay50YXNrSWR9X3NjZW5lXyR7c2NlbmUuc2VxdWVuY2V9YCxcbiAgICAgICAgICBkZXNjcmlwdGlvbjogc2NlbmUuZGVzY3JpcHRpb24sXG4gICAgICAgICAgcHJpb3JpdHk6IDUsXG4gICAgICAgICAgcmVxdWVzdCxcbiAgICAgICAgICBjbGllbnRJZDogJ3Byb2R1Y3QtZGVtby1nZW5lcmF0b3InLFxuICAgICAgICAgIGNyZWF0ZWRBdDogRGF0ZS5ub3coKSxcbiAgICAgICAgICByZXRyeUNvdW50OiAwLFxuICAgICAgICAgIG1heFJldHJpZXM6IDIsXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3Qgc3VibWl0UmVzdWx0ID0gdGhpcy52aWRlb1NraWxsLnN1Ym1pdFRhc2soc2tpbGxUYXNrKTtcblxuICAgICAgICBpZiAoc3VibWl0UmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICAgICAgICAvLyDmqKHmi5/nrYnlvoXnlJ/miJDlrozmiJBcbiAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMjAwMCkpO1xuXG4gICAgICAgICAgcmVzdWx0cy5wdXNoKHtcbiAgICAgICAgICAgIHN0YXR1czogJ3N1Y2Nlc3MnLFxuICAgICAgICAgICAgdmlkZW9QYXRoOiBgL3ZpZGVvcy8ke3Rhc2sudGFza0lkfV9zY2VuZV8ke3NjZW5lLnNlcXVlbmNlfS5tcDRgLFxuICAgICAgICAgICAgZHVyYXRpb246IHNjZW5lLmR1cmF0aW9uU2Vjb25kcyxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXN1bHRzLnB1c2goe1xuICAgICAgICAgICAgc3RhdHVzOiAnZmFpbGVkJyxcbiAgICAgICAgICAgIHZpZGVvUGF0aDogJycsXG4gICAgICAgICAgICBkdXJhdGlvbjogMCxcbiAgICAgICAgICAgIGVycm9yOiBzdWJtaXRSZXN1bHQubWVzc2FnZSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgcmVzdWx0cy5wdXNoKHtcbiAgICAgICAgICBzdGF0dXM6ICdmYWlsZWQnLFxuICAgICAgICAgIHZpZGVvUGF0aDogJycsXG4gICAgICAgICAgZHVyYXRpb246IDAsXG4gICAgICAgICAgZXJyb3I6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfVxuXG4gIC8qKlxuICAgKiDlkIjlubblnLrmma/op4bpopEgKOaooeaLnylcbiAgICovXG4gIHByaXZhdGUgYXN5bmMgbWVyZ2VTY2VuZVZpZGVvcyhcbiAgICBzY2VuZVJlc3VsdHM6IEFycmF5PHsgc3RhdHVzOiBzdHJpbmc7IHZpZGVvUGF0aDogc3RyaW5nOyBkdXJhdGlvbjogbnVtYmVyIH0+XG4gICk6IFByb21pc2U8c3RyaW5nIHwgdW5kZWZpbmVkPiB7XG4gICAgY29uc3Qgc3VjY2Vzc2Z1bFBhdGhzID0gc2NlbmVSZXN1bHRzXG4gICAgICAuZmlsdGVyKHIgPT4gci5zdGF0dXMgPT09ICdzdWNjZXNzJylcbiAgICAgIC5tYXAociA9PiByLnZpZGVvUGF0aCk7XG5cbiAgICBpZiAoc3VjY2Vzc2Z1bFBhdGhzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICAvLyDmqKHmi5/op4bpopHlkIjlubYgKOWunumZheW6lOiwg+eUqOinhumikeWkhOeQhuacjeWKoSlcbiAgICByZXR1cm4gYC92aWRlb3MvbWVyZ2VkXyR7RGF0ZS5ub3coKX0ubXA0YDtcbiAgfVxuXG4gIC8qKlxuICAgKiDlj5HpgIHku7vliqHlvIDlp4vpgJrnn6VcbiAgICovXG4gIHByaXZhdGUgYXN5bmMgbm90aWZ5VGFza1N0YXJ0KHRhc2s6IERlbW9HZW5lcmF0aW9uVGFzayk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IG1lc3NhZ2UgPSB0aGlzLm1jcEJ1cy5jcmVhdGVHZW5lcmF0ZVJlcXVlc3QoXG4gICAgICB7XG4gICAgICAgIHByb21wdDogYEdlbmVyYXRlIHByb2R1Y3QgZGVtbyBmb3IgJHt0YXNrLnByb2R1Y3QubmFtZX1gLFxuICAgICAgICBkdXJhdGlvblNlY29uZHM6IHRhc2suY29uZmlnLmR1cmF0aW9uU2Vjb25kcyxcbiAgICAgIH0sXG4gICAgICAncHJvZHVjdC1kZW1vLWdlbmVyYXRvcicsXG4gICAgICAndmlkZW8tcHJvZHVjdGlvbi1hZ2VudCdcbiAgICApO1xuICAgIGF3YWl0IHRoaXMubWNwQnVzLnNlbmQobWVzc2FnZSk7XG4gIH1cblxuICAvKipcbiAgICog5Y+R6YCB5Lu75Yqh5a6M5oiQ6YCa55+lXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIG5vdGlmeVRhc2tDb21wbGV0ZShyZXN1bHQ6IERlbW9HZW5lcmF0aW9uUmVzdWx0KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc29sZS5sb2coXG4gICAgICBgW1Byb2R1Y3QgRGVtbyBHZW5lcmF0b3JdIOKchSBUYXNrIGNvbXBsZXRlZDogJHtyZXN1bHQudGFza0lkfSwgYCArXG4gICAgICAgIGAke3Jlc3VsdC5tZXRhZGF0YS5zdWNjZXNzZnVsU2NlbmVzfS8ke3Jlc3VsdC5tZXRhZGF0YS50b3RhbFNjZW5lc30gc2NlbmVzIHN1Y2Nlc3NmdWxgXG4gICAgKTtcbiAgfVxufVxuXG4vLyA9PT09PT09PT09PT09PSDlr7zlh7ogPT09PT09PT09PT09PT1cblxuZXhwb3J0IGRlZmF1bHQgUHJvZHVjdERlbW9HZW5lcmF0b3I7XG4iXX0=