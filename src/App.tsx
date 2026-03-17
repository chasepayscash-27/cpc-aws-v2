// src/App.tsx
import React, { useMemo, useState } from "react";
import "./App.css";
import DaysInInventoryChart from "./components/DaysInInventoryChart";
import ProjectsPage from "./pages/ProjectsPage";
import ResourcesPage from "./pages/ResourcesPage";
import FinancialsPage from "./pages/FinancialsPage";

type NavItem = { label: string; key: string };

const App: React.FC = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [active, setActive] = useState("pipeline");
  const [financialProperty, setFinancialProperty] = useState<string | undefined>(undefined);

  const handleViewFullPnL = (name: string) => {
    setFinancialProperty(name);
    setActive("financials");
  };

  const nav: NavItem[] = useMemo(
    () => [
      { label: "Current Pipeline", key: "pipeline" },
      { label: "Days in Inventory", key: "inventory" },
      { label: "Projects", key: "projects" },
      { label: "Flipper Force Data", key: "flipper" },
      { label: "Profit by Category", key: "profit" },
      { label: "Properties", key: "properties" },
      { label: "Financials", key: "financials" }, 
      { label: "Resources", key: "resources" },
      { label: "Settings", key: "settings" },
    ],
    []
  );

  const renderPlaceholder = (
    title: string,
    subtitle: string = "This section is ready for the next chart or API-fed widget."
  ) => {
    return (
      <>
        <div className="pageHeader">
          <h1 className="h1">{title}</h1>
          <p className="muted">{subtitle}</p>
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
          <div className="cardLabel">{title}</div>
          <div className="chartPlaceholder">[Chart goes here]</div>
        </section>
      </>
    );
  };

  const renderContent = () => {
    switch (active) {
      case "pipeline":
        return (
          <>
            <div className="pageHeader">
              <h1 className="h1">Current Pipeline</h1>
              <p className="muted">
                Active deals and properties currently in the pipeline.
              </p>
            </div>

            <section className="grid">
              <div className="card">
                <div className="cardLabel">Active Deals</div>
                <div className="cardValue">—</div>
                <div className="cardSub muted">Properties in progress</div>
              </div>
              <div className="card">
                <div className="cardLabel">Total Pipeline Value</div>
                <div className="cardValue">$—</div>
                <div className="cardSub muted">Estimated value of open deals</div>
              </div>
              <div className="card">
                <div className="cardLabel">Avg Days in Pipeline</div>
                <div className="cardValue">—</div>
                <div className="cardSub muted">Across all active deals</div>
              </div>
            </section>

            <section className="card chartCard">
              <div className="cardLabel">Pipeline Overview</div>
              <div className="chartPlaceholder">[Pipeline chart coming soon]</div>
            </section>
          </>
        );

      case "inventory":
        return (
          <>
            <div className="pageHeader">
              <h1 className="h1">Days in Inventory</h1>
              <p className="muted">
                Static CSV-powered chart deployed with your Amplify frontend.
              </p>
            </div>

            <section className="card chartCard">
              <DaysInInventoryChart />
            </section>
          </>
        );

      case "projects":
        return <ProjectsPage onViewFullPnL={handleViewFullPnL} />;

      case "profit":
        return renderPlaceholder(
          "Profit by Category",
          "This is where we'll render charts fed from your RDS via an API."
        );

      case "properties":
        return renderPlaceholder(
          "Properties",
          "Property-level detail views can live here."
        );
      case "financials":
        return <FinancialsPage initialProperty={financialProperty} />;
      case "resources":
        return <ResourcesPage />;
      case "settings":
        return renderPlaceholder(
          "Settings",
          "Dashboard settings and filters can live here."
        );

      default:
        return renderPlaceholder("Dashboard");
    }
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
        </div>
      </header>

      <div className="body">
        <aside className={`sidebar ${isSidebarOpen ? "" : "collapsed"}`}>
          {nav.map((n) => (
            <button
              key={n.key}
              className={`navItem ${active === n.key ? "active" : ""}`}
              onClick={() => { setActive(n.key); if (n.key !== "financials") setFinancialProperty(undefined); }}
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
