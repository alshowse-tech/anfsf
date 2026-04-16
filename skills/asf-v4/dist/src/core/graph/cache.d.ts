/**
 * ASF V4.0 Graph Kernel - Cache Utilities
 *
 * Performance optimization with LRU caching for expensive operations.
 * Version: v0.8.5
 */
/**
 * LRU Cache implementation.
 */
export declare class LRUCache<K, V> {
    private cache;
    private maxSize;
    constructor(maxSize?: number);
    get(key: K): V | undefined;
    set(key: K, value: V): void;
    has(key: K): boolean;
    delete(key: K): boolean;
    clear(): void;
    size(): number;
    /**
     * Get cache statistics.
     */
    stats(): {
        size: number;
        maxSize: number;
        utilization: number;
    };
}
/**
 * Memoization decorator for expensive functions.
 */
export declare function memoize<T extends (...args: any[]) => any>(fn: T, cacheKeyFn?: (...args: Parameters<T>) => string): T;
/**
 * Time-based cache with TTL.
 */
export declare class TTLCache<K, V> {
    private cache;
    private defaultTTL;
    constructor(defaultTTL?: number);
    get(key: K): V | undefined;
    set(key: K, value: V, ttl?: number): void;
    delete(key: K): boolean;
    clear(): void;
    /**
     * Remove all expired entries.
     */
    prune(): number;
    size(): number;
}
/**
 * Debounce function.
 */
export declare function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): T;
/**
 * Throttle function.
 */
export declare function throttle<T extends (...args: any[]) => any>(fn: T, limit: number): T;
/**
 * Batch processor for grouping rapid calls.
 */
export declare class BatchProcessor<T, R> {
    private queue;
    private processor;
    private delay;
    private maxSize;
    private timeoutId;
    constructor(processor: (items: T[]) => Promise<R>, options?: {
        delay?: number;
        maxSize?: number;
    });
    add(item: T): Promise<R>;
    private process;
    flush(): Promise<R>;
    clear(): void;
    size(): number;
}
