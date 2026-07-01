import React from 'react';
import { NavLink } from 'react-router-dom';

interface NavItem {
  label: string;
  icon: string;
  path: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: 'Portfolio',
    items: [
      { icon: '🏠', label: 'Home', path: '/' },
      { icon: '🏗️', label: 'Projects', path: '/projects' },
      { icon: '🏷️', label: 'Active Listing', path: '/active-listing' },
      { icon: '🗺️', label: 'Maps', path: '/maps' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { icon: '🧭', label: 'Workflow', path: '/workflow' },
      { icon: '📋', label: 'Sales Meetings', path: '/sales-meetings' },
      { icon: '🔧', label: 'Resources', path: '/resources' },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      { icon: '📊', label: 'Analytics', path: '/analytics' },
      // Temporarily hidden: financials nav can be re-enabled by uncommenting this entry.
      // { icon: '💰', label: 'Financials', path: '/financials' },
      { icon: '🤖', label: 'AI Chat', path: '/chat' },
    ],
  },
  {
    title: 'Team',
    items: [
      { icon: '👥', label: 'Team', path: '/team' },
      { icon: '💬', label: 'Team Chat', path: '/team-chat' },
    ],
  },
];

interface NavigationProps {
  collapsed?: boolean;
}

const Navigation: React.FC<NavigationProps> = ({ collapsed = false }) => {
  return (
    <nav className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      {navGroups.map((group) => (
        <div key={group.title} className="navGroup">
          {!collapsed && <div className="navGroupLabel">{group.title}</div>}
          {group.items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `navItem${isActive ? ' active' : ''}`}
              style={{ textDecoration: 'none', display: 'block' }}
              title={collapsed ? item.label : undefined}
            >
              <span className="navItemIcon">{item.icon}</span>
              {!collapsed && <span className="navItemLabel">{item.label}</span>}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
};

export default Navigation;
