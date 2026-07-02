import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchRunDetail } from '../api/client';
import RequirementReview from './RequirementReview';

export default function RequirementReviewPage() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId') || searchParams.get('runId');
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    fetchRunDetail(projectId)
      .then(run => {
        setItems([{
          id: '1', text: run.projectName || 'Project', category: 'overview',
          annotation: { itemId: '1', itemText: run.projectName || '', source: 'explicit',
            confidence: 'high', confidenceScore: 0.95, rationale: 'From PRD', pmConfirmed: false }
        }]);
        setSummary({ total: 1, explicit: 1, inferred: 0, supplemented: 0,
          highConfidence: 1, mediumConfidence: 0, lowConfidence: 0 });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  if (!projectId) return <div className="text-center py-12 text-gray-500">Please provide a project ID</div>;
  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <RequirementReview
      items={items}
      summary={summary}
      attentionItems={items.filter(i => i.annotation.confidence === 'low').map(i => i.id)}
      onLock={() => {}}
      onReanalyze={() => {}}
    />
  );
}
