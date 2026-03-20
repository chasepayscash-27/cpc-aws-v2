import { Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import Dashboard from './pages/Dashboard';
import ProjectsPage from './pages/ProjectsPage';
import FinancialsPage from './pages/FinancialsPage';
import ResourcesPage from './pages/ResourcesPage';
import CurrentPipelinePage from './pages/CurrentPipelinePage';
import YTDSummaryPage from './pages/YTDSummaryPage';
import './App.css';

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
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/financials" element={<FinancialsPage />} />
            <Route path="/current-pipeline" element={<CurrentPipelinePage />} />
            <Route path="/resources" element={<ResourcesPage />} />
            <Route path="/ytd-summary" element={<YTDSummaryPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default App;