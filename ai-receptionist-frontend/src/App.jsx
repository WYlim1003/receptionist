import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';
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
      <Sidebar business={business} />

      <main className="flex-1 ml-60 min-h-screen flex flex-col">
        <Routes>
          <Route path="/"         element={<Overview  business={business} />} />
          <Route path="/settings" element={<Settings  business={business} setBusiness={setBusiness} />} />
        </Routes>
      </main>
    </div>
  );
}
