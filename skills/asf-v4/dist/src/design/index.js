"use strict";
/**
 * Design 模块索引
 *
 * 版本：V1.0.0
 * 状态：✅ 完成
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesignHarnessDefault = exports.getDesignHarness = exports.DesignHarness = exports.DesignSystemConfigLoaderDefault = exports.DesignSystemConfigLoader = void 0;
// 配置加载器
var design_system_config_1 = require("./design-system-config");
Object.defineProperty(exports, "DesignSystemConfigLoader", { enumerable: true, get: function () { return design_system_config_1.DesignSystemConfigLoader; } });
Object.defineProperty(exports, "DesignSystemConfigLoaderDefault", { enumerable: true, get: function () { return __importDefault(design_system_config_1).default; } });
// UI/UX Harness 集成
var design_harness_1 = require("./design-harness");
Object.defineProperty(exports, "DesignHarness", { enumerable: true, get: function () { return design_harness_1.DesignHarness; } });
Object.defineProperty(exports, "getDesignHarness", { enumerable: true, get: function () { return design_harness_1.getDesignHarness; } });
Object.defineProperty(exports, "DesignHarnessDefault", { enumerable: true, get: function () { return __importDefault(design_harness_1).default; } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvZGVzaWduL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7R0FLRzs7Ozs7O0FBRUgsUUFBUTtBQUNSLCtEQUdnQztBQUY5QixnSUFBQSx3QkFBd0IsT0FBQTtBQUN4Qix3SkFBQSxPQUFPLE9BQW1DO0FBRzVDLG1CQUFtQjtBQUNuQixtREFJMEI7QUFIeEIsK0dBQUEsYUFBYSxPQUFBO0FBQ2Isa0hBQUEsZ0JBQWdCLE9BQUE7QUFDaEIsdUlBQUEsT0FBTyxPQUF3QiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogRGVzaWduIOaooeWdl+e0ouW8lVxuICogXG4gKiDniYjmnKzvvJpWMS4wLjBcbiAqIOeKtuaAge+8muKchSDlrozmiJBcbiAqL1xuXG4vLyDphY3nva7liqDovb3lmahcbmV4cG9ydCB7XG4gIERlc2lnblN5c3RlbUNvbmZpZ0xvYWRlcixcbiAgZGVmYXVsdCBhcyBEZXNpZ25TeXN0ZW1Db25maWdMb2FkZXJEZWZhdWx0LFxufSBmcm9tICcuL2Rlc2lnbi1zeXN0ZW0tY29uZmlnJztcblxuLy8gVUkvVVggSGFybmVzcyDpm4bmiJBcbmV4cG9ydCB7XG4gIERlc2lnbkhhcm5lc3MsXG4gIGdldERlc2lnbkhhcm5lc3MsXG4gIGRlZmF1bHQgYXMgRGVzaWduSGFybmVzc0RlZmF1bHQsXG59IGZyb20gJy4vZGVzaWduLWhhcm5lc3MnO1xuXG4vLyDnsbvlnovlrprkuYlcbmV4cG9ydCB0eXBlIHtcbiAgRGVzaWduTWFwcGluZ0NvbmZpZyxcbiAgRGVzaWduU3lzdGVtTWV0YSxcbiAgTWF0Y2hSZXN1bHQsXG59IGZyb20gJy4vZGVzaWduLXN5c3RlbS1jb25maWcnO1xuXG5leHBvcnQgdHlwZSB7XG4gIERlc2lnbkNvbnRleHQsXG4gIERlc2lnblN5c3RlbVJlc3BvbnNlLFxufSBmcm9tICcuL2Rlc2lnbi1oYXJuZXNzJztcbiJdfQ==