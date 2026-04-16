"use strict";
/**
 * ANFSF V1.5.0 - 本地零 API 向量嵌入器
 * 使用 Sentence Transformers 替代 OpenAI Embeddings
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleVectorDB = exports.LocalEmbedder = void 0;
const transformers_1 = require("@xenova/transformers");
const text_splitter_1 = require("langchain/text_splitter");
/**
 * 本地向量嵌入器
 */
class LocalEmbedder {
    constructor(modelName = 'Xenova/all-MiniLM-L6-v2') {
        this.embedder = null;
        // 设置本地模型路径
        transformers_1.env.allowLocalModels = true;
        transformers_1.env.useBrowserCache = false;
        this.textSplitter = new text_splitter_1.RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200
        });
    }
    /**
     * 初始化嵌入器（懒加载）
     */
    async initialize() {
        if (!this.embedder) {
            const extractor = await (0, transformers_1.pipeline)('feature-extraction', this.getModelName());
            this.embedder = extractor;
        }
    }
    /**
     * 获取模型名称
     */
    getModelName() {
        // 可配置的模型列表
        const models = {
            'mini': 'Xenova/all-MiniLM-L6-v2', // 384维，快速
            'base': 'Xenova/all-mpnet-base-v2', // 768维，准确
            'large': 'Xenova/gtr-t5-large' // 1024维，最准确
        };
        return models[process.env.EMBEDDER_MODEL || 'mini'];
    }
    /**
     * 嵌入单个文本
     */
    async embed(text) {
        await this.initialize();
        // 分割长文本
        const chunks = await this.textSplitter.createDocuments([text]);
        // 对每个块进行嵌入
        const embeddings = [];
        for (const chunk of chunks) {
            const output = await this.embedder(chunk.pageContent, {
                pooling: 'mean',
                normalize: true
            });
            embeddings.push(output.dataset.output);
        }
        // 简单平均（也可以使用加权平均）
        const avgEmbedding = this.averageEmbeddings(embeddings);
        return avgEmbedding;
    }
    /**
     * 批量嵌入
     */
    async embedBatch(texts) {
        await this.initialize();
        const allEmbeddings = [];
        for (const text of texts) {
            const chunks = await this.textSplitter.createDocuments([text]);
            const embeddings = [];
            for (const chunk of chunks) {
                const output = await this.embedder(chunk.pageContent, {
                    pooling: 'mean',
                    normalize: true
                });
                embeddings.push(output.dataset.output);
            }
            const avgEmbedding = this.averageEmbeddings(embeddings);
            allEmbeddings.push(avgEmbedding);
        }
        return allEmbeddings;
    }
    /**
     * 平均嵌入向量
     */
    averageEmbeddings(embeddings) {
        if (embeddings.length === 0) {
            return [];
        }
        const dims = embeddings[0].length;
        const avg = new Array(dims).fill(0);
        for (const emb of embeddings) {
            for (let i = 0; i < dims; i++) {
                avg[i] += emb[i];
            }
        }
        // 取平均
        for (let i = 0; i < dims; i++) {
            avg[i] /= embeddings.length;
        }
        return avg;
    }
    /**
     * 嵌入并获取维度
     */
    async embedWithDimension(text) {
        const embedding = await this.embed(text);
        return {
            embedding,
            dimension: embedding.length
        };
    }
}
exports.LocalEmbedder = LocalEmbedder;
/**
 * 简单向量数据库 (用于测试)
 */
class SimpleVectorDB {
    constructor() {
        this.store = new Map();
    }
    /**
     * 添加向量
     */
    add(id, embedding) {
        this.store.set(id, embedding);
    }
    /**
     * 获取向量
     */
    get(id) {
        return this.store.get(id);
    }
    /**
     * 批量添加
     */
    addBatch(entries) {
        for (const entry of entries) {
            this.store.set(entry.id, entry.embedding);
        }
    }
    /**
     * 计算余弦相似度
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
     * 搜索相似向量
     */
    search(query, topK = 5) {
        const scores = [];
        for (const [id, embedding] of this.store.entries()) {
            const score = this.cosineSimilarity(query, embedding);
            scores.push({ id, score });
        }
        // 排序并返回 topK
        return scores
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
    }
    /**
     * 清空存储
     */
    clear() {
        this.store.clear();
    }
    /**
     * 获取大小
     */
    size() {
        return this.store.size;
    }
}
exports.SimpleVectorDB = SimpleVectorDB;
/**
 * 使用示例:
 *
 * // 初始化嵌入器
 * const embedder = new LocalEmbedder();
 *
 * // 嵌入文本
 * const embedding = await embedder.embed('这是测试文本');
 * console.log('Dimension:', embedding.length);
 *
 * // 批量嵌入
 * const embeddings = await embedder.embedBatch(['文本1', '文本2', '文本3']);
 *
 * // 使用向量数据库
 * const db = new SimpleVectorDB();
 * db.add('doc1', embedding);
 *
 * // 搜索
 * const queryEmbedding = await embedder.embed('查询文本');
 * const results = db.search(queryEmbedding, 5);
 *
 * console.log('Search results:', results);
 */
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxfZW1iZWRkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMvbWVtb3J5L2xvY2FsX2VtYmVkZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O0dBR0c7OztBQUVILHVEQUFxRDtBQUNyRCwyREFBeUU7QUFFekU7O0dBRUc7QUFDSCxNQUFhLGFBQWE7SUFJeEIsWUFBWSxZQUFvQix5QkFBeUI7UUFIakQsYUFBUSxHQUFlLElBQUksQ0FBQztRQUlsQyxXQUFXO1FBQ1gsa0JBQUcsQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUM7UUFDNUIsa0JBQUcsQ0FBQyxlQUFlLEdBQUcsS0FBSyxDQUFDO1FBRTVCLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSw4Q0FBOEIsQ0FBQztZQUNyRCxTQUFTLEVBQUUsSUFBSTtZQUNmLFlBQVksRUFBRSxHQUFHO1NBQ2xCLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxVQUFVO1FBQ2QsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNuQixNQUFNLFNBQVMsR0FBRyxNQUFNLElBQUEsdUJBQVEsRUFBQyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQztZQUM1RSxJQUFJLENBQUMsUUFBUSxHQUFHLFNBQVMsQ0FBQztRQUM1QixDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0ssWUFBWTtRQUNsQixXQUFXO1FBQ1gsTUFBTSxNQUFNLEdBQTJCO1lBQ3JDLE1BQU0sRUFBRSx5QkFBeUIsRUFBTyxVQUFVO1lBQ2xELE1BQU0sRUFBRSwwQkFBMEIsRUFBTSxVQUFVO1lBQ2xELE9BQU8sRUFBRSxxQkFBcUIsQ0FBVSxZQUFZO1NBQ3JELENBQUM7UUFFRixPQUFPLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsSUFBSSxNQUFNLENBQUMsQ0FBQztJQUN0RCxDQUFD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QUksQ0FBQztJQUN6QixDQUFDO0NBQ0Y7QUF6RUQsd0NBeUVDO0FBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FzQkciLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEFORlNGIFYxLjUuMCAtIOacrOWcsOmbtiBBUEkg5ZCR6YeP5bWM5YWl5ZmoXG4gKiDkvb/nlKggU2VudGVuY2UgVHJhbnNmb3JtZXJzIOabv+S7oyBPcGVuQUkgRW1iZWRkaW5nc1xuICovXG5cbmltcG9ydCB7IHBpcGVsaW5lLCBlbnYgfSBmcm9tICdAeGVub3ZhL3RyYW5zZm9ybWVycyc7XG5pbXBvcnQgeyBSZWN1cnNpdmVDaGFyYWN0ZXJUZXh0U3BsaXR0ZXIgfSBmcm9tICdsYW5nY2hhaW4vdGV4dF9zcGxpdHRlcic7XG5cbi8qKlxuICog5pys5Zyw5ZCR6YeP5bWM5YWl5ZmoXG4gKi9cbmV4cG9ydCBjbGFzcyBMb2NhbEVtYmVkZGVyIHtcbiAgcHJpdmF0ZSBlbWJlZGRlcjogYW55IHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgdGV4dFNwbGl0dGVyOiBSZWN1cnNpdmVDaGFyYWN0ZXJUZXh0U3BsaXR0ZXI7XG5cbiAgY29uc3RydWN0b3IobW9kZWxOYW1lOiBzdHJpbmcgPSAnWGVub3ZhL2FsbC1NaW5pTE0tTDYtdjInKSB7XG4gICAgLy8g6K6+572u5pys5Zyw5qih5Z6L6Lev5b6EXG4gICAgZW52LmFsbG93TG9jYWxNb2RlbHMgPSB0cnVlO1xuICAgIGVudi51c2VCcm93c2VyQ2FjaGUgPSBmYWxzZTtcblxuICAgIHRoaXMudGV4dFNwbGl0dGVyID0gbmV3IFJlY3Vyc2l2ZUNoYXJhY3RlclRleHRTcGxpdHRlcih7XG4gICAgICBjaHVua1NpemU6IDEwMDAsXG4gICAgICBjaHVua092ZXJsYXA6IDIwMFxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIOWIneWni+WMluW1jOWFpeWZqO+8iOaHkuWKoOi9ve+8iVxuICAgKi9cbiAgYXN5bmMgaW5pdGlhbGl6ZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoIXRoaXMuZW1iZWRkZXIpIHtcbiAgICAgIGNvbnN0IGV4dHJhY3RvciA9IGF3YWl0IHBpcGVsaW5lKCdmZWF0dXJlLWV4dHJhY3Rpb24nLCB0aGlzLmdldE1vZGVsTmFtZSgpKTtcbiAgICAgIHRoaXMuZW1iZWRkZXIgPSBleHRyYWN0b3I7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIOiOt+WPluaooeWei+WQjeensFxuICAgKi9cbiAgcHJpdmF0ZSBnZXRNb2RlbE5hbWUoKTogc3RyaW5nIHtcbiAgICAvLyDlj6/phY3nva7nmoTmqKHlnovliJfooahcbiAgICBjb25zdCBtb2RlbHM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gICAgICAnbWluaSc6ICdYZW5vdmEvYWxsLU1pbmlMTS1MNi12MicsICAgICAgLy8gMzg057u077yM5b+r6YCfXG4gICAgICAnYmFzZSc6ICdYZW5vdmEvYWxsLW1wbmV0LWJhc2UtdjInLCAgICAgLy8gNzY457u077yM5YeG56GuXG4gICAgICAnbGFyZ2UnOiAnWGVub3ZhL2d0ci10NS1sYXJnZScgICAgICAgICAgLy8gMTAyNOe7tO+8jOacgOWHhuehrlxuICAgIH07XG5cbiAgICByZXR1cm4gbW9kZWxzW3Byb2Nlc3MuZW52LkVNQkVEREVSX01PREVMIHx8ICdtaW5pJ107XG4gIH1cblxuICAvKipcbiAgICog5bWM5YWl5Y2V5Liq5paH5pysXG4gICAqL1xuICBhc3luYyBlbWJlZCh0ZXh0OiBzdHJpbmcpOiBQcm9taXNlPG51bWJlcltdPiB7XG4gICAgYXdhaXQgdGhpcy5pbml0aWFsaXplKCk7XG5cbiAgICAvLyDliIblibLplb/mlofmnKxcbiAgICBjb25zdCBjaHVua3MgPSBhd2FpdCB0aGlzLnRleHRTcGxpdHRlci5jcmVhdGVEb2N1bWVudHMoW3RleHRdKTtcbiAgICBcbiAgICAvLyDlr7nmr4/kuKrlnZfov5vooYzltYzlhaVcbiAgICBjb25zdCBlbWJlZGRpbmdzID0gW107XG4gICAgZm9yIChjb25zdCBjaHVuayBvZiBjaHVua3MpIHtcbiAgICAgIGNvbnN0IG91dHB1dCA9IGF3YWl0IHRoaXMuZW1iZWRkZXIoY2h1bmsucGFnZUNvbnRlbnQsIHtcbiAgICAgICAgcG9vbGluZzogJ21lYW4nLFxuICAgICAgICBub3JtYWxpemU6IHRydWVcbiAgICAgIH0pO1xuICAgICAgZW1iZWRkaW5ncy5wdXNoKG91dHB1dC5kYXRhc2V0Lm91dHB1dCk7XG4gICAgfVxuXG4gICAgLy8g566A5Y2V5bmz5Z2H77yI5Lmf5Y+v5Lul5L2/55So5Yqg5p2D5bmz5Z2H77yJXG4gICAgY29uc3QgYXZnRW1iZWRkaW5nID0gdGhpcy5hdmVyYWdlRW1iZWRkaW5ncyhlbWJlZGRpbmdzKTtcbiAgICBcbiAgICByZXR1cm4gYXZnRW1iZWRkaW5nO1xuICB9XG5cbiAgLyoqXG4gICAqIOaJuemHj+W1jOWFpVxuICAgKi9cbiAgYXN5bmMgZW1iZWRCYXRjaCh0ZXh0czogc3RyaW5nW10pOiBQcm9taXNlPG51bWJlcltdW10+IHtcbiAgICBhd2FpdCB0aGlzLmluaXRpYWxpemUoKTtcblxuICAgIGNvbnN0IGFsbEVtYmVkZGluZ3MgPSBbXTtcbiAgICBcbiAgICBmb3IgKGNvbnN0IHRleHQgb2YgdGV4dHMpIHtcbiAgICAgIGNvbnN0IGNodW5rcyA9IGF3YWl0IHRoaXMudGV4dFNwbGl0dGVyLmNyZWF0ZURvY3VtZW50cyhbdGV4dF0pO1xuICAgICAgY29uc3QgZW1iZWRkaW5ncyA9IFtdO1xuXG4gICAgICBmb3IgKGNvbnN0IGNodW5rIG9mIGNodW5rcykge1xuICAgICAgICBjb25zdCBvdXRwdXQgPSBhd2FpdCB0aGlzLmVtYmVkZGVyKGNodW5rLnBhZ2VDb250ZW50LCB7XG4gICAgICAgICAgcG9vbGluZzogJ21lYW4nLFxuICAgICAgICAgIG5vcm1hbGl6ZTogdHJ1ZVxuICAgICAgICB9KTtcbiAgICAgICAgZW1iZWRkaW5ncy5wdXNoKG91dHB1dC5kYXRhc2V0Lm91dHB1dCk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGF2Z0VtYmVkZGluZyA9IHRoaXMuYXZlcmFnZUVtYmVkZGluZ3MoZW1iZWRkaW5ncyk7XG4gICAgICBhbGxFbWJlZGRpbmdzLnB1c2goYXZnRW1iZWRkaW5nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gYWxsRW1iZWRkaW5ncztcbiAgfVxuXG4gIC8qKlxuICAgKiDlubPlnYfltYzlhaXlkJHph49cbiAgICovXG4gIHByaXZhdGUgYXZlcmFnZUVtYmVkZGluZ3MoZW1iZWRkaW5nczogbnVtYmVyW11bXSk6IG51bWJlcltdIHtcbiAgICBpZiAoZW1iZWRkaW5ncy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBjb25zdCBkaW1zID0gZW1iZWRkaW5nc1swXS5sZW5ndGg7XG4gICAgY29uc3QgYXZnID0gbmV3IEFycmF5KGRpbXMpLmZpbGwoMCk7XG5cbiAgICBmb3IgKGNvbnN0IGVtYiBvZiBlbWJlZGRpbmdzKSB7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGRpbXM7IGkrKykge1xuICAgICAgICBhdmdbaV0gKz0gZW1iW2ldO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIOWPluW5s+Wdh1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZGltczsgaSsrKSB7XG4gICAgICBhdmdbaV0gLz0gZW1iZWRkaW5ncy5sZW5ndGg7XG4gICAgfVxuXG4gICAgcmV0dXJuIGF2ZztcbiAgfVxuXG4gIC8qKlxuICAgKiDltYzlhaXlubbojrflj5bnu7TluqZcbiAgICovXG4gIGFzeW5jIGVtYmVkV2l0aERpbWVuc2lvbih0ZXh0OiBzdHJpbmcpOiBQcm9taXNlPHsgZW1iZWRkaW5nOiBudW1iZXJbXSwgZGltZW5zaW9uOiBudW1iZXIgfT4ge1xuICAgIGNvbnN0IGVtYmVkZGluZyA9IGF3YWl0IHRoaXMuZW1iZWQodGV4dCk7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVtYmVkZGluZyxcbiAgICAgIGRpbWVuc2lvbjogZW1iZWRkaW5nLmxlbmd0aFxuICAgIH07XG4gIH1cbn1cblxuLyoqXG4gKiDnroDljZXlkJHph4/mlbDmja7lupMgKOeUqOS6jua1i+ivlSlcbiAqL1xuZXhwb3J0IGNsYXNzIFNpbXBsZVZlY3RvckRCIHtcbiAgcHJpdmF0ZSBzdG9yZTogTWFwPHN0cmluZywgbnVtYmVyW10+ID0gbmV3IE1hcCgpO1xuXG4gIC8qKlxuICAgKiDmt7vliqDlkJHph49cbiAgICovXG4gIGFkZChpZDogc3RyaW5nLCBlbWJlZGRpbmc6IG51bWJlcltdKTogdm9pZCB7XG4gICAgdGhpcy5zdG9yZS5zZXQoaWQsIGVtYmVkZGluZyk7XG4gIH1cblxuICAvKipcbiAgICog6I635Y+W5ZCR6YePXG4gICAqL1xuICBnZXQoaWQ6IHN0cmluZyk6IG51bWJlcltdIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5zdG9yZS5nZXQoaWQpO1xuICB9XG5cbiAgLyoqXG4gICAqIOaJuemHj+a3u+WKoFxuICAgKi9cbiAgYWRkQmF0Y2goZW50cmllczogeyBpZDogc3RyaW5nOyBlbWJlZGRpbmc6IG51bWJlcltdIH1bXSk6IHZvaWQge1xuICAgIGZvciAoY29uc3QgZW50cnkgb2YgZW50cmllcykge1xuICAgICAgdGhpcy5zdG9yZS5zZXQoZW50cnkuaWQsIGVudHJ5LmVtYmVkZGluZyk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIOiuoeeul+S9meW8puebuOS8vOW6plxuICAgKi9cbiAgY29zaW5lU2ltaWxhcml0eShhOiBudW1iZXJbXSwgYjogbnVtYmVyW10pOiBudW1iZXIge1xuICAgIGxldCBkb3QgPSAwO1xuICAgIGxldCBub3JtQSA9IDA7XG4gICAgbGV0IG5vcm1CID0gMDtcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYS5sZW5ndGg7IGkrKykge1xuICAgICAgZG90ICs9IGFbaV0gKiBiW2ldO1xuICAgICAgbm9ybUEgKz0gYVtpXSAqIGFbaV07XG4gICAgICBub3JtQiArPSBiW2ldICogYltpXTtcbiAgICB9XG5cbiAgICByZXR1cm4gZG90IC8gKE1hdGguc3FydChub3JtQSkgKiBNYXRoLnNxcnQobm9ybUIpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiDmkJzntKLnm7jkvLzlkJHph49cbiAgICovXG4gIHNlYXJjaChxdWVyeTogbnVtYmVyW10sIHRvcEs6IG51bWJlciA9IDUpOiB7IGlkOiBzdHJpbmc7IHNjb3JlOiBudW1iZXIgfVtdIHtcbiAgICBjb25zdCBzY29yZXM6IHsgaWQ6IHN0cmluZzsgc2NvcmU6IG51bWJlciB9W10gPSBbXTtcblxuICAgIGZvciAoY29uc3QgW2lkLCBlbWJlZGRpbmddIG9mIHRoaXMuc3RvcmUuZW50cmllcygpKSB7XG4gICAgICBjb25zdCBzY29yZSA9IHRoaXMuY29zaW5lU2ltaWxhcml0eShxdWVyeSwgZW1iZWRkaW5nKTtcbiAgICAgIHNjb3Jlcy5wdXNoKHsgaWQsIHNjb3JlIH0pO1xuICAgIH1cblxuICAgIC8vIOaOkuW6j+W5tui/lOWbniB0b3BLXG4gICAgcmV0dXJuIHNjb3Jlc1xuICAgICAgLnNvcnQoKGEsIGIpID0+IGIuc2NvcmUgLSBhLnNjb3JlKVxuICAgICAgLnNsaWNlKDAsIHRvcEspO1xuICB9XG5cbiAgLyoqXG4gICAqIOa4heepuuWtmOWCqFxuICAgKi9cbiAgY2xlYXIoKTogdm9pZCB7XG4gICAgdGhpcy5zdG9yZS5jbGVhcigpO1xuICB9XG5cbiAgLyoqXG4gICAqIOiOt+WPluWkp+Wwj1xuICAgKi9cbiAgc2l6ZSgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLnN0b3JlLnNpemU7XG4gIH1cbn1cblxuLyoqXG4gKiDkvb/nlKjnpLrkvos6XG4gKiBcbiAqIC8vIOWIneWni+WMluW1jOWFpeWZqFxuICogY29uc3QgZW1iZWRkZXIgPSBuZXcgTG9jYWxFbWJlZGRlcigpO1xuICogXG4gKiAvLyDltYzlhaXmlofmnKxcbiAqIGNvbnN0IGVtYmVkZGluZyA9IGF3YWl0IGVtYmVkZGVyLmVtYmVkKCfov5nmmK/mtYvor5XmlofmnKwnKTtcbiAqIGNvbnNvbGUubG9nKCdEaW1lbnNpb246JywgZW1iZWRkaW5nLmxlbmd0aCk7XG4gKiBcbiAqIC8vIOaJuemHj+W1jOWFpVxuICogY29uc3QgZW1iZWRkaW5ncyA9IGF3YWl0IGVtYmVkZGVyLmVtYmVkQmF0Y2goWyfmlofmnKwxJywgJ+aWh+acrDInLCAn5paH5pysMyddKTtcbiAqIFxuICogLy8g5L2/55So5ZCR6YeP5pWw5o2u5bqTXG4gKiBjb25zdCBkYiA9IG5ldyBTaW1wbGVWZWN0b3JEQigpO1xuICogZGIuYWRkKCdkb2MxJywgZW1iZWRkaW5nKTtcbiAqIFxuICogLy8g5pCc57SiXG4gKiBjb25zdCBxdWVyeUVtYmVkZGluZyA9IGF3YWl0IGVtYmVkZGVyLmVtYmVkKCfmn6Xor6LmlofmnKwnKTtcbiAqIGNvbnN0IHJlc3VsdHMgPSBkYi5zZWFyY2gocXVlcnlFbWJlZGRpbmcsIDUpO1xuICogXG4gKiBjb25zb2xlLmxvZygnU2VhcmNoIHJlc3VsdHM6JywgcmVzdWx0cyk7XG4gKi9cbiJdfQ==