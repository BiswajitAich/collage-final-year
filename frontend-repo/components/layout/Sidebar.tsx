'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Database, BrainCircuit, Workflow, Wrench,
  Mic, ScrollText, BarChart3, Settings, ChevronLeft, Zap
} from 'lucide-react';
import { useUIStore } from '@/stores';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { id: 'schema', label: 'Schema Manager', icon: Database, href: '/schema' },
  { id: 'schema-review', label: 'AI Review', icon: BrainCircuit, href: '/schema/review' },
  { id: 'workflows', label: 'Workflows', icon: Workflow, href: '/workflows' },
  { id: 'tools', label: 'Tool Registry', icon: Wrench, href: '/tools' },
  { id: 'live-assistant', label: 'Live Assistant', icon: Mic, href: '/live-assistant' },
  { id: 'logs', label: 'Logs', icon: ScrollText, href: '/logs' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, href: '/analytics' },
  { id: 'settings', label: 'Settings', icon: Settings, href: '/settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isSidebarCollapsed, toggleSidebar } = useUIStore();

  const isActive = (href: string) => {
    if (pathname === href) return true;
    if (href === '/dashboard') return false;
    if (NAV_ITEMS.some((n) => n.href !== href && n.href.startsWith(href + '/'))) return false;
    return pathname.startsWith(href + '/');
  };

  return (
    <aside className={`${styles.sidebar} ${isSidebarCollapsed ? styles.collapsed : ''}`}>
      {/* Logo */}
      <div className={styles.logo}>
        <div className={styles.logoIcon}>
          <Zap size={18} />
        </div>
        {!isSidebarCollapsed && (
          <div className={styles.logoText}>
            <span className={styles.logoName}>FlowAI</span>
            <span className={styles.logoTag}>Platform</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className={styles.nav}>
        <ul className={styles.navList}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={`${styles.navItem} ${active ? styles.active : ''}`}
                  title={isSidebarCollapsed ? item.label : undefined}
                >
                  <span className={styles.navIcon}>
                    <Icon size={17} />
                  </span>
                  {!isSidebarCollapsed && (
                    <span className={styles.navLabel}>{item.label}</span>
                  )}
                  {active && <span className={styles.activeIndicator} />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Collapse Button */}
      <button
        className={styles.collapseBtn}
        onClick={toggleSidebar}
        aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <ChevronLeft
          size={15}
          className={`${styles.collapseIcon} ${isSidebarCollapsed ? styles.rotated : ''}`}
        />
        {!isSidebarCollapsed && <span>Collapse</span>}
      </button>

      {/* System Status */}
      {!isSidebarCollapsed && (
        <div className={styles.statusBar}>
          <span className={styles.statusDot} />
          <span className={styles.statusText}>All systems operational</span>
        </div>
      )}
    </aside>
  );
}
