// src/App.tsx
import React, { useMemo, useState } from "react";
import "./App.css";
import { AnalyticsDashboard } from "./components/AnalyticsDashboard";

type NavItem = { label: string; key: string };

const App: React.FC = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [active, setActive] = useState("overview");
  const [refreshKey, setRefreshKey] = useState(0);

  const nav: NavItem[] = useMemo(
    () => [
      { label: "Overview", key: "overview" },
      { label: "Profit by Category", key: "profit" },
      { label: "Properties", key: "properties" },
      { label: "Settings", key: "settings" },
    ],
    []
  );

  const renderContent = () => {
    if (active === "overview") {
      return <AnalyticsDashboard refreshKey={refreshKey} />;
    }
    return (
      <>
        <div className="pageHeader">
          <h1 className="h1">
            {nav.find((n) => n.key === active)?.label ?? "Dashboard"}
          </h1>
          <p className="muted">
            This is where we'll render charts fed from your RDS via an API.
          </p>
        </div>

        <section className="grid">
          <div className="card">
            <div className="cardLabel">Total Profit (YTD)</div>
            <div className="cardValue">$—</div>
            <div className="cardSub muted">Hook this to your API</div>
          </div>
          <div className="card">
            <div className="cardLabel">Active Properties</div>
            <div className="cardValue">—</div>
            <div className="cardSub muted">Count of open projects</div>
          </div>
          <div className="card">
            <div className="cardLabel">Avg Days to Close</div>
            <div className="cardValue">—</div>
            <div className="cardSub muted">Trailing 90 days</div>
          </div>
        </section>

        <section className="card chartCard">
          <div className="cardLabel">Profit by Category</div>
          <div className="chartPlaceholder">[Chart goes here]</div>
        </section>
      </>
    );
  };

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

        <div className="topbarActions">
          <button className="btn" onClick={() => setSidebarOpen((s) => !s)}>
            {isSidebarOpen ? "Hide" : "Show"} Menu
          </button>
          <button
            className="btnPrimary"
            onClick={() => setRefreshKey((k) => k + 1)}
          >
            Refresh
          </button>
        </div>
      </header>

      <div className="body">
        <aside className={`sidebar ${isSidebarOpen ? "" : "collapsed"}`}>
          {nav.map((n) => (
            <button
              key={n.key}
              className={`navItem ${active === n.key ? "active" : ""}`}
              onClick={() => setActive(n.key)}
            >
              {n.label}
            </button>
          ))}
        </aside>

        <main className="content">{renderContent()}</main>
      </div>
    </div>
  );
};

export default App;
