/**
 * ANFSF Storage — File-backed JSON KV store
 *
 * Generic persistent key-value store backed by a JSON file.
 * Uses in-memory Map for fast reads, syncs to disk on every write.
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export class FileBackedStore<T> {
  private data: Map<string, T>;
  private filePath: string;
  private writePromise: Promise<void> | null = null;

  constructor(filePath: string) {
    this.filePath = path.resolve(filePath);
    this.data = new Map();
  }

  /** Initialize — loads data from file if exists */
  async init(): Promise<void> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw) as Record<string, T>;
      this.data = new Map(Object.entries(parsed));
    } catch {
      // File doesn't exist or is empty — start fresh
      this.data = new Map();
    }
  }

  async set(key: string, value: T): Promise<void> {
    this.data.set(key, value);
    await this.persist();
  }

  async delete(key: string): Promise<void> {
    this.data.delete(key);
    await this.persist();
  }

  get(key: string): T | null {
    return this.data.get(key) ?? null;
  }

  has(key: string): boolean {
    return this.data.has(key);
  }

  keys(): string[] {
    return [...this.data.keys()];
  }

  values(): T[] {
    return [...this.data.values()];
  }

  clear(): Promise<void> {
    this.data.clear();
    return this.persist();
  }

  size(): number {
    return this.data.size;
  }

  /** Export all data as plain object (for backup/debugging) */
  export(): Record<string, T> {
    return Object.fromEntries(this.data);
  }

  /** Import data from plain object (for restore/testing) */
  async import(record: Record<string, T>): Promise<void> {
    this.data = new Map(Object.entries(record));
    await this.persist();
  }

  private async persist(): Promise<void> {
    // Debounce concurrent writes
    if (this.writePromise) {
      return this.writePromise;
    }
    this.writePromise = this.doPersist().finally(() => {
      this.writePromise = null;
    });
    return this.writePromise;
  }

  private async doPersist(): Promise<void> {
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });
    const raw = JSON.stringify(Object.fromEntries(this.data), null, 2);
    await fs.writeFile(this.filePath, raw, 'utf-8');
  }
}
