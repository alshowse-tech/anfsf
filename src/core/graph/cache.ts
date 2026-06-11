/**
 * ASF V4.0 Graph Kernel - Cache Utilities
 * 
 * Performance optimization with LRU caching for expensive operations.
 * Version: v0.8.5
 */

/**
 * LRU Cache implementation.
 */
export class LRUCache<K, V> {
  private cache: Map<K, V>;
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    // Delete if exists to update position
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    
    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics.
   */
  stats(): { size: number; maxSize: number; utilization: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      utilization: this.cache.size / this.maxSize,
    };
  }
}

/**
 * Memoization decorator for expensive functions.
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  cacheKeyFn?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();

  const memoizedFn = ((...args: Parameters<T>) => {
    const key = cacheKeyFn 
      ? cacheKeyFn(...args)
      : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;

  // Attach cache methods
  (memoizedFn as any).cache = cache;
  (memoizedFn as any).clear = () => cache.clear();
  (memoizedFn as any).stats = () => ({ size: cache.size });

  return memoizedFn;
}

/**
 * Time-based cache with TTL.
 */
export class TTLCache<K, V> {
  private cache: Map<K, { value: V; expiresAt: number }>;
  private defaultTTL: number;

  constructor(defaultTTL: number = 5 * 60 * 1000) {
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    
    return entry.value;
  }

  set(key: K, value: V, ttl?: number): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (ttl ?? this.defaultTTL),
    });
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  /**
   * Remove all expired entries.
   */
  prune(): number {
    const now = Date.now();
    let count = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        count++;
      }
    }
    
    return count;
  }

  size(): number {
    this.prune();
    return this.cache.size;
  }
}

/**
 * Debounce function.
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): T {
  let timeoutId: NodeJS.Timeout | null = null;

  const debouncedFn = ((...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  }) as T;

  (debouncedFn as any).cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debouncedFn;
}

/**
 * Throttle function.
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): T {
  let inThrottle = false;
  let lastResult: ReturnType<T> | null = null;

  const throttledFn = ((...args: Parameters<T>) => {
    if (!inThrottle) {
      lastResult = fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
    return lastResult;
  }) as T;

  return throttledFn;
}

/**
 * Batch processor for grouping rapid calls.
 */
export class BatchProcessor<T, R> {
  private queue: T[] = [];
  private pendingResolves: Array<(result: R) => void> = [];
  private processor: (items: T[]) => Promise<R>;
  private delay: number;
  private maxSize: number;
  private timeoutId: NodeJS.Timeout | null = null;

  constructor(
    processor: (items: T[]) => Promise<R>,
    options: { delay?: number; maxSize?: number } = {}
  ) {
    this.processor = processor;
    this.delay = options.delay ?? 100;
    this.maxSize = options.maxSize ?? 100;
  }

  add(item: T): Promise<R> {
    this.queue.push(item);

    return new Promise<R>((resolve) => {
      this.pendingResolves.push(resolve);

      // Process immediately if at max size
      if (this.queue.length >= this.maxSize) {
        this.process();
        return;
      }

      // Schedule processing
      if (!this.timeoutId) {
        this.timeoutId = setTimeout(() => {
          this.process();
        }, this.delay);
      }
    });
  }

  private async process(): Promise<void> {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    const batch = [...this.queue];
    const resolves = [...this.pendingResolves];
    this.queue = [];
    this.pendingResolves = [];

    const result = await this.processor(batch);
    for (const resolve of resolves) {
      resolve(result);
    }
  }

  flush(): Promise<R> {
    return new Promise<R>((resolve) => {
      if (this.queue.length > 0) {
        this.pendingResolves.push(resolve);
        this.process();
      }
    });
  }

  clear(): void {
    this.queue = [];
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  size(): number {
    return this.queue.length;
  }
}
