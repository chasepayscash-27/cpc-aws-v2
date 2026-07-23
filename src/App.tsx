import { lazy, Suspense, useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import { PropertyTasksProvider } from './contexts/PropertyTasksContext';
import { StageOverrideProvider } from './contexts/StageOverrideContext';
import './App.css';

// Lazy-load each page so Vite emits a separate chunk per route.
// The browser only downloads a page's chunk when the user navigates to it.
const YTDSummaryPage = lazy(() => import('./pages/YTDSummaryPage'));
const ProjectsPage   = lazy(() => import('./pages/ProjectsPage'));
const MapsPage       = lazy(() => import('./pages/MapsPage'));
const FinancialsPage = lazy(() => import('./pages/FinancialsPage'));
const ResourcesPage  = lazy(() => import('./pages/ResourcesPage'));
const TeamPage       = lazy(() => import('./pages/TeamPage'));
const ChatPage       = lazy(() => import('./pages/ChatPage'));
const WorkflowPage      = lazy(() => import('./pages/WorkflowPage'));
const TeamChatPage        = lazy(() => import('./pages/TeamChatPage'));
const ActiveListingPage   = lazy(() => import('./pages/ActiveListingPage'));
const SalesMeetingsPage   = lazy(() => import('./pages/SalesMeetingsPage'));
const TeamWipPage         = lazy(() => import('./pages/TeamWipPage'));

const App = () => {
  const [sidebarOpen, setSidebarOpen] = useState(
    () => typeof window !== 'undefined' && window.innerWidth > 768,
  );

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark';
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  function toggleTheme() {
    setTheme(t => (t === 'dark' ? 'light' : 'dark'));
  }

  return (
    <div className="appShell">
      {/* Overlay shown on mobile when sidebar is open */}
      {sidebarOpen && (
        <div
          className="sidebarOverlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
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
        <div className="topbarActions">
          <button
            className="themeToggle"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>
      <div className={`body${sidebarOpen ? '' : ' sidebarCollapsed'}`}>
        <Navigation collapsed={!sidebarOpen} />
        <main className="content">
          <StageOverrideProvider>
          <PropertyTasksProvider>
          <Suspense fallback={<div className="pageHeader" role="status" aria-live="polite"><p className="muted">Loading…</p></div>}>
            <Routes>
              <Route path="/" element={<YTDSummaryPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/maps" element={<MapsPage />} />
              <Route path="/financials" element={<FinancialsPage />} />
              <Route path="/resources" element={<ResourcesPage />} />
              <Route path="/team" element={<TeamPage />} />
              {/* Analytics route temporarily disabled for production. To re-enable:
                  1. Uncomment the Analytics nav item in src/components/Navigation.tsx
                  2. Restore this route: <Route path="/analytics" element={<AnalyticsPage />} /> */}
              <Route path="/analytics" element={<Navigate to="/" replace />} />
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
          </StageOverrideProvider>
        </main>
      </div>
    </div>
  );
};

export default App;
