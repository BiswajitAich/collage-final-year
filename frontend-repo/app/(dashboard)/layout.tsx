// 'use client';

// import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import styles from './layout.module.css';

// const PAGE_TITLES: Record<string, { title: string; subtitle?: string }> = {
//   '/dashboard': { title: 'Dashboard', subtitle: 'Overview' },
//   '/schema': { title: 'Schema Manager', subtitle: 'Upload & manage database schemas' },
//   '/schema/review': { title: 'AI Schema Review', subtitle: 'AI-powered entity & relationship analysis' },
//   '/workflows': { title: 'Workflows', subtitle: 'Manage AI-generated workflows' },
//   '/tools': { title: 'Tool Registry', subtitle: 'Voice assistant tool inventory' },
//   '/live-assistant': { title: 'Live Assistant', subtitle: 'Real-time voice session monitor' },
//   '/logs': { title: 'System Logs', subtitle: 'Execution & event monitoring' },
//   '/analytics': { title: 'Analytics', subtitle: 'Platform performance insights' },
//   '/settings': { title: 'Settings', subtitle: 'Platform configuration' },
// };

// function getPageInfo(pathname: string) {
//   // Check exact match first
//   if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
//   // Check prefix matches
//   const match = Object.keys(PAGE_TITLES)
//     .filter((k) => pathname.startsWith(k))
//     .sort((a, b) => b.length - a.length)[0];
//   if (match) return PAGE_TITLES[match];
//   return { title: 'FlowAI Platform' };
// }

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // const pathname = usePathname();
  // const { title, subtitle } = getPageInfo(pathname);

  return (
    <div className={styles.layout}>
      <Sidebar />
      <div className={styles.main}>
        <Navbar />
        <main className={styles.content}>
          {children}
        </main>
      </div>
    </div>
  );
}
