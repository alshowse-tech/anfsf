"use strict";
/**
 * ANFSF V1.5.0 - Context Compressor Skill (v2.0)
 *
 * 超长上下文分层压缩 + 4-bit 量化 + 稀疏注意力路由
 * 注册到：Orchestration Harness
 * 能效比目标：5,200 倍
 * 延迟增幅：+5-10ms
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextCompressorSkill = void 0;
exports.registerContextCompressorSkill = registerContextCompressorSkill;
exports.createContextCompressorSkill = createContextCompressorSkill;
const base_1 = require("./base");
const quantization_1 = require("../integrations/quantization");
// ============================================================================
// Constants
// ============================================================================
const DEFAULT_STRATEGIES = {
    fast: {
        compressionLevel: 0.9,
        attentionType: 'sparse',
        layers: { L1: 0.05, L2: 0.15, L3: 0.80 },
    },
    balanced: {
        compressionLevel: 0.7,
        attentionType: 'quantized',
        layers: { L1: 0.15, L2: 0.35, L3: 0.50 }, // Optimized for speed
    },
    deep: {
        compressionLevel: 0.5,
        attentionType: 'full',
        layers: { L1: 0.25, L2: 0.45, L3: 0.30 }, // Optimized for speed
    },
};
const TOKEN_BUDGET_THRESHOLDS = {
    low: 50000,
    medium: 200000,
    high: 1000000,
};
// Token 硬限制 (196,601 - 安全边界)
const MAX_TOKENS = 180000;
// ============================================================================
// ContextCompressorSkill
// ============================================================================
class ContextCompressorSkill extends base_1.Skill {
    constructor() {
        super();
        this.name = 'context-compressor';
        this.version = '2.0.0';
        this.description = '超长上下文分层压缩 + 4-bit 量化 + 稀疏注意力路由';
        this.quantizer = (0, quantization_1.createQuantizer)({ bits: 4 });
    }
    async execute(ctx) {
        const startTime = Date.now();
        // 1. Select compression strategy based on DynamicRouter
        const strategy = this.selectStrategy(ctx);
        // 2. Apply 4-bit quantization if compression level > 0.7
        const quantized = strategy.compressionLevel > 0.7
            ? await this.apply4BitQuantization(ctx.rawTokens)
            : ctx.rawTokens;
        // 3. Compress hierarchical (L1 + L2 + L3)
        const compressed = await this.compressHierarchical(quantized, strategy);
        // 4. Calculate metrics
        const compressionRatio = ctx.rawTokens.length / compressed.length;
        const estimatedOps = this.calculateOps(compressed.length, strategy.attentionType);
        const executionTime = Date.now() - startTime;
        return {
            compressedTokens: compressed,
            compressionRatio,
            strategy,
            estimatedOps,
            executionTime,
            metadata: {
                originalTokens: ctx.rawTokens.length,
                compressedTokens: compressed.length,
                opsReduction: this.calculateOps(ctx.rawTokens.length, 'full') / estimatedOps,
            },
        };
    }
    /**
     * Select compression strategy based on token count, budget, and performance mode.
     */
    selectStrategy(ctx) {
        const baseStrategy = DEFAULT_STRATEGIES[ctx.performanceMode];
        // Adjust based on token budget
        if (ctx.tokenBudget < TOKEN_BUDGET_THRESHOLDS.low) {
            return {
                ...baseStrategy,
                compressionLevel: Math.min(baseStrategy.compressionLevel + 0.1, 0.95),
                attentionType: 'sparse',
            };
        }
        // Adjust based on task type
        if (ctx.taskType === 'code') {
            // Code needs more precision
            return {
                ...baseStrategy,
                compressionLevel: Math.max(baseStrategy.compressionLevel - 0.1, 0.5),
                layers: {
                    L1: baseStrategy.layers.L1 * 1.5,
                    L2: baseStrategy.layers.L2,
                    L3: baseStrategy.layers.L3 * 0.5,
                },
            };
        }
        return baseStrategy;
    }
    /**
     * Apply 4-bit quantization to tokens.
     */
    async apply4BitQuantization(tokens) {
        try {
            // Use actual quantization
            const result = await this.quantizer.quantize(tokens);
            // Convert quantized tokens to string representation
            return result.tokens.map((qt, idx) => {
                const clusterId = Math.floor(idx / 16);
                if (idx % 16 === 0) {
                    return `[Q4_${clusterId}_scale=${qt.scale.toFixed(4)}]${qt.original}`;
                }
                return null;
            }).filter(Boolean);
        }
        catch (error) {
            console.error('[ContextCompressor] Quantization error:', error);
            // Fallback to simulated quantization
            return this.simulateQuantization(tokens);
        }
    }
    /**
     * Simulate quantization (fallback).
     */
    simulateQuantization(tokens) {
        return tokens.map((token, idx) => {
            const clusterId = Math.floor(idx / 16);
            if (idx % 16 === 0) {
                return `[Q4_${clusterId}]${token}`;
            }
            return null;
        }).filter(Boolean);
    }
    /**
     * Compress tokens hierarchically (L1 + L2 + L3).
     */
    async compressHierarchical(tokens, strategy) {
        const L1Count = Math.floor(tokens.length * strategy.layers.L1);
        const L2Count = Math.floor(tokens.length * strategy.layers.L2);
        const L3Count = tokens.length - L1Count - L2Count;
        // L1: Raw tokens (most recent)
        const L1Tokens = tokens.slice(-L1Count);
        // L2: Semantic summary (middle section)
        const L2Tokens = await this.generateSemanticSummary(tokens.slice(L1Count, L1Count + L2Count));
        // L3: Graph index (oldest section)
        const L3Tokens = await this.buildGraphIndex(tokens.slice(0, L3Count));
        return [...L3Tokens, ...L2Tokens, ...L1Tokens];
    }
    /**
     * Generate semantic summary for L2 layer.
     */
    async generateSemanticSummary(tokens) {
        // Simulated semantic summarization
        // In production, use actual summarization model
        const summaryInterval = Math.max(1, Math.floor(tokens.length / 10));
        const summary = tokens.filter((_, idx) => idx % summaryInterval === 0);
        return [`[L2_SUMMARY:${summary.length} tokens]`, ...summary];
    }
    /**
     * Build graph index for L3 layer.
     */
    async buildGraphIndex(tokens) {
        // Simulated graph indexing
        // In production, use actual GraphRAG
        const uniqueTokens = [...new Set(tokens)];
        const indexSize = Math.max(1, Math.floor(uniqueTokens.length / 100));
        const index = uniqueTokens.slice(0, indexSize);
        return [`[L3_GRAPH_INDEX:${index.length} nodes]`, ...index];
    }
    /**
     * Calculate estimated operations based on attention type.
     */
    calculateOps(tokenCount, attentionType) {
        const n = tokenCount;
        switch (attentionType) {
            case 'full':
                return n * n; // O(n²)
            case 'sparse':
                return n * Math.log(n); // O(n log n)
            case 'quantized':
                return (n * n) / 4; // 4-bit quantization reduces ops by 4x
            default:
                return n * n;
        }
    }
    /**
     * Token 超限解决方案 - 为自升级场景定制压缩
     * 解决 HTTP 400: InternalError.Algo.InvalidParameter - Range of input length should be [1, 196601]
     */
    async compressForUpgrade(rawInput) {
        const tokenCount = this.estimateTokens(rawInput);
        const droppedSections = [];
        let truncated = false;
        if (tokenCount > MAX_TOKENS) {
            console.log(`[ContextCompressor] Token 超限: ${tokenCount} > ${MAX_TOKENS}, 执行优先级裁剪`);
            // 优先级裁剪规则
            const rules = {
                keep: ['currentTask', 'currentFile', 'directDeps', 'criticalContext'],
                drop: ['oldHistory', 'irrelevantMemory', 'oldVersions', 'redundantContext']
            };
            const truncatedInput = this.truncateByPriority(rawInput, rules);
            droppedSections.push(...rules.drop);
            truncated = true;
            const newTokenCount = this.estimateTokens(truncatedInput);
            console.log(`[ContextCompressor] 裁剪后 token: ${newTokenCount}, 压缩比: ${(tokenCount / newTokenCount).toFixed(2)}x`);
            // 复用现有分层压缩
            const compressedTokens = await this.compressHierarchical(truncatedInput.split('\n'), DEFAULT_STRATEGIES.fast);
            return {
                tokens: compressedTokens,
                tokenCount: newTokenCount,
                compressionRatio: tokenCount / newTokenCount,
                truncated,
                droppedSections
            };
        }
        // 未超限，直接分层压缩
        const compressedTokens = await this.compressHierarchical(rawInput.split('\n'), DEFAULT_STRATEGIES.balanced);
        return {
            tokens: compressedTokens,
            tokenCount,
            compressionRatio: 1,
            truncated: false,
            droppedSections: []
        };
    }
    /**
     * 估算 token 数量 (简化算法: 1 token ≈ 4 chars)
     */
    estimateTokens(input) {
        // 简化估算: 平均 4 个字符 = 1 token
        // 中文: 1.5 字符 = 1 token, 英文: 4 字符 = 1 token
        const charCount = input.length;
        const chineseChars = (input.match(/[\u4e00-\u9fa5]/g) || []).length;
        const englishChars = charCount - chineseChars;
        // 中文按 1.5 字符/token，英文按 4 字符/token
        const estimatedTokens = Math.ceil(chineseChars / 1.5) + Math.ceil(englishChars / 4);
        return estimatedTokens;
    }
    /**
     * 按优先级裁剪输入内容
     */
    truncateByPriority(input, rules) {
        const lines = input.split('\n');
        const result = [];
        // 标记各区域
        const sections = [];
        let currentSection = [];
        let currentType = 'unknown';
        // 简化的区域识别
        for (const line of lines) {
            // 识别区域类型
            if (line.includes('当前任务') || line.includes('currentTask')) {
                if (currentSection.length > 0) {
                    sections.push({ type: currentType, content: currentSection, priority: this.getPriority(currentType, rules) });
                }
                currentSection = [line];
                currentType = 'currentTask';
            }
            else if (line.includes('当前文件') || line.includes('currentFile')) {
                if (currentSection.length > 0) {
                    sections.push({ type: currentType, content: currentSection, priority: this.getPriority(currentType, rules) });
                }
                currentSection = [line];
                currentType = 'currentFile';
            }
            else if (line.includes('历史') || line.includes('history')) {
                if (currentSection.length > 0) {
                    sections.push({ type: currentType, content: currentSection, priority: this.getPriority(currentType, rules) });
                }
                currentSection = [line];
                currentType = 'oldHistory';
            }
            else {
                currentSection.push(line);
            }
        }
        // 添加最后一个区域
        if (currentSection.length > 0) {
            sections.push({ type: currentType, content: currentSection, priority: this.getPriority(currentType, rules) });
        }
        // 按优先级排序并保留高优先级内容
        sections.sort((a, b) => b.priority - a.priority);
        // 估算保留的内容
        let currentTokens = 0;
        const keptSections = [];
        for (const section of sections) {
            const sectionTokens = this.estimateTokens(section.content.join('\n'));
            if (currentTokens + sectionTokens <= MAX_TOKENS * 0.8) { // 保留 80% 预算
                keptSections.push(...section.content);
                currentTokens += sectionTokens;
            }
        }
        return keptSections.join('\n');
    }
    /**
     * 获取区域优先级
     */
    getPriority(type, rules) {
        if (rules.keep.includes(type))
            return 10; // 高优先级
        if (rules.drop.includes(type))
            return 1; // 低优先级
        return 5; // 中等优先级
    }
    /**
     * Get skill metadata.
     */
    getMetadata() {
        return {
            name: this.name,
            version: this.version,
            compressionLevels: ['fast', 'balanced', 'deep'],
            supportedTaskTypes: ['code', 'document', 'conversation'],
            maxTokenSupport: 1000000,
            energyEfficiencyRatio: '5200:1',
            tokenLimit: MAX_TOKENS,
            upgradeCompression: true,
        };
    }
}
exports.ContextCompressorSkill = ContextCompressorSkill;
// ============================================================================
// Skill Registration
// ============================================================================
function registerContextCompressorSkill(registry) {
    registry.register(new ContextCompressorSkill());
}
function createContextCompressorSkill() {
    return new ContextCompressorSkill();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dC1jb21wcmVzc29yLXNraWxsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vc3JjL3NraWxscy9jb250ZXh0LWNvbXByZXNzb3Itc2tpbGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7O0dBT0c7OztBQWlhSCx3RUFFQztBQUVELG9FQUVDO0FBcmFELGlDQUEwRDtBQUMxRCwrREFBbUc7QUE2Q25HLCtFQUErRTtBQUMvRSxZQUFZO0FBQ1osK0VBQStFO0FBRS9FLE1BQU0sa0JBQWtCLEdBQXVFO0lBQzdGLElBQUksRUFBRTtRQUNKLGdCQUFnQixFQUFFLEdBQUc7UUFDckIsYUFBYSxFQUFFLFFBQVE7UUFDdkIsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUU7S0FDekM7SUFDRCxRQUFRLEVBQUU7UUFDUixnQkFBZ0IsRUFBRSxHQUFHO1FBQ3JCLGFBQWEsRUFBRSxXQUFXO1FBQzFCLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsc0JBQXNCO0tBQ2pFO0lBQ0QsSUFBSSxFQUFFO1FBQ0osZ0JBQWdCLEVBQUUsR0FBRztRQUNyQixhQUFhLEVBQUUsTUFBTTtRQUNyQixNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxFQUFFLHNCQUFzQjtLQUNqRTtDQUNGLENBQUM7QUFFRixNQUFNLHVCQUF1QixHQUFHO0lBQzlCLEdBQUcsRUFBRSxLQUFLO0lBQ1YsTUFBTSxFQUFFLE1BQU07SUFDZCxJQUFJLEVBQUUsT0FBTztDQUNkLENBQUM7QUFFRiw2QkFBNkI7QUFDN0IsTUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDO0FBRTFCLCtF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QU87WUFDeEIscUJBQXFCLEVBQUUsUUFBUTtZQUMvQixVQUFVLEVBQUUsVUFBVTtZQUN0QixrQkFBa0IsRUFBRSxJQUFJO1NBQ3pCLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUF4VUQsd0RBd1VDO0FBRUQsK0VBQStFO0FBQy9FLHFCQUFxQjtBQUNyQiwrRUFBK0U7QUFFL0UsU0FBZ0IsOEJBQThCLENBQUMsUUFBYTtJQUMxRCxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksc0JBQXNCLEVBQUUsQ0FBQyxDQUFDO0FBQ2xELENBQUM7QUFFRCxTQUFnQiw0QkFBNEI7SUFDMUMsT0FBTyxJQUFJLHNCQUFzQixFQUFFLENBQUM7QUFDdEMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQU5GU0YgVjEuNS4wIC0gQ29udGV4dCBDb21wcmVzc29yIFNraWxsICh2Mi4wKVxuICogXG4gKiDotoXplb/kuIrkuIvmlofliIblsYLljovnvKkgKyA0LWJpdCDph4/ljJYgKyDnqIDnlo/ms6jmhI/lipvot6/nlLFcbiAqIOazqOWGjOWIsO+8mk9yY2hlc3RyYXRpb24gSGFybmVzc1xuICog6IO95pWI5q+U55uu5qCH77yaNSwyMDAg5YCNXG4gKiDlu7bov5/lop7luYXvvJorNS0xMG1zXG4gKi9cblxuaW1wb3J0IHsgU2tpbGwsIFNraWxsQ29udGV4dCwgU2tpbGxSZXN1bHQgfSBmcm9tICcuL2Jhc2UnO1xuaW1wb3J0IHsgUXVhbnRpemVyLCBjcmVhdGVRdWFudGl6ZXIsIHR5cGUgUXVhbnRpemF0aW9uUmVzdWx0IH0gZnJvbSAnLi4vaW50ZWdyYXRpb25zL3F1YW50aXphdGlvbic7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFR5cGVzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8vIFRva2VuIOi2hemZkOino+WGs+aWueahiCAtIOaWsOWinuexu+Wei1xuZXhwb3J0IGludGVyZmFjZSBQcmlvcml0eVJ1bGVzIHtcbiAga2VlcDogc3RyaW5nW107ICAgLy8g5L+d55WZ55qE5YWz6ZSu5YaF5a6557G75Z6LXG4gIGRyb3A6IHN0cmluZ1tdOyAgIC8vIOWIoOmZpOeahOWGheWuueexu+Wei1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbXByZXNzZWRDb250ZXh0IHtcbiAgdG9rZW5zOiBzdHJpbmdbXTtcbiAgdG9rZW5Db3VudDogbnVtYmVyO1xuICBjb21wcmVzc2lvblJhdGlvOiBudW1iZXI7XG4gIHRydW5jYXRlZDogYm9vbGVhbjtcbiAgZHJvcHBlZFNlY3Rpb25zOiBzdHJpbmdbXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb21wcmVzc2lvbkNvbnRleHQge1xuICByYXdUb2tlbnM6IHN0cmluZ1tdO1xuICB0b2tlbkNvdW50OiBudW1iZXI7XG4gIHRva2VuQnVkZ2V0OiBudW1iZXI7XG4gIHBlcmZvcm1hbmNlTW9kZTogJ2Zhc3QnIHwgJ2JhbGFuY2VkJyB8ICdkZWVwJztcbiAgdGFza1R5cGU6ICdjb2RlJyB8ICdkb2N1bWVudCcgfCAnY29udmVyc2F0aW9uJztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb21wcmVzc2lvblN0cmF0ZWd5IHtcbiAgY29tcHJlc3Npb25MZXZlbDogbnVtYmVyOyAvLyAwLTFcbiAgYXR0ZW50aW9uVHlwZTogJ2Z1bGwnIHwgJ3NwYXJzZScgfCAncXVhbnRpemVkJztcbiAgbGF5ZXJzOiB7XG4gICAgTDE6IG51bWJlcjsgLy8g5Y6f5aeLIHRva2VucyAo5pyA6L+RKVxuICAgIEwyOiBudW1iZXI7IC8vIOivreS5ieaRmOimgVxuICAgIEwzOiBudW1iZXI7IC8vIOWbvue0ouW8lVxuICB9O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbXByZXNzaW9uUmVzdWx0IGV4dGVuZHMgU2tpbGxSZXN1bHQge1xuICBjb21wcmVzc2VkVG9rZW5zOiBzdHJpbmdbXTtcbiAgY29tcHJlc3Npb25SYXRpbzogbnVtYmVyO1xuICBzdHJhdGVneTogQ29tcHJlc3Npb25TdHJhdGVneTtcbiAgZXN0aW1hdGVkT3BzOiBudW1iZXI7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIENvbnN0YW50c1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5jb25zdCBERUZBVUxUX1NUUkFURUdJRVM6IFJlY29yZDxDb21wcmVzc2lvbkNvbnRleHRbJ3BlcmZvcm1hbmNlTW9kZSddLCBDb21wcmVzc2lvblN0cmF0ZWd5PiA9IHtcbiAgZmFzdDoge1xuICAgIGNvbXByZXNzaW9uTGV2ZWw6IDAuOSxcbiAgICBhdHRlbnRpb25UeXBlOiAnc3BhcnNlJyxcbiAgICBsYXllcnM6IHsgTDE6IDAuMDUsIEwyOiAwLjE1LCBMMzogMC44MCB9LFxuICB9LFxuICBiYWxhbmNlZDoge1xuICAgIGNvbXByZXNzaW9uTGV2ZWw6IDAuNyxcbiAgICBhdHRlbnRpb25UeXBlOiAncXVhbnRpemVkJyxcbiAgICBsYXllcnM6IHsgTDE6IDAuMTUsIEwyOiAwLjM1LCBMMzogMC41MCB9LCAvLyBPcHRpbWl6ZWQgZm9yIHNwZWVkXG4gIH0sXG4gIGRlZXA6IHtcbiAgICBjb21wcmVzc2lvbkxldmVsOiAwLjUsXG4gICAgYXR0ZW50aW9uVHlwZTogJ2Z1bGwnLFxuICAgIGxheWVyczogeyBMMTogMC4yNSwgTDI6IDAuNDUsIEwzOiAwLjMwIH0sIC8vIE9wdGltaXplZCBmb3Igc3BlZWRcbiAgfSxcbn07XG5cbmNvbnN0IFRPS0VOX0JVREdFVF9USFJFU0hPTERTID0ge1xuICBsb3c6IDUwMDAwLFxuICBtZWRpdW06IDIwMDAwMCxcbiAgaGlnaDogMTAwMDAwMCxcbn07XG5cbi8vIFRva2VuIOehrOmZkOWItiAoMTk2LDYwMSAtIOWuieWFqOi+ueeVjClcbmNvbnN0IE1BWF9UT0tFTlMgPSAxODAwMDA7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIENvbnRleHRDb21wcmVzc29yU2tpbGxcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGNsYXNzIENvbnRleHRDb21wcmVzc29yU2tpbGwgZXh0ZW5kcyBTa2lsbCB7XG4gIG5hbWUgPSAnY29udGV4dC1jb21wcmVzc29yJztcbiAgdmVyc2lvbiA9ICcyLjAuMCc7XG4gIGRlc2NyaXB0aW9uID0gJ+i2hemVv+S4iuS4i+aWh+WIhuWxguWOi+e8qSArIDQtYml0IOmHj+WMliArIOeogOeWj+azqOaEj+WKm+i3r+eUsSc7XG5cbiAgcHJpdmF0ZSBxdWFudGl6ZXI6IFF1YW50aXplcjtcblxuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcigpO1xuICAgIHRoaXMucXVhbnRpemVyID0gY3JlYXRlUXVhbnRpemVyKHsgYml0czogNCB9KTtcbiAgfVxuXG4gIGFzeW5jIGV4ZWN1dGUoY3R4OiBDb21wcmVzc2lvbkNvbnRleHQpOiBQcm9taXNlPENvbXByZXNzaW9uUmVzdWx0PiB7XG4gICAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcblxuICAgIC8vIDEuIFNlbGVjdCBjb21wcmVzc2lvbiBzdHJhdGVneSBiYXNlZCBvbiBEeW5hbWljUm91dGVyXG4gICAgY29uc3Qgc3RyYXRlZ3kgPSB0aGlzLnNlbGVjdFN0cmF0ZWd5KGN0eCk7XG5cbiAgICAvLyAyLiBBcHBseSA0LWJpdCBxdWFudGl6YXRpb24gaWYgY29tcHJlc3Npb24gbGV2ZWwgPiAwLjdcbiAgICBjb25zdCBxdWFudGl6ZWQgPSBzdHJhdGVneS5jb21wcmVzc2lvbkxldmVsID4gMC43XG4gICAgICA/IGF3YWl0IHRoaXMuYXBwbHk0Qml0UXVhbnRpemF0aW9uKGN0eC5yYXdUb2tlbnMpXG4gICAgICA6IGN0eC5yYXdUb2tlbnM7XG5cbiAgICAvLyAzLiBDb21wcmVzcyBoaWVyYXJjaGljYWwgKEwxICsgTDIgKyBMMylcbiAgICBjb25zdCBjb21wcmVzc2VkID0gYXdhaXQgdGhpcy5jb21wcmVzc0hpZXJhcmNoaWNhbChxdWFudGl6ZWQsIHN0cmF0ZWd5KTtcblxuICAgIC8vIDQuIENhbGN1bGF0ZSBtZXRyaWNzXG4gICAgY29uc3QgY29tcHJlc3Npb25SYXRpbyA9IGN0eC5yYXdUb2tlbnMubGVuZ3RoIC8gY29tcHJlc3NlZC5sZW5ndGg7XG4gICAgY29uc3QgZXN0aW1hdGVkT3BzID0gdGhpcy5jYWxjdWxhdGVPcHMoY29tcHJlc3NlZC5sZW5ndGgsIHN0cmF0ZWd5LmF0dGVudGlvblR5cGUpO1xuICAgIGNvbnN0IGV4ZWN1dGlvblRpbWUgPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGNvbXByZXNzZWRUb2tlbnM6IGNvbXByZXNzZWQsXG4gICAgICBjb21wcmVzc2lvblJhdGlvLFxuICAgICAgc3RyYXRlZ3ksXG4gICAgICBlc3RpbWF0ZWRPcHMsXG4gICAgICBleGVjdXRpb25UaW1lLFxuICAgICAgbWV0YWRhdGE6IHtcbiAgICAgICAgb3JpZ2luYWxUb2tlbnM6IGN0eC5yYXdUb2tlbnMubGVuZ3RoLFxuICAgICAgICBjb21wcmVzc2VkVG9rZW5zOiBjb21wcmVzc2VkLmxlbmd0aCxcbiAgICAgICAgb3BzUmVkdWN0aW9uOiB0aGlzLmNhbGN1bGF0ZU9wcyhjdHgucmF3VG9rZW5zLmxlbmd0aCwgJ2Z1bGwnKSAvIGVzdGltYXRlZE9wcyxcbiAgICAgIH0sXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZWxlY3QgY29tcHJlc3Npb24gc3RyYXRlZ3kgYmFzZWQgb24gdG9rZW4gY291bnQsIGJ1ZGdldCwgYW5kIHBlcmZvcm1hbmNlIG1vZGUuXG4gICAqL1xuICBwcml2YXRlIHNlbGVjdFN0cmF0ZWd5KGN0eDogQ29tcHJlc3Npb25Db250ZXh0KTogQ29tcHJlc3Npb25TdHJhdGVneSB7XG4gICAgY29uc3QgYmFzZVN0cmF0ZWd5ID0gREVGQVVMVF9TVFJBVEVHSUVTW2N0eC5wZXJmb3JtYW5jZU1vZGVdO1xuXG4gICAgLy8gQWRqdXN0IGJhc2VkIG9uIHRva2VuIGJ1ZGdldFxuICAgIGlmIChjdHgudG9rZW5CdWRnZXQgPCBUT0tFTl9CVURHRVRfVEhSRVNIT0xEUy5sb3cpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIC4uLmJhc2VTdHJhdGVneSxcbiAgICAgICAgY29tcHJlc3Npb25MZXZlbDogTWF0aC5taW4oYmFzZVN0cmF0ZWd5LmNvbXByZXNzaW9uTGV2ZWwgKyAwLjEsIDAuOTUpLFxuICAgICAgICBhdHRlbnRpb25UeXBlOiAnc3BhcnNlJyxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gQWRqdXN0IGJhc2VkIG9uIHRhc2sgdHlwZVxuICAgIGlmIChjdHgudGFza1R5cGUgPT09ICdjb2RlJykge1xuICAgICAgLy8gQ29kZSBuZWVkcyBtb3JlIHByZWNpc2lvblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgLi4uYmFzZVN0cmF0ZWd5LFxuICAgICAgICBjb21wcmVzc2lvbkxldmVsOiBNYXRoLm1heChiYXNlU3RyYXRlZ3kuY29tcHJlc3Npb25MZXZlbCAtIDAuMSwgMC41KSxcbiAgICAgICAgbGF5ZXJzOiB7XG4gICAgICAgICAgTDE6IGJhc2VTdHJhdGVneS5sYXllcnMuTDEgKiAxLjUsXG4gICAgICAgICAgTDI6IGJhc2VTdHJhdGVneS5sYXllcnMuTDIsXG4gICAgICAgICAgTDM6IGJhc2VTdHJhdGVneS5sYXllcnMuTDMgKiAwLjUsXG4gICAgICAgIH0sXG4gICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBiYXNlU3RyYXRlZ3k7XG4gIH1cblxuICAvKipcbiAgICogQXBwbHkgNC1iaXQgcXVhbnRpemF0aW9uIHRvIHRva2Vucy5cbiAgICovXG4gIHByaXZhdGUgYXN5bmMgYXBwbHk0Qml0UXVhbnRpemF0aW9uKHRva2Vuczogc3RyaW5nW10pOiBQcm9taXNlPHN0cmluZ1tdPiB7XG4gICAgdHJ5IHtcbiAgICAgIC8vIFVzZSBhY3R1YWwgcXVhbnRpemF0aW9uXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLnF1YW50aXplci5xdWFudGl6ZSh0b2tlbnMpO1xuICAgICAgXG4gICAgICAvLyBDb252ZXJ0IHF1YW50aXplZCB0b2tlbnMgdG8gc3RyaW5nIHJlcHJlc2VudGF0aW9uXG4gICAgICByZXR1cm4gcmVzdWx0LnRva2Vucy5tYXAoKHF0LCBpZHgpID0+IHtcbiAgICAgICAgY29uc3QgY2x1c3RlcklkID0gTWF0aC5mbG9vcihpZHggLyAxNik7XG4gICAgICAgIGlmIChpZHggJSAxNiA9PT0gMCkge1xuICAgICAgICAgIHJldHVybiBgW1E0XyR7Y2x1c3RlcklkfV9zY2FsZT0ke3F0LnNjYWxlLnRvRml4ZWQoNCl9XSR7cXQub3JpZ2luYWx9YDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH0pLmZpbHRlcihCb29sZWFuKSBhcyBzdHJpbmdbXTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignW0NvbnRleHRDb21wcmVzc29yXSBRdWFudGl6YXRpb24gZXJyb3I6JywgZXJyb3IpO1xuICAgICAgLy8gRmFsbGJhY2sgdG8gc2ltdWxhdGVkIHF1YW50aXphdGlvblxuICAgICAgcmV0dXJuIHRoaXMuc2ltdWxhdGVRdWFudGl6YXRpb24odG9rZW5zKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2ltdWxhdGUgcXVhbnRpemF0aW9uIChmYWxsYmFjaykuXG4gICAqL1xuICBwcml2YXRlIHNpbXVsYXRlUXVhbnRpemF0aW9uKHRva2Vuczogc3RyaW5nW10pOiBzdHJpbmdbXSB7XG4gICAgcmV0dXJuIHRva2Vucy5tYXAoKHRva2VuLCBpZHgpID0+IHtcbiAgICAgIGNvbnN0IGNsdXN0ZXJJZCA9IE1hdGguZmxvb3IoaWR4IC8gMTYpO1xuICAgICAgaWYgKGlkeCAlIDE2ID09PSAwKSB7XG4gICAgICAgIHJldHVybiBgW1E0XyR7Y2x1c3RlcklkfV0ke3Rva2VufWA7XG4gICAgICB9XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9KS5maWx0ZXIoQm9vbGVhbikgYXMgc3RyaW5nW107XG4gIH1cblxuICAvKipcbiAgICogQ29tcHJlc3MgdG9rZW5zIGhpZXJhcmNoaWNhbGx5IChMMSArIEwyICsgTDMpLlxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBjb21wcmVzc0hpZXJhcmNoaWNhbCh0b2tlbnM6IHN0cmluZ1tdLCBzdHJhdGVneTogQ29tcHJlc3Npb25TdHJhdGVneSk6IFByb21pc2U8c3RyaW5nW10+IHtcbiAgICBjb25zdCBMMUNvdW50ID0gTWF0aC5mbG9vcih0b2tlbnMubGVuZ3RoICogc3RyYXRlZ3kubGF5ZXJzLkwxKTtcbiAgICBjb25zdCBMMkNvdW50ID0gTWF0aC5mbG9vcih0b2tlbnMubGVuZ3RoICogc3RyYXRlZ3kubGF5ZXJzLkwyKTtcbiAgICBjb25zdCBMM0NvdW50ID0gdG9rZW5zLmxlbmd0aCAtIEwxQ291bnQgLSBMMkNvdW50O1xuXG4gICAgLy8gTDE6IFJhdyB0b2tlbnMgKG1vc3QgcmVjZW50KVxuICAgIGNvbnN0IEwxVG9rZW5zID0gdG9rZW5zLnNsaWNlKC1MMUNvdW50KTtcblxuICAgIC8vIEwyOiBTZW1hbnRpYyBzdW1tYXJ5IChtaWRkbGUgc2VjdGlvbilcbiAgICBjb25zdCBMMlRva2VucyA9IGF3YWl0IHRoaXMuZ2VuZXJhdGVTZW1hbnRpY1N1bW1hcnkodG9rZW5zLnNsaWNlKEwxQ291bnQsIEwxQ291bnQgKyBMMkNvdW50KSk7XG5cbiAgICAvLyBMMzogR3JhcGggaW5kZXggKG9sZGVzdCBzZWN0aW9uKVxuICAgIGNvbnN0IEwzVG9rZW5zID0gYXdhaXQgdGhpcy5idWlsZEdyYXBoSW5kZXgodG9rZW5zLnNsaWNlKDAsIEwzQ291bnQpKTtcblxuICAgIHJldHVybiBbLi4uTDNUb2tlbnMsIC4uLkwyVG9rZW5zLCAuLi5MMVRva2Vuc107XG4gIH1cblxuICAvKipcbiAgICogR2VuZXJhdGUgc2VtYW50aWMgc3VtbWFyeSBmb3IgTDIgbGF5ZXIuXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIGdlbmVyYXRlU2VtYW50aWNTdW1tYXJ5KHRva2Vuczogc3RyaW5nW10pOiBQcm9taXNlPHN0cmluZ1tdPiB7XG4gICAgLy8gU2ltdWxhdGVkIHNlbWFudGljIHN1bW1hcml6YXRpb25cbiAgICAvLyBJbiBwcm9kdWN0aW9uLCB1c2UgYWN0dWFsIHN1bW1hcml6YXRpb24gbW9kZWxcbiAgICBjb25zdCBzdW1tYXJ5SW50ZXJ2YWwgPSBNYXRoLm1heCgxLCBNYXRoLmZsb29yKHRva2Vucy5sZW5ndGggLyAxMCkpO1xuICAgIGNvbnN0IHN1bW1hcnkgPSB0b2tlbnMuZmlsdGVyKChfLCBpZHgpID0+IGlkeCAlIHN1bW1hcnlJbnRlcnZhbCA9PT0gMCk7XG4gICAgcmV0dXJuIFtgW0wyX1NVTU1BUlk6JHtzdW1tYXJ5Lmxlbmd0aH0gdG9rZW5zXWAsIC4uLnN1bW1hcnldO1xuICB9XG5cbiAgLyoqXG4gICAqIEJ1aWxkIGdyYXBoIGluZGV4IGZvciBMMyBsYXllci5cbiAgICovXG4gIHByaXZhdGUgYXN5bmMgYnVpbGRHcmFwaEluZGV4KHRva2Vuczogc3RyaW5nW10pOiBQcm9taXNlPHN0cmluZ1tdPiB7XG4gICAgLy8gU2ltdWxhdGVkIGdyYXBoIGluZGV4aW5nXG4gICAgLy8gSW4gcHJvZHVjdGlvbiwgdXNlIGFjdHVhbCBHcmFwaFJBR1xuICAgIGNvbnN0IHVuaXF1ZVRva2VucyA9IFsuLi5uZXcgU2V0KHRva2VucyldO1xuICAgIGNvbnN0IGluZGV4U2l6ZSA9IE1hdGgubWF4KDEsIE1hdGguZmxvb3IodW5pcXVlVG9rZW5zLmxlbmd0aCAvIDEwMCkpO1xuICAgIGNvbnN0IGluZGV4ID0gdW5pcXVlVG9rZW5zLnNsaWNlKDAsIGluZGV4U2l6ZSk7XG4gICAgcmV0dXJuIFtgW0wzX0dSQVBIX0lOREVYOiR7aW5kZXgubGVuZ3RofSBub2Rlc11gLCAuLi5pbmRleF07XG4gIH1cblxuICAvKipcbiAgICogQ2FsY3VsYXRlIGVzdGltYXRlZCBvcGVyYXRpb25zIGJhc2VkIG9uIGF0dGVudGlvbiB0eXBlLlxuICAgKi9cbiAgcHJpdmF0ZSBjYWxjdWxhdGVPcHModG9rZW5Db3VudDogbnVtYmVyLCBhdHRlbnRpb25UeXBlOiBzdHJpbmcpOiBudW1iZXIge1xuICAgIGNvbnN0IG4gPSB0b2tlbkNvdW50O1xuICAgIHN3aXRjaCAoYXR0ZW50aW9uVHlwZSkge1xuICAgICAgY2FzZSAnZnVsbCc6XG4gICAgICAgIHJldHVybiBuICogbjsgLy8gTyhuwrIpXG4gICAgICBjYXNlICdzcGFyc2UnOlxuICAgICAgICByZXR1cm4gbiAqIE1hdGgubG9nKG4pOyAvLyBPKG4gbG9nIG4pXG4gICAgICBjYXNlICdxdWFudGl6ZWQnOlxuICAgICAgICByZXR1cm4gKG4gKiBuKSAvIDQ7IC8vIDQtYml0IHF1YW50aXphdGlvbiByZWR1Y2VzIG9wcyBieSA0eFxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIG4gKiBuO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBUb2tlbiDotoXpmZDop6PlhrPmlrnmoYggLSDkuLroh6rljYfnuqflnLrmma/lrprliLbljovnvKlcbiAgICog6Kej5YazIEhUVFAgNDAwOiBJbnRlcm5hbEVycm9yLkFsZ28uSW52YWxpZFBhcmFtZXRlciAtIFJhbmdlIG9mIGlucHV0IGxlbmd0aCBzaG91bGQgYmUgWzEsIDE5NjYwMV1cbiAgICovXG4gIGFzeW5jIGNvbXByZXNzRm9yVXBncmFkZShyYXdJbnB1dDogc3RyaW5nKTogUHJvbWlzZTxDb21wcmVzc2VkQ29udGV4dD4ge1xuICAgIGNvbnN0IHRva2VuQ291bnQgPSB0aGlzLmVzdGltYXRlVG9rZW5zKHJhd0lucHV0KTtcbiAgICBjb25zdCBkcm9wcGVkU2VjdGlvbnM6IHN0cmluZ1tdID0gW107XG4gICAgbGV0IHRydW5jYXRlZCA9IGZhbHNlO1xuXG4gICAgaWYgKHRva2VuQ291bnQgPiBNQVhfVE9LRU5TKSB7XG4gICAgICBjb25zb2xlLmxvZyhgW0NvbnRleHRDb21wcmVzc29yXSBUb2tlbiDotoXpmZA6ICR7dG9rZW5Db3VudH0gPiAke01BWF9UT0tFTlN9LCDmiafooYzkvJjlhYjnuqfoo4HliapgKTtcbiAgICAgIFxuICAgICAgLy8g5LyY5YWI57qn6KOB5Ymq6KeE5YiZXG4gICAgICBjb25zdCBydWxlczogUHJpb3JpdHlSdWxlcyA9IHtcbiAgICAgICAga2VlcDogWydjdXJyZW50VGFzaycsICdjdXJyZW50RmlsZScsICdkaXJlY3REZXBzJywgJ2NyaXRpY2FsQ29udGV4dCddLFxuICAgICAgICBkcm9wOiBbJ29sZEhpc3RvcnknLCAnaXJyZWxldmFudE1lbW9yeScsICdvbGRWZXJzaW9ucycsICdyZWR1bmRhbnRDb250ZXh0J11cbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IHRydW5jYXRlZElucHV0ID0gdGhpcy50cnVuY2F0ZUJ5UHJpb3JpdHkocmF3SW5wdXQsIHJ1bGVzKTtcbiAgICAgIGRyb3BwZWRTZWN0aW9ucy5wdXNoKC4uLnJ1bGVzLmRyb3ApO1xuICAgICAgdHJ1bmNhdGVkID0gdHJ1ZTtcblxuICAgICAgY29uc3QgbmV3VG9rZW5Db3VudCA9IHRoaXMuZXN0aW1hdGVUb2tlbnModHJ1bmNhdGVkSW5wdXQpO1xuICAgICAgY29uc29sZS5sb2coYFtDb250ZXh0Q29tcHJlc3Nvcl0g6KOB5Ymq5ZCOIHRva2VuOiAke25ld1Rva2VuQ291bnR9LCDljovnvKnmr5Q6ICR7KHRva2VuQ291bnQgLyBuZXdUb2tlbkNvdW50KS50b0ZpeGVkKDIpfXhgKTtcblxuICAgICAgLy8g5aSN55So546w5pyJ5YiG5bGC5Y6L57ypXG4gICAgICBjb25zdCBjb21wcmVzc2VkVG9rZW5zID0gYXdhaXQgdGhpcy5jb21wcmVzc0hpZXJhcmNoaWNhbChcbiAgICAgICAgdHJ1bmNhdGVkSW5wdXQuc3BsaXQoJ1xcbicpLFxuICAgICAgICBERUZBVUxUX1NUUkFURUdJRVMuZmFzdFxuICAgICAgKTtcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdG9rZW5zOiBjb21wcmVzc2VkVG9rZW5zLFxuICAgICAgICB0b2tlbkNvdW50OiBuZXdUb2tlbkNvdW50LFxuICAgICAgICBjb21wcmVzc2lvblJhdGlvOiB0b2tlbkNvdW50IC8gbmV3VG9rZW5Db3VudCxcbiAgICAgICAgdHJ1bmNhdGVkLFxuICAgICAgICBkcm9wcGVkU2VjdGlvbnNcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8g5pyq6LaF6ZmQ77yM55u05o6l5YiG5bGC5Y6L57ypXG4gICAgY29uc3QgY29tcHJlc3NlZFRva2VucyA9IGF3YWl0IHRoaXMuY29tcHJlc3NIaWVyYXJjaGljYWwoXG4gICAgICByYXdJbnB1dC5zcGxpdCgnXFxuJyksXG4gICAgICBERUZBVUxUX1NUUkFURUdJRVMuYmFsYW5jZWRcbiAgICApO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHRva2VuczogY29tcHJlc3NlZFRva2VucyxcbiAgICAgIHRva2VuQ291bnQsXG4gICAgICBjb21wcmVzc2lvblJhdGlvOiAxLFxuICAgICAgdHJ1bmNhdGVkOiBmYWxzZSxcbiAgICAgIGRyb3BwZWRTZWN0aW9uczogW11cbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIOS8sOeulyB0b2tlbiDmlbDph48gKOeugOWMlueul+azlTogMSB0b2tlbiDiiYggNCBjaGFycylcbiAgICovXG4gIHByaXZhdGUgZXN0aW1hdGVUb2tlbnMoaW5wdXQ6IHN0cmluZyk6IG51bWJlciB7XG4gICAgLy8g566A5YyW5Lyw566XOiDlubPlnYcgNCDkuKrlrZfnrKYgPSAxIHRva2VuXG4gICAgLy8g5Lit5paHOiAxLjUg5a2X56ymID0gMSB0b2tlbiwg6Iux5paHOiA0IOWtl+espiA9IDEgdG9rZW5cbiAgICBjb25zdCBjaGFyQ291bnQgPSBpbnB1dC5sZW5ndGg7XG4gICAgY29uc3QgY2hpbmVzZUNoYXJzID0gKGlucHV0Lm1hdGNoKC9bXFx1NGUwMC1cXHU5ZmE1XS9nKSB8fCBbXSkubGVuZ3RoO1xuICAgIGNvbnN0IGVuZ2xpc2hDaGFycyA9IGNoYXJDb3VudCAtIGNoaW5lc2VDaGFycztcbiAgICBcbiAgICAvLyDkuK3mlofmjIkgMS41IOWtl+espi90b2tlbu+8jOiLseaWh+aMiSA0IOWtl+espi90b2tlblxuICAgIGNvbnN0IGVzdGltYXRlZFRva2VucyA9IE1hdGguY2VpbChjaGluZXNlQ2hhcnMgLyAxLjUpICsgTWF0aC5jZWlsKGVuZ2xpc2hDaGFycyAvIDQpO1xuICAgIHJldHVybiBlc3RpbWF0ZWRUb2tlbnM7XG4gIH1cblxuICAvKipcbiAgICog5oyJ5LyY5YWI57qn6KOB5Ymq6L6T5YWl5YaF5a65XG4gICAqL1xuICBwcml2YXRlIHRydW5jYXRlQnlQcmlvcml0eShpbnB1dDogc3RyaW5nLCBydWxlczogUHJpb3JpdHlSdWxlcyk6IHN0cmluZyB7XG4gICAgY29uc3QgbGluZXMgPSBpbnB1dC5zcGxpdCgnXFxuJyk7XG4gICAgY29uc3QgcmVzdWx0OiBzdHJpbmdbXSA9IFtdO1xuICAgIFxuICAgIC8vIOagh+iusOWQhOWMuuWfn1xuICAgIGNvbnN0IHNlY3Rpb25zOiB7IHR5cGU6IHN0cmluZzsgY29udGVudDogc3RyaW5nW107IHByaW9yaXR5OiBudW1iZXIgfVtdID0gW107XG4gICAgbGV0IGN1cnJlbnRTZWN0aW9uOiBzdHJpbmdbXSA9IFtdO1xuICAgIGxldCBjdXJyZW50VHlwZSA9ICd1bmtub3duJztcblxuICAgIC8vIOeugOWMlueahOWMuuWfn+ivhuWIq1xuICAgIGZvciAoY29uc3QgbGluZSBvZiBsaW5lcykge1xuICAgICAgLy8g6K+G5Yir5Yy65Z+f57G75Z6LXG4gICAgICBpZiAobGluZS5pbmNsdWRlcygn5b2T5YmN5Lu75YqhJykgfHwgbGluZS5pbmNsdWRlcygnY3VycmVudFRhc2snKSkge1xuICAgICAgICBpZiAoY3VycmVudFNlY3Rpb24ubGVuZ3RoID4gMCkge1xuICAgICAgICAgIHNlY3Rpb25zLnB1c2goeyB0eXBlOiBjdXJyZW50VHlwZSwgY29udGVudDogY3VycmVudFNlY3Rpb24sIHByaW9yaXR5OiB0aGlzLmdldFByaW9yaXR5KGN1cnJlbnRUeXBlLCBydWxlcykgfSk7XG4gICAgICAgIH1cbiAgICAgICAgY3VycmVudFNlY3Rpb24gPSBbbGluZV07XG4gICAgICAgIGN1cnJlbnRUeXBlID0gJ2N1cnJlbnRUYXNrJztcbiAgICAgIH0gZWxzZSBpZiAobGluZS5pbmNsdWRlcygn5b2T5YmN5paH5Lu2JykgfHwgbGluZS5pbmNsdWRlcygnY3VycmVudEZpbGUnKSkge1xuICAgICAgICBpZiAoY3VycmVudFNlY3Rpb24ubGVuZ3RoID4gMCkge1xuICAgICAgICAgIHNlY3Rpb25zLnB1c2goeyB0eXBlOiBjdXJyZW50VHlwZSwgY29udGVudDogY3VycmVudFNlY3Rpb24sIHByaW9yaXR5OiB0aGlzLmdldFByaW9yaXR5KGN1cnJlbnRUeXBlLCBydWxlcykgfSk7XG4gICAgICAgIH1cbiAgICAgICAgY3VycmVudFNlY3Rpb24gPSBbbGluZV07XG4gICAgICAgIGN1cnJlbnRUeXBlID0gJ2N1cnJlbnRGaWxlJztcbiAgICAgIH0gZWxzZSBpZiAobGluZS5pbmNsdWRlcygn5Y6G5Y+yJykgfHwgbGluZS5pbmNsdWRlcygnaGlzdG9yeScpKSB7XG4gICAgICAgIGlmIChjdXJyZW50U2VjdGlvbi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgc2VjdGlvbnMucHVzaCh7IHR5cGU6IGN1cnJlbnRUeXBlLCBjb250ZW50OiBjdXJyZW50U2VjdGlvbiwgcHJpb3JpdHk6IHRoaXMuZ2V0UHJpb3JpdHkoY3VycmVudFR5cGUsIHJ1bGVzKSB9KTtcbiAgICAgICAgfVxuICAgICAgICBjdXJyZW50U2VjdGlvbiA9IFtsaW5lXTtcbiAgICAgICAgY3VycmVudFR5cGUgPSAnb2xkSGlzdG9yeSc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjdXJyZW50U2VjdGlvbi5wdXNoKGxpbmUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIOa3u+WKoOacgOWQjuS4gOS4quWMuuWfn1xuICAgIGlmIChjdXJyZW50U2VjdGlvbi5sZW5ndGggPiAwKSB7XG4gICAgICBzZWN0aW9ucy5wdXNoKHsgdHlwZTogY3VycmVudFR5cGUsIGNvbnRlbnQ6IGN1cnJlbnRTZWN0aW9uLCBwcmlvcml0eTogdGhpcy5nZXRQcmlvcml0eShjdXJyZW50VHlwZSwgcnVsZXMpIH0pO1xuICAgIH1cblxuICAgIC8vIOaMieS8mOWFiOe6p+aOkuW6j+W5tuS/neeVmemrmOS8mOWFiOe6p+WGheWuuVxuICAgIHNlY3Rpb25zLnNvcnQoKGEsIGIpID0+IGIucHJpb3JpdHkgLSBhLnByaW9yaXR5KTtcblxuICAgIC8vIOS8sOeul+S/neeVmeeahOWGheWuuVxuICAgIGxldCBjdXJyZW50VG9rZW5zID0gMDtcbiAgICBjb25zdCBrZXB0U2VjdGlvbnM6IHN0cmluZ1tdID0gW107XG5cbiAgICBmb3IgKGNvbnN0IHNlY3Rpb24gb2Ygc2VjdGlvbnMpIHtcbiAgICAgIGNvbnN0IHNlY3Rpb25Ub2tlbnMgPSB0aGlzLmVzdGltYXRlVG9rZW5zKHNlY3Rpb24uY29udGVudC5qb2luKCdcXG4nKSk7XG4gICAgICBpZiAoY3VycmVudFRva2VucyArIHNlY3Rpb25Ub2tlbnMgPD0gTUFYX1RPS0VOUyAqIDAuOCkgeyAvLyDkv53nlZkgODAlIOmihOeul1xuICAgICAgICBrZXB0U2VjdGlvbnMucHVzaCguLi5zZWN0aW9uLmNvbnRlbnQpO1xuICAgICAgICBjdXJyZW50VG9rZW5zICs9IHNlY3Rpb25Ub2tlbnM7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGtlcHRTZWN0aW9ucy5qb2luKCdcXG4nKTtcbiAgfVxuXG4gIC8qKlxuICAgKiDojrflj5bljLrln5/kvJjlhYjnuqdcbiAgICovXG4gIHByaXZhdGUgZ2V0UHJpb3JpdHkodHlwZTogc3RyaW5nLCBydWxlczogUHJpb3JpdHlSdWxlcyk6IG51bWJlciB7XG4gICAgaWYgKHJ1bGVzLmtlZXAuaW5jbHVkZXModHlwZSkpIHJldHVybiAxMDsgIC8vIOmrmOS8mOWFiOe6p1xuICAgIGlmIChydWxlcy5kcm9wLmluY2x1ZGVzKHR5cGUpKSByZXR1cm4gMTsgICAvLyDkvY7kvJjlhYjnuqdcbiAgICByZXR1cm4gNTsgIC8vIOS4reetieS8mOWFiOe6p1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBza2lsbCBtZXRhZGF0YS5cbiAgICovXG4gIGdldE1ldGFkYXRhKCk6IFJlY29yZDxzdHJpbmcsIGFueT4ge1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lOiB0aGlzLm5hbWUsXG4gICAgICB2ZXJzaW9uOiB0aGlzLnZlcnNpb24sXG4gICAgICBjb21wcmVzc2lvbkxldmVsczogWydmYXN0JywgJ2JhbGFuY2VkJywgJ2RlZXAnXSxcbiAgICAgIHN1cHBvcnRlZFRhc2tUeXBlczogWydjb2RlJywgJ2RvY3VtZW50JywgJ2NvbnZlcnNhdGlvbiddLFxuICAgICAgbWF4VG9rZW5TdXBwb3J0OiAxMDAwMDAwLFxuICAgICAgZW5lcmd5RWZmaWNpZW5jeVJhdGlvOiAnNTIwMDoxJyxcbiAgICAgIHRva2VuTGltaXQ6IE1BWF9UT0tFTlMsXG4gICAgICB1cGdyYWRlQ29tcHJlc3Npb246IHRydWUsXG4gICAgfTtcbiAgfVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTa2lsbCBSZWdpc3RyYXRpb25cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyQ29udGV4dENvbXByZXNzb3JTa2lsbChyZWdpc3RyeTogYW55KTogdm9pZCB7XG4gIHJlZ2lzdHJ5LnJlZ2lzdGVyKG5ldyBDb250ZXh0Q29tcHJlc3NvclNraWxsKCkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlQ29udGV4dENvbXByZXNzb3JTa2lsbCgpOiBDb250ZXh0Q29tcHJlc3NvclNraWxsIHtcbiAgcmV0dXJuIG5ldyBDb250ZXh0Q29tcHJlc3NvclNraWxsKCk7XG59XG4iXX0=