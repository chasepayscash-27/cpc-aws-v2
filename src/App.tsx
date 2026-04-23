import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import './App.css';

// Lazy-load each page so Vite emits a separate chunk per route.
// The browser only downloads a page's chunk when the user navigates to it.
const YTDSummaryPage = lazy(() => import('./pages/YTDSummaryPage'));
const ProjectsPage   = lazy(() => import('./pages/ProjectsPage'));
const FinancialsPage = lazy(() => import('./pages/FinancialsPage'));
const ResourcesPage  = lazy(() => import('./pages/ResourcesPage'));
const TeamPage       = lazy(() => import('./pages/TeamPage'));
const AnalyticsPage  = lazy(() => import('./pages/AnalyticsPage'));
const ChatPage       = lazy(() => import('./pages/ChatPage'));

const App = () => {
  return (
    <div className="appShell">
      <header className="topbar">
        <div className="brand">
          <div className="brandMark">CPC</div>
          <div>
            <div className="brandTitle">Chase Pays Cash</div>
            <div className="brandSub">Analytics Dashboard</div>
          </div>
        </div>
      </header>
      <div className="body">
        <Navigation />
        <main className="content">
          <Suspense fallback={<div className="pageHeader" role="status" aria-live="polite"><p className="muted">Loading…</p></div>}>
            <Routes>
              <Route path="/" element={<YTDSummaryPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/financials" element={<FinancialsPage />} />
              <Route path="/resources" element={<ResourcesPage />} />
              <Route path="/team" element={<TeamPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export default App;
