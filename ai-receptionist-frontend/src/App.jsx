import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Overview from './pages/Overview.jsx';
import Settings from './pages/Settings.jsx';
import { api, DEMO_BUSINESS_ID } from './lib/api.js';

export default function App() {
  const [business, setBusiness] = useState(null);

  useEffect(() => {
    api.businesses.get(DEMO_BUSINESS_ID)
      .then(setBusiness)
      .catch((err) => {
        console.error("Failed to fetch business:", err);
      });
  }, []);

  return (
    <div className="flex min-h-screen bg-surface">
      <main className="flex-1 min-h-screen flex flex-col p-4">
        <Routes>
          <Route path="/"         element={<Overview  business={business} />} />
          <Route path="/settings" element={<Settings  business={business} setBusiness={setBusiness} />} />
        </Routes>
      </main>
    </div>
  );
}
