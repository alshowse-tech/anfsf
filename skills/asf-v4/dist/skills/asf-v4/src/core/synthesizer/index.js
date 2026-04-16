"use strict";
/**
 * Core Synthesizer Index - ANFSF v2.0
 *
 * 统一导出 Core Synthesizer 模块的所有内容
 * 包含类定义和工具函数
 *
 * @module asf-v4/core/synthesizer
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateConflictReport = exports.resolveOwnershipConflict = exports.createSafeOptimizer = exports.SafeOnlineOptimizer = exports.DEFAULT_VETO_RULES = exports.createDefaultVetoEnforcer = exports.VetoEnforcer = exports.DefaultVetoEnforcer = void 0;
// 类定义
var default_veto_enforcer_1 = require("./default-veto-enforcer");
Object.defineProperty(exports, "DefaultVetoEnforcer", { enumerable: true, get: function () { return default_veto_enforcer_1.DefaultVetoEnforcer; } });
Object.defineProperty(exports, "VetoEnforcer", { enumerable: true, get: function () { return default_veto_enforcer_1.VetoEnforcer; } });
Object.defineProperty(exports, "createDefaultVetoEnforcer", { enumerable: true, get: function () { return default_veto_enforcer_1.createDefaultVetoEnforcer; } });
Object.defineProperty(exports, "DEFAULT_VETO_RULES", { enumerable: true, get: function () { return default_veto_enforcer_1.DEFAULT_VETO_RULES; } });
var safe_optimizer_1 = require("./safe-optimizer");
Object.defineProperty(exports, "SafeOnlineOptimizer", { enumerable: true, get: function () { return safe_optimizer_1.SafeOnlineOptimizer; } });
Object.defineProperty(exports, "createSafeOptimizer", { enumerable: true, get: function () { return safe_optimizer_1.createSafeOptimizer; } });
var conflict_resolver_1 = require("./conflict-resolver");
Object.defineProperty(exports, "resolveOwnershipConflict", { enumerable: true, get: function () { return conflict_resolver_1.resolveOwnershipConflict; } });
Object.defineProperty(exports, "generateConflictReport", { enumerable: true, get: function () { return conflict_resolver_1.generateConflictReport; } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvY29yZS9zeW50aGVzaXplci9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7R0FPRzs7O0FBRUgsTUFBTTtBQUNOLGlFQUtpQztBQUovQiw0SEFBQSxtQkFBbUIsT0FBQTtBQUNuQixxSEFBQSxZQUFZLE9BQUE7QUFDWixrSUFBQSx5QkFBeUIsT0FBQTtBQUN6QiwySEFBQSxrQkFBa0IsT0FBQTtBQUdwQixtREFHMEI7QUFGeEIscUhBQUEsbUJBQW1CLE9BQUE7QUFDbkIscUhBQUEsbUJBQW1CLE9BQUE7QUFHckIseURBRzZCO0FBRjNCLDZIQUFBLHdCQUF3QixPQUFBO0FBQ3hCLDJIQUFBLHNCQUFzQixPQUFBIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBDb3JlIFN5bnRoZXNpemVyIEluZGV4IC0gQU5GU0YgdjIuMFxuICogXG4gKiDnu5/kuIDlr7zlh7ogQ29yZSBTeW50aGVzaXplciDmqKHlnZfnmoTmiYDmnInlhoXlrrlcbiAqIOWMheWQq+exu+WumuS5ieWSjOW3peWFt+WHveaVsFxuICogXG4gKiBAbW9kdWxlIGFzZi12NC9jb3JlL3N5bnRoZXNpemVyXG4gKi9cblxuLy8g57G75a6a5LmJXG5leHBvcnQgeyBcbiAgRGVmYXVsdFZldG9FbmZvcmNlciwgXG4gIFZldG9FbmZvcmNlcixcbiAgY3JlYXRlRGVmYXVsdFZldG9FbmZvcmNlcixcbiAgREVGQVVMVF9WRVRPX1JVTEVTLFxufSBmcm9tICcuL2RlZmF1bHQtdmV0by1lbmZvcmNlcic7XG5cbmV4cG9ydCB7XG4gIFNhZmVPbmxpbmVPcHRpbWl6ZXIsXG4gIGNyZWF0ZVNhZmVPcHRpbWl6ZXIsXG59IGZyb20gJy4vc2FmZS1vcHRpbWl6ZXInO1xuXG5leHBvcnQge1xuICByZXNvbHZlT3duZXJzaGlwQ29uZmxpY3QsXG4gIGdlbmVyYXRlQ29uZmxpY3RSZXBvcnQsXG59IGZyb20gJy4vY29uZmxpY3QtcmVzb2x2ZXInOyJdfQ==