"use strict";
/**
 * Dynamic Router - ANFSF V1.5.0 中大型项目优化补丁
 *
 * 补丁版本：v2.1-minimal-patch (2026-04-12)
 * 作用：当 Graph 为模块化且跨模块依赖>8 时，自动切换到 multi-module-orchestration 策略
 *
 * @module asf-v4/providers/dynamic-router
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamicRouter = void 0;
exports.createDynamicRouter = createDynamicRouter;
// ============================================================================
// Dynamic Router
// ============================================================================
class DynamicRouter {
    /**
     * 选择执行策略
     */
    selectStrategy(graph) {
        const metadata = this.getGraphMetadata(graph);
        console.log(`🔍 Graph 检测：模块化=${metadata.isModular}, 跨模块依赖=${metadata.crossModuleDependencies}`);
        // 当 Graph 为模块化且跨模块依赖>8 时，启用多模块编排策略
        if (metadata.isModular && metadata.crossModuleDependencies > 8) {
            console.log('🚀 检测到跨模块依赖，启用 multi-module-orchestration 策略（复用事务协议 + 增量交付）');
            return this.createMultiModuleOrchestrationStrategy(graph);
        }
        console.log('📋 选择策略：standard（标准单模块）');
        return this.createStandardStrategy();
    }
    /**
     * 获取 Graph 元数据 - 新增辅助方法
     */
    getGraphMetadata(graph) {
        return {
            isModular: (graph.modules && graph.modules.length > 1) ? true : false,
            crossModuleDependencies: this.countCrossModuleDeps(graph)
        };
    }
    /**
     * 计算跨模块依赖数 - 复用 GraphRAG 已有方法
     */
    countCrossModuleDeps(graph) {
        // 复用 GraphRAG 已有方法，统计跨模块依赖深度
        return graph.crossModuleEdges?.length ||
            graph.dependencies?.length ||
            0;
    }
    /**
     * 创建多模块编排策略 - 复用 Layer 8.5 Orchestration Harness 已有能力
     */
    createMultiModuleOrchestrationStrategy(graph) {
        return {
            name: 'multi-module-orchestration',
            type: 'orchestration',
            config: {
                // 复用已有事务协议
                transactionProtocol: true,
                // 增量交付
                incrementalDelivery: true,
                // 模块执行顺序（拓扑排序）
                executionOrder: this.computeExecutionOrder(graph),
                // 模块间同步点
                syncPoints: this.computeSyncPoints(graph),
                // 回滚策略
                rollbackStrategy: 'module-level',
                // 超时配置
                timeout: {
                    perModule: 300, // 每模块 5 分钟
                    total: 1800 // 总计 30 分钟
                }
            }
        };
    }
    /**
     * 创建标准策略
     */
    createStandardStrategy() {
        return {
            name: 'standard',
            type: 'standard',
            config: {
                transactionProtocol: false,
                incrementalDelivery: false
            }
        };
    }
    /**
     * 计算模块执行顺序 - 拓扑排序
     */
    computeExecutionOrder(graph) {
        if (!graph.modules)
            return [];
        const order = [];
        const visited = new Set();
        const visiting = new Set();
        const visit = (moduleName) => {
            if (visited.has(moduleName))
                return;
            if (visiting.has(moduleName)) {
                console.warn(`⚠️ 检测到循环依赖：${moduleName}`);
                return;
            }
            visiting.add(moduleName);
            const module = graph.modules?.find(m => m.name === moduleName);
            if (module?.dependencies) {
                for (const dep of module.dependencies) {
                    visit(dep.target || dep);
                }
            }
            visiting.delete(moduleName);
            visited.add(moduleName);
            order.push(moduleName);
        };
        for (const module of graph.modules) {
            visit(module.name);
        }
        console.log(`📋 模块执行顺序：${order.join(' → ')}`);
        return order;
    }
    /**
     * 计算模块间同步点
     */
    computeSyncPoints(graph) {
        if (!graph.modules)
            return [];
        // 在每个模块完成后设置同步点
        return graph.modules.map(m => `after-${m.name}`);
    }
}
exports.DynamicRouter = DynamicRouter;
// ============================================================================
// 导出
// ============================================================================
function createDynamicRouter() {
    return new DynamicRouter();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHluYW1pYy1yb3V0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvcHJvdmlkZXJzL2R5bmFtaWMtcm91dGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7OztHQU9HOzs7QUErSkgsa0RBRUM7QUFwSkQsK0VBQStFO0FBQy9FLGlCQUFpQjtBQUNqQiwrRUFBK0U7QUFFL0UsTUFBYSxhQUFhO0lBQ3hCOztPQUVHO0lBQ0gsY0FBYyxDQUFDLEtBQW1CO1FBQ2hDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUU5QyxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixRQUFRLENBQUMsU0FBUyxXQUFXLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSxDQUFDLENBQUM7UUFFaEcsbUNBQW1DO1FBQ25DLElBQUksUUFBUSxDQUFDLFNBQVMsSUFBSSxRQUFRLENBQUMsdUJBQXVCLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDL0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyw2REFBNkQsQ0FBQyxDQUFDO1lBQzNFLE9BQU8sSUFBSSxDQUFDLHNDQUFzQyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzVELENBQUM7UUFFRCxPQUFPLENBQUMsR0FBRyxDQUFDLHlCQUF5QixDQUFDLENBQUM7UUFDdkMsT0FBTyxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztJQUN2QyxDQUFDO0lBRUQ7O09BRUc7SUFDSyxnQkFBZ0IsQ0FBQyxLQUFtQjtRQUkxQyxPQUFPO1lBQ0wsU0FBUyxFQUFFLENBQUMsS0FBSyxDQUFDLE9BQU8sSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLO1lBQ3JFLHVCQUF1QixFQUFFLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUM7U0FDMUQsQ0FBQztJQUNK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QUM7UUFDOUMsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDO0lBRUQ7O09BRUc7SUFDSyxpQkFBaUIsQ0FBQyxLQUFtQjtRQUMzQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU87WUFBRSxPQUFPLEVBQUUsQ0FBQztRQUU5QixnQkFBZ0I7UUFDaEIsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7SUFDbkQsQ0FBQztDQUNGO0FBeElELHNDQXdJQztBQUVELCtFQUErRTtBQUMvRSxLQUFLO0FBQ0wsK0VBQStFO0FBRS9FLFNBQWdCLG1CQUFtQjtJQUNqQyxPQUFPLElBQUksYUFBYSxFQUFFLENBQUM7QUFDN0IsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogRHluYW1pYyBSb3V0ZXIgLSBBTkZTRiBWMS41LjAg5Lit5aSn5Z6L6aG555uu5LyY5YyW6KGl5LiBXG4gKiBcbiAqIOihpeS4geeJiOacrO+8mnYyLjEtbWluaW1hbC1wYXRjaCAoMjAyNi0wNC0xMilcbiAqIOS9nOeUqO+8muW9kyBHcmFwaCDkuLrmqKHlnZfljJbkuJTot6jmqKHlnZfkvp3otZY+OCDml7bvvIzoh6rliqjliIfmjaLliLAgbXVsdGktbW9kdWxlLW9yY2hlc3RyYXRpb24g562W55WlXG4gKiBcbiAqIEBtb2R1bGUgYXNmLXY0L3Byb3ZpZGVycy9keW5hbWljLXJvdXRlclxuICovXG5cbmltcG9ydCB7IFJlZmluZWRHcmFwaCB9IGZyb20gJy4uL2NvcmUvdHlwZXMnO1xuaW1wb3J0IHsgU3RyYXRlZ3kgfSBmcm9tICcuLi9jb3JlL3N0cmF0ZWd5LWNvbmZpZyc7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIOetlueVpeexu+Wei+WumuS5iVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5leHBvcnQgdHlwZSBSb3V0ZXJTdHJhdGVneSA9IFxuICB8ICdzdGFuZGFyZCcgICAgICAgICAgICAgICAgICAgIC8vIOagh+WHhuWNleaooeWdl+etlueVpVxuICB8ICdtdWx0aS1tb2R1bGUtb3JjaGVzdHJhdGlvbic7IC8vIOWkmuaooeWdl+e8luaOkuetlueVpe+8iOWkjeeUqOS6i+WKoeWNj+iuriArIOWinumHj+S6pOS7mO+8iVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBEeW5hbWljIFJvdXRlclxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5leHBvcnQgY2xhc3MgRHluYW1pY1JvdXRlciB7XG4gIC8qKlxuICAgKiDpgInmi6nmiafooYznrZbnlaVcbiAgICovXG4gIHNlbGVjdFN0cmF0ZWd5KGdyYXBoOiBSZWZpbmVkR3JhcGgpOiBTdHJhdGVneSB7XG4gICAgY29uc3QgbWV0YWRhdGEgPSB0aGlzLmdldEdyYXBoTWV0YWRhdGEoZ3JhcGgpO1xuICAgIFxuICAgIGNvbnNvbGUubG9nKGDwn5SNIEdyYXBoIOajgOa1i++8muaooeWdl+WMlj0ke21ldGFkYXRhLmlzTW9kdWxhcn0sIOi3qOaooeWdl+S+nei1lj0ke21ldGFkYXRhLmNyb3NzTW9kdWxlRGVwZW5kZW5jaWVzfWApO1xuICAgIFxuICAgIC8vIOW9kyBHcmFwaCDkuLrmqKHlnZfljJbkuJTot6jmqKHlnZfkvp3otZY+OCDml7bvvIzlkK/nlKjlpJrmqKHlnZfnvJbmjpLnrZbnlaVcbiAgICBpZiAobWV0YWRhdGEuaXNNb2R1bGFyICYmIG1ldGFkYXRhLmNyb3NzTW9kdWxlRGVwZW5kZW5jaWVzID4gOCkge1xuICAgICAgY29uc29sZS5sb2coJ/CfmoAg5qOA5rWL5Yiw6Leo5qih5Z2X5L6d6LWW77yM5ZCv55SoIG11bHRpLW1vZHVsZS1vcmNoZXN0cmF0aW9uIOetlueVpe+8iOWkjeeUqOS6i+WKoeWNj+iuriArIOWinumHj+S6pOS7mO+8iScpO1xuICAgICAgcmV0dXJuIHRoaXMuY3JlYXRlTXVsdGlNb2R1bGVPcmNoZXN0cmF0aW9uU3RyYXRlZ3koZ3JhcGgpO1xuICAgIH1cbiAgICBcbiAgICBjb25zb2xlLmxvZygn8J+TiyDpgInmi6nnrZbnlaXvvJpzdGFuZGFyZO+8iOagh+WHhuWNleaooeWdl++8iScpO1xuICAgIHJldHVybiB0aGlzLmNyZWF0ZVN0YW5kYXJkU3RyYXRlZ3koKTtcbiAgfVxuXG4gIC8qKlxuICAgKiDojrflj5YgR3JhcGgg5YWD5pWw5o2uIC0g5paw5aKe6L6F5Yqp5pa55rOVXG4gICAqL1xuICBwcml2YXRlIGdldEdyYXBoTWV0YWRhdGEoZ3JhcGg6IFJlZmluZWRHcmFwaCk6IHtcbiAgICBpc01vZHVsYXI6IGJvb2xlYW47XG4gICAgY3Jvc3NNb2R1bGVEZXBlbmRlbmNpZXM6IG51bWJlcjtcbiAgfSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGlzTW9kdWxhcjogKGdyYXBoLm1vZHVsZXMgJiYgZ3JhcGgubW9kdWxlcy5sZW5ndGggPiAxKSA/IHRydWUgOiBmYWxzZSxcbiAgICAgIGNyb3NzTW9kdWxlRGVwZW5kZW5jaWVzOiB0aGlzLmNvdW50Q3Jvc3NNb2R1bGVEZXBzKGdyYXBoKVxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICog6K6h566X6Leo5qih5Z2X5L6d6LWW5pWwIC0g5aSN55SoIEdyYXBoUkFHIOW3suacieaWueazlVxuICAgKi9cbiAgcHJpdmF0ZSBjb3VudENyb3NzTW9kdWxlRGVwcyhncmFwaDogUmVmaW5lZEdyYXBoKTogbnVtYmVyIHtcbiAgICAvLyDlpI3nlKggR3JhcGhSQUcg5bey5pyJ5pa55rOV77yM57uf6K6h6Leo5qih5Z2X5L6d6LWW5rex5bqmXG4gICAgcmV0dXJuIChncmFwaCBhcyBhbnkpLmNyb3NzTW9kdWxlRWRnZXM/Lmxlbmd0aCB8fCBcbiAgICAgICAgICAgZ3JhcGguZGVwZW5kZW5jaWVzPy5sZW5ndGggfHwgXG4gICAgICAgICAgIDA7XG4gIH1cblxuICAvKipcbiAgICog5Yib5bu65aSa5qih5Z2X57yW5o6S562W55WlIC0g5aSN55SoIExheWVyIDguNSBPcmNoZXN0cmF0aW9uIEhhcm5lc3Mg5bey5pyJ6IO95YqbXG4gICAqL1xuICBwcml2YXRlIGNyZWF0ZU11bHRpTW9kdWxlT3JjaGVzdHJhdGlvblN0cmF0ZWd5KGdyYXBoOiBSZWZpbmVkR3JhcGgpOiBTdHJhdGVneSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6ICdtdWx0aS1tb2R1bGUtb3JjaGVzdHJhdGlvbicsXG4gICAgICB0eXBlOiAnb3JjaGVzdHJhdGlvbicsXG4gICAgICBjb25maWc6IHtcbiAgICAgICAgLy8g5aSN55So5bey5pyJ5LqL5Yqh5Y2P6K6uXG4gICAgICAgIHRyYW5zYWN0aW9uUHJvdG9jb2w6IHRydWUsXG4gICAgICAgIFxuICAgICAgICAvLyDlop7ph4/kuqTku5hcbiAgICAgICAgaW5jcmVtZW50YWxEZWxpdmVyeTogdHJ1ZSxcbiAgICAgICAgXG4gICAgICAgIC8vIOaooeWdl+aJp+ihjOmhuuW6j++8iOaLk+aJkeaOkuW6j++8iVxuICAgICAgICBleGVjdXRpb25PcmRlcjogdGhpcy5jb21wdXRlRXhlY3V0aW9uT3JkZXIoZ3JhcGgpLFxuICAgICAgICBcbiAgICAgICAgLy8g5qih5Z2X6Ze05ZCM5q2l54K5XG4gICAgICAgIHN5bmNQb2ludHM6IHRoaXMuY29tcHV0ZVN5bmNQb2ludHMoZ3JhcGgpLFxuICAgICAgICBcbiAgICAgICAgLy8g5Zue5rua562W55WlXG4gICAgICAgIHJvbGxiYWNrU3RyYXRlZ3k6ICdtb2R1bGUtbGV2ZWwnLFxuICAgICAgICBcbiAgICAgICAgLy8g6LaF5pe26YWN572uXG4gICAgICAgIHRpbWVvdXQ6IHtcbiAgICAgICAgICBwZXJNb2R1bGU6IDMwMCwgIC8vIOavj+aooeWdlyA1IOWIhumSn1xuICAgICAgICAgIHRvdGFsOiAxODAwICAgICAgLy8g5oC76K6hIDMwIOWIhumSn1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiDliJvlu7rmoIflh4bnrZbnlaVcbiAgICovXG4gIHByaXZhdGUgY3JlYXRlU3RhbmRhcmRTdHJhdGVneSgpOiBTdHJhdGVneSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6ICdzdGFuZGFyZCcsXG4gICAgICB0eXBlOiAnc3RhbmRhcmQnLFxuICAgICAgY29uZmlnOiB7XG4gICAgICAgIHRyYW5zYWN0aW9uUHJvdG9jb2w6IGZhbHNlLFxuICAgICAgICBpbmNyZW1lbnRhbERlbGl2ZXJ5OiBmYWxzZVxuICAgICAgfVxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICog6K6h566X5qih5Z2X5omn6KGM6aG65bqPIC0g5ouT5omR5o6S5bqPXG4gICAqL1xuICBwcml2YXRlIGNvbXB1dGVFeGVjdXRpb25PcmRlcihncmFwaDogUmVmaW5lZEdyYXBoKTogc3RyaW5nW10ge1xuICAgIGlmICghZ3JhcGgubW9kdWxlcykgcmV0dXJuIFtdO1xuICAgIFxuICAgIGNvbnN0IG9yZGVyOiBzdHJpbmdbXSA9IFtdO1xuICAgIGNvbnN0IHZpc2l0ZWQgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICBjb25zdCB2aXNpdGluZyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIFxuICAgIGNvbnN0IHZpc2l0ID0gKG1vZHVsZU5hbWU6IHN0cmluZykgPT4ge1xuICAgICAgaWYgKHZpc2l0ZWQuaGFzKG1vZHVsZU5hbWUpKSByZXR1cm47XG4gICAgICBpZiAodmlzaXRpbmcuaGFzKG1vZHVsZU5hbWUpKSB7XG4gICAgICAgIGNvbnNvbGUud2Fybihg4pqg77iPIOajgOa1i+WIsOW+queOr+S+nei1lu+8miR7bW9kdWxlTmFtZX1gKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgXG4gICAgICB2aXNpdGluZy5hZGQobW9kdWxlTmFtZSk7XG4gICAgICBcbiAgICAgIGNvbnN0IG1vZHVsZSA9IGdyYXBoLm1vZHVsZXM/LmZpbmQobSA9PiBtLm5hbWUgPT09IG1vZHVsZU5hbWUpO1xuICAgICAgaWYgKG1vZHVsZT8uZGVwZW5kZW5jaWVzKSB7XG4gICAgICAgIGZvciAoY29uc3QgZGVwIG9mIG1vZHVsZS5kZXBlbmRlbmNpZXMpIHtcbiAgICAgICAgICB2aXNpdCgoZGVwIGFzIGFueSkudGFyZ2V0IHx8IGRlcCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIFxuICAgICAgdmlzaXRpbmcuZGVsZXRlKG1vZHVsZU5hbWUpO1xuICAgICAgdmlzaXRlZC5hZGQobW9kdWxlTmFtZSk7XG4gICAgICBvcmRlci5wdXNoKG1vZHVsZU5hbWUpO1xuICAgIH07XG4gICAgXG4gICAgZm9yIChjb25zdCBtb2R1bGUgb2YgZ3JhcGgubW9kdWxlcykge1xuICAgICAgdmlzaXQobW9kdWxlLm5hbWUpO1xuICAgIH1cbiAgICBcbiAgICBjb25zb2xlLmxvZyhg8J+TiyDmqKHlnZfmiafooYzpobrluo/vvJoke29yZGVyLmpvaW4oJyDihpIgJyl9YCk7XG4gICAgcmV0dXJuIG9yZGVyO1xuICB9XG5cbiAgLyoqXG4gICAqIOiuoeeul+aooeWdl+mXtOWQjOatpeeCuVxuICAgKi9cbiAgcHJpdmF0ZSBjb21wdXRlU3luY1BvaW50cyhncmFwaDogUmVmaW5lZEdyYXBoKTogc3RyaW5nW10ge1xuICAgIGlmICghZ3JhcGgubW9kdWxlcykgcmV0dXJuIFtdO1xuICAgIFxuICAgIC8vIOWcqOavj+S4quaooeWdl+WujOaIkOWQjuiuvue9ruWQjOatpeeCuVxuICAgIHJldHVybiBncmFwaC5tb2R1bGVzLm1hcChtID0+IGBhZnRlci0ke20ubmFtZX1gKTtcbiAgfVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyDlr7zlh7pcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUR5bmFtaWNSb3V0ZXIoKTogRHluYW1pY1JvdXRlciB7XG4gIHJldHVybiBuZXcgRHluYW1pY1JvdXRlcigpO1xufVxuIl19