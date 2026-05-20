import React from 'react';
import '../App.css';

const WorkflowPage: React.FC = () => {
  return (
    <>
      <div className="pageHeader">
        <h1 className="h1">Workflow</h1>
        <p className="muted">Property flipping workflow document.</p>
      </div>

      <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <iframe
          title="Workflow PDF"
          src="/workflow.pdf"
          style={{ width: '100%', height: '78vh', border: 'none', display: 'block' }}
        />
      </section>

      <p className="muted" style={{ marginTop: 12 }}>
        If the preview does not load,{' '}
        <a href="/workflow.pdf" target="_blank" rel="noopener noreferrer">
          open the workflow PDF in a new tab
        </a>
        .
      </p>
    </>
  );
};

export default WorkflowPage;
