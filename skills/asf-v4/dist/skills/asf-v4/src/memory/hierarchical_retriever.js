"use strict";
/**
 * ANFSF V1.5.0 - 层级记忆检索器
 * 结合 Wings + Rooms + TemporalKG + Embedding
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HierarchicalMemoryRetriever = void 0;
const temporal_kg_1 = require("./temporal_kg");
const local_embedder_1 = require("./local_embedder");
const structured_1 = require("./structured");
const local_embedder_2 = require("./local_embedder");
const embedding_options_1 = require("./embedding_options");
// ============================================================================
// 层级记忆检索器
// ============================================================================
class HierarchicalMemoryRetriever {
    constructor() {
        this.结构 = new structured_1.MemoryStructureManager();
        this.useLocalEmbedder = process.env.USE_LOCAL_EMBEDDER === 'true';
        this.embedder = this.useLocalEmbedder
            ? new local_embedder_2.LocalEmbedder()
            : new embedding_options_1.OpenAIEmbeddingAdapter();
        this.db = new local_embedder_1.SimpleVectorDB();
        this.temporalKG = new temporal_kg_1.TemporalKnowledgeGraph();
    }
    /**
     * 初始化
     */
    async initialize() {
        await this.结构.load();
        // 只有本地嵌入器需要显式初始化
        if (this.useLocalEmbedder) {
            await this.embedder.initialize();
        }
    }
    /**
     * 存储记忆
     */
    async store(content, wing, room, metadata) {
        // 1. 嵌入内容
        let embedding;
        let dimension;
        if (this.useLocalEmbedder) {
            const embedder = this.embedder;
            const result = await embedder.embedWithDimension(content);
            embedding = result.embedding;
            dimension = result.dimension;
        }
        else {
            const embedder = this.embedder;
            embedding = await embedder.embed(content);
            dimension = embedding.length;
        }
        // 2. 存储到向量数据库
        const id = `store_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.db.add(id, embedding);
        // 3. 存储 temporal triple (用于时间查询)
        await this.temporalKG.addTriple(wing, 'has_memory', id, new Date().toISOString());
        // 4. 存储 metadata
        // (实际应用中会存储到文件或数据库)
    }
    /**
     * 搜索记忆
     */
    async search(query, options = {}) {
        const { topK = 5, minScore = 0.7, includeTemporal = true } = options;
        // 1. 嵌入查询
        const queryEmbedding = await this.embedder.embed(query);
        // 2. 向量搜索
        const vectorResults = this.db.search(queryEmbedding, topK * 2);
        // 3. 时间感知过滤
        const results = [];
        for (const result of vectorResults) {
            if (result.score < minScore)
                continue;
            // 获取 temporal 信息
            const matchedTriples = includeTemporal
                ? await this.temporalKG.queryEntity('has_memory', result.id)
                : [];
            // 提取 wing/room 信息
            const wing = 'wing_general'; // TODO: 从 triple 提取
            const room = 'general_chat'; // TODO: 从 triple 提取
            results.push({
                id: result.id,
                content: this.getContent(result.id),
                score: result.score,
                wing,
                room,
                timestamp: new Date().toISOString()
            });
        }
        // 按分数排序
        return results.sort((a, b) => b.score - a.score);
    }
    /**
     * 获取内容（模拟）
     */
    getContent(id) {
        // TODO: 实现从文件/数据库获取实际内容
        return `Content for ${id}`;
    }
    /**
     * 层级导航搜索
     */
    async navigateSearch(query, wing, room) {
        // 相当于缩小搜索范围
        const results = await this.search(query, {
            topK: 10,
            minScore: 0.6
        });
        // 可以进一步过滤 wing/room
        return results.filter(r => r.wing === wing && r.room === room);
    }
    /**
     * 时间感知搜索
     */
    async temporalSearch(query, as_of) {
        const results = await this.search(query, {
            topK: 10,
            minScore: 0.6,
            includeTemporal: true
        });
        // 过滤时间点
        return results;
    }
    /**
     * 获取统计
     */
    async stats() {
        const tempStats = await this.temporalKG.stats();
        const all = await this.temporalKG.dump();
        return {
            totalMemories: this.db.size(),
            wings: tempStats.subjects,
            rooms: 0, // TODO: 计算 rooms
            tempFacts: all.length
        };
    }
    /**
     * 计算向量相似度
     */
    cosineSimilarity(a, b) {
        let dot = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }
    /**
     * 关闭资源
     */
    async close() {
        await this.temporalKG.cleanup();
        await this.结构.close();
    }
}
exports.HierarchicalMemoryRetriever = HierarchicalMemoryRetriever;
local_embedder_1.SimpleVectorDB.prototype.size = function () {
    return this.store.size;
};
// ============================================================================
// 使用示例
// ============================================================================
/**
 * // 初始化检索器
 * const retriever = new HierarchicalMemoryRetriever();
 * await retriever.initialize();
 *
 * // 存储记忆
 * await retriever.store(
 *   '用户决定使用 PostgreSQL 而不是 SQLite',
 *   'wing_postgres_project',
 *   'hall_facts',
 *   { type: 'decision', priority: 'high' }
 * );
 *
 * // 搜索
 * const results = await retriever.search('database decision', {
 *   topK: 5,
 *   minScore: 0.7
 * });
 *
 * // 层级导航搜索
 * const wingResults = await retriever.navigateSearch(
 *   'database decision',
 *   'wing_postgres_project',
 *   'hall_facts'
 * );
 *
 * // 时间感知搜索
 * const historyResults = await retriever.temporalSearch(
 *   'database decision',
 *   '2026-04-09T12:00:00Z'
 * );
 *
 * // 获取统计
 * const stats = await retriever.stats();
 *
 * // 清理
 * await retriever.close();
 */
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGllcmFyY2hpY2FsX3JldHJpZXZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy9tZW1vcnkvaGllcmFyY2hpY2FsX3JldHJpZXZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztHQUdHOzs7QUFFSCwrQ0FBdUQ7QUFDdkQscURBQWtEO0FBQ2xELDZDQUF5RTtBQUN6RSxxREFBaUQ7QUFDakQsMkRBQTZEO0FBNEI3RCwrRUFBK0U7QUFDL0UsVUFBVTtBQUNWLCtFQUErRTtBQUUvRSxNQUFhLDJCQUEyQjtJQU90QztRQUNFLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxtQ0FBc0IsRUFBRSxDQUFDO1FBQ3ZDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixLQUFLLE1BQU0sQ0FBQztRQUNsRSxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxnQkFBZ0I7WUFDbkMsQ0FBQyxDQUFDLElBQUksOEJBQWEsRUFBRTtZQUNyQixDQUFDLENBQUMsSUFBSSwwQ0FBc0IsRUFBRSxDQUFDO1FBQ2pDLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSwrQkFBYyxFQUFFLENBQUM7UUFDL0IsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLG9DQUFzQixFQUFFLENBQUM7SUFDakQsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLFVBQVU7UUFDZCxNQUFNLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUM7UUFFckIsaUJBQWlCO1FBQ2pCLElBQUksSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDMUIsTUFBTyxJQUFJLENBQUMsUUFBMEIsQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUN0RCxDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLEtBQUssQ0FDVCxPQUFlLEVBQ2YsSUFBWSxFQUNaLElBQVksRUFDWixRQUE4QjtRQUU5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QUN6QixDQUFDLENBQUM7QUFFRiwrRUFBK0U7QUFDL0UsT0FBTztBQUNQLCtFQUErRTtBQUUvRTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQXFDRyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQU5GU0YgVjEuNS4wIC0g5bGC57qn6K6w5b+G5qOA57Si5ZmoXG4gKiDnu5PlkIggV2luZ3MgKyBSb29tcyArIFRlbXBvcmFsS0cgKyBFbWJlZGRpbmdcbiAqL1xuXG5pbXBvcnQgeyBUZW1wb3JhbEtub3dsZWRnZUdyYXBoIH0gZnJvbSAnLi90ZW1wb3JhbF9rZyc7XG5pbXBvcnQgeyBTaW1wbGVWZWN0b3JEQiB9IGZyb20gJy4vbG9jYWxfZW1iZWRkZXInO1xuaW1wb3J0IHsgSU5JVElBTF9TVFJVQ1RVUkUsIE1lbW9yeVN0cnVjdHVyZU1hbmFnZXIgfSBmcm9tICcuL3N0cnVjdHVyZWQnO1xuaW1wb3J0IHsgTG9jYWxFbWJlZGRlciB9IGZyb20gJy4vbG9jYWxfZW1iZWRkZXInO1xuaW1wb3J0IHsgT3BlbkFJRW1iZWRkaW5nQWRhcHRlciB9IGZyb20gJy4vZW1iZWRkaW5nX29wdGlvbnMnO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyDmn6Xor6LmqKHlvI9cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGludGVyZmFjZSBRdWVyeUNvbnRleHQge1xuICB0ZXh0OiBzdHJpbmc7XG4gIHdpbmdfZmlsdGVyPzogc3RyaW5nO1xuICByb29tX2ZpbHRlcj86IHN0cmluZztcbiAgYXNfb2Y/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2VhcmNoUmVzdWx0IHtcbiAgaWQ6IHN0cmluZztcbiAgY29udGVudDogc3RyaW5nO1xuICBzY29yZTogbnVtYmVyO1xuICB3aW5nOiBzdHJpbmc7XG4gIHJvb206IHN0cmluZztcbiAgdGltZXN0YW1wOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2VhcmNoT3B0aW9ucyB7XG4gIHRvcEs/OiBudW1iZXI7XG4gIG1pblNjb3JlPzogbnVtYmVyO1xuICBpbmNsdWRlVGVtcG9yYWw/OiBib29sZWFuO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyDlsYLnuqforrDlv4bmo4DntKLlmahcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGNsYXNzIEhpZXJhcmNoaWNhbE1lbW9yeVJldHJpZXZlciB7XG4gIHByaXZhdGXnu5PmnoQ6IE1lbW9yeVN0cnVjdHVyZU1hbmFnZXI7XG4gIHByaXZhdGUgZW1iZWRkZXI6IExvY2FsRW1iZWRkZXIgfCBPcGVuQUlFbWJlZGRpbmdBZGFwdGVyO1xuICBwcml2YXRlIGRiOiBTaW1wbGVWZWN0b3JEQjtcbiAgcHJpdmF0ZSB0ZW1wb3JhbEtHOiBUZW1wb3JhbEtub3dsZWRnZUdyYXBoO1xuICBwcml2YXRlIHVzZUxvY2FsRW1iZWRkZXI6IGJvb2xlYW47XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy7nu5PmnoQgPSBuZXcgTWVtb3J5U3RydWN0dXJlTWFuYWdlcigpO1xuICAgIHRoaXMudXNlTG9jYWxFbWJlZGRlciA9IHByb2Nlc3MuZW52LlVTRV9MT0NBTF9FTUJFRERFUiA9PT0gJ3RydWUnO1xuICAgIHRoaXMuZW1iZWRkZXIgPSB0aGlzLnVzZUxvY2FsRW1iZWRkZXIgXG4gICAgICA/IG5ldyBMb2NhbEVtYmVkZGVyKCkgXG4gICAgICA6IG5ldyBPcGVuQUlFbWJlZGRpbmdBZGFwdGVyKCk7XG4gICAgdGhpcy5kYiA9IG5ldyBTaW1wbGVWZWN0b3JEQigpO1xuICAgIHRoaXMudGVtcG9yYWxLRyA9IG5ldyBUZW1wb3JhbEtub3dsZWRnZUdyYXBoKCk7XG4gIH1cblxuICAvKipcbiAgICog5Yid5aeL5YyWXG4gICAqL1xuICBhc3luYyBpbml0aWFsaXplKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMu57uT5p6ELmxvYWQoKTtcbiAgICBcbiAgICAvLyDlj6rmnInmnKzlnLDltYzlhaXlmajpnIDopoHmmL7lvI/liJ3lp4vljJZcbiAgICBpZiAodGhpcy51c2VMb2NhbEVtYmVkZGVyKSB7XG4gICAgICBhd2FpdCAodGhpcy5lbWJlZGRlciBhcyBMb2NhbEVtYmVkZGVyKS5pbml0aWFsaXplKCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIOWtmOWCqOiusOW/hlxuICAgKi9cbiAgYXN5bmMgc3RvcmUoXG4gICAgY29udGVudDogc3RyaW5nLFxuICAgIHdpbmc6IHN0cmluZyxcbiAgICByb29tOiBzdHJpbmcsXG4gICAgbWV0YWRhdGE/OiBSZWNvcmQ8c3RyaW5nLCBhbnk+XG4gICk6IFByb21pc2U8dm9pZD4ge1xuICAgIC8vIDEuIOW1jOWFpeWGheWuuVxuICAgIGxldCBlbWJlZGRpbmc6IG51bWJlcltdO1xuICAgIGxldCBkaW1lbnNpb246IG51bWJlcjtcbiAgICBcbiAgICBpZiAodGhpcy51c2VMb2NhbEVtYmVkZGVyKSB7XG4gICAgICBjb25zdCBlbWJlZGRlciA9IHRoaXMuZW1iZWRkZXIgYXMgTG9jYWxFbWJlZGRlcjtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGVtYmVkZGVyLmVtYmVkV2l0aERpbWVuc2lvbihjb250ZW50KTtcbiAgICAgIGVtYmVkZGluZyA9IHJlc3VsdC5lbWJlZGRpbmc7XG4gICAgICBkaW1lbnNpb24gPSByZXN1bHQuZGltZW5zaW9uO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBlbWJlZGRlciA9IHRoaXMuZW1iZWRkZXIgYXMgT3BlbkFJRW1iZWRkaW5nQWRhcHRlcjtcbiAgICAgIGVtYmVkZGluZyA9IGF3YWl0IGVtYmVkZGVyLmVtYmVkKGNvbnRlbnQpO1xuICAgICAgZGltZW5zaW9uID0gZW1iZWRkaW5nLmxlbmd0aDtcbiAgICB9XG5cbiAgICAvLyAyLiDlrZjlgqjliLDlkJHph4/mlbDmja7lupNcbiAgICBjb25zdCBpZCA9IGBzdG9yZV8ke0RhdGUubm93KCl9XyR7TWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyKDIsIDkpfWA7XG4gICAgdGhpcy5kYi5hZGQoaWQsIGVtYmVkZGluZyk7XG5cbiAgICAvLyAzLiDlrZjlgqggdGVtcG9yYWwgdHJpcGxlICjnlKjkuo7ml7bpl7Tmn6Xor6IpXG4gICAgYXdhaXQgdGhpcy50ZW1wb3JhbEtHLmFkZFRyaXBsZShcbiAgICAgIHdpbmcsXG4gICAgICAnaGFzX21lbW9yeScsXG4gICAgICBpZCxcbiAgICAgIG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxuICAgICk7XG5cbiAgICAvLyA0LiDlrZjlgqggbWV0YWRhdGFcbiAgICAvLyAo5a6e6ZmF5bqU55So5Lit5Lya5a2Y5YKo5Yiw5paH5Lu25oiW5pWw5o2u5bqTKVxuICB9XG5cbiAgLyoqXG4gICAqIOaQnOe0ouiusOW/hlxuICAgKi9cbiAgYXN5bmMgc2VhcmNoKFxuICAgIHF1ZXJ5OiBzdHJpbmcsXG4gICAgb3B0aW9uczogU2VhcmNoT3B0aW9ucyA9IHt9XG4gICk6IFByb21pc2U8U2VhcmNoUmVzdWx0W10+IHtcbiAgICBjb25zdCB7XG4gICAgICB0b3BLID0gNSxcbiAgICAgIG1pblNjb3JlID0gMC43LFxuICAgICAgaW5jbHVkZVRlbXBvcmFsID0gdHJ1ZVxuICAgIH0gPSBvcHRpb25zO1xuXG4gICAgLy8gMS4g5bWM5YWl5p+l6K+iXG4gICAgY29uc3QgcXVlcnlFbWJlZGRpbmcgPSBhd2FpdCB0aGlzLmVtYmVkZGVyLmVtYmVkKHF1ZXJ5KTtcblxuICAgIC8vIDIuIOWQkemHj+aQnOe0olxuICAgIGNvbnN0IHZlY3RvclJlc3VsdHMgPSB0aGlzLmRiLnNlYXJjaChxdWVyeUVtYmVkZGluZywgdG9wSyAqIDIpO1xuXG4gICAgLy8gMy4g5pe26Ze05oSf55+l6L+H5rukXG4gICAgY29uc3QgcmVzdWx0czogU2VhcmNoUmVzdWx0W10gPSBbXTtcblxuICAgIGZvciAoY29uc3QgcmVzdWx0IG9mIHZlY3RvclJlc3VsdHMpIHtcbiAgICAgIGlmIChyZXN1bHQuc2NvcmUgPCBtaW5TY29yZSkgY29udGludWU7XG5cbiAgICAgIC8vIOiOt+WPliB0ZW1wb3JhbCDkv6Hmga9cbiAgICAgIGNvbnN0IG1hdGNoZWRUcmlwbGVzID0gaW5jbHVkZVRlbXBvcmFsIFxuICAgICAgICA/IGF3YWl0IHRoaXMudGVtcG9yYWxLRy5xdWVyeUVudGl0eSgnaGFzX21lbW9yeScsIHJlc3VsdC5pZCkgXG4gICAgICAgIDogW107XG5cbiAgICAgIC8vIOaPkOWPliB3aW5nL3Jvb20g5L+h5oGvXG4gICAgICBjb25zdCB3aW5nID0gJ3dpbmdfZ2VuZXJhbCc7IC8vIFRPRE86IOS7jiB0cmlwbGUg5o+Q5Y+WXG4gICAgICBjb25zdCByb29tID0gJ2dlbmVyYWxfY2hhdCc7IC8vIFRPRE86IOS7jiB0cmlwbGUg5o+Q5Y+WXG5cbiAgICAgIHJlc3VsdHMucHVzaCh7XG4gICAgICAgIGlkOiByZXN1bHQuaWQsXG4gICAgICAgIGNvbnRlbnQ6IHRoaXMuZ2V0Q29udGVudChyZXN1bHQuaWQpLFxuICAgICAgICBzY29yZTogcmVzdWx0LnNjb3JlLFxuICAgICAgICB3aW5nLFxuICAgICAgICByb29tLFxuICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8g5oyJ5YiG5pWw5o6S5bqPXG4gICAgcmV0dXJuIHJlc3VsdHMuc29ydCgoYSwgYikgPT4gYi5zY29yZSAtIGEuc2NvcmUpO1xuICB9XG5cbiAgLyoqXG4gICAqIOiOt+WPluWGheWuue+8iOaooeaLn++8iVxuICAgKi9cbiAgcHJpdmF0ZSBnZXRDb250ZW50KGlkOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIC8vIFRPRE86IOWunueOsOS7juaWh+S7ti/mlbDmja7lupPojrflj5blrp7pmYXlhoXlrrlcbiAgICByZXR1cm4gYENvbnRlbnQgZm9yICR7aWR9YDtcbiAgfVxuXG4gIC8qKlxuICAgKiDlsYLnuqflr7zoiKrmkJzntKJcbiAgICovXG4gIGFzeW5jIG5hdmlnYXRlU2VhcmNoKFxuICAgIHF1ZXJ5OiBzdHJpbmcsXG4gICAgd2luZzogc3RyaW5nLFxuICAgIHJvb206IHN0cmluZ1xuICApOiBQcm9taXNlPFNlYXJjaFJlc3VsdFtdPiB7XG4gICAgLy8g55u45b2T5LqO57yp5bCP5pCc57Si6IyD5Zu0XG4gICAgY29uc3QgcmVzdWx0cyA9IGF3YWl0IHRoaXMuc2VhcmNoKHF1ZXJ5LCB7XG4gICAgICB0b3BLOiAxMCxcbiAgICAgIG1pblNjb3JlOiAwLjZcbiAgICB9KTtcblxuICAgIC8vIOWPr+S7pei/m+S4gOatpei/h+a7pCB3aW5nL3Jvb21cbiAgICByZXR1cm4gcmVzdWx0cy5maWx0ZXIociA9PiByLndpbmcgPT09IHdpbmcgJiYgci5yb29tID09PSByb29tKTtcbiAgfVxuXG4gIC8qKlxuICAgKiDml7bpl7TmhJ/nn6XmkJzntKJcbiAgICovXG4gIGFzeW5jIHRlbXBvcmFsU2VhcmNoKFxuICAgIHF1ZXJ5OiBzdHJpbmcsXG4gICAgYXNfb2Y6IHN0cmluZ1xuICApOiBQcm9taXNlPFNlYXJjaFJlc3VsdFtdPiB7XG4gICAgY29uc3QgcmVzdWx0cyA9IGF3YWl0IHRoaXMuc2VhcmNoKHF1ZXJ5LCB7XG4gICAgICB0b3BLOiAxMCxcbiAgICAgIG1pblNjb3JlOiAwLjYsXG4gICAgICBpbmNsdWRlVGVtcG9yYWw6IHRydWVcbiAgICB9KTtcblxuICAgIC8vIOi/h+a7pOaXtumXtOeCuVxuICAgIHJldHVybiByZXN1bHRzO1xuICB9XG5cbiAgLyoqXG4gICAqIOiOt+WPlue7n+iuoVxuICAgKi9cbiAgYXN5bmMgc3RhdHMoKTogUHJvbWlzZTx7XG4gICAgdG90YWxNZW1vcmllczogbnVtYmVyO1xuICAgIHdpbmdzOiBudW1iZXI7XG4gICAgcm9vbXM6IG51bWJlcjtcbiAgICB0ZW1wRmFjdHM6IG51bWJlcjtcbiAgfT4ge1xuICAgIGNvbnN0IHRlbXBTdGF0cyA9IGF3YWl0IHRoaXMudGVtcG9yYWxLRy5zdGF0cygpO1xuICAgIGNvbnN0IGFsbCA9IGF3YWl0IHRoaXMudGVtcG9yYWxLRy5kdW1wKCk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgdG90YWxNZW1vcmllczogdGhpcy5kYi5zaXplKCksXG4gICAgICB3aW5nczogdGVtcFN0YXRzLnN1YmplY3RzLFxuICAgICAgcm9vbXM6IDAsIC8vIFRPRE86IOiuoeeulyByb29tc1xuICAgICAgdGVtcEZhY3RzOiBhbGwubGVuZ3RoXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiDorqHnrpflkJHph4/nm7jkvLzluqZcbiAgICovXG4gIGNvc2luZVNpbWlsYXJpdHkoYTogbnVtYmVyW10sIGI6IG51bWJlcltdKTogbnVtYmVyIHtcbiAgICBsZXQgZG90ID0gMDtcbiAgICBsZXQgbm9ybUEgPSAwO1xuICAgIGxldCBub3JtQiA9IDA7XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGEubGVuZ3RoOyBpKyspIHtcbiAgICAgIGRvdCArPSBhW2ldICogYltpXTtcbiAgICAgIG5vcm1BICs9IGFbaV0gKiBhW2ldO1xuICAgICAgbm9ybUIgKz0gYltpXSAqIGJbaV07XG4gICAgfVxuXG4gICAgcmV0dXJuIGRvdCAvIChNYXRoLnNxcnQobm9ybUEpICogTWF0aC5zcXJ0KG5vcm1CKSk7XG4gIH1cblxuICAvKipcbiAgICog5YWz6Zet6LWE5rqQXG4gICAqL1xuICBhc3luYyBjbG9zZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0aGlzLnRlbXBvcmFsS0cuY2xlYW51cCgpO1xuICAgIGF3YWl0IHRoaXMu57uT5p6ELmNsb3NlKCk7XG4gIH1cbn1cblxuLy8g5omp5bGVIFNpbXBsZVZlY3RvckRCIOS7pea3u+WKoCBzaXplIOaWueazlVxuZGVjbGFyZSBtb2R1bGUgJy4vbG9jYWxfZW1iZWRkZXInIHtcbiAgaW50ZXJmYWNlIFNpbXBsZVZlY3RvckRCIHtcbiAgICBzaXplKCk6IG51bWJlcjtcbiAgfVxufVxuXG5TaW1wbGVWZWN0b3JEQi5wcm90b3R5cGUuc2l6ZSA9IGZ1bmN0aW9uKHRoaXM6IFNpbXBsZVZlY3RvckRCKTogbnVtYmVyIHtcbiAgcmV0dXJuIHRoaXMuc3RvcmUuc2l6ZTtcbn07XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIOS9v+eUqOekuuS+i1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIC8vIOWIneWni+WMluajgOe0ouWZqFxuICogY29uc3QgcmV0cmlldmVyID0gbmV3IEhpZXJhcmNoaWNhbE1lbW9yeVJldHJpZXZlcigpO1xuICogYXdhaXQgcmV0cmlldmVyLmluaXRpYWxpemUoKTtcbiAqIFxuICogLy8g5a2Y5YKo6K6w5b+GXG4gKiBhd2FpdCByZXRyaWV2ZXIuc3RvcmUoXG4gKiAgICfnlKjmiLflhrPlrprkvb/nlKggUG9zdGdyZVNRTCDogIzkuI3mmK8gU1FMaXRlJyxcbiAqICAgJ3dpbmdfcG9zdGdyZXNfcHJvamVjdCcsXG4gKiAgICdoYWxsX2ZhY3RzJyxcbiAqICAgeyB0eXBlOiAnZGVjaXNpb24nLCBwcmlvcml0eTogJ2hpZ2gnIH1cbiAqICk7XG4gKiBcbiAqIC8vIOaQnOe0olxuICogY29uc3QgcmVzdWx0cyA9IGF3YWl0IHJldHJpZXZlci5zZWFyY2goJ2RhdGFiYXNlIGRlY2lzaW9uJywge1xuICogICB0b3BLOiA1LFxuICogICBtaW5TY29yZTogMC43XG4gKiB9KTtcbiAqIFxuICogLy8g5bGC57qn5a+86Iiq5pCc57SiXG4gKiBjb25zdCB3aW5nUmVzdWx0cyA9IGF3YWl0IHJldHJpZXZlci5uYXZpZ2F0ZVNlYXJjaChcbiAqICAgJ2RhdGFiYXNlIGRlY2lzaW9uJyxcbiAqICAgJ3dpbmdfcG9zdGdyZXNfcHJvamVjdCcsXG4gKiAgICdoYWxsX2ZhY3RzJ1xuICogKTtcbiAqIFxuICogLy8g5pe26Ze05oSf55+l5pCc57SiXG4gKiBjb25zdCBoaXN0b3J5UmVzdWx0cyA9IGF3YWl0IHJldHJpZXZlci50ZW1wb3JhbFNlYXJjaChcbiAqICAgJ2RhdGFiYXNlIGRlY2lzaW9uJyxcbiAqICAgJzIwMjYtMDQtMDlUMTI6MDA6MDBaJ1xuICogKTtcbiAqIFxuICogLy8g6I635Y+W57uf6K6hXG4gKiBjb25zdCBzdGF0cyA9IGF3YWl0IHJldHJpZXZlci5zdGF0cygpO1xuICogXG4gKiAvLyDmuIXnkIZcbiAqIGF3YWl0IHJldHJpZXZlci5jbG9zZSgpO1xuICovXG4iXX0=