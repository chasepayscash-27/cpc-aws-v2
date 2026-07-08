import { lazy, Suspense, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import { PropertyTasksProvider } from './contexts/PropertyTasksContext';
import './App.css';

// Lazy-load each page so Vite emits a separate chunk per route.
// The browser only downloads a page's chunk when the user navigates to it.
const YTDSummaryPage = lazy(() => import('./pages/YTDSummaryPage'));
const ProjectsPage   = lazy(() => import('./pages/ProjectsPage'));
const MapsPage       = lazy(() => import('./pages/MapsPage'));
const FinancialsPage = lazy(() => import('./pages/FinancialsPage'));
const ResourcesPage  = lazy(() => import('./pages/ResourcesPage'));
const TeamPage       = lazy(() => import('./pages/TeamPage'));
const AnalyticsPage  = lazy(() => import('./pages/AnalyticsPage'));
const ChatPage       = lazy(() => import('./pages/ChatPage'));
const WorkflowPage      = lazy(() => import('./pages/WorkflowPage'));
const TeamChatPage        = lazy(() => import('./pages/TeamChatPage'));
const ActiveListingPage   = lazy(() => import('./pages/ActiveListingPage'));
const SalesMeetingsPage   = lazy(() => import('./pages/SalesMeetingsPage'));
const TeamWipPage         = lazy(() => import('./pages/TeamWipPage'));

const App = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="appShell">
      <header className="topbar">
        <div className="topbarLeft">
          <button
            className="sidebarToggle"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
          <div className="brand">
            <div className="brandMark">CPC</div>
            <div>
              <div className="brandTitle">Chase Pays Cash</div>
              <div className="brandSub">Analytics Dashboard</div>
            </div>
          </div>
        </div>
      </header>
      <div className={`body${sidebarOpen ? '' : ' sidebarCollapsed'}`}>
        <Navigation collapsed={!sidebarOpen} />
        <main className="content">
          <PropertyTasksProvider>
          <Suspense fallback={<div className="pageHeader" role="status" aria-live="polite"><p className="muted">Loading…</p></div>}>
            <Routes>
              <Route path="/" element={<YTDSummaryPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/maps" element={<MapsPage />} />
              <Route path="/financials" element={<FinancialsPage />} />
              <Route path="/resources" element={<ResourcesPage />} />
              <Route path="/team" element={<TeamPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/workflow" element={<WorkflowPage />} />
              <Route path="/team-chat" element={<TeamChatPage />} />
              <Route path="/active-listing" element={<ActiveListingPage />} />
              <Route path="/sales-meetings" element={<SalesMeetingsPage />} />
              <Route path="/team-wip" element={<TeamWipPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
          </PropertyTasksProvider>
        </main>
      </div>
    </div>
  );
};

export default App;
