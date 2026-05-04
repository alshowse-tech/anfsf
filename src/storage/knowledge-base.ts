/**
 * ANFSF Storage — Knowledge Base
 *
 * Persistent knowledge store for cross-project experience reuse.
 */

import { FileBackedStore } from './file-store';

export interface KnowledgeEntry {
  id: string;
  projectId: string;
  category: string;
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
}

export class KnowledgeBase {
  private store: FileBackedStore<KnowledgeEntry>;

  constructor(filePath: string) {
    this.store = new FileBackedStore<KnowledgeEntry>(filePath);
  }

  async init(): Promise<void> {
    await this.store.init();
  }

  async add(entry: KnowledgeEntry): Promise<void> {
    await this.store.set(entry.id, entry);
  }

  async getById(id: string): Promise<KnowledgeEntry | null> {
    return this.store.get(id);
  }

  async query(projectId?: string, category?: string): Promise<KnowledgeEntry[]> {
    const entries = this.store.values();
    return entries.filter(e => {
      if (projectId && e.projectId !== projectId) return false;
      if (category && e.category !== category) return false;
      return true;
    });
  }

  async delete(id: string): Promise<void> {
    await this.store.delete(id);
  }

  async count(): Promise<number> {
    return this.store.size();
  }
}
