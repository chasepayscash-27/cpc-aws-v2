import React from 'react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { label: '🏠 Home', path: '/' },
  { label: '🏗️ Projects', path: '/projects' },
  { label: '🏷️ Active Listing', path: '/active-listing' },
  { label: '🗺️ Maps', path: '/maps' },
  // Temporarily hidden: financials nav can be re-enabled by uncommenting this entry.
  // { label: '💰 Financials', path: '/financials' },
  { label: '📊 Analytics', path: '/analytics' },
  { label: '🤖 AI Chat', path: '/chat' },
  { label: '🧭 Workflow', path: '/workflow' },
  { label: '🔧 Resources', path: '/resources' },
  { label: '👥 Team', path: '/team' },
  { label: '💬 Team Chat', path: '/team-chat' },
];

const Navigation: React.FC = () => {
  return (
    <nav className="sidebar">
      <div className="nav-title">Navigation</div>
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === '/'}
          className={({ isActive }) => `navItem${isActive ? ' active' : ''}`}
          style={{ textDecoration: 'none', display: 'block' }}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
};

export default Navigation;
