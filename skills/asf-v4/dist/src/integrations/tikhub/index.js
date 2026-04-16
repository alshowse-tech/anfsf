"use strict";
/**
 * TikHub SDK 导出
 * 统一导出所有类型、配置和客户端
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERROR_CODES = exports.HTTP_STATUS = exports.TikHubError = exports.loadConfigFromEnv = exports.validateConfig = exports.createConfig = exports.getBaseURL = exports.CN_BASE_URL = exports.GLOBAL_BASE_URL = exports.DEFAULT_CONFIG = exports.TikHubClientDefault = exports.TikHubClient = void 0;
// 客户端
var tikhub_client_1 = require("./tikhub-client");
Object.defineProperty(exports, "TikHubClient", { enumerable: true, get: function () { return tikhub_client_1.TikHubClient; } });
var tikhub_client_2 = require("./tikhub-client");
Object.defineProperty(exports, "TikHubClientDefault", { enumerable: true, get: function () { return __importDefault(tikhub_client_2).default; } });
// 配置
var config_1 = require("./config");
Object.defineProperty(exports, "DEFAULT_CONFIG", { enumerable: true, get: function () { return config_1.DEFAULT_CONFIG; } });
Object.defineProperty(exports, "GLOBAL_BASE_URL", { enumerable: true, get: function () { return config_1.GLOBAL_BASE_URL; } });
Object.defineProperty(exports, "CN_BASE_URL", { enumerable: true, get: function () { return config_1.CN_BASE_URL; } });
Object.defineProperty(exports, "getBaseURL", { enumerable: true, get: function () { return config_1.getBaseURL; } });
Object.defineProperty(exports, "createConfig", { enumerable: true, get: function () { return config_1.createConfig; } });
Object.defineProperty(exports, "validateConfig", { enumerable: true, get: function () { return config_1.validateConfig; } });
Object.defineProperty(exports, "loadConfigFromEnv", { enumerable: true, get: function () { return config_1.loadConfigFromEnv; } });
// 错误
var types_1 = require("./types");
Object.defineProperty(exports, "TikHubError", { enumerable: true, get: function () { return types_1.TikHubError; } });
Object.defineProperty(exports, "HTTP_STATUS", { enumerable: true, get: function () { return types_1.HTTP_STATUS; } });
Object.defineProperty(exports, "ERROR_CODES", { enumerable: true, get: function () { return types_1.ERROR_CODES; } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvaW50ZWdyYXRpb25zL3Rpa2h1Yi9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztHQUdHOzs7Ozs7QUFFSCxNQUFNO0FBQ04saURBQStDO0FBQXRDLDZHQUFBLFlBQVksT0FBQTtBQUNyQixpREFBaUU7QUFBeEQscUlBQUEsT0FBTyxPQUF1QjtBQUV2QyxLQUFLO0FBQ0wsbUNBUWtCO0FBUGhCLHdHQUFBLGNBQWMsT0FBQTtBQUNkLHlHQUFBLGVBQWUsT0FBQTtBQUNmLHFHQUFBLFdBQVcsT0FBQTtBQUNYLG9HQUFBLFVBQVUsT0FBQTtBQUNWLHNHQUFBLFlBQVksT0FBQTtBQUNaLHdHQUFBLGNBQWMsT0FBQTtBQUNkLDJHQUFBLGlCQUFpQixPQUFBO0FBa0JuQixLQUFLO0FBQ0wsaUNBQWdFO0FBQXZELG9HQUFBLFdBQVcsT0FBQTtBQUFFLG9HQUFBLFdBQVcsT0FBQTtBQUFFLG9HQUFBLFdBQVcsT0FBQSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogVGlrSHViIFNESyDlr7zlh7pcbiAqIOe7n+S4gOWvvOWHuuaJgOacieexu+Wei+OAgemFjee9ruWSjOWuouaIt+err1xuICovXG5cbi8vIOWuouaIt+err1xuZXhwb3J0IHsgVGlrSHViQ2xpZW50IH0gZnJvbSAnLi90aWtodWItY2xpZW50JztcbmV4cG9ydCB7IGRlZmF1bHQgYXMgVGlrSHViQ2xpZW50RGVmYXVsdCB9IGZyb20gJy4vdGlraHViLWNsaWVudCc7XG5cbi8vIOmFjee9rlxuZXhwb3J0IHtcbiAgREVGQVVMVF9DT05GSUcsXG4gIEdMT0JBTF9CQVNFX1VSTCxcbiAgQ05fQkFTRV9VUkwsXG4gIGdldEJhc2VVUkwsXG4gIGNyZWF0ZUNvbmZpZyxcbiAgdmFsaWRhdGVDb25maWcsXG4gIGxvYWRDb25maWdGcm9tRW52LFxufSBmcm9tICcuL2NvbmZpZyc7XG5cbi8vIOexu+Wei1xuZXhwb3J0IHR5cGUge1xuICBVc2VyUHJvZmlsZSxcbiAgVmlkZW9JbmZvLFxuICBOb3RlSW5mbyxcbiAgSG90TGlzdCxcbiAgU2VhcmNoUmVzdWx0LFxuICBBbmFseXRpY3NEYXRhLFxuICBCYWxhbmNlSW5mbyxcbiAgUmF0ZUxpbWl0SW5mbyxcbiAgUGFyc2VkVmlkZW8sXG4gIFRpa0h1YkNvbmZpZyxcbiAgUGxhdGZvcm0sXG59IGZyb20gJy4vdHlwZXMnO1xuXG4vLyDplJnor69cbmV4cG9ydCB7IFRpa0h1YkVycm9yLCBIVFRQX1NUQVRVUywgRVJST1JfQ09ERVMgfSBmcm9tICcuL3R5cGVzJztcbiJdfQ==