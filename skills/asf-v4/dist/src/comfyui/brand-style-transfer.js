"use strict";
/**
 * 品牌风格迁移引擎
 *
 * 层级：Layer 6 - System Architecture Layer
 * 功能：将品牌视觉风格应用到生成的视频
 * 版本：V1.0.0
 * 状态：🟡 开发中
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrandStyleTransferEngine = void 0;
// ============== 默认配置 ==============
const DEFAULT_BRAND_STYLES = {
    tech: {
        brandId: 'tech',
        brandName: '科技感',
        primaryColor: '#0066FF',
        secondaryColors: ['#00D4FF', '#7B61FF', '#1A1A2E'],
        fonts: {
            heading: 'Inter',
            body: 'Roboto',
        },
        styleKeywords: ['modern', 'sleek', 'futuristic', 'clean', 'minimal'],
        visualGuidelines: {
            minWhitespace: '24px',
            cornerRadius: '8px',
            shadowIntensity: 'light',
            animationStyle: 'moderate',
        },
        forbiddenElements: ['comic sans', 'neon colors', 'excessive gradients'],
    },
    luxury: {
        brandId: 'luxury',
        brandName: '奢华感',
        primaryColor: '#D4AF37',
        secondaryColors: ['#1A1A1A', '#FFFFFF', '#8B7355'],
        fonts: {
            heading: 'Playfair Display',
            body: 'Lato',
        },
        styleKeywords: ['elegant', 'sophisticated', 'premium', 'refined', 'timeless'],
        visualGuidelines: {
            minWhitespace: '48px',
            cornerRadius: '4px',
            shadowIntensity: 'medium',
            animationStyle: 'subtle',
        },
        forbiddenElements: ['bright colors', 'cartoon effects', 'casual fonts'],
    },
    playful: {
        brandId: 'playful',
        brandName: '活泼感',
        primaryColor: '#FF6B6B',
        secondaryColors: ['#4ECDC4', '#FFE66D', '#95E1D3'],
        fonts: {
            heading: 'Fredoka One',
            body: 'Open Sans',
        },
        styleKeywords: ['fun', 'colorful', 'energetic', 'friendly', 'vibrant'],
        visualGuidelines: {
            minWhitespace: '16px',
            cornerRadius: '16px',
            shadowIntensity: 'medium',
            animationStyle: 'bold',
        },
        forbiddenElements: ['dark themes', 'serious tone', 'rigid layouts'],
    },
};
// ============== 核心类 ==============
/**
 * 品牌风格迁移引擎
 */
class BrandStyleTransferEngine {
    constructor(videoSkill) {
        this.videoSkill = videoSkill;
        this.brandStyles = new Map(Object.entries(DEFAULT_BRAND_STYLES));
    }
    /**
     * 注册品牌风格
     */
    registerBrand(brand) {
        this.brandStyles.set(brand.brandId, brand);
    }
    /**
     * 获取品牌风格
     */
    getBrand(brandId) {
        return this.brandStyles.get(brandId);
    }
    /**
     * 执行风格迁移
     */
    async transferStyle(config) {
        const startTime = Date.now();
        const taskId = `style_transfer_${config.sourceVideoPath.split('/').pop()}_${Date.now()}`;
        try {
            // 1. 验证品牌风格
            if (!this.brandStyles.has(config.targetBrand.brandId)) {
                throw new Error(`Unknown brand: ${config.targetBrand.brandId}`);
            }
            // 2. 验证迁移强度
            if (config.transferStrength < 0 || config.transferStrength > 1) {
                throw new Error('Transfer strength must be between 0 and 1');
            }
            // 3. 生成风格迁移提示
            const transferPrompt = this.createTransferPrompt(config);
            // 4. 创建视频生成请求 (使用参考视频)
            const request = {
                prompt: transferPrompt,
                video: config.sourceVideoPath, // 使用源视频作为参考
                durationSeconds: 30, // 实际应从源视频获取
                resolution: config.outputResolution,
                aspectRatio: '16:9',
            };
            // 5. 提交生成任务
            const task = {
                id: taskId,
                description: `Apply ${config.targetBrand.brandName} style`,
                priority: 7,
                request,
                clientId: 'brand-style-transfer',
                createdAt: Date.now(),
                retryCount: 0,
                maxRetries: 2,
            };
            const submitResult = this.videoSkill.submitTask(task);
            if (!submitResult.success) {
                throw new Error(submitResult.message);
            }
            // 6. 模拟等待生成完成
            await new Promise(resolve => setTimeout(resolve, 3000));
            // 7. 构建结果
            const result = {
                taskId,
                status: 'success',
                outputVideoPath: `/videos/styled_${taskId}.mp4`,
                thumbnailPath: `/thumbnails/styled_${taskId}.jpg`,
                durationSeconds: (Date.now() - startTime) / 1000,
                appliedStyle: {
                    colorGrading: config.colorCorrection,
                    logoAdded: config.addLogo,
                    watermarkAdded: config.addWatermark,
                    fontApplied: true,
                },
            };
            return result;
        }
        catch (error) {
            return {
                taskId,
                status: 'failed',
                outputVideoPath: undefined,
                durationSeconds: (Date.now() - startTime) / 1000,
                error: error instanceof Error ? error.message : 'Unknown error',
                appliedStyle: {
                    colorGrading: false,
                    logoAdded: false,
                    watermarkAdded: false,
                    fontApplied: false,
                },
            };
        }
    }
    /**
     * 批量应用品牌风格到多个视频
     */
    async batchTransferStyle(videoPaths, brand, config = {}) {
        const results = [];
        for (const videoPath of videoPaths) {
            const result = await this.transferStyle({
                sourceVideoPath: videoPath,
                targetBrand: brand,
                transferStrength: 0.8,
                preserveContent: true,
                addWatermark: true,
                addLogo: true,
                colorCorrection: true,
                outputResolution: '1080P',
                ...config,
            });
            results.push(result);
        }
        return results;
    }
    /**
     * 验证视频是否符合品牌规范
     */
    validateBrandCompliance(videoPath, brand) {
        const issues = [];
        // 模拟品牌合规检查
        // 实际应使用计算机视觉 API 检测
        // 检查禁用元素
        brand.forbiddenElements.forEach(element => {
            // 模拟检查
            if (Math.random() < 0.1) {
                issues.push(`Detected forbidden element: ${element}`);
            }
        });
        // 检查主色调使用
        // 模拟：假设检查通过
        const primaryColorUsage = Math.random();
        if (primaryColorUsage < 0.3) {
            issues.push('Primary color usage below recommended threshold');
        }
        return {
            compliant: issues.length === 0,
            issues,
        };
    }
    /**
     * 生成品牌风格指南
     */
    generateStyleGuide(brand) {
        let guide = `# ${brand.brandName} 品牌风格指南\n\n`;
        guide += `## 品牌色彩\n\n`;
        guide += `- **主色调**: ${brand.primaryColor}\n`;
        guide += `- **辅助色**: ${brand.secondaryColors.join(', ')}\n\n`;
        guide += `## 品牌字体\n\n`;
        guide += `- **标题**: ${brand.fonts.heading || 'N/A'}\n`;
        guide += `- **正文**: ${brand.fonts.body || 'N/A'}\n\n`;
        guide += `## 风格关键词\n\n`;
        guide += brand.styleKeywords.map(k => `- ${k}`).join('\n');
        guide += '\n\n';
        guide += `## 视觉规范\n\n`;
        guide += `- **最小留白**: ${brand.visualGuidelines.minWhitespace}\n`;
        guide += `- **圆角大小**: ${brand.visualGuidelines.cornerRadius}\n`;
        guide += `- **阴影强度**: ${brand.visualGuidelines.shadowIntensity}\n`;
        guide += `- **动画风格**: ${brand.visualGuidelines.animationStyle}\n\n`;
        guide += `## 禁用元素\n\n`;
        guide += brand.forbiddenElements.map(e => `- ❌ ${e}`).join('\n');
        return guide;
    }
    /**
     * 创建风格迁移提示
     */
    createTransferPrompt(config) {
        const brand = config.targetBrand;
        const styleKeywords = brand.styleKeywords.join(', ');
        let prompt = `Apply ${brand.brandName} brand style to video. `;
        prompt += `Style: ${styleKeywords}. `;
        prompt += `Primary color: ${brand.primaryColor}. `;
        if (config.addLogo && brand.logoPath) {
            prompt += `Add logo overlay. `;
        }
        if (config.addWatermark) {
            prompt += `Add subtle watermark. `;
        }
        if (config.colorCorrection) {
            prompt += `Color grade to match brand palette. `;
        }
        if (config.preserveContent) {
            prompt += `Preserve original content and composition. `;
        }
        prompt += `Transfer strength: ${config.transferStrength * 100}%. `;
        prompt += `Professional quality, high fidelity.`;
        return prompt;
    }
}
exports.BrandStyleTransferEngine = BrandStyleTransferEngine;
// ============== 导出 ==============
exports.default = BrandStyleTransferEngine;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJhbmQtc3R5bGUtdHJhbnNmZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvY29tZnl1aS9icmFuZC1zdHlsZS10cmFuc2Zlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7R0FPRzs7O0FBMEZILHFDQUFxQztBQUVyQyxNQUFNLG9CQUFvQixHQUErQjtJQUN2RCxJQUFJLEVBQUU7UUFDSixPQUFPLEVBQUUsTUFBTTtRQUNmLFNBQVMsRUFBRSxLQUFLO1FBQ2hCLFlBQVksRUFBRSxTQUFTO1FBQ3ZCLGVBQWUsRUFBRSxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDO1FBQ2xELEtBQUssRUFBRTtZQUNMLE9BQU8sRUFBRSxPQUFPO1lBQ2hCLElBQUksRUFBRSxRQUFRO1NBQ2Y7UUFDRCxhQUFhLEVBQUUsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxPQUFPLEVBQUUsU0FBUyxDQUFDO1FBQ3BFLGdCQUFnQixFQUFFO1lBQ2hCLGFBQWEsRUFBRSxNQUFNO1lBQ3JCLFlBQVksRUFBRSxLQUFLO1lBQ25CLGVBQWUsRUFBRSxPQUFPO1lBQ3hCLGNBQWMsRUFBRSxVQUFVO1NBQzNCO1FBQ0QsaUJBQWlCLEVBQUUsQ0FBQyxZQUFZLEVBQUUsYUFBYSxFQUFFLHFCQUFxQixDQUFDO0tBQ3hFO0lBQ0QsTUFBTSxFQUFFO1FBQ04sT0FBTyxFQUFFLFFBQVE7UUFDakIsU0FBUyxFQUFFLEtBQUs7UUFDaEIsWUFBWSxFQUFFLFNBQVM7UUFDdkIsZUFBZSxFQUFFLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLENBQUM7UUFDbEQsS0FBSyxFQUFFO1lBQ0wsT0FBTyxFQUFFLGtCQUFrQjtZQUMzQixJQUFJLEVBQUUsTUFBTTtTQUNiO1FBQ0QsYUFBYSxFQUFFLENBQUMsU0FBUyxFQUFFLGVBQWUsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFVBQVUsQ0FBQztRQUM3RSxnQkFB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QyxPQUFPLElBQUksS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3JDLE1BQU0sSUFBSSxvQkFBb0IsQ0FBQztRQUNqQyxDQUFDO1FBRUQsSUFBSSxNQUFNLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDeEIsTUFBTSxJQUFJLHdCQUF3QixDQUFDO1FBQ3JDLENBQUM7UUFFRCxJQUFJLE1BQU0sQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUMzQixNQUFNLElBQUksc0NBQXNDLENBQUM7UUFDbkQsQ0FBQztRQUVELElBQUksTUFBTSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQzNCLE1BQU0sSUFBSSw2Q0FBNkMsQ0FBQztRQUMxRCxDQUFDO1FBRUQsTUFBTSxJQUFJLHNCQUFzQixNQUFNLENBQUMsZ0JBQWdCLEdBQUcsR0FBRyxLQUFLLENBQUM7UUFDbkUsTUFBTSxJQUFJLHNDQUFzQyxDQUFDO1FBRWpELE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUM7Q0FDRjtBQXhPRCw0REF3T0M7QUFFRCxtQ0FBbUM7QUFFbkMsa0JBQWUsd0JBQXdCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIOWTgeeJjOmjjuagvOi/geenu+W8leaTjlxuICogXG4gKiDlsYLnuqfvvJpMYXllciA2IC0gU3lzdGVtIEFyY2hpdGVjdHVyZSBMYXllclxuICog5Yqf6IO977ya5bCG5ZOB54mM6KeG6KeJ6aOO5qC85bqU55So5Yiw55Sf5oiQ55qE6KeG6aKRXG4gKiDniYjmnKzvvJpWMS4wLjBcbiAqIOeKtuaAge+8mvCfn6Eg5byA5Y+R5LitXG4gKi9cblxuaW1wb3J0IHsgVmlkZW9HZW5lcmF0aW9uUmVxdWVzdCB9IGZyb20gJy4vY29tZnl1aS13b3JrZmxvdy1vcmNoZXN0cmF0b3InO1xuaW1wb3J0IHsgVmlkZW9HZW5lcmF0aW9uU2tpbGwgfSBmcm9tICcuL3ZpZGVvLWdlbmVyYXRpb24tc2tpbGwnO1xuXG4vLyA9PT09PT09PT09PT09PSDnsbvlnovlrprkuYkgPT09PT09PT09PT09PT1cblxuLyoqXG4gKiDlk4HniYzpo47moLzlrprkuYlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBCcmFuZFN0eWxlIHtcbiAgLyoqIOWTgeeJjCBJRCAqL1xuICBicmFuZElkOiBzdHJpbmc7XG4gIC8qKiDlk4HniYzlkI3np7AgKi9cbiAgYnJhbmROYW1lOiBzdHJpbmc7XG4gIC8qKiDkuLvoibLosIMgKi9cbiAgcHJpbWFyeUNvbG9yOiBzdHJpbmc7XG4gIC8qKiDovoXliqnoibLosIMgKi9cbiAgc2Vjb25kYXJ5Q29sb3JzOiBzdHJpbmdbXTtcbiAgLyoqIOWTgeeJjOWtl+S9kyAqL1xuICBmb250czoge1xuICAgIGhlYWRpbmc/OiBzdHJpbmc7XG4gICAgYm9keT86IHN0cmluZztcbiAgfTtcbiAgLyoqIExvZ28g6Lev5b6EICovXG4gIGxvZ29QYXRoPzogc3RyaW5nO1xuICAvKiog6aOO5qC85YWz6ZSu6K+NICovXG4gIHN0eWxlS2V5d29yZHM6IHN0cmluZ1tdO1xuICAvKiog6KeG6KeJ6KeE6IyDICovXG4gIHZpc3VhbEd1aWRlbGluZXM6IHtcbiAgICAvKiog5pyA5bCP55WZ55m9ICovXG4gICAgbWluV2hpdGVzcGFjZTogc3RyaW5nO1xuICAgIC8qKiDlnIbop5LlpKflsI8gKi9cbiAgICBjb3JuZXJSYWRpdXM6IHN0cmluZztcbiAgICAvKiog6Zi05b2x5by65bqmICovXG4gICAgc2hhZG93SW50ZW5zaXR5OiAnbm9uZScgfCAnbGlnaHQnIHwgJ21lZGl1bScgfCAnaGVhdnknO1xuICAgIC8qKiDliqjnlLvpo47moLwgKi9cbiAgICBhbmltYXRpb25TdHlsZTogJ3N1YnRsZScgfCAnbW9kZXJhdGUnIHwgJ2JvbGQnO1xuICB9O1xuICAvKiog56aB55So5YWD57SgICovXG4gIGZvcmJpZGRlbkVsZW1lbnRzOiBzdHJpbmdbXTtcbn1cblxuLyoqXG4gKiDpo47moLzov4Hnp7vphY3nva5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBTdHlsZVRyYW5zZmVyQ29uZmlnIHtcbiAgLyoqIOa6kOinhumikei3r+W+hCAqL1xuICBzb3VyY2VWaWRlb1BhdGg6IHN0cmluZztcbiAgLyoqIOebruagh+WTgeeJjOmjjuagvCAqL1xuICB0YXJnZXRCcmFuZDogQnJhbmRTdHlsZTtcbiAgLyoqIOi/geenu+W8uuW6piAoMC0xKSAqL1xuICB0cmFuc2ZlclN0cmVuZ3RoOiBudW1iZXI7XG4gIC8qKiDkv53mjIHlhoXlrrnlrozmlbTmgKcgKi9cbiAgcHJlc2VydmVDb250ZW50OiBib29sZWFuO1xuICAvKiog5re75Yqg5ZOB54mM5rC05Y2wICovXG4gIGFkZFdhdGVybWFyazogYm9vbGVhbjtcbiAgLyoqIOa3u+WKoCBMb2dvICovXG4gIGFkZExvZ286IGJvb2xlYW47XG4gIC8qKiDpopzoibLmoKHmraMgKi9cbiAgY29sb3JDb3JyZWN0aW9uOiBib29sZWFuO1xuICAvKiog6L6T5Ye65YiG6L6o546HICovXG4gIG91dHB1dFJlc29sdXRpb246ICc0ODBQJyB8ICc3MjBQJyB8ICcxMDgwUCc7XG59XG5cbi8qKlxuICog6aOO5qC86L+B56e757uT5p6cXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU3R5bGVUcmFuc2ZlclJlc3VsdCB7XG4gIC8qKiDku7vliqEgSUQgKi9cbiAgdGFza0lkOiBzdHJpbmc7XG4gIC8qKiDnirbmgIEgKi9cbiAgc3RhdHVzOiAnc3VjY2VzcycgfCAnZmFpbGVkJztcbiAgLyoqIOi+k+WHuuinhumikei3r+W+hCAqL1xuICBvdXRwdXRWaWRlb1BhdGg/OiBzdHJpbmc7XG4gIC8qKiDpooTop4jlm77ot6/lvoQgKi9cbiAgdGh1bWJuYWlsUGF0aD86IHN0cmluZztcbiAgLyoqIOeUn+aIkOiAl+aXtiAo56eSKSAqL1xuICBkdXJhdGlvblNlY29uZHM6IG51bWJlcjtcbiAgLyoqIOmUmeivr+S/oeaBryAqL1xuICBlcnJvcj86IHN0cmluZztcbiAgLyoqIOW6lOeUqOeahOmjjuagvCAqL1xuICBhcHBsaWVkU3R5bGU6IHtcbiAgICBjb2xvckdyYWRpbmc6IGJvb2xlYW47XG4gICAgbG9nb0FkZGVkOiBib29sZWFuO1xuICAgIHdhdGVybWFya0FkZGVkOiBib29sZWFuO1xuICAgIGZvbnRBcHBsaWVkOiBib29sZWFuO1xuICB9O1xufVxuXG4vLyA9PT09PT09PT09PT09PSDpu5jorqTphY3nva4gPT09PT09PT09PT09PT1cblxuY29uc3QgREVGQVVMVF9CUkFORF9TVFlMRVM6IFJlY29yZDxzdHJpbmcsIEJyYW5kU3R5bGU+ID0ge1xuICB0ZWNoOiB7XG4gICAgYnJhbmRJZDogJ3RlY2gnLFxuICAgIGJyYW5kTmFtZTogJ+enkeaKgOaEnycsXG4gICAgcHJpbWFyeUNvbG9yOiAnIzAwNjZGRicsXG4gICAgc2Vjb25kYXJ5Q29sb3JzOiBbJyMwMEQ0RkYnLCAnIzdCNjFGRicsICcjMUExQTJFJ10sXG4gICAgZm9udHM6IHtcbiAgICAgIGhlYWRpbmc6ICdJbnRlcicsXG4gICAgICBib2R5OiAnUm9ib3RvJyxcbiAgICB9LFxuICAgIHN0eWxlS2V5d29yZHM6IFsnbW9kZXJuJywgJ3NsZWVrJywgJ2Z1dHVyaXN0aWMnLCAnY2xlYW4nLCAnbWluaW1hbCddLFxuICAgIHZpc3VhbEd1aWRlbGluZXM6IHtcbiAgICAgIG1pbldoaXRlc3BhY2U6ICcyNHB4JyxcbiAgICAgIGNvcm5lclJhZGl1czogJzhweCcsXG4gICAgICBzaGFkb3dJbnRlbnNpdHk6ICdsaWdodCcsXG4gICAgICBhbmltYXRpb25TdHlsZTogJ21vZGVyYXRlJyxcbiAgICB9LFxuICAgIGZvcmJpZGRlbkVsZW1lbnRzOiBbJ2NvbWljIHNhbnMnLCAnbmVvbiBjb2xvcnMnLCAnZXhjZXNzaXZlIGdyYWRpZW50cyddLFxuICB9LFxuICBsdXh1cnk6IHtcbiAgICBicmFuZElkOiAnbHV4dXJ5JyxcbiAgICBicmFuZE5hbWU6ICflpaLljY7mhJ8nLFxuICAgIHByaW1hcnlDb2xvcjogJyNENEFGMzcnLFxuICAgIHNlY29uZGFyeUNvbG9yczogWycjMUExQTFBJywgJyNGRkZGRkYnLCAnIzhCNzM1NSddLFxuICAgIGZvbnRzOiB7XG4gICAgICBoZWFkaW5nOiAnUGxheWZhaXIgRGlzcGxheScsXG4gICAgICBib2R5OiAnTGF0bycsXG4gICAgfSxcbiAgICBzdHlsZUtleXdvcmRzOiBbJ2VsZWdhbnQnLCAnc29waGlzdGljYXRlZCcsICdwcmVtaXVtJywgJ3JlZmluZWQnLCAndGltZWxlc3MnXSxcbiAgICB2aXN1YWxHdWlkZWxpbmVzOiB7XG4gICAgICBtaW5XaGl0ZXNwYWNlOiAnNDhweCcsXG4gICAgICBjb3JuZXJSYWRpdXM6ICc0cHgnLFxuICAgICAgc2hhZG93SW50ZW5zaXR5OiAnbWVkaXVtJyxcbiAgICAgIGFuaW1hdGlvblN0eWxlOiAnc3VidGxlJyxcbiAgICB9LFxuICAgIGZvcmJpZGRlbkVsZW1lbnRzOiBbJ2JyaWdodCBjb2xvcnMnLCAnY2FydG9vbiBlZmZlY3RzJywgJ2Nhc3VhbCBmb250cyddLFxuICB9LFxuICBwbGF5ZnVsOiB7XG4gICAgYnJhbmRJZDogJ3BsYXlmdWwnLFxuICAgIGJyYW5kTmFtZTogJ+a0u+azvOaEnycsXG4gICAgcHJpbWFyeUNvbG9yOiAnI0ZGNkI2QicsXG4gICAgc2Vjb25kYXJ5Q29sb3JzOiBbJyM0RUNEQzQnLCAnI0ZGRTY2RCcsICcjOTVFMUQzJ10sXG4gICAgZm9udHM6IHtcbiAgICAgIGhlYWRpbmc6ICdGcmVkb2thIE9uZScsXG4gICAgICBib2R5OiAnT3BlbiBTYW5zJyxcbiAgICB9LFxuICAgIHN0eWxlS2V5d29yZHM6IFsnZnVuJywgJ2NvbG9yZnVsJywgJ2VuZXJnZXRpYycsICdmcmllbmRseScsICd2aWJyYW50J10sXG4gICAgdmlzdWFsR3VpZGVsaW5lczoge1xuICAgICAgbWluV2hpdGVzcGFjZTogJzE2cHgnLFxuICAgICAgY29ybmVyUmFkaXVzOiAnMTZweCcsXG4gICAgICBzaGFkb3dJbnRlbnNpdHk6ICdtZWRpdW0nLFxuICAgICAgYW5pbWF0aW9uU3R5bGU6ICdib2xkJyxcbiAgICB9LFxuICAgIGZvcmJpZGRlbkVsZW1lbnRzOiBbJ2RhcmsgdGhlbWVzJywgJ3NlcmlvdXMgdG9uZScsICdyaWdpZCBsYXlvdXRzJ10sXG4gIH0sXG59O1xuXG4vLyA9PT09PT09PT09PT09PSDmoLjlv4PnsbsgPT09PT09PT09PT09PT1cblxuLyoqXG4gKiDlk4HniYzpo47moLzov4Hnp7vlvJXmk45cbiAqL1xuZXhwb3J0IGNsYXNzIEJyYW5kU3R5bGVUcmFuc2ZlckVuZ2luZSB7XG4gIHByaXZhdGUgdmlkZW9Ta2lsbDogVmlkZW9HZW5lcmF0aW9uU2tpbGw7XG4gIHByaXZhdGUgYnJhbmRTdHlsZXM6IE1hcDxzdHJpbmcsIEJyYW5kU3R5bGU+O1xuXG4gIGNvbnN0cnVjdG9yKHZpZGVvU2tpbGw6IFZpZGVvR2VuZXJhdGlvblNraWxsKSB7XG4gICAgdGhpcy52aWRlb1NraWxsID0gdmlkZW9Ta2lsbDtcbiAgICB0aGlzLmJyYW5kU3R5bGVzID0gbmV3IE1hcChPYmplY3QuZW50cmllcyhERUZBVUxUX0JSQU5EX1NUWUxFUykpO1xuICB9XG5cbiAgLyoqXG4gICAqIOazqOWGjOWTgeeJjOmjjuagvFxuICAgKi9cbiAgcmVnaXN0ZXJCcmFuZChicmFuZDogQnJhbmRTdHlsZSk6IHZvaWQge1xuICAgIHRoaXMuYnJhbmRTdHlsZXMuc2V0KGJyYW5kLmJyYW5kSWQsIGJyYW5kKTtcbiAgfVxuXG4gIC8qKlxuICAgKiDojrflj5blk4HniYzpo47moLxcbiAgICovXG4gIGdldEJyYW5kKGJyYW5kSWQ6IHN0cmluZyk6IEJyYW5kU3R5bGUgfCB1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLmJyYW5kU3R5bGVzLmdldChicmFuZElkKTtcbiAgfVxuXG4gIC8qKlxuICAgKiDmiafooYzpo47moLzov4Hnp7tcbiAgICovXG4gIGFzeW5jIHRyYW5zZmVyU3R5bGUoXG4gICAgY29uZmlnOiBTdHlsZVRyYW5zZmVyQ29uZmlnXG4gICk6IFByb21pc2U8U3R5bGVUcmFuc2ZlclJlc3VsdD4ge1xuICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XG4gICAgY29uc3QgdGFza0lkID0gYHN0eWxlX3RyYW5zZmVyXyR7Y29uZmlnLnNvdXJjZVZpZGVvUGF0aC5zcGxpdCgnLycpLnBvcCgpfV8ke0RhdGUubm93KCl9YDtcblxuICAgIHRyeSB7XG4gICAgICAvLyAxLiDpqozor4Hlk4HniYzpo47moLxcbiAgICAgIGlmICghdGhpcy5icmFuZFN0eWxlcy5oYXMoY29uZmlnLnRhcmdldEJyYW5kLmJyYW5kSWQpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBicmFuZDogJHtjb25maWcudGFyZ2V0QnJhbmQuYnJhbmRJZH1gKTtcbiAgICAgIH1cblxuICAgICAgLy8gMi4g6aqM6K+B6L+B56e75by65bqmXG4gICAgICBpZiAoY29uZmlnLnRyYW5zZmVyU3RyZW5ndGggPCAwIHx8IGNvbmZpZy50cmFuc2ZlclN0cmVuZ3RoID4gMSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RyYW5zZmVyIHN0cmVuZ3RoIG11c3QgYmUgYmV0d2VlbiAwIGFuZCAxJyk7XG4gICAgICB9XG5cbiAgICAgIC8vIDMuIOeUn+aIkOmjjuagvOi/geenu+aPkOekulxuICAgICAgY29uc3QgdHJhbnNmZXJQcm9tcHQgPSB0aGlzLmNyZWF0ZVRyYW5zZmVyUHJvbXB0KGNvbmZpZyk7XG5cbiAgICAgIC8vIDQuIOWIm+W7uuinhumikeeUn+aIkOivt+axgiAo5L2/55So5Y+C6ICD6KeG6aKRKVxuICAgICAgY29uc3QgcmVxdWVzdDogVmlkZW9HZW5lcmF0aW9uUmVxdWVzdCA9IHtcbiAgICAgICAgcHJvbXB0OiB0cmFuc2ZlclByb21wdCxcbiAgICAgICAgdmlkZW86IGNvbmZpZy5zb3VyY2VWaWRlb1BhdGgsIC8vIOS9v+eUqOa6kOinhumikeS9nOS4uuWPguiAg1xuICAgICAgICBkdXJhdGlvblNlY29uZHM6IDMwLCAvLyDlrp7pmYXlupTku47mupDop4bpopHojrflj5ZcbiAgICAgICAgcmVzb2x1dGlvbjogY29uZmlnLm91dHB1dFJlc29sdXRpb24sXG4gICAgICAgIGFzcGVjdFJhdGlvOiAnMTY6OScsXG4gICAgICB9O1xuXG4gICAgICAvLyA1LiDmj5DkuqTnlJ/miJDku7vliqFcbiAgICAgIGNvbnN0IHRhc2sgPSB7XG4gICAgICAgIGlkOiB0YXNrSWQsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBgQXBwbHkgJHtjb25maWcudGFyZ2V0QnJhbmQuYnJhbmROYW1lfSBzdHlsZWAsXG4gICAgICAgIHByaW9yaXR5OiA3LFxuICAgICAgICByZXF1ZXN0LFxuICAgICAgICBjbGllbnRJZDogJ2JyYW5kLXN0eWxlLXRyYW5zZmVyJyxcbiAgICAgICAgY3JlYXRlZEF0OiBEYXRlLm5vdygpLFxuICAgICAgICByZXRyeUNvdW50OiAwLFxuICAgICAgICBtYXhSZXRyaWVzOiAyLFxuICAgICAgfTtcblxuICAgICAgY29uc3Qgc3VibWl0UmVzdWx0ID0gdGhpcy52aWRlb1NraWxsLnN1Ym1pdFRhc2sodGFzayk7XG5cbiAgICAgIGlmICghc3VibWl0UmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKHN1Ym1pdFJlc3VsdC5tZXNzYWdlKTtcbiAgICAgIH1cblxuICAgICAgLy8gNi4g5qih5ouf562J5b6F55Sf5oiQ5a6M5oiQXG4gICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMzAwMCkpO1xuXG4gICAgICAvLyA3LiDmnoTlu7rnu5PmnpxcbiAgICAgIGNvbnN0IHJlc3VsdDogU3R5bGVUcmFuc2ZlclJlc3VsdCA9IHtcbiAgICAgICAgdGFza0lkLFxuICAgICAgICBzdGF0dXM6ICdzdWNjZXNzJyxcbiAgICAgICAgb3V0cHV0VmlkZW9QYXRoOiBgL3ZpZGVvcy9zdHlsZWRfJHt0YXNrSWR9Lm1wNGAsXG4gICAgICAgIHRodW1ibmFpbFBhdGg6IGAvdGh1bWJuYWlscy9zdHlsZWRfJHt0YXNrSWR9LmpwZ2AsXG4gICAgICAgIGR1cmF0aW9uU2Vjb25kczogKERhdGUubm93KCkgLSBzdGFydFRpbWUpIC8gMTAwMCxcbiAgICAgICAgYXBwbGllZFN0eWxlOiB7XG4gICAgICAgICAgY29sb3JHcmFkaW5nOiBjb25maWcuY29sb3JDb3JyZWN0aW9uLFxuICAgICAgICAgIGxvZ29BZGRlZDogY29uZmlnLmFkZExvZ28sXG4gICAgICAgICAgd2F0ZXJtYXJrQWRkZWQ6IGNvbmZpZy5hZGRXYXRlcm1hcmssXG4gICAgICAgICAgZm9udEFwcGxpZWQ6IHRydWUsXG4gICAgICAgIH0sXG4gICAgICB9O1xuXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB0YXNrSWQsXG4gICAgICAgIHN0YXR1czogJ2ZhaWxlZCcsXG4gICAgICAgIG91dHB1dFZpZGVvUGF0aDogdW5kZWZpbmVkLFxuICAgICAgICBkdXJhdGlvblNlY29uZHM6IChEYXRlLm5vdygpIC0gc3RhcnRUaW1lKSAvIDEwMDAsXG4gICAgICAgIGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJyxcbiAgICAgICAgYXBwbGllZFN0eWxlOiB7XG4gICAgICAgICAgY29sb3JHcmFkaW5nOiBmYWxzZSxcbiAgICAgICAgICBsb2dvQWRkZWQ6IGZhbHNlLFxuICAgICAgICAgIHdhdGVybWFya0FkZGVkOiBmYWxzZSxcbiAgICAgICAgICBmb250QXBwbGllZDogZmFsc2UsXG4gICAgICAgIH0sXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiDmibnph4/lupTnlKjlk4HniYzpo47moLzliLDlpJrkuKrop4bpopFcbiAgICovXG4gIGFzeW5jIGJhdGNoVHJhbnNmZXJTdHlsZShcbiAgICB2aWRlb1BhdGhzOiBzdHJpbmdbXSxcbiAgICBicmFuZDogQnJhbmRTdHlsZSxcbiAgICBjb25maWc6IFBhcnRpYWw8U3R5bGVUcmFuc2ZlckNvbmZpZz4gPSB7fVxuICApOiBQcm9taXNlPFN0eWxlVHJhbnNmZXJSZXN1bHRbXT4ge1xuICAgIGNvbnN0IHJlc3VsdHM6IFN0eWxlVHJhbnNmZXJSZXN1bHRbXSA9IFtdO1xuXG4gICAgZm9yIChjb25zdCB2aWRlb1BhdGggb2YgdmlkZW9QYXRocykge1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy50cmFuc2ZlclN0eWxlKHtcbiAgICAgICAgc291cmNlVmlkZW9QYXRoOiB2aWRlb1BhdGgsXG4gICAgICAgIHRhcmdldEJyYW5kOiBicmFuZCxcbiAgICAgICAgdHJhbnNmZXJTdHJlbmd0aDogMC44LFxuICAgICAgICBwcmVzZXJ2ZUNvbnRlbnQ6IHRydWUsXG4gICAgICAgIGFkZFdhdGVybWFyazogdHJ1ZSxcbiAgICAgICAgYWRkTG9nbzogdHJ1ZSxcbiAgICAgICAgY29sb3JDb3JyZWN0aW9uOiB0cnVlLFxuICAgICAgICBvdXRwdXRSZXNvbHV0aW9uOiAnMTA4MFAnLFxuICAgICAgICAuLi5jb25maWcsXG4gICAgICB9KTtcbiAgICAgIHJlc3VsdHMucHVzaChyZXN1bHQpO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHRzO1xuICB9XG5cbiAgLyoqXG4gICAqIOmqjOivgeinhumikeaYr+WQpuespuWQiOWTgeeJjOinhOiMg1xuICAgKi9cbiAgdmFsaWRhdGVCcmFuZENvbXBsaWFuY2UoXG4gICAgdmlkZW9QYXRoOiBzdHJpbmcsXG4gICAgYnJhbmQ6IEJyYW5kU3R5bGVcbiAgKTogeyBjb21wbGlhbnQ6IGJvb2xlYW47IGlzc3Vlczogc3RyaW5nW10gfSB7XG4gICAgY29uc3QgaXNzdWVzOiBzdHJpbmdbXSA9IFtdO1xuXG4gICAgLy8g5qih5ouf5ZOB54mM5ZCI6KeE5qOA5p+lXG4gICAgLy8g5a6e6ZmF5bqU5L2/55So6K6h566X5py66KeG6KeJIEFQSSDmo4DmtYtcblxuICAgIC8vIOajgOafpeemgeeUqOWFg+e0oFxuICAgIGJyYW5kLmZvcmJpZGRlbkVsZW1lbnRzLmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICAvLyDmqKHmi5/mo4Dmn6VcbiAgICAgIGlmIChNYXRoLnJhbmRvbSgpIDwgMC4xKSB7XG4gICAgICAgIGlzc3Vlcy5wdXNoKGBEZXRlY3RlZCBmb3JiaWRkZW4gZWxlbWVudDogJHtlbGVtZW50fWApO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8g5qOA5p+l5Li76Imy6LCD5L2/55SoXG4gICAgLy8g5qih5ouf77ya5YGH6K6+5qOA5p+l6YCa6L+HXG4gICAgY29uc3QgcHJpbWFyeUNvbG9yVXNhZ2UgPSBNYXRoLnJhbmRvbSgpO1xuICAgIGlmIChwcmltYXJ5Q29sb3JVc2FnZSA8IDAuMykge1xuICAgICAgaXNzdWVzLnB1c2goJ1ByaW1hcnkgY29sb3IgdXNhZ2UgYmVsb3cgcmVjb21tZW5kZWQgdGhyZXNob2xkJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGNvbXBsaWFudDogaXNzdWVzLmxlbmd0aCA9PT0gMCxcbiAgICAgIGlzc3VlcyxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIOeUn+aIkOWTgeeJjOmjjuagvOaMh+WNl1xuICAgKi9cbiAgZ2VuZXJhdGVTdHlsZUd1aWRlKGJyYW5kOiBCcmFuZFN0eWxlKTogc3RyaW5nIHtcbiAgICBsZXQgZ3VpZGUgPSBgIyAke2JyYW5kLmJyYW5kTmFtZX0g5ZOB54mM6aOO5qC85oyH5Y2XXFxuXFxuYDtcblxuICAgIGd1aWRlICs9IGAjIyDlk4HniYzoibLlvalcXG5cXG5gO1xuICAgIGd1aWRlICs9IGAtICoq5Li76Imy6LCDKio6ICR7YnJhbmQucHJpbWFyeUNvbG9yfVxcbmA7XG4gICAgZ3VpZGUgKz0gYC0gKirovoXliqnoibIqKjogJHticmFuZC5zZWNvbmRhcnlDb2xvcnMuam9pbignLCAnKX1cXG5cXG5gO1xuXG4gICAgZ3VpZGUgKz0gYCMjIOWTgeeJjOWtl+S9k1xcblxcbmA7XG4gICAgZ3VpZGUgKz0gYC0gKirmoIfpopgqKjogJHticmFuZC5mb250cy5oZWFkaW5nIHx8ICdOL0EnfVxcbmA7XG4gICAgZ3VpZGUgKz0gYC0gKirmraPmlocqKjogJHticmFuZC5mb250cy5ib2R5IHx8ICdOL0EnfVxcblxcbmA7XG5cbiAgICBndWlkZSArPSBgIyMg6aOO5qC85YWz6ZSu6K+NXFxuXFxuYDtcbiAgICBndWlkZSArPSBicmFuZC5zdHlsZUtleXdvcmRzLm1hcChrID0+IGAtICR7a31gKS5qb2luKCdcXG4nKTtcbiAgICBndWlkZSArPSAnXFxuXFxuJztcblxuICAgIGd1aWRlICs9IGAjIyDop4bop4nop4TojINcXG5cXG5gO1xuICAgIGd1aWRlICs9IGAtICoq5pyA5bCP55WZ55m9Kio6ICR7YnJhbmQudmlzdWFsR3VpZGVsaW5lcy5taW5XaGl0ZXNwYWNlfVxcbmA7XG4gICAgZ3VpZGUgKz0gYC0gKirlnIbop5LlpKflsI8qKjogJHticmFuZC52aXN1YWxHdWlkZWxpbmVzLmNvcm5lclJhZGl1c31cXG5gO1xuICAgIGd1aWRlICs9IGAtICoq6Zi05b2x5by65bqmKio6ICR7YnJhbmQudmlzdWFsR3VpZGVsaW5lcy5zaGFkb3dJbnRlbnNpdHl9XFxuYDtcbiAgICBndWlkZSArPSBgLSAqKuWKqOeUu+mjjuagvCoqOiAke2JyYW5kLnZpc3VhbEd1aWRlbGluZXMuYW5pbWF0aW9uU3R5bGV9XFxuXFxuYDtcblxuICAgIGd1aWRlICs9IGAjIyDnpoHnlKjlhYPntKBcXG5cXG5gO1xuICAgIGd1aWRlICs9IGJyYW5kLmZvcmJpZGRlbkVsZW1lbnRzLm1hcChlID0+IGAtIOKdjCAke2V9YCkuam9pbignXFxuJyk7XG5cbiAgICByZXR1cm4gZ3VpZGU7XG4gIH1cblxuICAvKipcbiAgICog5Yib5bu66aOO5qC86L+B56e75o+Q56S6XG4gICAqL1xuICBwcml2YXRlIGNyZWF0ZVRyYW5zZmVyUHJvbXB0KGNvbmZpZzogU3R5bGVUcmFuc2ZlckNvbmZpZyk6IHN0cmluZyB7XG4gICAgY29uc3QgYnJhbmQgPSBjb25maWcudGFyZ2V0QnJhbmQ7XG4gICAgY29uc3Qgc3R5bGVLZXl3b3JkcyA9IGJyYW5kLnN0eWxlS2V5d29yZHMuam9pbignLCAnKTtcblxuICAgIGxldCBwcm9tcHQgPSBgQXBwbHkgJHticmFuZC5icmFuZE5hbWV9IGJyYW5kIHN0eWxlIHRvIHZpZGVvLiBgO1xuICAgIHByb21wdCArPSBgU3R5bGU6ICR7c3R5bGVLZXl3b3Jkc30uIGA7XG4gICAgcHJvbXB0ICs9IGBQcmltYXJ5IGNvbG9yOiAke2JyYW5kLnByaW1hcnlDb2xvcn0uIGA7XG5cbiAgICBpZiAoY29uZmlnLmFkZExvZ28gJiYgYnJhbmQubG9nb1BhdGgpIHtcbiAgICAgIHByb21wdCArPSBgQWRkIGxvZ28gb3ZlcmxheS4gYDtcbiAgICB9XG5cbiAgICBpZiAoY29uZmlnLmFkZFdhdGVybWFyaykge1xuICAgICAgcHJvbXB0ICs9IGBBZGQgc3VidGxlIHdhdGVybWFyay4gYDtcbiAgICB9XG5cbiAgICBpZiAoY29uZmlnLmNvbG9yQ29ycmVjdGlvbikge1xuICAgICAgcHJvbXB0ICs9IGBDb2xvciBncmFkZSB0byBtYXRjaCBicmFuZCBwYWxldHRlLiBgO1xuICAgIH1cblxuICAgIGlmIChjb25maWcucHJlc2VydmVDb250ZW50KSB7XG4gICAgICBwcm9tcHQgKz0gYFByZXNlcnZlIG9yaWdpbmFsIGNvbnRlbnQgYW5kIGNvbXBvc2l0aW9uLiBgO1xuICAgIH1cblxuICAgIHByb21wdCArPSBgVHJhbnNmZXIgc3RyZW5ndGg6ICR7Y29uZmlnLnRyYW5zZmVyU3RyZW5ndGggKiAxMDB9JS4gYDtcbiAgICBwcm9tcHQgKz0gYFByb2Zlc3Npb25hbCBxdWFsaXR5LCBoaWdoIGZpZGVsaXR5LmA7XG5cbiAgICByZXR1cm4gcHJvbXB0O1xuICB9XG59XG5cbi8vID09PT09PT09PT09PT09IOWvvOWHuiA9PT09PT09PT09PT09PVxuXG5leHBvcnQgZGVmYXVsdCBCcmFuZFN0eWxlVHJhbnNmZXJFbmdpbmU7XG4iXX0=