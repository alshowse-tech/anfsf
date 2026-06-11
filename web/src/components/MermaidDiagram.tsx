import { useEffect, useRef, useState } from 'react';

interface MermaidDiagramProps {
  chart: string;
  className?: string;
}

export default function MermaidDiagram({ chart, className }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const mermaidRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    const loadMermaid = async () => {
      try {
        const mermaid = await import('mermaid');
        mermaid.default.initialize({ startOnLoad: false, theme: 'default' });
        mermaidRef.current = mermaid.default;
      } catch (e) {
        if (!cancelled) setError('Failed to load Mermaid library');
      }
    };

    loadMermaid();
  }, []);

  useEffect(() => {
    if (!mermaidRef.current || !chart) return;

    let cancelled = false;
    const render = async () => {
      try {
        const id = `mermaid-${Math.random().toString(36).slice(2, 8)}`;
        // Remove any previous renders with same id
        const prev = document.getElementById(id);
        if (prev) prev.remove();
        const { svg } = await mermaidRef.current.render(id, chart);
        if (!cancelled) setSvg(svg);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Render failed');
      }
    };
    render();
    return () => { cancelled = true; };
  }, [chart]);

  if (error) {
    return (
      <div className={`p-4 bg-red-50 text-red-700 rounded ${className || ''}`}>
        Mermaid error: {error}
      </div>
    );
  }

  if (!svg) {
    return (
      <div className={`p-4 text-gray-500 ${className || ''}`}>
        Loading diagram...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className || ''}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
