"use strict";
/**
 * Logger Utility - ANFSF v2.0
 *
 * 统一日志记录工具，提供一致的日志格式和级别控制
 *
 * @module asf-v4/utils/logger
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultLogger = exports.Logger = void 0;
exports.createModuleLogger = createModuleLogger;
class Logger {
    constructor(config) {
        this.config = {
            level: 'info',
            prefix: '[ANFSF]',
            timestamp: true,
            ...config,
        };
    }
    debug(message, ...args) {
        if (this.shouldLog('debug')) {
            this.log('DEBUG', message, args);
        }
    }
    info(message, ...args) {
        if (this.shouldLog('info')) {
            this.log('INFO', message, args);
        }
    }
    warn(message, ...args) {
        if (this.shouldLog('warn')) {
            this.log('WARN', message, args);
        }
    }
    error(message, ...args) {
        if (this.shouldLog('error')) {
            this.log('ERROR', message, args);
        }
    }
    shouldLog(level) {
        const levels = ['debug', 'info', 'warn', 'error'];
        const currentLevelIndex = levels.indexOf(this.config.level);
        const requestedLevelIndex = levels.indexOf(level);
        return requestedLevelIndex >= currentLevelIndex;
    }
    log(level, message, args) {
        let output = '';
        if (this.config.timestamp) {
            output += `${new Date().toISOString()} `;
        }
        output += `${this.config.prefix} [${level}] ${message}`;
        console.log(output, ...args);
    }
}
exports.Logger = Logger;
// 默认全局 logger
exports.defaultLogger = new Logger({
    level: 'info',
    prefix: '[ANFSF]',
    timestamp: true,
});
// 模块特定 logger 工厂
function createModuleLogger(moduleName) {
    return new Logger({
        level: 'info',
        prefix: `[${moduleName}]`,
        timestamp: true,
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vc3JjL3V0aWxzL2xvZ2dlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUF3RUgsZ0RBTUM7QUF0RUQsTUFBYSxNQUFNO0lBR2pCLFlBQVksTUFBOEI7UUFDeEMsSUFBSSxDQUFDLE1BQU0sR0FBRztZQUNaLEtBQUssRUFBRSxNQUFNO1lBQ2IsTUFBTSxFQUFFLFNBQVM7WUFDakIsU0FBUyxFQUFFLElBQUk7WUFDZixHQUFHLE1BQU07U0FDVixDQUFDO0lBQ0osQ0FBQztJQUVELEtBQUssQ0FBQyxPQUFlLEVBQUUsR0FBRyxJQUFXO1FBQ25DLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQzVCLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNuQyxDQUFDO0lBQ0gsQ0FBQztJQUVELElBQUksQ0FBQyxPQUFlLEVBQUUsR0FBRyxJQUFXO1FBQ2xDLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQzNCLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNsQyxDQUFDO0lBQ0gsQ0FBQztJQUVELElBQUksQ0FBQyxPQUFlLEVBQUUsR0FBRyxJQUFXO1FBQ2xDLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQzNCLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNsQyxDQUFDO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxPQUFlLEVBQUUsR0FBRyxJQUFXO1FBQ25DLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQzVCLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNuQyxDQUFDO0lBQ0gsQ0FBQztJQUVPLFNBQVMsQ0FBQyxLQUFhO1FBQzdCLE1BQU0sTUFBTSxHQUFHLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDbEQsTUFBTSxpQkFBaUIsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDNUQsTUFBTSxtQkFBbUIsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ2xELE9BQU8sbUJBQW1CLElBQUksaUJBQWlCLENBQUM7SUFDbEQsQ0FBQztJQUVPLEdBQUcsQ0FBQyxLQUFhLEVBQUUsT0FBZSxFQUFFLElBQVc7UUFDckQsSUFBSSxNQUFNLEdBQUcsRUFBRSxDQUFDO1FBRWhCLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUMxQixNQUFNLElBQUksR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRSxHQUFHLENBQUM7UUFDM0MsQ0FBQztRQUVELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxLQUFLLEtBQUssS0FBSyxPQUFPLEVBQUUsQ0FBQztRQUV4RCxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQy9CLENBQUM7Q0FDRjtBQXRERCx3QkFzREM7QUFFRCxjQUFjO0FBQ0QsUUFBQSxhQUFhLEdBQUcsSUFBSSxNQUFNLENBQUM7SUFDdEMsS0FBSyxFQUFFLE1BQU07SUFDYixNQUFNLEVBQUUsU0FBUztJQUNqQixTQUFTLEVBQUUsSUFBSTtDQUNoQixDQUFDLENBQUM7QUFFSCxpQkFBaUI7QUFDakIsU0FBZ0Isa0JBQWtCLENBQUMsVUFBa0I7SUFDbkQsT0FBTyxJQUFJLE1BQU0sQ0FBQztRQUNoQixLQUFLLEVBQUUsTUFBTTtRQUNiLE1BQU0sRUFBRSxJQUFJLFVBQVUsR0FBRztRQUN6QixTQUFTLEVBQUUsSUFBSTtLQUNoQixDQUFDLENBQUM7QUFDTCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBMb2dnZXIgVXRpbGl0eSAtIEFORlNGIHYyLjBcbiAqIFxuICog57uf5LiA5pel5b+X6K6w5b2V5bel5YW377yM5o+Q5L6b5LiA6Ie055qE5pel5b+X5qC85byP5ZKM57qn5Yir5o6n5Yi2XG4gKiBcbiAqIEBtb2R1bGUgYXNmLXY0L3V0aWxzL2xvZ2dlclxuICovXG5cbmV4cG9ydCBpbnRlcmZhY2UgTG9nZ2VyQ29uZmlnIHtcbiAgbGV2ZWw6ICdkZWJ1ZycgfCAnaW5mbycgfCAnd2FybicgfCAnZXJyb3InO1xuICBwcmVmaXg6IHN0cmluZztcbiAgdGltZXN0YW1wOiBib29sZWFuO1xufVxuXG5leHBvcnQgY2xhc3MgTG9nZ2VyIHtcbiAgcHJpdmF0ZSBjb25maWc6IExvZ2dlckNvbmZpZztcblxuICBjb25zdHJ1Y3Rvcihjb25maWc/OiBQYXJ0aWFsPExvZ2dlckNvbmZpZz4pIHtcbiAgICB0aGlzLmNvbmZpZyA9IHtcbiAgICAgIGxldmVsOiAnaW5mbycsXG4gICAgICBwcmVmaXg6ICdbQU5GU0ZdJyxcbiAgICAgIHRpbWVzdGFtcDogdHJ1ZSxcbiAgICAgIC4uLmNvbmZpZyxcbiAgICB9O1xuICB9XG5cbiAgZGVidWcobWVzc2FnZTogc3RyaW5nLCAuLi5hcmdzOiBhbnlbXSk6IHZvaWQge1xuICAgIGlmICh0aGlzLnNob3VsZExvZygnZGVidWcnKSkge1xuICAgICAgdGhpcy5sb2coJ0RFQlVHJywgbWVzc2FnZSwgYXJncyk7XG4gICAgfVxuICB9XG5cbiAgaW5mbyhtZXNzYWdlOiBzdHJpbmcsIC4uLmFyZ3M6IGFueVtdKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuc2hvdWxkTG9nKCdpbmZvJykpIHtcbiAgICAgIHRoaXMubG9nKCdJTkZPJywgbWVzc2FnZSwgYXJncyk7XG4gICAgfVxuICB9XG5cbiAgd2FybihtZXNzYWdlOiBzdHJpbmcsIC4uLmFyZ3M6IGFueVtdKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuc2hvdWxkTG9nKCd3YXJuJykpIHtcbiAgICAgIHRoaXMubG9nKCdXQVJOJywgbWVzc2FnZSwgYXJncyk7XG4gICAgfVxuICB9XG5cbiAgZXJyb3IobWVzc2FnZTogc3RyaW5nLCAuLi5hcmdzOiBhbnlbXSk6IHZvaWQge1xuICAgIGlmICh0aGlzLnNob3VsZExvZygnZXJyb3InKSkge1xuICAgICAgdGhpcy5sb2coJ0VSUk9SJywgbWVzc2FnZSwgYXJncyk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBzaG91bGRMb2cobGV2ZWw6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGxldmVscyA9IFsnZGVidWcnLCAnaW5mbycsICd3YXJuJywgJ2Vycm9yJ107XG4gICAgY29uc3QgY3VycmVudExldmVsSW5kZXggPSBsZXZlbHMuaW5kZXhPZih0aGlzLmNvbmZpZy5sZXZlbCk7XG4gICAgY29uc3QgcmVxdWVzdGVkTGV2ZWxJbmRleCA9IGxldmVscy5pbmRleE9mKGxldmVsKTtcbiAgICByZXR1cm4gcmVxdWVzdGVkTGV2ZWxJbmRleCA+PSBjdXJyZW50TGV2ZWxJbmRleDtcbiAgfVxuXG4gIHByaXZhdGUgbG9nKGxldmVsOiBzdHJpbmcsIG1lc3NhZ2U6IHN0cmluZywgYXJnczogYW55W10pOiB2b2lkIHtcbiAgICBsZXQgb3V0cHV0ID0gJyc7XG4gICAgXG4gICAgaWYgKHRoaXMuY29uZmlnLnRpbWVzdGFtcCkge1xuICAgICAgb3V0cHV0ICs9IGAke25ldyBEYXRlKCkudG9JU09TdHJpbmcoKX0gYDtcbiAgICB9XG4gICAgXG4gICAgb3V0cHV0ICs9IGAke3RoaXMuY29uZmlnLnByZWZpeH0gWyR7bGV2ZWx9XSAke21lc3NhZ2V9YDtcbiAgICBcbiAgICBjb25zb2xlLmxvZyhvdXRwdXQsIC4uLmFyZ3MpO1xuICB9XG59XG5cbi8vIOm7mOiupOWFqOWxgCBsb2dnZXJcbmV4cG9ydCBjb25zdCBkZWZhdWx0TG9nZ2VyID0gbmV3IExvZ2dlcih7XG4gIGxldmVsOiAnaW5mbycsXG4gIHByZWZpeDogJ1tBTkZTRl0nLFxuICB0aW1lc3RhbXA6IHRydWUsXG59KTtcblxuLy8g5qih5Z2X54m55a6aIGxvZ2dlciDlt6XljoJcbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVNb2R1bGVMb2dnZXIobW9kdWxlTmFtZTogc3RyaW5nKTogTG9nZ2VyIHtcbiAgcmV0dXJuIG5ldyBMb2dnZXIoe1xuICAgIGxldmVsOiAnaW5mbycsXG4gICAgcHJlZml4OiBgWyR7bW9kdWxlTmFtZX1dYCxcbiAgICB0aW1lc3RhbXA6IHRydWUsXG4gIH0pO1xufSJdfQ==