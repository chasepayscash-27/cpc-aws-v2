import { AnalyticsDashboard } from "../components/AnalyticsDashboard";
import { ErrorBoundary } from "../components/ErrorBoundary";

export default function AnalyticsPage() {
  return (
    <ErrorBoundary
      fallback={
        <div className="pageHeader">
          <h1 className="h1">Analytics</h1>
          <p className="muted">Analytics are temporarily unavailable. Please refresh and try again.</p>
        </div>
      }
    >
      <AnalyticsDashboard />
    </ErrorBoundary>
  );
}
