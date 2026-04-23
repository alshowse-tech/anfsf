import { useState, useEffect } from 'react';
import { getStudentProgress, getLearningPaths, getSubjectSummary } from '../services/neo4jService';

export const useKnowledgeData = () => {
  const [knowledgeData, setKnowledgeData] = useState([]);
  const [learningPaths, setLearningPaths] = useState([]);
  const [subjectSummary, setSubjectSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [progress, paths, summary] = await Promise.all([
          getStudentProgress(),
          getLearningPaths(),
          getSubjectSummary()
        ]);
        
        setKnowledgeData(progress);
        setLearningPaths(paths);
        setSubjectSummary(summary);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { knowledgeData, learningPaths, subjectSummary, loading, error };
};
