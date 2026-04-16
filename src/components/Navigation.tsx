import React from 'react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { label: '🏠 Home', path: '/' },
  { label: '🏗️ Projects', path: '/projects' },
  { label: '💰 Financials', path: '/financials' },
  { label: '🔧 Resources', path: '/resources' },
  { label: '👥 Team', path: '/team' },
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
