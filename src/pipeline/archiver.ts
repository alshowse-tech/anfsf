/**
 * ANFSF Pipeline — Project Archiver (T-305)
 *
 * After release, automatically:
 *   1. Generate metrics report
 *   2. Mark components as candidates for the library
 *   3. Create version snapshot
 *
 * Phase 1: basic metrics + candidate marking (no auto-extraction yet).
 * Phase 2: automatic pattern extraction and knowledge base updates.
 */

import type { FixRecord } from './fix-engine';
import type { CodeAnnotation } from './code-annotator';

// ============================================================================
// Types
// ============================================================================

export interface StageMetrics {
  stage: number;
  name: string;
  durationHours: number;
  startTimestamp: number;
  endTimestamp: number;
}

export interface ProjectMetrics {
  projectId: string;
  projectName: string;
  totalDurationHours: number;
  stages: StageMetrics[];
  reworkCount: number;
  reworkDistribution: Record<string, number>;
  componentReuseRate: number;
  fixSummary: {
    l1: number;
    l2: number;
    l3: number;
    total: number;
  };
  tokenUsage: {
    total: number;
    byStage: Record<string, number>;
  };
  generatedAt: number;
}

export interface ComponentCandidate {
  file: string;
  source: string;
  stability: 'stable' | 'unstable' | 'unknown';
  modifiedCount: number;
  lastModifiedAt: number;
  suggestedTags: string[];
}

export interface ArchiveResult {
  metrics: ProjectMetrics;
  candidates: ComponentCandidate[];
  snapshotVersion: string;
  archivedAt: number;
}

// ============================================================================
// Archiver
// ============================================================================

export class Archiver {
  /**
   * Archive a completed project.
   */
  archive(params: {
    projectId: string;
    projectName: string;
    stages: StageMetrics[];
    fixRecords: FixRecord[];
    annotations: CodeAnnotation[];
    tokenByStage: Record<string, number>;
    totalTokens: number;
    startTimestamp: number;
    endTimestamp: number;
  }): ArchiveResult {
    const metrics = this.buildMetrics(params);
    const candidates = this.identifyCandidates(params.annotations);
    const snapshotVersion = `v1.0.0-archive-${Date.now()}`;

    return {
      metrics,
      candidates,
      snapshotVersion,
      archivedAt: Date.now(),
    };
  }

  private buildMetrics(params: {
    projectId: string;
    projectName: string;
    stages: StageMetrics[];
    fixRecords: FixRecord[];
    annotations: CodeAnnotation[];
    tokenByStage: Record<string, number>;
    totalTokens: number;
    startTimestamp: number;
    endTimestamp: number;
  }): ProjectMetrics {
    const l1 = params.fixRecords.filter(r => r.level === 'L1').length;
    const l2 = params.fixRecords.filter(r => r.level === 'L2').length;
    const l3 = params.fixRecords.filter(r => r.level === 'L3').length;

    const reworkDistribution: Record<string, number> = {};
    for (const ann of params.annotations) {
      if (ann.source === 'modified') {
        reworkDistribution[ann.file] = (reworkDistribution[ann.file] || 0) + 1;
      }
    }

    const totalFiles = params.annotations.length;
    const newFiles = params.annotations.filter(a => a.source === 'new').length;
    const reuseRate = totalFiles > 0 ? 1 - (newFiles / totalFiles) : 0;

    return {
      projectId: params.projectId,
      projectName: params.projectName,
      totalDurationHours: (params.endTimestamp - params.startTimestamp) / (1000 * 3600),
      stages: params.stages,
      reworkCount: Object.values(reworkDistribution).reduce((a, b) => a + b, 0),
      reworkDistribution,
      componentReuseRate: reuseRate,
      fixSummary: { l1, l2, l3, total: l1 + l2 + l3 },
      tokenUsage: {
        total: params.totalTokens,
        byStage: params.tokenByStage,
      },
      generatedAt: Date.now(),
    };
  }

  /**
   * Identify components that could be candidates for the library.
   *
   * Phase 1 heuristic: files modified 0-2 times during dev → potentially stable.
   * Phase 2 will add more sophisticated analysis.
   */
  private identifyCandidates(annotations: CodeAnnotation[]): ComponentCandidate[] {
    const candidates: ComponentCandidate[] = [];
    const modificationCounts: Record<string, number> = {};

    for (const ann of annotations) {
      if (ann.source === 'modified') {
        modificationCounts[ann.file] = (modificationCounts[ann.file] || 0) + 1;
      }
    }

    for (const ann of annotations) {
      const modCount = modificationCounts[ann.file] || 0;
      const stability: ComponentCandidate['stability'] =
        modCount === 0 ? 'stable' :
        modCount <= 2 ? 'unknown' : 'unstable';

      // Only suggest as candidate if relatively stable
      if (stability !== 'unstable' && ann.source !== 'new') {
        candidates.push({
          file: ann.file,
          source: ann.source,
          stability,
          modifiedCount: modCount,
          lastModifiedAt: ann.annotatedAt,
          suggestedTags: this.suggestTags(ann.file),
        });
      }
    }

    return candidates;
  }

  private suggestTags(file: string): string[] {
    const tags: string[] = [];
    if (file.includes('components/') || file.includes('pages/')) tags.push('frontend');
    if (file.includes('routes/') || file.includes('services/')) tags.push('backend');
    if (file.includes('schema') || file.includes('database')) tags.push('database');
    if (file.includes('test')) tags.push('test');
    return tags;
  }
}
