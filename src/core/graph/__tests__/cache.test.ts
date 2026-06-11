/**
 * Cache Utilities — Tests
 */

import { LRUCache, memoize, TTLCache, debounce, throttle, BatchProcessor } from '../cache';

describe('LRUCache', () => {
  it('stores and retrieves values', () => {
    const cache = new LRUCache<string, number>();
    cache.set('a', 1);
    expect(cache.get('a')).toBe(1);
  });

  it('returns undefined for missing keys', () => {
    const cache = new LRUCache<string, number>();
    expect(cache.get('missing')).toBeUndefined();
  });

  it('evicts least recently used when at capacity', () => {
    const cache = new LRUCache<string, number>(3);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    cache.set('d', 4); // should evict 'a'

    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
    expect(cache.get('d')).toBe(4);
  });

  it('updates access order on get', () => {
    const cache = new LRUCache<string, number>(3);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    cache.get('a'); // make 'a' most recently used
    cache.set('d', 4); // should evict 'b'

    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBeUndefined();
  });

  it('has() works correctly', () => {
    const cache = new LRUCache<string, number>();
    cache.set('x', 10);
    expect(cache.has('x')).toBe(true);
    expect(cache.has('y')).toBe(false);
  });

  it('delete() removes entries', () => {
    const cache = new LRUCache<string, number>();
    cache.set('x', 10);
    expect(cache.delete('x')).toBe(true);
    expect(cache.has('x')).toBe(false);
    expect(cache.delete('missing')).toBe(false);
  });

  it('clear() empties the cache', () => {
    const cache = new LRUCache<string, number>();
    cache.set('a', 1);
    cache.set('b', 2);
    cache.clear();
    expect(cache.size()).toBe(0);
  });

  it('stats() returns utilization', () => {
    const cache = new LRUCache<string, number>(10);
    cache.set('a', 1);
    cache.set('b', 2);
    const stats = cache.stats();
    expect(stats.size).toBe(2);
    expect(stats.maxSize).toBe(10);
    expect(stats.utilization).toBe(0.2);
  });
});

describe('memoize', () => {
  it('caches function results', () => {
    let callCount = 0;
    const fn = memoize((x: number) => {
      callCount++;
      return x * 2;
    });

    expect(fn(5)).toBe(10);
    expect(fn(5)).toBe(10);
    expect(callCount).toBe(1); // only called once
  });

  it('uses custom cache key function', () => {
    let callCount = 0;
    const fn = memoize(
      (obj: { id: number }) => {
        callCount++;
        return obj.id * 2;
      },
      (obj) => String(obj.id)
    );

    expect(fn({ id: 1 })).toBe(2);
    expect(fn({ id: 1 })).toBe(2);
    expect(callCount).toBe(1);
  });

  it('exposes cache.clear()', () => {
    const fn = memoize((x: number) => x * 2);
    fn(5);
    (fn as any).clear();
    expect((fn as any).cache.size).toBe(0);
  });

  it('exposes cache.stats()', () => {
    const fn = memoize((x: number) => x * 2);
    fn(1);
    fn(2);
    expect((fn as any).stats()).toEqual({ size: 2 });
  });
});

describe('TTLCache', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns value before expiry', () => {
    const cache = new TTLCache<string, number>(5000);
    cache.set('x', 42);
    expect(cache.get('x')).toBe(42);
  });

  it('returns undefined after expiry', () => {
    const cache = new TTLCache<string, number>(1000);
    cache.set('x', 42);
    jest.advanceTimersByTime(1500);
    expect(cache.get('x')).toBeUndefined();
  });

  it('supports per-key TTL', () => {
    const cache = new TTLCache<string, number>(5000);
    cache.set('a', 1, 500);
    cache.set('b', 2, 2000);

    jest.advanceTimersByTime(1000);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
  });

  it('prune() removes expired entries', () => {
    const cache = new TTLCache<string, number>(1000);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3, 5000);

    jest.advanceTimersByTime(1500);
    const pruned = cache.prune();
    expect(pruned).toBe(2);
  });

  it('size() prunes before counting', () => {
    const cache = new TTLCache<string, number>(1000);
    cache.set('a', 1);
    cache.set('b', 2, 5000);

    jest.advanceTimersByTime(1500);
    expect(cache.size()).toBe(1);
  });

  it('delete() removes entries', () => {
    const cache = new TTLCache<string, number>(5000);
    cache.set('x', 42);
    expect(cache.delete('x')).toBe(true);
    expect(cache.get('x')).toBeUndefined();
  });

  it('clear() removes all entries', () => {
    const cache = new TTLCache<string, number>(5000);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.clear();
    expect(cache.size()).toBe(0);
  });
});

describe('debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calls function after delay', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);

    debounced();
    expect(fn).not.toHaveBeenCalled();
    jest.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('resets delay on subsequent calls', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);

    debounced();
    jest.advanceTimersByTime(50);
    debounced();
    jest.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled();
    jest.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('cancel() prevents execution', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);

    debounced();
    (debounced as any).cancel();
    jest.advanceTimersByTime(100);
    expect(fn).not.toHaveBeenCalled();
  });
});

describe('throttle', () => {
  it('calls immediately on first invocation', () => {
    const fn = jest.fn();
    const throttled = throttle(fn, 100);

    throttled();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('returns cached result during throttle period', () => {
    let counter = 0;
    const fn = () => ++counter;
    const throttled = throttle(fn, 100);

    const r1 = throttled();
    const r2 = throttled();
    expect(r1).toBe(1);
    expect(r2).toBe(1); // same result, not called again
  });
});

describe('BatchProcessor', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('processes batch after delay', async () => {
    const processor = jest.fn(async (items: number[]) => items.reduce((a, b) => a + b, 0));
    const bp = new BatchProcessor(processor, { delay: 100 });

    const p1 = bp.add(1);
    const p2 = bp.add(2);

    await jest.advanceTimersByTimeAsync(100);

    expect(processor).toHaveBeenCalledWith([1, 2]);
    expect(await p1).toBe(3);
    expect(await p2).toBe(3);
  });

  it('processes immediately when at max size', async () => {
    const processor = jest.fn(async (items: number[]) => items.length);
    const bp = new BatchProcessor(processor, { delay: 1000, maxSize: 2 });

    bp.add(1);
    const p2 = bp.add(2);

    await Promise.resolve();
    expect(processor).toHaveBeenCalledWith([1, 2]);
    expect(await p2).toBe(2);
  });

  it('flush() processes pending items', async () => {
    const processor = jest.fn(async (items: number[]) => items);
    const bp = new BatchProcessor(processor, { delay: 1000 });

    bp.add(1);
    bp.add(2);
    const result = bp.flush();

    expect(await result).toEqual([1, 2]);
  });

  it('clear() empties queue', async () => {
    const processor = jest.fn(async (items: number[]) => items);
    const bp = new BatchProcessor(processor, { delay: 100 });

    bp.add(1);
    bp.add(2);
    bp.clear();

    expect(bp.size()).toBe(0);
  });
});
