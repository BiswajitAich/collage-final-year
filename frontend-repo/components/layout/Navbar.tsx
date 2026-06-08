'use client';

import { useEffect, useState } from 'react';
import { Bell, Search, ChevronDown, User, LogOut, Settings, Wifi, WifiOff } from 'lucide-react';
import { useAuthStore } from '@/stores';
import { useRouter } from 'next/navigation';
import styles from './Navbar.module.css';
import { getUser, logoutUser } from '@/app/(auth)/login/action';

interface NavbarProps {
  title?: string;
  subtitle?: string;
}

export function Navbar({ title, subtitle }: NavbarProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  // const { user, logout } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    void getUser().then(setUser);
  }, []);

  const handleLogout = () => {
    logoutUser();
    router.push('/login');
  };

  return (
    <header className={styles.navbar}>
      {/* Title */}
      <div className={styles.titleSection}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
      </div>

      {/* Right Actions */}
      <div className={styles.actions}>
        {/* Search */}
        <div className={`${styles.searchWrap} ${isSearchFocused ? styles.focused : ''}`}>
          <Search size={14} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search..."
            className={styles.searchInput}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            aria-label="Search"
          />
          <kbd className={styles.searchKbd}>⌘K</kbd>
        </div>

        {/* Connection Status */}
        <div className={styles.connectionStatus} title="Connected to n8n">
          <Wifi size={14} className={styles.wifiIcon} />
          <span className={styles.connectionDot} />
        </div>

        {/* Notifications */}
        {/* <button className={styles.iconBtn} aria-label="Notifications">
          <Bell size={16} />
          <span className={styles.notifBadge}>3</span>
        </button> */}

        {/* Profile */}
        <div className={styles.profileWrap}>
          <button
            className={styles.profileBtn}
            onClick={() => setIsProfileOpen((v) => !v)}
            aria-label="User menu"
            aria-expanded={isProfileOpen}
          >
            <div className={styles.avatar}>
              <User size={14} />
            </div>
            <div className={styles.profileInfo}>
              <span className={styles.profileName}>{user?.name ?? 'Admin'}</span>
              <span className={styles.profileRole}>{user?.role ?? 'admin'}</span>
            </div>
            <ChevronDown size={13} className={`${styles.chevron} ${isProfileOpen ? styles.chevronOpen : ''}`} />
          </button>

          {isProfileOpen && (
            <div className={styles.dropdown}>
              <div className={styles.dropdownHeader}>
                <span className={styles.dropdownEmail}>{user?.email ?? 'admin@company.com'}</span>
              </div>
              <div className={styles.dropdownDivider} />
              <button className={styles.dropdownItem} onClick={() => { setIsProfileOpen(false); router.push('/settings'); }}>
                <Settings size={14} />
                Settings
              </button>
              <button className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`} onClick={handleLogout}>
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {isProfileOpen && (
        <div className={styles.dropdownOverlay} onClick={() => setIsProfileOpen(false)} />
      )}
    </header>
  );
}
