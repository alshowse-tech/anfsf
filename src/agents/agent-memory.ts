/**
 * ANFSF V4 Layer 9 - Agent Memory System
 *
 * Per-agent memory with three types: working (short-term), episodic (task history),
 * semantic (learned patterns). Integrates with MemoryConsolidationSkill for consolidation.
 */

import type { AgentMemory, MemoryType, ConsolidationResult } from './types';
import { MemoryConsolidationSkill } from '../skills/memory-consolidation-skill';
import * as fs from 'fs';
import * as path from 'path';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class AgentMemoryStore {
  private memories: Map<string, AgentMemory[]>;
  private persistencePath?: string;

  constructor(options?: { persistencePath?: string }) {
    this.memories = new Map();
    this.persistencePath = options?.persistencePath;
  }

  store(agentId: string, config: {
    type: MemoryType;
    content: Record<string, any>;
    tags?: string[];
    importance?: number;
  }): AgentMemory {
    const memory: AgentMemory = {
      id: generateUUID(),
      agentId,
      type: config.type,
      content: config.content,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      accessCount: 0,
      tags: config.tags,
      importance: config.importance,
    };

    if (!this.memories.has(agentId)) {
      this.memories.set(agentId, []);
    }
    this.memories.get(agentId)!.push(memory);
    return memory;
  }

  retrieve(agentId: string, options?: {
    type?: MemoryType;
    tags?: string[];
    limit?: number;
  }): AgentMemory[] {
    const agentMemories = this.memories.get(agentId) || [];
    let result = agentMemories;

    if (options?.type) {
      result = result.filter(m => m.type === options.type);
    }

    if (options?.tags && options.tags.length > 0) {
      result = result.filter(m =>
        m.tags && options.tags!.some(t => m.tags!.includes(t))
      );
    }

    result = result.sort((a, b) => b.lastAccessedAt - a.lastAccessedAt);

    if (options?.limit) {
      result = result.slice(0, options.limit);
    }

    for (const m of result) {
      m.accessCount++;
      m.lastAccessedAt = Date.now();
    }

    return result;
  }

  search(agentId: string, query: string, type?: MemoryType): AgentMemory[] {
    const agentMemories = this.memories.get(agentId) || [];
    let result = agentMemories;

    if (type) {
      result = result.filter(m => m.type === type);
    }

    const lowerQuery = query.toLowerCase();
    return result.filter(m => {
      const contentStr = JSON.stringify(m.content).toLowerCase();
      const tagsStr = (m.tags || []).join(' ').toLowerCase();
      return contentStr.includes(lowerQuery) || tagsStr.includes(lowerQuery);
    }).sort((a, b) => b.accessCount - a.accessCount);
  }

  async consolidate(agentId: string): Promise<ConsolidationResult> {
    const agentMemories = this.memories.get(agentId) || [];
    if (agentMemories.length === 0) {
      return { consolidatedCount: 0, prunedCount: 0, importanceScores: {} };
    }

    const skill = new MemoryConsolidationSkill();
    const memoryDataList = agentMemories.map(m => ({
      id: m.id,
      content: JSON.stringify(m.content),
      taskId: m.tags?.find(t => t.startsWith('task:'))?.replace('task:', ''),
      accessCount: m.accessCount,
      createdAt: m.createdAt,
      lastAccessedAt: m.lastAccessedAt,
      connectedMemories: [],
      metadata: { type: m.type, tags: m.tags, importance: m.importance },
    }));

    const result = await skill.execute({
      memories: memoryDataList,
      storageType: 'long',
      enableRLFeedback: false,
      enableUserFeedback: false,
    });

    for (const consolidated of result.consolidatedMemories) {
      const existing = agentMemories.find(m => m.id === consolidated.id);
      if (existing) {
        existing.importance = result.importanceScores[consolidated.id] ?? existing.importance;
      }
    }

    const prunedIds = new Set(result.prunedMemories.map(m => m.id));
    this.memories.set(agentId, agentMemories.filter(m => !prunedIds.has(m.id)));

    return {
      consolidatedCount: result.consolidatedMemories.length,
      prunedCount: result.prunedMemories.length,
      importanceScores: result.importanceScores,
    };
  }

  clear(agentId: string, type?: MemoryType): void {
    if (!type) {
      this.memories.delete(agentId);
      return;
    }
    const agentMemories = this.memories.get(agentId) || [];
    this.memories.set(agentId, agentMemories.filter(m => m.type !== type));
  }

  getStats(agentId: string): { working: number; episodic: number; semantic: number } {
    const agentMemories = this.memories.get(agentId) || [];
    return {
      working: agentMemories.filter(m => m.type === 'working').length,
      episodic: agentMemories.filter(m => m.type === 'episodic').length,
      semantic: agentMemories.filter(m => m.type === 'semantic').length,
    };
  }

  getTotalCount(): number {
    let total = 0;
    for (const mems of this.memories.values()) {
      total += mems.length;
    }
    return total;
  }

  async saveToPersistence(): Promise<void> {
    if (!this.persistencePath) return;

    const dir = path.dirname(this.persistencePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const data: Record<string, AgentMemory[]> = {};
    for (const [agentId, mems] of this.memories.entries()) {
      data[agentId] = mems;
    }
    fs.writeFileSync(this.persistencePath, JSON.stringify(data, null, 2));
  }

  async loadFromPersistence(): Promise<void> {
    if (!this.persistencePath || !fs.existsSync(this.persistencePath)) return;

    const raw = fs.readFileSync(this.persistencePath, 'utf-8');
    const data: Record<string, AgentMemory[]> = JSON.parse(raw);

    for (const [agentId, mems] of Object.entries(data)) {
      this.memories.set(agentId, mems);
    }
  }
}
