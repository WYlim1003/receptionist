import { useState, useEffect } from 'react';
import { PhoneIncoming, User, MessageCircle, CalendarSearch, CheckCircle2, PhoneOff } from 'lucide-react';

export default function LiveDemo() {
  const [activeCall, setActiveCall] = useState(null);

  useEffect(() => {
    const sseUrl = `${import.meta.env.VITE_API_URL || ''}/api/calls/live`;
    const source = new EventSource(sseUrl);

    source.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.state === 'CALL_ENDED') {
        setTimeout(() => setActiveCall(null), 10000); // clear after 10s
        setActiveCall(data);
      } else {
        setActiveCall(data);
      }
    };

    source.onerror = (err) => {
      console.error("SSE Error", err);
    }

    return () => source.close();
  }, []);

  const nodes = [
    { id: 'INCOMING_CALL', label: 'Phone Incoming', icon: PhoneIncoming },
    { id: 'GREETING', label: 'Greeting Agent', icon: User },
    { id: 'LISTENING_TRANSLATING', label: 'Listening & STT', icon: MessageCircle },
    { id: 'INTENT_ANALYSIS', label: 'LLM Agent', icon: MessageCircle },
    { id: 'CHECKING_SCHEDULE', label: 'Checking Timetable', icon: CalendarSearch },
    { id: 'BOOKING_CONFIRMED', label: 'Booking Confirmed', icon: CheckCircle2 }
  ];

  const stateToNodeIdx = {
    'INCOMING_CALL': 0,
    'GREETING': 1,
    'LISTENING_TRANSLATING': 2,
    'INTENT_ANALYSIS': 3,
    'CHECKING_SCHEDULE': 4,
    'BOOKING_CONFIRMED': 5,
    'CALL_ENDED': -1
  };

  const currentIdx = activeCall ? stateToNodeIdx[activeCall.state] : -1;

  return (
    <div className="p-8 max-w-5xl mx-auto w-full">
      <h1 className="text-3xl font-bold mb-2">Live Agent Monitor</h1>
      <p className="text-surface-content/70 mb-8">Demo View: Node-to-Node progress of AI voice agents.</p>

      {!activeCall ? (
        <div className="bg-surface-elevated rounded-xl p-12 text-center border border-white/5">
          <PhoneOff className="w-12 h-12 mx-auto mb-4 text-surface-content/30" />
          <h2 className="text-xl font-medium text-surface-content/70">Waiting for incoming call...</h2>
          <p className="text-surface-content/50 mt-2">Call your Twilio number to see the live workflow.</p>
        </div>
      ) : (
        <div className="bg-surface-elevated rounded-xl p-8 border border-white/5">
          <div className="flex justify-between items-center mb-12 pb-4 border-b border-white/10">
            <div>
              <p className="text-sm text-surface-content/50 uppercase tracking-wider font-semibold">Active Call</p>
              <p className="text-xl font-medium mt-1">{activeCall.caller_number}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                {activeCall.state !== 'CALL_ENDED' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>}
                <span className={`relative inline-flex rounded-full h-3 w-3 ${activeCall.state === 'CALL_ENDED' ? 'bg-red-500' : 'bg-primary'}`}></span>
              </span>
              <span className="text-sm font-medium">
                {activeCall.state === 'CALL_ENDED' ? 'Ended' : 'Live'}
              </span>
            </div>
          </div>

          <div className="relative">
            {/* Connecting Line */}
            <div className="absolute top-7 left-[5%] w-[90%] h-1 bg-surface z-0 rounded-full"></div>
            {currentIdx >= 0 && (
              <div 
                className="absolute top-7 left-[5%] h-1 bg-primary z-0 rounded-full transition-all duration-700 ease-in-out" 
                style={{ width: `${(Math.max(0, currentIdx) / (nodes.length - 1)) * 90}%` }}
              ></div>
            )}
            
            <div className="flex justify-between relative z-10">
              {nodes.map((node, idx) => {
                const Icon = node.icon;
                const isActive = currentIdx === idx;
                const isPassed = currentIdx > idx || activeCall.state === 'BOOKING_CONFIRMED' || (activeCall.state === 'CALL_ENDED' && idx === 0);
                
                return (
                  <div key={node.id} className="flex flex-col items-center flex-1">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center border-4 transition-all duration-500
                      ${isActive ? 'bg-primary border-primary/30 shadow-[0_0_20px_rgba(var(--color-primary),0.5)] scale-110' : 
                        isPassed ? 'bg-primary border-primary text-surface-elevated' : 'bg-surface border-surface text-surface-content/30'}`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <p className={`mt-4 text-sm font-medium text-center transition-colors duration-300
                      ${isActive ? 'text-primary' : isPassed ? 'text-surface-content' : 'text-surface-content/30'}`}>
                      {node.label}
                    </p>
                    {isActive && (
                      <p className="text-xs text-primary/70 mt-1 animate-pulse">Processing...</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
