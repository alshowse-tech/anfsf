/**
 * ANFSF V1.5.0 - 本地零 API 向量嵌入器
 * 使用 Sentence Transformers 替代 OpenAI Embeddings
 */
/**
 * 本地向量嵌入器
 */
export declare class LocalEmbedder {
    private embedder;
    private textSplitter;
    constructor(modelName?: string);
    /**
     * 初始化嵌入器（懒加载）
     */
    initialize(): Promise<void>;
    /**
     * 获取模型名称
     */
    private getModelName;
    /**
     * 嵌入单个文本
     */
    embed(text: string): Promise<number[]>;
    /**
     * 批量嵌入
     */
    embedBatch(texts: string[]): Promise<number[][]>;
    /**
     * 平均嵌入向量
     */
    private averageEmbeddings;
    /**
     * 嵌入并获取维度
     */
    embedWithDimension(text: string): Promise<{
        embedding: number[];
        dimension: number;
    }>;
}
/**
 * 简单向量数据库 (用于测试)
 */
export declare class SimpleVectorDB {
    private store;
    /**
     * 添加向量
     */
    add(id: string, embedding: number[]): void;
    /**
     * 获取向量
     */
    get(id: string): number[] | undefined;
    /**
     * 批量添加
     */
    addBatch(entries: {
        id: string;
        embedding: number[];
    }[]): void;
    /**
     * 计算余弦相似度
     */
    cosineSimilarity(a: number[], b: number[]): number;
    /**
     * 搜索相似向量
     */
    search(query: number[], topK?: number): {
        id: string;
        score: number;
    }[];
    /**
     * 清空存储
     */
    clear(): void;
}
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
