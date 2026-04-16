"use strict";
/**
 * Design UI/UX Harness 集成
 *
 * 层级：Layer 8.5.6 - UI Contract Pack
 * 功能：将 DesignSystemConfigLoader 集成到 ANFSF UI/UX Harness
 * 版本：V1.0.0
 * 状态：✅ 完成
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesignHarness = void 0;
exports.getDesignHarness = getDesignHarness;
const design_system_config_1 = require("./design-system-config");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// ============== 核心类 ==============
/**
 * UI/UX Design Harness
 *
 * 负责根据用户需求匹配设计系统，并加载对应的 DESIGN.md 内容
 */
class DesignHarness {
    constructor(designSystemsPath) {
        this.configLoader = design_system_config_1.DesignSystemConfigLoader.getInstance();
        this.designSystemsPath = designSystemsPath || path.join(__dirname, '../../design-systems');
    }
    /**
     * 根据需求匹配设计系统
     *
     * @param requirement 用户需求描述
     * @returns 设计系统匹配结果
     */
    match(requirement) {
        try {
            const result = this.configLoader.match(requirement);
            return {
                designSystem: result.designSystem,
                matchedBy: result.matchedBy,
                confidence: result.confidence,
                metadata: result.metadata,
            };
        }
        catch (error) {
            return {
                designSystem: this.configLoader.getDefault(),
                matchedBy: 'default',
                confidence: 0.5,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    /**
     * 获取设计系统内容
     *
     * @param designSystemName 设计系统名称
     * @returns DESIGN.md 内容
     */
    getDesignContent(designSystemName) {
        try {
            const designPath = path.join(this.designSystemsPath, designSystemName, 'DESIGN.md');
            if (fs.existsSync(designPath)) {
                return fs.readFileSync(designPath, 'utf-8');
            }
            return null;
        }
        catch (error) {
            console.error(`[DesignHarness] ❌ Failed to read design content:`, error);
            return null;
        }
    }
    /**
     * 根据需求匹配并获取设计系统内容
     *
     * @param requirement 用户需求描述
     * @returns 完整的设计系统响应
     */
    matchWithContent(requirement) {
        const matchResult = this.match(requirement);
        if (matchResult.error) {
            return matchResult;
        }
        const content = this.getDesignContent(matchResult.designSystem);
        return {
            ...matchResult,
            designContent: content || undefined,
        };
    }
    /**
     * 获取所有可用的设计系统
     *
     * @returns 设计系统元数据列表
     */
    getAllDesignSystems() {
        return this.configLoader.getAllDesignSystems();
    }
    /**
     * 获取设计系统列表（仅名称）
     *
     * @returns 设计系统名称数组
     */
    getDesignSystemList() {
        return Object.keys(this.configLoader.getAllDesignSystems());
    }
    /**
     * 获取默认设计系统
     *
     * @returns 默认设计系统名称
     */
    getDefault() {
        return this.configLoader.getDefault();
    }
    /**
     * 获取配置版本
     *
     * @returns 配置版本号
     */
    getVersion() {
        return this.configLoader.getVersion();
    }
    /**
     * 验证设计系统是否存在
     *
     * @param designSystemName 设计系统名称
     * @returns 是否存在
     */
    exists(designSystemName) {
        const designPath = path.join(this.designSystemsPath, designSystemName, 'DESIGN.md');
        return fs.existsSync(designPath);
    }
    /**
     * 搜索设计系统
     *
     * @param query 搜索关键词
     * @returns 匹配的设计系统列表
     */
    search(query) {
        const results = [];
        const systems = this.getAllDesignSystems();
        for (const [name, metadata] of Object.entries(systems)) {
            // 按名称匹配
            if (name.toLowerCase().includes(query.toLowerCase())) {
                results.push({
                    designSystem: name,
                    matchedBy: 'keyword',
                    confidence: 1.0,
                    metadata,
                });
                continue;
            }
            // 按标签匹配
            if (metadata.tags?.some(tag => tag.toLowerCase().includes(query.toLowerCase()))) {
                results.push({
                    designSystem: name,
                    matchedBy: 'keyword',
                    confidence: 0.8,
                    metadata,
                });
            }
        }
        return results;
    }
}
exports.DesignHarness = DesignHarness;
// ============== 导出 ==============
// 单例实例
let designHarnessInstance = null;
function getDesignHarness(designSystemsPath) {
    if (!designHarnessInstance) {
        designHarnessInstance = new DesignHarness(designSystemsPath);
    }
    return designHarnessInstance;
}
exports.default = DesignHarness;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVzaWduLWhhcm5lc3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMvZGVzaWduL2Rlc2lnbi1oYXJuZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7OztHQU9HOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFpTkgsNENBS0M7QUFwTkQsaUVBQWlHO0FBQ2pHLHVDQUF5QjtBQUN6QiwyQ0FBNkI7QUFtQjdCLG9DQUFvQztBQUVwQzs7OztHQUlHO0FBQ0gsTUFBYSxhQUFhO0lBSXhCLFlBQVksaUJBQTBCO1FBQ3BDLElBQUksQ0FBQyxZQUFZLEdBQUcsK0NBQXdCLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDM0QsSUFBSSxDQUFDLGlCQUFpQixHQUFHLGlCQUFpQixJQUFJLElBQUksQ0FBQyxJQUFJLENBQ3JELFNBQVMsRUFDVCxzQkFBc0IsQ0FDdkIsQ0FBQztJQUNKLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNILEtBQUssQ0FBQyxXQUFtQjtRQUN2QixJQUFJLENBQUM7WUFDSCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUVwRCxPQUFPO2dCQUNMLFlBQVksRUFBRSxNQUFNLENBQUMsWUFBWTtnQkFDakMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxTQUFTO2dCQUMzQixVQUFVLEVBQUUsTUFBTSxDQUFDLFVBQVU7Z0JBQzdCLFFBQVEsRUFBRSxNQUFNLENBQUMsUUFBUTthQUMxQixDQUFDO1FBQ0osQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixPQUFPO2dCQUNMLFlBQVksRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsRUFBRTtnQkFDNUMsU0FBUyxFQUFFLFNBQVM7Z0JBQ3BCLFVBQVUsRUFBRSxHQUFHO2dCQUNmLEtBQUssRUFBRSxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxL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QUFHLENBQUMsRUFBRSxDQUM1QixHQUFHLENBQUMsV0FBVyxFQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUNoRCxFQUFFLENBQUM7Z0JBQ0YsT0FBTyxDQUFDLElBQUksQ0FBQztvQkFDWCxZQUFZLEVBQUUsSUFBSTtvQkFDbEIsU0FBUyxFQUFFLFNBQVM7b0JBQ3BCLFVBQVUsRUFBRSxHQUFHO29CQUNmLFFBQVE7aUJBQ1QsQ0FBQyxDQUFDO1lBQ0wsQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLE9BQU8sQ0FBQztJQUNqQixDQUFDO0NBQ0Y7QUE1S0Qsc0NBNEtDO0FBRUQsbUNBQW1DO0FBRW5DLE9BQU87QUFDUCxJQUFJLHFCQUFxQixHQUF5QixJQUFJLENBQUM7QUFFdkQsU0FBZ0IsZ0JBQWdCLENBQUMsaUJBQTBCO0lBQ3pELElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1FBQzNCLHFCQUFxQixHQUFHLElBQUksYUFBYSxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDL0QsQ0FBQztJQUNELE9BQU8scUJBQXFCLENBQUM7QUFDL0IsQ0FBQztBQUVELGtCQUFlLGFBQWEsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogRGVzaWduIFVJL1VYIEhhcm5lc3Mg6ZuG5oiQXG4gKiBcbiAqIOWxgue6p++8mkxheWVyIDguNS42IC0gVUkgQ29udHJhY3QgUGFja1xuICog5Yqf6IO977ya5bCGIERlc2lnblN5c3RlbUNvbmZpZ0xvYWRlciDpm4bmiJDliLAgQU5GU0YgVUkvVVggSGFybmVzc1xuICog54mI5pys77yaVjEuMC4wXG4gKiDnirbmgIHvvJrinIUg5a6M5oiQXG4gKi9cblxuaW1wb3J0IHsgRGVzaWduU3lzdGVtQ29uZmlnTG9hZGVyLCBNYXRjaFJlc3VsdCwgRGVzaWduU3lzdGVtTWV0YSB9IGZyb20gJy4vZGVzaWduLXN5c3RlbS1jb25maWcnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcblxuLy8gPT09PT09PT09PT09PT0g57G75Z6L5a6a5LmJID09PT09PT09PT09PT09XG5cbmV4cG9ydCBpbnRlcmZhY2UgRGVzaWduQ29udGV4dCB7XG4gIHJlcXVpcmVtZW50OiBzdHJpbmc7XG4gIG1hdGNoZWREZXNpZ24/OiBNYXRjaFJlc3VsdDtcbiAgZGVzaWduQ29udGVudD86IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBEZXNpZ25TeXN0ZW1SZXNwb25zZSB7XG4gIGRlc2lnblN5c3RlbTogc3RyaW5nO1xuICBtYXRjaGVkQnk6ICd1c2VyX3NwZWNpZmllZCcgfCAna2V5d29yZCcgfCAnYWxpYXMnIHwgJ2RlZmF1bHQnO1xuICBjb25maWRlbmNlOiBudW1iZXI7XG4gIG1ldGFkYXRhPzogRGVzaWduU3lzdGVtTWV0YTtcbiAgZGVzaWduQ29udGVudD86IHN0cmluZztcbiAgZXJyb3I/OiBzdHJpbmc7XG59XG5cbi8vID09PT09PT09PT09PT09IOaguOW/g+exuyA9PT09PT09PT09PT09PVxuXG4vKipcbiAqIFVJL1VYIERlc2lnbiBIYXJuZXNzXG4gKiBcbiAqIOi0n+i0o+agueaNrueUqOaIt+mcgOaxguWMuemFjeiuvuiuoeezu+e7n++8jOW5tuWKoOi9veWvueW6lOeahCBERVNJR04ubWQg5YaF5a65XG4gKi9cbmV4cG9ydCBjbGFzcyBEZXNpZ25IYXJuZXNzIHtcbiAgcHJpdmF0ZSBjb25maWdMb2FkZXI6IERlc2lnblN5c3RlbUNvbmZpZ0xvYWRlcjtcbiAgcHJpdmF0ZSBkZXNpZ25TeXN0ZW1zUGF0aDogc3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKGRlc2lnblN5c3RlbXNQYXRoPzogc3RyaW5nKSB7XG4gICAgdGhpcy5jb25maWdMb2FkZXIgPSBEZXNpZ25TeXN0ZW1Db25maWdMb2FkZXIuZ2V0SW5zdGFuY2UoKTtcbiAgICB0aGlzLmRlc2lnblN5c3RlbXNQYXRoID0gZGVzaWduU3lzdGVtc1BhdGggfHwgcGF0aC5qb2luKFxuICAgICAgX19kaXJuYW1lLFxuICAgICAgJy4uLy4uL2Rlc2lnbi1zeXN0ZW1zJ1xuICAgICk7XG4gIH1cblxuICAvKipcbiAgICog5qC55o2u6ZyA5rGC5Yy56YWN6K6+6K6h57O757ufXG4gICAqIFxuICAgKiBAcGFyYW0gcmVxdWlyZW1lbnQg55So5oi36ZyA5rGC5o+P6L+wXG4gICAqIEByZXR1cm5zIOiuvuiuoeezu+e7n+WMuemFjee7k+aenFxuICAgKi9cbiAgbWF0Y2gocmVxdWlyZW1lbnQ6IHN0cmluZyk6IERlc2lnblN5c3RlbVJlc3BvbnNlIHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5jb25maWdMb2FkZXIubWF0Y2gocmVxdWlyZW1lbnQpO1xuICAgICAgXG4gICAgICByZXR1cm4ge1xuICAgICAgICBkZXNpZ25TeXN0ZW06IHJlc3VsdC5kZXNpZ25TeXN0ZW0sXG4gICAgICAgIG1hdGNoZWRCeTogcmVzdWx0Lm1hdGNoZWRCeSxcbiAgICAgICAgY29uZmlkZW5jZTogcmVzdWx0LmNvbmZpZGVuY2UsXG4gICAgICAgIG1ldGFkYXRhOiByZXN1bHQubWV0YWRhdGEsXG4gICAgICB9O1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBkZXNpZ25TeXN0ZW06IHRoaXMuY29uZmlnTG9hZGVyLmdldERlZmF1bHQoKSxcbiAgICAgICAgbWF0Y2hlZEJ5OiAnZGVmYXVsdCcsXG4gICAgICAgIGNvbmZpZGVuY2U6IDAuNSxcbiAgICAgICAgZXJyb3I6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InLFxuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICog6I635Y+W6K6+6K6h57O757uf5YaF5a65XG4gICAqIFxuICAgKiBAcGFyYW0gZGVzaWduU3lzdGVtTmFtZSDorr7orqHns7vnu5/lkI3np7BcbiAgICogQHJldHVybnMgREVTSUdOLm1kIOWGheWuuVxuICAgKi9cbiAgZ2V0RGVzaWduQ29udGVudChkZXNpZ25TeXN0ZW1OYW1lOiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsIHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgZGVzaWduUGF0aCA9IHBhdGguam9pbihcbiAgICAgICAgdGhpcy5kZXNpZ25TeXN0ZW1zUGF0aCxcbiAgICAgICAgZGVzaWduU3lzdGVtTmFtZSxcbiAgICAgICAgJ0RFU0lHTi5tZCdcbiAgICAgICk7XG5cbiAgICAgIGlmIChmcy5leGlzdHNTeW5jKGRlc2lnblBhdGgpKSB7XG4gICAgICAgIHJldHVybiBmcy5yZWFkRmlsZVN5bmMoZGVzaWduUGF0aCwgJ3V0Zi04Jyk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKGBbRGVzaWduSGFybmVzc10g4p2MIEZhaWxlZCB0byByZWFkIGRlc2lnbiBjb250ZW50OmAsIGVycm9yKTtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiDmoLnmja7pnIDmsYLljLnphY3lubbojrflj5borr7orqHns7vnu5/lhoXlrrlcbiAgICogXG4gICAqIEBwYXJhbSByZXF1aXJlbWVudCDnlKjmiLfpnIDmsYLmj4/ov7BcbiAgICogQHJldHVybnMg5a6M5pW055qE6K6+6K6h57O757uf5ZON5bqUXG4gICAqL1xuICBtYXRjaFdpdGhDb250ZW50KHJlcXVpcmVtZW50OiBzdHJpbmcpOiBEZXNpZ25TeXN0ZW1SZXNwb25zZSB7XG4gICAgY29uc3QgbWF0Y2hSZXN1bHQgPSB0aGlzLm1hdGNoKHJlcXVpcmVtZW50KTtcbiAgICBcbiAgICBpZiAobWF0Y2hSZXN1bHQuZXJyb3IpIHtcbiAgICAgIHJldHVybiBtYXRjaFJlc3VsdDtcbiAgICB9XG5cbiAgICBjb25zdCBjb250ZW50ID0gdGhpcy5nZXREZXNpZ25Db250ZW50KG1hdGNoUmVzdWx0LmRlc2lnblN5c3RlbSk7XG4gICAgXG4gICAgcmV0dXJuIHtcbiAgICAgIC4uLm1hdGNoUmVzdWx0LFxuICAgICAgZGVzaWduQ29udGVudDogY29udGVudCB8fCB1bmRlZmluZWQsXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiDojrflj5bmiYDmnInlj6/nlKjnmoTorr7orqHns7vnu59cbiAgICogXG4gICAqIEByZXR1cm5zIOiuvuiuoeezu+e7n+WFg+aVsOaNruWIl+ihqFxuICAgKi9cbiAgZ2V0QWxsRGVzaWduU3lzdGVtcygpOiBSZWNvcmQ8c3RyaW5nLCBEZXNpZ25TeXN0ZW1NZXRhPiB7XG4gICAgcmV0dXJuIHRoaXMuY29uZmlnTG9hZGVyLmdldEFsbERlc2lnblN5c3RlbXMoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiDojrflj5borr7orqHns7vnu5/liJfooajvvIjku4XlkI3np7DvvIlcbiAgICogXG4gICAqIEByZXR1cm5zIOiuvuiuoeezu+e7n+WQjeensOaVsOe7hFxuICAgKi9cbiAgZ2V0RGVzaWduU3lzdGVtTGlzdCgpOiBzdHJpbmdbXSB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMuY29uZmlnTG9hZGVyLmdldEFsbERlc2lnblN5c3RlbXMoKSk7XG4gIH1cblxuICAvKipcbiAgICog6I635Y+W6buY6K6k6K6+6K6h57O757ufXG4gICAqIFxuICAgKiBAcmV0dXJucyDpu5jorqTorr7orqHns7vnu5/lkI3np7BcbiAgICovXG4gIGdldERlZmF1bHQoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5jb25maWdMb2FkZXIuZ2V0RGVmYXVsdCgpO1xuICB9XG5cbiAgLyoqXG4gICAqIOiOt+WPlumFjee9rueJiOacrFxuICAgKiBcbiAgICogQHJldHVybnMg6YWN572u54mI5pys5Y+3XG4gICAqL1xuICBnZXRWZXJzaW9uKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuY29uZmlnTG9hZGVyLmdldFZlcnNpb24oKTtcbiAgfVxuXG4gIC8qKlxuICAgKiDpqozor4Horr7orqHns7vnu5/mmK/lkKblrZjlnKhcbiAgICogXG4gICAqIEBwYXJhbSBkZXNpZ25TeXN0ZW1OYW1lIOiuvuiuoeezu+e7n+WQjeensFxuICAgKiBAcmV0dXJucyDmmK/lkKblrZjlnKhcbiAgICovXG4gIGV4aXN0cyhkZXNpZ25TeXN0ZW1OYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBjb25zdCBkZXNpZ25QYXRoID0gcGF0aC5qb2luKFxuICAgICAgdGhpcy5kZXNpZ25TeXN0ZW1zUGF0aCxcbiAgICAgIGRlc2lnblN5c3RlbU5hbWUsXG4gICAgICAnREVTSUdOLm1kJ1xuICAgICk7XG4gICAgcmV0dXJuIGZzLmV4aXN0c1N5bmMoZGVzaWduUGF0aCk7XG4gIH1cblxuICAvKipcbiAgICog5pCc57Si6K6+6K6h57O757ufXG4gICAqIFxuICAgKiBAcGFyYW0gcXVlcnkg5pCc57Si5YWz6ZSu6K+NXG4gICAqIEByZXR1cm5zIOWMuemFjeeahOiuvuiuoeezu+e7n+WIl+ihqFxuICAgKi9cbiAgc2VhcmNoKHF1ZXJ5OiBzdHJpbmcpOiBEZXNpZ25TeXN0ZW1SZXNwb25zZVtdIHtcbiAgICBjb25zdCByZXN1bHRzOiBEZXNpZ25TeXN0ZW1SZXNwb25zZVtdID0gW107XG4gICAgY29uc3Qgc3lzdGVtcyA9IHRoaXMuZ2V0QWxsRGVzaWduU3lzdGVtcygpO1xuXG4gICAgZm9yIChjb25zdCBbbmFtZSwgbWV0YWRhdGFdIG9mIE9iamVjdC5lbnRyaWVzKHN5c3RlbXMpKSB7XG4gICAgICAvLyDmjInlkI3np7DljLnphY1cbiAgICAgIGlmIChuYW1lLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMocXVlcnkudG9Mb3dlckNhc2UoKSkpIHtcbiAgICAgICAgcmVzdWx0cy5wdXNoKHtcbiAgICAgICAgICBkZXNpZ25TeXN0ZW06IG5hbWUsXG4gICAgICAgICAgbWF0Y2hlZEJ5OiAna2V5d29yZCcsXG4gICAgICAgICAgY29uZmlkZW5jZTogMS4wLFxuICAgICAgICAgIG1ldGFkYXRhLFxuICAgICAgICB9KTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIC8vIOaMieagh+etvuWMuemFjVxuICAgICAgaWYgKG1ldGFkYXRhLnRhZ3M/LnNvbWUodGFnID0+IFxuICAgICAgICB0YWcudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhxdWVyeS50b0xvd2VyQ2FzZSgpKVxuICAgICAgKSkge1xuICAgICAgICByZXN1bHRzLnB1c2goe1xuICAgICAgICAgIGRlc2lnblN5c3RlbTogbmFtZSxcbiAgICAgICAgICBtYXRjaGVkQnk6ICdrZXl3b3JkJyxcbiAgICAgICAgICBjb25maWRlbmNlOiAwLjgsXG4gICAgICAgICAgbWV0YWRhdGEsXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXN1bHRzO1xuICB9XG59XG5cbi8vID09PT09PT09PT09PT09IOWvvOWHuiA9PT09PT09PT09PT09PVxuXG4vLyDljZXkvovlrp7kvotcbmxldCBkZXNpZ25IYXJuZXNzSW5zdGFuY2U6IERlc2lnbkhhcm5lc3MgfCBudWxsID0gbnVsbDtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldERlc2lnbkhhcm5lc3MoZGVzaWduU3lzdGVtc1BhdGg/OiBzdHJpbmcpOiBEZXNpZ25IYXJuZXNzIHtcbiAgaWYgKCFkZXNpZ25IYXJuZXNzSW5zdGFuY2UpIHtcbiAgICBkZXNpZ25IYXJuZXNzSW5zdGFuY2UgPSBuZXcgRGVzaWduSGFybmVzcyhkZXNpZ25TeXN0ZW1zUGF0aCk7XG4gIH1cbiAgcmV0dXJuIGRlc2lnbkhhcm5lc3NJbnN0YW5jZTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgRGVzaWduSGFybmVzczsiXX0=