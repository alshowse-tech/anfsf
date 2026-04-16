"use strict";
/**
 * Design System 配置加载器
 *
 * 层级：Layer 8.5.6 - UI Contract Pack
 * 功能：读取 design-mapping.yaml，关键词匹配设计系统
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
exports.DesignSystemConfigLoader = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const js_yaml_1 = require("js-yaml");
// ============== 核心类 ==============
class DesignSystemConfigLoader {
    constructor(configPath) {
        this.config = null;
        this.lastModified = 0;
        this.fileWatcher = null;
        this.configPath = configPath || path.join(__dirname, '../../config/design-mapping.yaml');
        this.loadConfig();
        this.watchConfigFile();
    }
    static getInstance(configPath) {
        if (!DesignSystemConfigLoader.instance) {
            DesignSystemConfigLoader.instance = new DesignSystemConfigLoader(configPath);
        }
        return DesignSystemConfigLoader.instance;
    }
    /**
     * 加载配置文件
     */
    loadConfig() {
        try {
            const yamlContent = fs.readFileSync(this.configPath, 'utf-8');
            this.config = this.parseYaml(yamlContent);
            this.lastModified = fs.statSync(this.configPath).mtimeMs;
            console.log(`[DesignSystemConfig] ✅ Config loaded: ${this.configPath}`);
        }
        catch (error) {
            console.error(`[DesignSystemConfig] ❌ Failed to load config:`, error);
            // 使用默认配置
            this.config = this.getDefaultConfig();
        }
    }
    /**
     * 解析 YAML (使用 js-yaml)
     */
    parseYaml(yaml) {
        try {
            const config = (0, js_yaml_1.load)(yaml);
            return config;
        }
        catch (error) {
            console.error('[DesignSystemConfig] ❌ YAML parse error:', error);
            return this.getDefaultConfig();
        }
    }
    /**
     * 获取默认配置
     */
    getDefaultConfig() {
        return {
            version: '1.0.0',
            default: 'linear',
            keywords: {
                'saas|生产力': 'linear',
                '支付|payment': 'stripe',
                '营销|landing': 'vercel',
                'apple|苹果': 'apple',
                'ai|人工智能': 'claude',
            },
            excludes: [],
            aliases: {},
            designSystems: {},
        };
    }
    /**
     * 监听配置文件变化
     */
    watchConfigFile() {
        try {
            this.fileWatcher = fs.watch(this.configPath, (event) => {
                if (event === 'change') {
                    this.reload();
                }
            });
            console.log(`[DesignSystemConfig] 👁️ Watching config file`);
        }
        catch (error) {
            console.error(`[DesignSystemConfig] ⚠️ Cannot watch file:`, error);
        }
    }
    /**
     * 重新加载配置
     */
    reload() {
        const stats = fs.statSync(this.configPath);
        if (stats.mtimeMs > this.lastModified) {
            this.loadConfig();
            console.log(`[DesignSystemConfig] 🔄 Config reloaded`);
        }
    }
    /**
     * 匹配设计系统
     */
    match(text) {
        // 1. 检查用户是否直接指定了设计系统
        const userSpecified = this.extractUserSpecified(text);
        if (userSpecified) {
            const resolved = this.resolveAlias(userSpecified);
            return {
                designSystem: resolved || userSpecified,
                matchedBy: 'user_specified',
                confidence: 1.0,
                metadata: this.config?.designSystems[resolved || userSpecified],
            };
        }
        // 2. 关键词匹配
        for (const [pattern, design] of Object.entries(this.config?.keywords || {})) {
            const regex = new RegExp(pattern, 'i');
            if (regex.test(text)) {
                // 检查排除规则
                if (this.isExcluded(text, design)) {
                    continue;
                }
                return {
                    designSystem: design,
                    matchedBy: 'keyword',
                    confidence: 0.8,
                    metadata: this.config?.designSystems[design],
                };
            }
        }
        // 3. 使用默认值
        return {
            designSystem: this.config?.default || 'linear',
            matchedBy: 'default',
            confidence: 0.5,
            metadata: this.config?.designSystems[this.config?.default || 'linear'],
        };
    }
    /**
     * 提取用户指定的设计系统
     */
    extractUserSpecified(text) {
        const patterns = [
            /使用\s*([a-zA-Z\u4e00-\u9fa5]+)\s*风格/,
            /按\s*([a-zA-Z\u4e00-\u9fa5]+)\s*设计/,
            /参考\s*([a-zA-Z\u4e00-\u9fa5]+)/,
            /design[:\s]*([a-zA-Z]+)/i,
            /style[:\s]*([a-zA-Z]+)/i,
        ];
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                return match[1].toLowerCase();
            }
        }
        return null;
    }
    /**
     * 解析别名
     */
    resolveAlias(input) {
        const normalized = input.toLowerCase();
        for (const [design, aliases] of Object.entries(this.config?.aliases || {})) {
            if (aliases.includes(normalized)) {
                return design;
            }
        }
        return null;
    }
    /**
     * 检查排除规则
     */
    isExcluded(text, design) {
        for (const exclude of this.config?.excludes || []) {
            if (exclude.design === design) {
                const regex = new RegExp(exclude.pattern, 'i');
                if (regex.test(text)) {
                    return true;
                }
            }
        }
        return false;
    }
    /**
     * 获取默认设计系统
     */
    getDefault() {
        return this.config?.default || 'linear';
    }
    /**
     * 获取所有设计系统元数据
     */
    getAllDesignSystems() {
        return this.config?.designSystems || {};
    }
    /**
     * 获取配置版本
     */
    getVersion() {
        return this.config?.version || '1.0.0';
    }
    /**
     * 清理资源
     */
    dispose() {
        if (this.fileWatcher) {
            this.fileWatcher.close();
            this.fileWatcher = null;
        }
    }
}
exports.DesignSystemConfigLoader = DesignSystemConfigLoader;
// ============== 导出 ==============
exports.default = DesignSystemConfigLoader;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVzaWduLXN5c3RlbS1jb25maWcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMvZGVzaWduL2Rlc2lnbi1zeXN0ZW0tY29uZmlnLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7OztHQU9HOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCx1Q0FBeUI7QUFDekIsMkNBQTZCO0FBQzdCLHFDQUE0QztBQTRCNUMsb0NBQW9DO0FBRXBDLE1BQWEsd0JBQXdCO0lBT25DLFlBQW9CLFVBQW1CO1FBTC9CLFdBQU0sR0FBK0IsSUFBSSxDQUFDO1FBRTFDLGlCQUFZLEdBQVcsQ0FBQyxDQUFDO1FBQ3pCLGdCQUFXLEdBQXdCLElBQUksQ0FBQztRQUc5QyxJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUN2QyxTQUFTLEVBQ1Qsa0NBQWtDLENBQ25DLENBQUM7UUFDRixJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDbEIsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO0lBQ3pCLENBQUM7SUFFRCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQW1CO1FBQ3BDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUN2Qyx3QkFBd0IsQ0FBQyxRQUFRLEdBQUcsSUFBSSx3QkFBd0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUMvRSxDQUFDO1FBQ0QsT0FBTyx3QkFBd0IsQ0FBQyxRQUFRLENBQUM7SUFDM0MsQ0FBQztJQUVEOztPQUVHO0lBQ0ssVUFBVTtRQUNoQixJQUFJLENBQUM7WUFDSCxNQUFNLFdBQVcsR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDOUQsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQzFDLElBQUks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QUNSLE9BQU8sSUFBSSxDQUFDLE1BQU0sRUFBRSxPQUFPLElBQUksUUFBUSxDQUFDO0lBQzFDLENBQUM7SUFFRDs7T0FFRztJQUNILG1CQUFtQjtRQUNqQixPQUFPLElBQUksQ0FBQyxNQUFNLEVBQUUsYUFBYSxJQUFJLEVBQUUsQ0FBQztJQUMxQyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxVQUFVO1FBQ1IsT0FBTyxJQUFJLENBQUMsTUFBTSxFQUFFLE9BQU8sSUFBSSxPQUFPLENBQUM7SUFDekMsQ0FBQztJQUVEOztPQUVHO0lBQ0gsT0FBTztRQUNMLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3JCLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDekIsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7UUFDMUIsQ0FBQztJQUNILENBQUM7Q0FDRjtBQTVORCw0REE0TkM7QUFFRCxtQ0FBbUM7QUFFbkMsa0JBQWUsd0JBQXdCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIERlc2lnbiBTeXN0ZW0g6YWN572u5Yqg6L295ZmoXG4gKiBcbiAqIOWxgue6p++8mkxheWVyIDguNS42IC0gVUkgQ29udHJhY3QgUGFja1xuICog5Yqf6IO977ya6K+75Y+WIGRlc2lnbi1tYXBwaW5nLnlhbWzvvIzlhbPplK7or43ljLnphY3orr7orqHns7vnu59cbiAqIOeJiOacrO+8mlYxLjAuMFxuICog54q25oCB77ya4pyFIOWujOaIkFxuICovXG5cbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBsb2FkIGFzIHBhcnNlWWFtbCB9IGZyb20gJ2pzLXlhbWwnO1xuXG4vLyA9PT09PT09PT09PT09PSDnsbvlnovlrprkuYkgPT09PT09PT09PT09PT1cblxuZXhwb3J0IGludGVyZmFjZSBEZXNpZ25NYXBwaW5nQ29uZmlnIHtcbiAgdmVyc2lvbjogc3RyaW5nO1xuICBkZWZhdWx0OiBzdHJpbmc7XG4gIGtleXdvcmRzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+O1xuICBleGNsdWRlczogQXJyYXk8eyBwYXR0ZXJuOiBzdHJpbmc7IGRlc2lnbjogc3RyaW5nIH0+O1xuICBhbGlhc2VzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmdbXT47XG4gIGRlc2lnblN5c3RlbXM6IFJlY29yZDxzdHJpbmcsIERlc2lnblN5c3RlbU1ldGE+O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIERlc2lnblN5c3RlbU1ldGEge1xuICBuYW1lOiBzdHJpbmc7XG4gIGRlc2NyaXB0aW9uOiBzdHJpbmc7XG4gIHRhZ3M6IHN0cmluZ1tdO1xuICBwcmltYXJ5Q29sb3I6IHN0cmluZztcbiAgZGFya01vZGU6IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTWF0Y2hSZXN1bHQge1xuICBkZXNpZ25TeXN0ZW06IHN0cmluZztcbiAgbWF0Y2hlZEJ5OiAndXNlcl9zcGVjaWZpZWQnIHwgJ2tleXdvcmQnIHwgJ2FsaWFzJyB8ICdkZWZhdWx0JztcbiAgY29uZmlkZW5jZTogbnVtYmVyO1xuICBtZXRhZGF0YT86IERlc2lnblN5c3RlbU1ldGE7XG59XG5cbi8vID09PT09PT09PT09PT09IOaguOW/g+exuyA9PT09PT09PT09PT09PVxuXG5leHBvcnQgY2xhc3MgRGVzaWduU3lzdGVtQ29uZmlnTG9hZGVyIHtcbiAgcHJpdmF0ZSBzdGF0aWMgaW5zdGFuY2U6IERlc2lnblN5c3RlbUNvbmZpZ0xvYWRlcjtcbiAgcHJpdmF0ZSBjb25maWc6IERlc2lnbk1hcHBpbmdDb25maWcgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBjb25maWdQYXRoOiBzdHJpbmc7XG4gIHByaXZhdGUgbGFzdE1vZGlmaWVkOiBudW1iZXIgPSAwO1xuICBwcml2YXRlIGZpbGVXYXRjaGVyOiBmcy5GU1dhdGNoZXIgfCBudWxsID0gbnVsbDtcblxuICBwcml2YXRlIGNvbnN0cnVjdG9yKGNvbmZpZ1BhdGg/OiBzdHJpbmcpIHtcbiAgICB0aGlzLmNvbmZpZ1BhdGggPSBjb25maWdQYXRoIHx8IHBhdGguam9pbihcbiAgICAgIF9fZGlybmFtZSxcbiAgICAgICcuLi8uLi9jb25maWcvZGVzaWduLW1hcHBpbmcueWFtbCdcbiAgICApO1xuICAgIHRoaXMubG9hZENvbmZpZygpO1xuICAgIHRoaXMud2F0Y2hDb25maWdGaWxlKCk7XG4gIH1cblxuICBzdGF0aWMgZ2V0SW5zdGFuY2UoY29uZmlnUGF0aD86IHN0cmluZyk6IERlc2lnblN5c3RlbUNvbmZpZ0xvYWRlciB7XG4gICAgaWYgKCFEZXNpZ25TeXN0ZW1Db25maWdMb2FkZXIuaW5zdGFuY2UpIHtcbiAgICAgIERlc2lnblN5c3RlbUNvbmZpZ0xvYWRlci5pbnN0YW5jZSA9IG5ldyBEZXNpZ25TeXN0ZW1Db25maWdMb2FkZXIoY29uZmlnUGF0aCk7XG4gICAgfVxuICAgIHJldHVybiBEZXNpZ25TeXN0ZW1Db25maWdMb2FkZXIuaW5zdGFuY2U7XG4gIH1cblxuICAvKipcbiAgICog5Yqg6L296YWN572u5paH5Lu2XG4gICAqL1xuICBwcml2YXRlIGxvYWRDb25maWcoKTogdm9pZCB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHlhbWxDb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKHRoaXMuY29uZmlnUGF0aCwgJ3V0Zi04Jyk7XG4gICAgICB0aGlzLmNvbmZpZyA9IHRoaXMucGFyc2VZYW1sKHlhbWxDb250ZW50KTtcbiAgICAgIHRoaXMubGFzdE1vZGlmaWVkID0gZnMuc3RhdFN5bmModGhpcy5jb25maWdQYXRoKS5tdGltZU1zO1xuICAgICAgY29uc29sZS5sb2coYFtEZXNpZ25TeXN0ZW1Db25maWddIOKchSBDb25maWcgbG9hZGVkOiAke3RoaXMuY29uZmlnUGF0aH1gKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcihgW0Rlc2lnblN5c3RlbUNvbmZpZ10g4p2MIEZhaWxlZCB0byBsb2FkIGNvbmZpZzpgLCBlcnJvcik7XG4gICAgICAvLyDkvb/nlKjpu5jorqTphY3nva5cbiAgICAgIHRoaXMuY29uZmlnID0gdGhpcy5nZXREZWZhdWx0Q29uZmlnKCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIOino+aekCBZQU1MICjkvb/nlKgganMteWFtbClcbiAgICovXG4gIHByaXZhdGUgcGFyc2VZYW1sKHlhbWw6IHN0cmluZyk6IERlc2lnbk1hcHBpbmdDb25maWcge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBjb25maWcgPSBwYXJzZVlhbWwoeWFtbCkgYXMgRGVzaWduTWFwcGluZ0NvbmZpZztcbiAgICAgIHJldHVybiBjb25maWc7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tEZXNpZ25TeXN0ZW1Db25maWddIOKdjCBZQU1MIHBhcnNlIGVycm9yOicsIGVycm9yKTtcbiAgICAgIHJldHVybiB0aGlzLmdldERlZmF1bHRDb25maWcoKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICog6I635Y+W6buY6K6k6YWN572uXG4gICAqL1xuICBwcml2YXRlIGdldERlZmF1bHRDb25maWcoKTogRGVzaWduTWFwcGluZ0NvbmZpZyB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHZlcnNpb246ICcxLjAuMCcsXG4gICAgICBkZWZhdWx0OiAnbGluZWFyJyxcbiAgICAgIGtleXdvcmRzOiB7XG4gICAgICAgICdzYWFzfOeUn+S6p+WKmyc6ICdsaW5lYXInLFxuICAgICAgICAn5pSv5LuYfHBheW1lbnQnOiAnc3RyaXBlJyxcbiAgICAgICAgJ+iQpemUgHxsYW5kaW5nJzogJ3ZlcmNlbCcsXG4gICAgICAgICdhcHBsZXzoi7nmnpwnOiAnYXBwbGUnLFxuICAgICAgICAnYWl85Lq65bel5pm66IO9JzogJ2NsYXVkZScsXG4gICAgICB9LFxuICAgICAgZXhjbHVkZXM6IFtdLFxuICAgICAgYWxpYXNlczoge30sXG4gICAgICBkZXNpZ25TeXN0ZW1zOiB7fSxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIOebkeWQrOmFjee9ruaWh+S7tuWPmOWMllxuICAgKi9cbiAgcHJpdmF0ZSB3YXRjaENvbmZpZ0ZpbGUoKTogdm9pZCB7XG4gICAgdHJ5IHtcbiAgICAgIHRoaXMuZmlsZVdhdGNoZXIgPSBmcy53YXRjaCh0aGlzLmNvbmZpZ1BhdGgsIChldmVudCkgPT4ge1xuICAgICAgICBpZiAoZXZlbnQgPT09ICdjaGFuZ2UnKSB7XG4gICAgICAgICAgdGhpcy5yZWxvYWQoKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBjb25zb2xlLmxvZyhgW0Rlc2lnblN5c3RlbUNvbmZpZ10g8J+Rge+4jyBXYXRjaGluZyBjb25maWcgZmlsZWApO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKGBbRGVzaWduU3lzdGVtQ29uZmlnXSDimqDvuI8gQ2Fubm90IHdhdGNoIGZpbGU6YCwgZXJyb3IpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiDph43mlrDliqDovb3phY3nva5cbiAgICovXG4gIHByaXZhdGUgcmVsb2FkKCk6IHZvaWQge1xuICAgIGNvbnN0IHN0YXRzID0gZnMuc3RhdFN5bmModGhpcy5jb25maWdQYXRoKTtcbiAgICBpZiAoc3RhdHMubXRpbWVNcyA+IHRoaXMubGFzdE1vZGlmaWVkKSB7XG4gICAgICB0aGlzLmxvYWRDb25maWcoKTtcbiAgICAgIGNvbnNvbGUubG9nKGBbRGVzaWduU3lzdGVtQ29uZmlnXSDwn5SEIENvbmZpZyByZWxvYWRlZGApO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiDljLnphY3orr7orqHns7vnu59cbiAgICovXG4gIG1hdGNoKHRleHQ6IHN0cmluZyk6IE1hdGNoUmVzdWx0IHtcbiAgICAvLyAxLiDmo4Dmn6XnlKjmiLfmmK/lkKbnm7TmjqXmjIflrprkuoborr7orqHns7vnu59cbiAgICBjb25zdCB1c2VyU3BlY2lmaWVkID0gdGhpcy5leHRyYWN0VXNlclNwZWNpZmllZCh0ZXh0KTtcbiAgICBpZiAodXNlclNwZWNpZmllZCkge1xuICAgICAgY29uc3QgcmVzb2x2ZWQgPSB0aGlzLnJlc29sdmVBbGlhcyh1c2VyU3BlY2lmaWVkKTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGRlc2lnblN5c3RlbTogcmVzb2x2ZWQgfHwgdXNlclNwZWNpZmllZCxcbiAgICAgICAgbWF0Y2hlZEJ5OiAndXNlcl9zcGVjaWZpZWQnLFxuICAgICAgICBjb25maWRlbmNlOiAxLjAsXG4gICAgICAgIG1ldGFkYXRhOiB0aGlzLmNvbmZpZz8uZGVzaWduU3lzdGVtc1tyZXNvbHZlZCB8fCB1c2VyU3BlY2lmaWVkXSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gMi4g5YWz6ZSu6K+N5Yy56YWNXG4gICAgZm9yIChjb25zdCBbcGF0dGVybiwgZGVzaWduXSBvZiBPYmplY3QuZW50cmllcyh0aGlzLmNvbmZpZz8ua2V5d29yZHMgfHwge30pKSB7XG4gICAgICBjb25zdCByZWdleCA9IG5ldyBSZWdFeHAocGF0dGVybiwgJ2knKTtcbiAgICAgIGlmIChyZWdleC50ZXN0KHRleHQpKSB7XG4gICAgICAgIC8vIOajgOafpeaOkumZpOinhOWImVxuICAgICAgICBpZiAodGhpcy5pc0V4Y2x1ZGVkKHRleHQsIGRlc2lnbikpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGRlc2lnblN5c3RlbTogZGVzaWduLFxuICAgICAgICAgIG1hdGNoZWRCeTogJ2tleXdvcmQnLFxuICAgICAgICAgIGNvbmZpZGVuY2U6IDAuOCxcbiAgICAgICAgICBtZXRhZGF0YTogdGhpcy5jb25maWc/LmRlc2lnblN5c3RlbXNbZGVzaWduXSxcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyAzLiDkvb/nlKjpu5jorqTlgLxcbiAgICByZXR1cm4ge1xuICAgICAgZGVzaWduU3lzdGVtOiB0aGlzLmNvbmZpZz8uZGVmYXVsdCB8fCAnbGluZWFyJyxcbiAgICAgIG1hdGNoZWRCeTogJ2RlZmF1bHQnLFxuICAgICAgY29uZmlkZW5jZTogMC41LFxuICAgICAgbWV0YWRhdGE6IHRoaXMuY29uZmlnPy5kZXNpZ25TeXN0ZW1zW3RoaXMuY29uZmlnPy5kZWZhdWx0IHx8ICdsaW5lYXInXSxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIOaPkOWPlueUqOaIt+aMh+WumueahOiuvuiuoeezu+e7n1xuICAgKi9cbiAgcHJpdmF0ZSBleHRyYWN0VXNlclNwZWNpZmllZCh0ZXh0OiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsIHtcbiAgICBjb25zdCBwYXR0ZXJucyA9IFtcbiAgICAgIC/kvb/nlKhcXHMqKFthLXpBLVpcXHU0ZTAwLVxcdTlmYTVdKylcXHMq6aOO5qC8LyxcbiAgICAgIC/mjIlcXHMqKFthLXpBLVpcXHU0ZTAwLVxcdTlmYTVdKylcXHMq6K6+6K6hLyxcbiAgICAgIC/lj4LogINcXHMqKFthLXpBLVpcXHU0ZTAwLVxcdTlmYTVdKykvLFxuICAgICAgL2Rlc2lnbls6XFxzXSooW2EtekEtWl0rKS9pLFxuICAgICAgL3N0eWxlWzpcXHNdKihbYS16QS1aXSspL2ksXG4gICAgXTtcblxuICAgIGZvciAoY29uc3QgcGF0dGVybiBvZiBwYXR0ZXJucykge1xuICAgICAgY29uc3QgbWF0Y2ggPSB0ZXh0Lm1hdGNoKHBhdHRlcm4pO1xuICAgICAgaWYgKG1hdGNoKSB7XG4gICAgICAgIHJldHVybiBtYXRjaFsxXS50b0xvd2VyQ2FzZSgpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiDop6PmnpDliKvlkI1cbiAgICovXG4gIHJlc29sdmVBbGlhcyhpbnB1dDogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4gICAgY29uc3Qgbm9ybWFsaXplZCA9IGlucHV0LnRvTG93ZXJDYXNlKCk7XG4gICAgZm9yIChjb25zdCBbZGVzaWduLCBhbGlhc2VzXSBvZiBPYmplY3QuZW50cmllcyh0aGlzLmNvbmZpZz8uYWxpYXNlcyB8fCB7fSkpIHtcbiAgICAgIGlmIChhbGlhc2VzLmluY2x1ZGVzKG5vcm1hbGl6ZWQpKSB7XG4gICAgICAgIHJldHVybiBkZXNpZ247XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIOajgOafpeaOkumZpOinhOWImVxuICAgKi9cbiAgcHJpdmF0ZSBpc0V4Y2x1ZGVkKHRleHQ6IHN0cmluZywgZGVzaWduOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBmb3IgKGNvbnN0IGV4Y2x1ZGUgb2YgdGhpcy5jb25maWc/LmV4Y2x1ZGVzIHx8IFtdKSB7XG4gICAgICBpZiAoZXhjbHVkZS5kZXNpZ24gPT09IGRlc2lnbikge1xuICAgICAgICBjb25zdCByZWdleCA9IG5ldyBSZWdFeHAoZXhjbHVkZS5wYXR0ZXJuLCAnaScpO1xuICAgICAgICBpZiAocmVnZXgudGVzdCh0ZXh0KSkge1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8qKlxuICAgKiDojrflj5bpu5jorqTorr7orqHns7vnu59cbiAgICovXG4gIGdldERlZmF1bHQoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5jb25maWc/LmRlZmF1bHQgfHwgJ2xpbmVhcic7XG4gIH1cblxuICAvKipcbiAgICog6I635Y+W5omA5pyJ6K6+6K6h57O757uf5YWD5pWw5o2uXG4gICAqL1xuICBnZXRBbGxEZXNpZ25TeXN0ZW1zKCk6IFJlY29yZDxzdHJpbmcsIERlc2lnblN5c3RlbU1ldGE+IHtcbiAgICByZXR1cm4gdGhpcy5jb25maWc/LmRlc2lnblN5c3RlbXMgfHwge307XG4gIH1cblxuICAvKipcbiAgICog6I635Y+W6YWN572u54mI5pysXG4gICAqL1xuICBnZXRWZXJzaW9uKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuY29uZmlnPy52ZXJzaW9uIHx8ICcxLjAuMCc7XG4gIH1cblxuICAvKipcbiAgICog5riF55CG6LWE5rqQXG4gICAqL1xuICBkaXNwb3NlKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmZpbGVXYXRjaGVyKSB7XG4gICAgICB0aGlzLmZpbGVXYXRjaGVyLmNsb3NlKCk7XG4gICAgICB0aGlzLmZpbGVXYXRjaGVyID0gbnVsbDtcbiAgICB9XG4gIH1cbn1cblxuLy8gPT09PT09PT09PT09PT0g5a+85Ye6ID09PT09PT09PT09PT09XG5cbmV4cG9ydCBkZWZhdWx0IERlc2lnblN5c3RlbUNvbmZpZ0xvYWRlcjtcbiJdfQ==