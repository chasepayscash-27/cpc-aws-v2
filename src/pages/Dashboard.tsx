import ProjectsByStatusChart from "../components/charts/ProjectsByStatusChart";
import PullManifestTable from "../components/charts/PullManifestTable";
import PhotoLogTimelineChart from "../components/charts/PhotoLogTimelineChart";

export default function Dashboard() {
  return (
    <>
      <div className="pageHeader">
        <h1 className="h1">Chase Pays Cash Dashboard</h1>
        <p className="muted">
          Flipper Force and project tracking data loaded from CSV files.
        </p>
      </div>

      <section className="grid">
        <div className="card chartCard">
          <ProjectsByStatusChart />
        </div>

        <div className="card chartCard">
          <PhotoLogTimelineChart />
        </div>
      </section>

      <section className="card chartCard" style={{ marginTop: "24px" }}>
        <PullManifestTable />
      </section>
    </>
  );
}