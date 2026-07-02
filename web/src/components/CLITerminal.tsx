import { useState, useRef, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_ANFSF_API || '';

export default function CLITerminal() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState<string[]>([
    'Welcome to ANFSF OS CLI v1.0',
    'Type "help" for available commands or enter any shell command.',
  ]);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [loading, setLoading] = useState(false);
  const outRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (outRef.current) outRef.current.scrollTop = outRef.current.scrollHeight; }, [output]);

  const run = async (cmd: string) => {
    setOutput(p => [...p, `$ ${cmd}`]);
    setHistory(p => [...p, cmd]);
    setHistoryIdx(-1);

    const lower = cmd.toLowerCase().trim();
    if (lower === 'help') {
      setOutput(p => [...p, '  help     - Show this help', '  clear    - Clear terminal', '  exit     - Go back to dashboard', '  Any other command executes on the server shell']);
      return;
    }
    if (lower === 'clear') { setOutput([]); return; }
    if (lower === 'exit') { window.history.back(); return; }

    setLoading(true);
    try {
      const res = await fetch(API_BASE + '/api/v1/cli/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd }),
      });
      const data = await res.json();
      if (data.output) setOutput(p => [...p, data.output.trimEnd()]);
      if (data.error) setOutput(p => [...p, `\u2716 ${data.error}`]);
    } catch (e) {
      setOutput(p => [...p, `\u2716 ${String(e)}`]);
    }
    setLoading(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && input.trim()) { run(input.trim()); setInput(''); }
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const i = historyIdx === -1 ? history.length - 1 : Math.max(0, historyIdx - 1);
        setHistoryIdx(i); setInput(history[i]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx >= 0) {
        const i = historyIdx + 1;
        if (i >= history.length) { setHistoryIdx(-1); setInput(''); }
        else { setHistoryIdx(i); setInput(history[i]); }
      }
    }
  };

  return (
    <div className="bg-gray-900 text-green-400 font-mono text-sm rounded-lg overflow-hidden border border-gray-700">
      <div className="bg-gray-800 px-4 py-2 text-xs text-gray-400 flex items-center justify-between select-none">
        <span>ANFSF OS CLI</span>
        <span className={loading ? 'text-yellow-400' : 'text-green-400'}>{loading ? 'Running...' : 'Ready'}</span>
      </div>
      <div ref={outRef} className="p-3 h-80 overflow-y-auto whitespace-pre-wrap break-all leading-relaxed">
        {output.map((line, i) => (
          <div key={i} className={
            line.startsWith('$ ') ? 'text-yellow-300' :
            line.startsWith('\u2716') ? 'text-red-400' :
            line.startsWith('  ') ? 'text-gray-400' : ''
          }>{line}</div>
        ))}
      </div>
      <div className="border-t border-gray-700 flex items-center px-3 py-2">
        <span className="text-green-300 mr-2 shrink-0">$</span>
        <input type="text" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey} disabled={loading}
          className="flex-1 bg-transparent outline-none text-green-400 placeholder-gray-600"
          placeholder="Type a command..." autoFocus
        />
      </div>
    </div>
  );
}
