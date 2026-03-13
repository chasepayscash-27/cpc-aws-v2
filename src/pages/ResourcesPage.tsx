import React from 'react';
import './ResourcesPage.css'; // Importing CSS for styling

const ResourcesPage = () => {
  return (
    <div className="resources-page">
      <h1 className="title">Resources</h1>
      <div className="card-container">
        <a href="/link1" className="card">
          <h2 className="card-title">Resource 1</h2>
          <p className="card-description">Description for Resource 1.</p>
          <div className="arrow-icon">→</div>
        </a>
        <a href="/link2" className="card">
          <h2 className="card-title">Resource 2</h2>
          <p className="card-description">Description for Resource 2.</p>
          <div className="arrow-icon">→</div>
        </a>
        <!-- Add more resource cards as needed -->
      </div>
    </div>
  );
};

export default ResourcesPage;