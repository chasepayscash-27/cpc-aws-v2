import React from 'react';

const ResourcesPage: React.FC = () => {
  const links = [
    { name: "GitHub", url: "https://github.com" },
    { name: "React", url: "https://reactjs.org" },
    { name: "TypeScript", url: "https://www.typescriptlang.org" },
    // Add more links as needed
  ];

  return (
    <div>
      <h1>Resources</h1>
      <ul>
        {links.map((link, index) => (
          <li key={index}>
            <a href={link.url} target="_blank" rel="noopener noreferrer">
              {link.name}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ResourcesPage;