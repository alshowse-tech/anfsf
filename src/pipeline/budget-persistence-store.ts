import type { TokenUsageRecord, BudgetPersistence } from './token-budget';

/**
 * Store-backed BudgetPersistence adapter.
 * Bridges TokenBudget persistence hooks to PipelineRunStore.
 */
export class StoreBudgetPersistence implements BudgetPersistence {
  constructor(
    private store: { saveBudgetRecords?(projectId: string, records: unknown[]): unknown; loadBudgetRecords?(projectId: string): unknown },
    private projectId: string,
  ) {}

  async restore(): Promise<TokenUsageRecord[] | null> {
    if (typeof this.store.loadBudgetRecords !== 'function') return null;
    const records = this.store.loadBudgetRecords(this.projectId);
    return records as TokenUsageRecord[];
  }

  async save(records: TokenUsageRecord[], _totalUsed: number): Promise<void> {
    if (typeof this.store.saveBudgetRecords !== 'function') return;
    await this.store.saveBudgetRecords(this.projectId, records);
  }
}
