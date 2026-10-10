import { useState, useCallback } from 'react';
import { Zap } from 'lucide-react';
import TopBar from '../components/TopBar.jsx';
import WhatsAppAgent from '../components/WhatsAppAgent.jsx';
import Slots from './Slots.jsx';

export default function Overview({ business }) {
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    // Top bar refresh handler if needed
  }, []);

  return (
    <div className="flex flex-col flex-1 h-screen overflow-hidden">
      <TopBar
        title="Overview"
        subtitle={`Welcome back${business ? `, ${business.name}` : ''}`}
        onRefresh={load}
        loading={loading}
      />

      <div className="flex-1 p-6 flex gap-6 overflow-hidden animate-slide-up bg-surface">
        {/* Left side: WhatsApp Agent (The Key Concept) */}
        <div className="w-1/2 lg:w-7/12 flex flex-col gap-6 overflow-y-auto pr-2">
          <div className="card border-brand-500/30 flex-1 flex flex-col min-h-[600px]">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <Zap className="text-brand-400"/> Live WhatsApp AI Agent
              </h2>
              <p className="text-sm text-gray-400">
                Automatically fetches dialect voice messages from customers, runs Speech-to-Text translation, and uses AI to explain the intent and suggest a reply for the merchant.
              </p>
            </div>
            
            <div className="flex-1 min-h-0 bg-black/20 rounded-xl overflow-hidden border border-surface-border">
              <WhatsAppAgent />
            </div>
          </div>
        </div>

        {/* Right side: Slots Manager */}
        <div className="w-1/2 lg:w-5/12 flex flex-col bg-surface-card border border-surface-border rounded-2xl overflow-hidden shadow-xl">
           <Slots business={business} isEmbedded={true} />
        </div>
      </div>
    </div>
  );
}
