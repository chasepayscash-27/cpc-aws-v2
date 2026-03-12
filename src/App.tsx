// src/App.tsx
import React, { useMemo, useState } from "react";
import "./App.css";
import { AnalyticsDashboard } from "./components/AnalyticsDashboard";
import DaysInInventoryChart from "./components/DaysInInventoryChart";
import ProjectsTable from "./components/ProjectsTable";
import ProjectsGallery from "./components/ProjectsGallery";

type NavItem = { label: string; key: string };

const App: React.FC = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [active, setActive] = useState("overview");
  const [refreshKey, setRefreshKey] = useState(0);

  const nav: NavItem[] = useMemo(
    () => [
      { label: "Overview", key: "overview" },
      { label: "Days in Inventory", key: "inventory" },
      { label: "Projects Gallery", key: "flipper" },
      { label: "Profit by Category", key: "profit" },
      { label: "Properties Table", key: "properties" },
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
      case "overview":
        return <AnalyticsDashboard refreshKey={refreshKey} />;

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

      case "flipper":
        return (
          <>
            <div className="pageHeader">
              <h1 className="h1">Projects Gallery</h1>
              <p className="muted">
                Browse all Flipper Force projects with photos, stage, and property details.
              </p>
            </div>
            <ProjectsGallery />
          </>
        );

      case "profit":
        return renderPlaceholder(
          "Profit by Category",
          "This is where we'll render charts fed from your RDS via an API."
        );

      case "properties":
        return (
          <>
            <div className="pageHeader">
              <h1 className="h1">Properties Table</h1>
              <p className="muted">
                Sortable and searchable table of all Flipper Force projects.
              </p>
            </div>
            <ProjectsTable />
          </>
        );

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