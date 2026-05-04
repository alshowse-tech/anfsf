/**
 * ANFSF V1.5.0 — Vector Search Engine
 *
 * Semantic search for requirements and project knowledge using LLM-generated
 * embeddings. Stores vectors in a file-backed index. No external vector DB required.
 *
 * Uses the DashScope embedding API (text-embedding-v3) for generating 1024-dim vectors.
 * Cosine similarity is used for ranking.
 */

import { FileBackedStore } from '../storage/file-store';

export interface VectorDocumentInput {
  id: string;
  projectId: string;
  text: string;
  metadata: Record<string, unknown>;
}

export interface VectorDocument {
  id: string;
  projectId: string;
  text: string;
  embedding: number[];
  metadata: Record<string, unknown>;
  createdAt: number;
}

export interface SearchResult {
  document: VectorDocument;
  score: number; // 0-1 cosine similarity
}

export interface VectorSearchConfig {
  apiKey?: string;
  model?: string;
  embeddingModel?: string;
  llmBaseUrl?: string;
  /** Dimension of embedding vectors (default: 1024 for text-embedding-v3) */
  dimensions?: number;
  /** Path to the vector index file */
  indexPath?: string;
}

const DEFAULT_EMBEDDING_MODEL = 'text-embedding-v3';
const DEFAULT_DIMENSIONS = 1024;

export class VectorSearchEngine {
  private apiKey: string;
  private embeddingModel: string;
  private llmBaseUrl: string;
  private dimensions: number;
  private documents: Map<string, VectorDocument>;
  private indexStore: FileBackedStore<VectorDocument>;
  private initialized: boolean;

  constructor(config: VectorSearchConfig = {}) {
    this.apiKey = config.apiKey || process.env.DASHSCOPE_API_KEY || '';
    this.embeddingModel = config.embeddingModel || DEFAULT_EMBEDDING_MODEL;
    this.llmBaseUrl = config.llmBaseUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
    this.dimensions = config.dimensions ?? DEFAULT_DIMENSIONS;
    this.documents = new Map();
    this.indexStore = new FileBackedStore<VectorDocument>(config.indexPath || './.anfsf/vector-index.json');
    this.initialized = false;
  }

  /** Initialize — loads the vector index from disk */
  async init(): Promise<void> {
    await this.indexStore.init();
    // Restore documents from index
    for (const doc of this.indexStore.values()) {
      this.documents.set(doc.id, doc);
    }
    this.initialized = true;
  }

  /**
   * Index a document (text) for semantic search.
   * Generates embedding if API key is available, otherwise uses hash-based fallback.
   */
  async index(document: VectorDocumentInput): Promise<VectorDocument> {
    let embedding: number[];

    if (this.apiKey) {
      embedding = await this.generateEmbedding(document.text);
    } else {
      embedding = this.hashFallback(document.text);
    }

    const doc: VectorDocument = {
      ...document,
      embedding,
      createdAt: Date.now(),
    };

    this.documents.set(doc.id, doc);
    await this.indexStore.set(doc.id, doc);

    return doc;
  }

  /**
   * Index multiple documents in parallel.
   */
  async indexMany(documents: VectorDocumentInput[]): Promise<VectorDocument[]> {
    return Promise.all(documents.map(d => this.index(d)));
  }

  /**
   * Search for semantically similar documents.
   */
  async search(query: string, limit: number = 10, projectId?: string): Promise<SearchResult[]> {
    if (this.documents.size === 0) return [];

    let queryEmbedding: number[];

    if (this.apiKey) {
      queryEmbedding = await this.generateEmbedding(query);
    } else {
      queryEmbedding = this.hashFallback(query);
    }

    const results: SearchResult[] = [];

    for (const doc of this.documents.values()) {
      if (projectId && doc.projectId !== projectId) continue;

      const score = cosineSimilarity(queryEmbedding, doc.embedding);
      results.push({ document: doc, score });
    }

    // Sort by similarity and return top results
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  /**
   * Search for similar historical requirements.
   * Convenience method for requirement-matching use case.
   */
  async findSimilarRequirements(requirement: string, limit: number = 5): Promise<SearchResult[]> {
    return this.search(requirement, limit);
  }

  /**
   * Delete a document from the index.
   */
  async delete(id: string): Promise<void> {
    this.documents.delete(id);
    await this.indexStore.delete(id);
  }

  /** Get the number of indexed documents */
  get size(): number {
    return this.documents.size;
  }

  /** Check if a document exists */
  has(id: string): boolean {
    return this.documents.has(id);
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await fetch(`${this.llmBaseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.embeddingModel,
          input: text.slice(0, 8000), // Truncate to max input length
        }),
      });

      if (!response.ok) {
        return this.hashFallback(text);
      }

      const data = await response.json() as {
        data: Array<{ embedding: number[] }>;
      };

      return data.data[0]?.embedding || this.hashFallback(text);
    } catch {
      return this.hashFallback(text);
    }
  }

  /**
   * Deterministic hash-based vector fallback when embedding API is unavailable.
   * Generates a normalized vector with fixed dimensions based on text content.
   */
  private hashFallback(text: string): number[] {
    const vector = new Float64Array(this.dimensions);

    // Generate multiple hash positions to create a dense-ish vector
    for (let i = 0; i < text.length && i < 200; i++) {
      const charCode = text.charCodeAt(i);
      // Spread across dimensions using multiplicative hashing
      const pos = (charCode * 31 + i * 17) % this.dimensions;
      vector[pos] += (charCode % 100) / 100;
    }

    // Normalize to unit vector
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    if (magnitude > 0) {
      for (let i = 0; i < this.dimensions; i++) {
        vector[i] /= magnitude;
      }
    }

    return Array.from(vector);
  }
}

/**
 * Compute cosine similarity between two vectors.
 * Returns a value between 0 and 1 for non-negative vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < len; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  // Cosine similarity ranges from -1 to 1; normalize to 0-1
  return (dotProduct / denominator + 1) / 2;
}

export function createVectorSearchEngine(config: VectorSearchConfig = {}): VectorSearchEngine {
  return new VectorSearchEngine(config);
}
