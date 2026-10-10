import { useState, useRef } from 'react';
import { runPipeline, PIPELINE_NODES } from '../lib/agents/orchestrator.js';

// ── Node Status Colors ──────────────────────────────────────
const NODE_STYLES = {
  idle:    { ring: 'border-surface-border',     bg: 'bg-surface-hover',       dot: 'bg-gray-600',    text: 'text-gray-500' },
  running: { ring: 'border-brand-500/70',       bg: 'bg-brand-500/10',        dot: 'bg-brand-400 animate-pulse', text: 'text-brand-300' },
  done:    { ring: 'border-emerald-500/50',     bg: 'bg-emerald-500/10',      dot: 'bg-emerald-400', text: 'text-emerald-300' },
  error:   { ring: 'border-red-500/50',         bg: 'bg-red-500/10',          dot: 'bg-red-400',     text: 'text-red-300' },
};

const TONE_STYLES = {
  friendly:     'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  professional: 'bg-brand-500/20 text-brand-300 border-brand-500/30',
  casual:       'bg-amber-500/20 text-amber-300 border-amber-500/30',
};

// ── Pipeline Node Visualization ─────────────────────────────
function PipelineNode({ node, status }) {
  const s = NODE_STYLES[status] || NODE_STYLES.idle;
  return (
    <div className={`flex-1 rounded-xl border p-3 transition-all duration-300 ${s.ring} ${s.bg}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
        <span className="text-xs font-bold text-white">{node.icon} {node.label}</span>
      </div>
      <p className={`text-[10px] leading-relaxed ${s.text}`}>{node.description}</p>
      <div className={`mt-2 text-[10px] font-semibold uppercase tracking-wider ${s.text}`}>
        {status === 'running' && '⚡ Running...'}
        {status === 'done'    && '✓ Complete'}
        {status === 'error'   && '✗ Failed'}
        {status === 'idle'    && 'Waiting'}
      </div>
    </div>
  );
}

// ── Result Card ─────────────────────────────────────────────
function ResultCard({ result, index }) {
  const [copiedIdx, setCopiedIdx] = useState(null);

  const copy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const card = result.displayCard || {};

  return (
    <div className="rounded-xl border border-surface-border bg-surface-hover overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="px-4 py-3 bg-black/20 border-b border-surface-border flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-white">
            {result.sender || 'Unknown'}
          </p>
          <p className="text-[11px] text-gray-500">{card.timestamp || ''}</p>
        </div>
        <div className="flex items-center gap-2">
          {card.language && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
              {card.language}
            </span>
          )}
          {result.llmModel && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-brand-500/20 text-brand-300 border border-brand-500/30">
              {result.llmModel}
            </span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Transcription */}
        {result.transcription && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
              🎙️ Transcription
            </p>
            <p className="text-sm text-white bg-black/20 rounded-lg px-3 py-2 font-mono">
              "{result.transcription}"
            </p>
          </div>
        )}

        {/* Intent */}
        {result.intent && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
              💡 Customer Intent
            </p>
            <p className="text-sm font-semibold text-amber-300">{result.intent}</p>
          </div>
        )}

        {/* Explanation */}
        {result.explanation && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
              📝 Explanation for Merchant
            </p>
            <p className="text-sm text-gray-200 leading-relaxed">{result.explanation}</p>
          </div>
        )}

        {/* Error */}
        {result.error && !result.transcription && (
          <p className="text-sm text-red-400">⚠️ {result.error}</p>
        )}

        {/* Suggested Replies */}
        {result.replies && result.replies.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
              💬 Suggested Replies
            </p>
            <div className="space-y-2">
              {result.replies.map((reply, ri) => (
                <div
                  key={ri}
                  className="rounded-lg border border-surface-border bg-black/20 p-3 group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-white">{reply.label}</span>
                    <div className="flex items-center gap-2">
                      {reply.tone && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${TONE_STYLES[reply.tone] || TONE_STYLES.friendly}`}>
                          {reply.tone}
                        </span>
                      )}
                      <button
                        onClick={() => copy(reply.text, ri)}
                        className="text-[10px] px-2 py-0.5 rounded-lg bg-brand-500/20 hover:bg-brand-500/40 text-brand-300 border border-brand-500/30 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        {copiedIdx === ri ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">{reply.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main WhatsAppAgent Component ────────────────────────────
export default function WhatsAppAgent() {
  const [nodeStatuses, setNodeStatuses] = useState(
    Object.fromEntries(PIPELINE_NODES.map((n) => [n.id, 'idle']))
  );
  const [logs, setLogs]       = useState([]);
  const [results, setResults] = useState([]);
  const [running, setRunning] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const logsEndRef = useRef(null);

  const addLog = (msg) => {
    setLogs((prev) => [...prev, { time: new Date().toLocaleTimeString('en-MY', { hour12: false }), msg }]);
    setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const updateNode = (nodeId, status) => {
    setNodeStatuses((prev) => ({ ...prev, [nodeId]: status }));
  };

  const handleRun = async () => {
    // Reset state
    setRunning(true);
    setLogs([]);
    setResults([]);
    setNodeStatuses(Object.fromEntries(PIPELINE_NODES.map((n) => [n.id, 'idle'])));

    try {
      await runPipeline({
        onLog: addLog,
        onNodeUpdate: updateNode,
        onResult: (result) => setResults((prev) => [...prev, result]),
      });
    } catch (err) {
      addLog(`❌ Pipeline error: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  const allDone = Object.values(nodeStatuses).every((s) => s === 'done' || s === 'idle');

  return (
    <div className="flex flex-col h-full bg-surface-card rounded-2xl overflow-hidden">
      {/* ── Header ── */}
      <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.487-1.761-1.66-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.052 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
          </svg>
          <div>
            <h3 className="text-sm font-bold text-white">Dialect Voice Pipeline</h3>
            <p className="text-[10px] text-gray-500">5-Agent Orchestration System</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLogs((v) => !v)}
            className="text-[10px] px-2.5 py-1 rounded-lg bg-surface-hover border border-surface-border text-gray-400 hover:text-white transition-colors"
          >
            {showLogs ? 'Hide' : 'Show'} Logs
          </button>
          <button
            onClick={handleRun}
            disabled={running}
            className="text-xs px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-lg shadow-brand-900/30"
          >
            {running ? (
              <>
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                Running...
              </>
            ) : (
              <>🚀 Fetch & Analyse</>
            )}
          </button>
        </div>
      </div>

      {/* ── Pipeline Nodes Visualization ── */}
      <div className="px-4 py-3 border-b border-surface-border flex-shrink-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">Agent Pipeline</p>
        <div className="flex gap-2">
          {PIPELINE_NODES.map((node, i) => (
            <div key={node.id} className="flex items-center gap-2 flex-1 min-w-0">
              <PipelineNode node={node} status={nodeStatuses[node.id]} />
              {i < PIPELINE_NODES.length - 1 && (
                <span className="text-gray-600 text-sm flex-shrink-0">→</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Scrollable Body ── */}
      <div className="flex-1 overflow-y-auto">
        {/* Live Logs */}
        {showLogs && logs.length > 0 && (
          <div className="m-3 rounded-xl bg-black/40 border border-surface-border p-3 font-mono text-[10px] space-y-0.5 max-h-40 overflow-y-auto">
            {logs.map((l, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-gray-600 flex-shrink-0">{l.time}</span>
                <span className={l.msg.startsWith('❌') ? 'text-red-400' : l.msg.startsWith('✅') ? 'text-emerald-400' : l.msg.startsWith('⚠️') ? 'text-amber-400' : 'text-gray-300'}>
                  {l.msg}
                </span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}

        {/* Empty State */}
        {!running && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mb-4">
              <span className="text-2xl">🎙️</span>
            </div>
            <p className="text-white font-semibold mb-1">Ready to Analyse</p>
            <p className="text-gray-500 text-xs leading-relaxed max-w-xs">
              Click <strong className="text-brand-400">Fetch & Analyse</strong> to run all 5 agents — fetch voice messages, transcribe, understand intent, explain to you, and generate reply options.
            </p>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="p-3 space-y-4">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                {results.length} Voice Message{results.length !== 1 ? 's' : ''} Processed
              </p>
              <div className="flex-1 h-px bg-surface-border" />
            </div>
            {results.map((r, i) => (
              <ResultCard key={r.id || i} result={r} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
