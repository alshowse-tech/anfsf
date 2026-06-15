/**
 * ANFSF Pipeline — PM UAT Review (GAP-07)
 *
 * PM review cycle for generated output.
 * Connects to PipelineStateMachine: stage4_testing -> stage4_fixing/confirmed
 */

export type ReviewDecision = "approved" | "rejected" | "changes_requested";

export interface Review {
  id: string;
  projectId: string;
  reviewer: string;
  decision: ReviewDecision;
  comments: string;
  createdAt: number;
}

let _reviews: Review[] = [];

export function createReview(projectId: string, reviewer: string, decision: ReviewDecision, comments: string): Review {
  const id = "rev_" + Math.random().toString(36).slice(2, 10) + "_" + Date.now();
  const r: Review = { id, projectId, reviewer, decision, comments, createdAt: Date.now() };
  _reviews.push(r);
  return r;
}

export function getReviews(projectId?: string): Review[] {
  if (!projectId) return _reviews.slice();
  return _reviews.filter(r => r.projectId === projectId);
}

export function getReview(id: string): Review | undefined {
  return _reviews.find(r => r.id === id);
}

export function getLastDecision(projectId: string): Review | undefined {
  const reviews = getReviews(projectId).sort((a, b) => b.createdAt - a.createdAt);
  return reviews[0];
}

export function clearReviews(): void { _reviews = []; }