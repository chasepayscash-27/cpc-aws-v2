import React from 'react';
import '../App.css';

const WORKFLOW_PDF_PATH = '/PropertyHydra_Automated_Acquisitions.pdf';

const WorkflowPage: React.FC = () => {
  return (
    <>
      <div className="pageHeader">
        <h1 className="h1">Workflow</h1>
        <p className="muted">PropertyHydra Automated Acquisitions document.</p>
      </div>

      <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <iframe
          title="PropertyHydra Automated Acquisitions PDF"
          src={WORKFLOW_PDF_PATH}
          style={{ width: '100%', height: '78vh', border: 'none', display: 'block' }}
        />
      </section>

      <p className="muted" style={{ marginTop: 12 }}>
        If the preview does not load,{' '}
        <a href={WORKFLOW_PDF_PATH} target="_blank" rel="noopener noreferrer">
          open PropertyHydra Automated Acquisitions in a new tab
        </a>
        .
      </p>
    </>
  );
};

export default WorkflowPage;
