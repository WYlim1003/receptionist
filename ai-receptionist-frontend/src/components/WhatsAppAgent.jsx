import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';

export default function WhatsAppAgent() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(null); // id of message being analyzed
  const [analysisResults, setAnalysisResults] = useState({});

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:3001/api/whatsapp/messages');
      const data = await response.json();
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
    setLoading(false);
  };

  const analyzeMessage = async (msg) => {
    setAnalyzing(msg.id);
    try {
      const response = await fetch('http://127.0.0.1:3001/api/whatsapp/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filepath: msg.content })
      });
      const data = await response.json();
      if (data.analysis) {
        setAnalysisResults(prev => ({ ...prev, [msg.id]: data.analysis }));
      }
    } catch (err) {
      console.error("Failed to analyze message:", err);
    }
    setAnalyzing(null);
  };

  return (
    <div className="card h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.487-1.761-1.66-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.052 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
          </svg>
          Dialect Voice Assistant
        </h3>
        <button
          onClick={fetchMessages}
          disabled={loading}
          className="text-xs px-3 py-1.5 bg-surface-hover hover:bg-surface-border text-brand-400 font-medium rounded-lg disabled:opacity-50 transition-colors border border-brand-600/30"
        >
          {loading ? 'Fetching...' : 'Fetch WA'}
        </button>
      </div>

      <div className="space-y-3 overflow-y-auto flex-1 pr-1 custom-scrollbar">
        {(() => {
          if (messages.length === 0) {
            return <p className="text-gray-500 text-sm text-center py-6">No messages found. Click fetch.</p>;
          }
          const voiceMessages = messages.filter(m => !m.is_from_me && m.content.startsWith('[Audio]'));
          if (voiceMessages.length === 0) {
            return <p className="text-gray-500 text-sm text-center py-6">No voice messages found in this chat.</p>;
          }
          return voiceMessages.map(msg => (
            <div key={msg.id} className="p-3 bg-surface-hover rounded-xl border border-surface-border flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-white">{msg.sender_display || 'Unknown'}</p>
                  <p className="text-xs text-gray-500">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                </div>
                {msg.content.startsWith('[Audio]') && (
                  <button
                    onClick={() => analyzeMessage(msg)}
                    disabled={analyzing === msg.id}
                    className="px-2 py-1 bg-brand-500/20 hover:bg-brand-500/30 text-brand-400 text-xs font-medium rounded border border-brand-500/30 disabled:opacity-50 transition-colors"
                  >
                    {analyzing === msg.id ? 'Analyzing...' : 'Analyze Audio'}
                  </button>
                )}
              </div>
              
              <div className="text-sm text-gray-300 whitespace-pre-wrap">
                {msg.content.startsWith('[Audio]') ? (
                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    Voice Message
                  </div>
                ) : (
                  msg.content
                )}
              </div>

              {analysisResults[msg.id] && (
                <div className="mt-2 p-3 bg-brand-900/20 rounded-lg border border-brand-500/20">
                  <h4 className="text-xs font-semibold text-brand-300 mb-1">AI Translation & Reply:</h4>
                  <div className="text-brand-100 text-sm whitespace-pre-wrap">{analysisResults[msg.id]}</div>
                </div>
              )}
            </div>
          ));
        })()}
      </div>
    </div>
  );
}
