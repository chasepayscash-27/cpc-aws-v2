import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  HardHat,
  Tag,
  Map,
  Workflow,
  ClipboardList,
  Wrench,
  Bot,
  Users,
  MessageSquare,
  Construction,
  CheckCircle2,
  Archive,
  Landmark,
  type LucideIcon,
} from 'lucide-react';

interface NavItem {
  label: string;
  Icon: LucideIcon;
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
      { Icon: Home,          label: 'Home',           path: '/' },
      { Icon: HardHat,       label: 'Projects',       path: '/projects' },
      { Icon: Tag,           label: 'Active Listing', path: '/active-listing' },
      { Icon: Map,           label: 'Maps',           path: '/maps' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { Icon: Workflow,      label: 'Workflow',       path: '/workflow' },
      { Icon: ClipboardList, label: 'Sales Meetings', path: '/sales-meetings' },
      { Icon: Wrench,        label: 'Resources',      path: '/resources' },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      // Temporarily hidden: analytics nav can be re-enabled by uncommenting this entry.
      // { Icon: BarChart2, label: 'Analytics', path: '/analytics' },
      // Temporarily hidden: financials nav can be re-enabled by uncommenting this entry.
      // { Icon: DollarSign, label: 'Financials', path: '/financials' },
      { Icon: Bot,           label: 'AI Chat',        path: '/chat' },
    ],
  },
  {
    title: 'Team',
    items: [
      { Icon: Users,         label: 'Team',           path: '/team' },
      { Icon: MessageSquare, label: 'Team Chat',      path: '/team-chat' },
      { Icon: Construction,  label: 'Team - WIP',     path: '/team-wip' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { Icon: Landmark,      label: 'Interest Payments', path: '/interest-payments' },
    ],
  },
  {
    title: 'Archive',
    items: [
      { Icon: CheckCircle2,  label: 'Completed Projects', path: '/completed-projects' },
      { Icon: Archive,       label: 'Archived Projects',  path: '/archived-projects' },
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
              title={item.label}
            >
              <span className="navItemIcon"><item.Icon size={16} strokeWidth={2} /></span>
              {!collapsed && <span className="navItemLabel">{item.label}</span>}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
};

export default Navigation;
