"use strict";
/**
 * ANFSF V1.5.0 - 内存模块依赖配置说明
 *
 * 需要手动安装的依赖:
 *
 * 1. @xenova/transformers - 本地向量嵌入模型
 *    npm install @xenova/transformers@latest
 *
 * 2. langchain - 文本分割支持
 *    npm install langchain
 *
 * 3. sqlite3 - 时间知识图谱存储
 *    npm install sqlite3
 *
 * 4. 如果出现 sharp 安装问题:
 *    - 方案 A: 安装系统依赖
 *      sudo apt-get update && sudo apt-get install -y build-essential
 *    - 方案 B: 跳过 sharp
 *      npm install --ignore-scripts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEmbedder = exports.HierarchicalMemoryRetriever = exports.OpenAIEmbeddingAdapter = void 0;
// ============================================================================
// 替代方案: 使用 OpenAI Embeddings (现有配置)
// ============================================================================
/**
 * 由于本地嵌入器安装依赖的复杂性，
 * 建议在中国大陆环境下使用 OpenAI Embeddings (已有配置)
 *
 * 已有配置:
 * - Model: text-embedding-v2
 * - Provider: OpenAI
 * - Enabled: true
 */
const openai_1 = require("@langchain/openai");
/**
 * 使用 OpenAI 的嵌入器（替代 LocalEmbedder）
 */
class OpenAIEmbeddingAdapter {
    constructor() {
        this.embeddings = new openai_1.OpenAIEmbeddings({
            apiKey: process.env.ALGER_BAILIAN_API_KEY,
            model: 'text-embedding-v2'
        });
    }
    async embed(text) {
        return this.embeddings.embed(text);
    }
    async embedBatch(texts) {
        return this.embeddings.embedDocuments(texts);
    }
}
exports.OpenAIEmbeddingAdapter = OpenAIEmbeddingAdapter;
/**
 * 在内存检索器中使用 OpenAI 嵌入
 */
class HierarchicalMemoryRetriever {
    // ... (其他代码保持不变)
    async embedContent(text) {
        // 使用 OpenAI 嵌入（生产环境推荐）
        const adapter = new OpenAIEmbeddingAdapter();
        return adapter.embed(text);
        // 或使用本地嵌入（开发/离线环境）
        // const localEmbedder = new LocalEmbedder();
        // return localEmbedder.embed(text);
    }
}
exports.HierarchicalMemoryRetriever = HierarchicalMemoryRetriever;
// ============================================================================
// 推荐部署方案
// ============================================================================
/**
 * 方案 A: OpenAI Embeddings (推荐)
 * ✅ 零配置
 * ✅ 高质量
 * ⚠️ 需要 API Key
 *
 * 适用场景:
 * - 生产环境
 * - 云部署
 * - API 通行情况好
 */
/**
 * 方案 B: 本地嵌入器
 * ✅ 完全本地
 * ✅ 无 API 依赖
 * ⚠️ 需要安装依赖
 * ⚠️ 首次运行需要下载模型
 *
 * 适用场景:
 * - 本地开发
 * - 离线环境
 * - 数据隐私要求高
 */
/**
 * 集成说明:
 *
 * 1. 在内存检索器中添加条件判断
 * 2. 根据环境变量选择嵌入器
 * 3. 提供降级策略
 */
const getEmbedder = () => {
    const useLocal = process.env.USE_LOCAL_EMBEDDER === 'true';
    if (useLocal) {
        return new LocalEmbedder();
    }
    return new OpenAIEmbeddingAdapter();
};
exports.getEmbedder = getEmbedder;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1iZWRkaW5nX29wdGlvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvbWVtb3J5L2VtYmVkZGluZ19vcHRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQW1CRzs7O0FBRUgsK0VBQStFO0FBQy9FLG9DQUFvQztBQUNwQywrRUFBK0U7QUFFL0U7Ozs7Ozs7O0dBUUc7QUFFSCw4Q0FFMkI7QUFFM0I7O0dBRUc7QUFDSCxNQUFhLHNCQUFzQjtJQUdqQztRQUNFLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSx5QkFBZ0IsQ0FBQztZQUNyQyxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUI7WUFDekMsS0FBSyxFQUFFLG1CQUFtQjtTQUMzQixDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFZO1FBQ3RCLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDckMsQ0FBQztJQUVELEtBQUssQ0FBQyxVQUFVLENBQUMsS0FBZTtRQUM5QixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQy9DLENBQUM7Q0FDRjtBQWpCRCx3REFpQkM7QUFFRDs7R0FFRztBQUNILE1BQWEsMkJBQTJCO0lBQ3RDLGlCQUFpQjtJQUVULEtBQUssQ0FBQyxZQUFZLENBQUMsSUFBWTtRQUNyQyx1QkFBdUI7UUFDdkIsTUFBTSxPQUFPLEdBQUcsSUFBSSxzQkFBc0IsRUFBRSxDQUFDO1FBQzdDLE9BQU8sT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUUzQixtQkFBbUI7UUFDbkIsNkNBQTZDO1FBQzdDLG9DQUFvQztJQUN0QyxDQUFDO0NBR0Y7QUFkRCxrRUFjQztBQUVELCtFQUErRTtBQUMvRSxTQUFTO0FBQ1QsK0VBQStFO0FBRS9FOzs7Ozs7Ozs7O0dBVUc7QUFFSDs7Ozs7Ozs7Ozs7R0FXRztBQUVIOzs7Ozs7R0FNRztBQUVJLE1BQU0sV0FBVyxHQUFHLEdBQUcsRUFBRTtJQUM5QixNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixLQUFLLE1BQU0sQ0FBQztJQUUzRCxJQUFJLFFBQVEsRUFBRSxDQUFDO1FBQ2IsT0FBTyxJQUFJLGFBQWEsRUFBRSxDQUFDO0lBQzdCLENBQUM7SUFDRCxPQUFPLElBQUksc0JBQXNCLEVBQUUsQ0FBQztBQUN0QyxDQUFDLENBQUM7QUFQVyxRQUFBLFdBQVcsZUFPdEIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEFORlNGIFYxLjUuMCAtIOWGheWtmOaooeWdl+S+nei1lumFjee9ruivtOaYjlxuICogXG4gKiDpnIDopoHmiYvliqjlronoo4XnmoTkvp3otZY6XG4gKiBcbiAqIDEuIEB4ZW5vdmEvdHJhbnNmb3JtZXJzIC0g5pys5Zyw5ZCR6YeP5bWM5YWl5qih5Z6LXG4gKiAgICBucG0gaW5zdGFsbCBAeGVub3ZhL3RyYW5zZm9ybWVyc0BsYXRlc3RcbiAqIFxuICogMi4gbGFuZ2NoYWluIC0g5paH5pys5YiG5Ymy5pSv5oyBXG4gKiAgICBucG0gaW5zdGFsbCBsYW5nY2hhaW5cbiAqIFxuICogMy4gc3FsaXRlMyAtIOaXtumXtOefpeivhuWbvuiwseWtmOWCqFxuICogICAgbnBtIGluc3RhbGwgc3FsaXRlM1xuICogXG4gKiA0LiDlpoLmnpzlh7rnjrAgc2hhcnAg5a6J6KOF6Zeu6aKYOlxuICogICAgLSDmlrnmoYggQTog5a6J6KOF57O757uf5L6d6LWWXG4gKiAgICAgIHN1ZG8gYXB0LWdldCB1cGRhdGUgJiYgc3VkbyBhcHQtZ2V0IGluc3RhbGwgLXkgYnVpbGQtZXNzZW50aWFsXG4gKiAgICAtIOaWueahiCBCOiDot7Pov4cgc2hhcnBcbiAqICAgICAgbnBtIGluc3RhbGwgLS1pZ25vcmUtc2NyaXB0c1xuICovXG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIOabv+S7o+aWueahiDog5L2/55SoIE9wZW5BSSBFbWJlZGRpbmdzICjnjrDmnInphY3nva4pXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICog55Sx5LqO5pys5Zyw5bWM5YWl5Zmo5a6J6KOF5L6d6LWW55qE5aSN5p2C5oCn77yMXG4gKiDlu7rorq7lnKjkuK3lm73lpKfpmYbnjq/looPkuIvkvb/nlKggT3BlbkFJIEVtYmVkZGluZ3MgKOW3suaciemFjee9rilcbiAqIFxuICog5bey5pyJ6YWN572uOlxuICogLSBNb2RlbDogdGV4dC1lbWJlZGRpbmctdjJcbiAqIC0gUHJvdmlkZXI6IE9wZW5BSVxuICogLSBFbmFibGVkOiB0cnVlXG4gKi9cblxuaW1wb3J0IHsgXG4gIE9wZW5BSUVtYmVkZGluZ3MgXG59IGZyb20gJ0BsYW5nY2hhaW4vb3BlbmFpJztcblxuLyoqXG4gKiDkvb/nlKggT3BlbkFJIOeahOW1jOWFpeWZqO+8iOabv+S7oyBMb2NhbEVtYmVkZGVy77yJXG4gKi9cbmV4cG9ydCBjbGFzcyBPcGVuQUlFbWJlZGRpbmdBZGFwdGVyIHtcbiAgcHJpdmF0ZSBlbWJlZGRpbmdzOiBPcGVuQUlFbWJlZGRpbmdzO1xuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuZW1iZWRkaW5ncyA9IG5ldyBPcGVuQUlFbWJlZGRpbmdzKHtcbiAgICAgIGFwaUtleTogcHJvY2Vzcy5lbnYuQUxHRVJfQkFJTElBTl9BUElfS0VZLFxuICAgICAgbW9kZWw6ICd0ZXh0LWVtYmVkZGluZy12MidcbiAgICB9KTtcbiAgfVxuXG4gIGFzeW5jIGVtYmVkKHRleHQ6IHN0cmluZyk6IFByb21pc2U8bnVtYmVyW10+IHtcbiAgICByZXR1cm4gdGhpcy5lbWJlZGRpbmdzLmVtYmVkKHRleHQpO1xuICB9XG5cbiAgYXN5bmMgZW1iZWRCYXRjaCh0ZXh0czogc3RyaW5nW10pOiBQcm9taXNlPG51bWJlcltdW10+IHtcbiAgICByZXR1cm4gdGhpcy5lbWJlZGRpbmdzLmVtYmVkRG9jdW1lbnRzKHRleHRzKTtcbiAgfVxufVxuXG4vKipcbiAqIOWcqOWGheWtmOajgOe0ouWZqOS4reS9v+eUqCBPcGVuQUkg5bWM5YWlXG4gKi9cbmV4cG9ydCBjbGFzcyBIaWVyYXJjaGljYWxNZW1vcnlSZXRyaWV2ZXIge1xuICAvLyAuLi4gKOWFtuS7luS7o+eggeS/neaMgeS4jeWPmClcbiAgXG4gIHByaXZhdGUgYXN5bmMgZW1iZWRDb250ZW50KHRleHQ6IHN0cmluZyk6IFByb21pc2U8bnVtYmVyW10+IHtcbiAgICAvLyDkvb/nlKggT3BlbkFJIOW1jOWFpe+8iOeUn+S6p+eOr+Wig+aOqOiNkO+8iVxuICAgIGNvbnN0IGFkYXB0ZXIgPSBuZXcgT3BlbkFJRW1iZWRkaW5nQWRhcHRlcigpO1xuICAgIHJldHVybiBhZGFwdGVyLmVtYmVkKHRleHQpO1xuICAgIFxuICAgIC8vIOaIluS9v+eUqOacrOWcsOW1jOWFpe+8iOW8gOWPkS/nprvnur/njq/looPvvIlcbiAgICAvLyBjb25zdCBsb2NhbEVtYmVkZGVyID0gbmV3IExvY2FsRW1iZWRkZXIoKTtcbiAgICAvLyByZXR1cm4gbG9jYWxFbWJlZGRlci5lbWJlZCh0ZXh0KTtcbiAgfVxuXG4gIC8vIC4uLiAo5YW25L2Z5Luj56CBKVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyDmjqjojZDpg6jnvbLmlrnmoYhcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiDmlrnmoYggQTogT3BlbkFJIEVtYmVkZGluZ3MgKOaOqOiNkClcbiAqIOKchSDpm7bphY3nva5cbiAqIOKchSDpq5jotKjph49cbiAqIOKaoO+4jyDpnIDopoEgQVBJIEtleVxuICogXG4gKiDpgILnlKjlnLrmma86XG4gKiAtIOeUn+S6p+eOr+Wig1xuICogLSDkupHpg6jnvbJcbiAqIC0gQVBJIOmAmuihjOaDheWGteWlvVxuICovXG5cbi8qKlxuICog5pa55qGIIEI6IOacrOWcsOW1jOWFpeWZqFxuICog4pyFIOWujOWFqOacrOWcsFxuICog4pyFIOaXoCBBUEkg5L6d6LWWXG4gKiDimqDvuI8g6ZyA6KaB5a6J6KOF5L6d6LWWXG4gKiDimqDvuI8g6aaW5qyh6L+Q6KGM6ZyA6KaB5LiL6L295qih5Z6LXG4gKiBcbiAqIOmAgueUqOWcuuaZrzpcbiAqIC0g5pys5Zyw5byA5Y+RXG4gKiAtIOemu+e6v+eOr+Wig1xuICogLSDmlbDmja7pmpDnp4HopoHmsYLpq5hcbiAqL1xuXG4vKipcbiAqIOmbhuaIkOivtOaYjjpcbiAqIFxuICogMS4g5Zyo5YaF5a2Y5qOA57Si5Zmo5Lit5re75Yqg5p2h5Lu25Yik5patXG4gKiAyLiDmoLnmja7njq/looPlj5jph4/pgInmi6nltYzlhaXlmahcbiAqIDMuIOaPkOS+m+mZjee6p+etlueVpVxuICovXG5cbmV4cG9ydCBjb25zdCBnZXRFbWJlZGRlciA9ICgpID0+IHtcbiAgY29uc3QgdXNlTG9jYWwgPSBwcm9jZXNzLmVudi5VU0VfTE9DQUxfRU1CRURERVIgPT09ICd0cnVlJztcbiAgXG4gIGlmICh1c2VMb2NhbCkge1xuICAgIHJldHVybiBuZXcgTG9jYWxFbWJlZGRlcigpO1xuICB9XG4gIHJldHVybiBuZXcgT3BlbkFJRW1iZWRkaW5nQWRhcHRlcigpO1xufTtcbiJdfQ==