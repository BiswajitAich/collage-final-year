'use client';

import { TrendingUp, TrendingDown, Minus, AlertCircle, PackageOpen } from 'lucide-react';
import { getStatusColor, getStatusLabel, formatNumber, formatPercent } from '@/lib/utils';
import type { AnalyticsMetric } from '@/lib/types';
import styles from './UIComponents.module.css';

// ===== STATUS BADGE =====

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
  showDot?: boolean;
}

export function StatusBadge({ status, size = 'md', showDot = true }: StatusBadgeProps) {
  const color = getStatusColor(status);
  const label = getStatusLabel(status);
  return (
    <span className={`${styles.badge} ${styles[`badge_${size}`]}`} style={{ '--badge-color': color } as React.CSSProperties}>
      {showDot && <span className={styles.badgeDot} />}
      {label}
    </span>
  );
}

// ===== STAT CARD =====

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  change?: number;
  accentColor?: string;
  isLoading?: boolean;
}

export function StatCard({ title, value, subtitle, icon, trend, change, accentColor, isLoading }: StatCardProps) {
  if (isLoading) return <LoadingSkeleton height={110} rounded />;
  return (
    <div className={styles.statCard} style={{ '--card-accent': accentColor ?? 'var(--accent-primary)' } as React.CSSProperties}>
      <div className={styles.statHeader}>
        <span className={styles.statTitle}>{title}</span>
        {icon && <span className={styles.statIcon}>{icon}</span>}
      </div>
      <div className={styles.statValue}>{typeof value === 'number' ? formatNumber(value) : value}</div>
      {(subtitle || trend) && (
        <div className={styles.statFooter}>
          {trend && change !== undefined && (
            <span className={`${styles.statTrend} ${styles[`trend_${trend}`]}`}>
              {trend === 'up' ? <TrendingUp size={12} /> : trend === 'down' ? <TrendingDown size={12} /> : <Minus size={12} />}
              {Math.abs(change).toFixed(1)}%
            </span>
          )}
          {subtitle && <span className={styles.statSubtitle}>{subtitle}</span>}
        </div>
      )}
    </div>
  );
}

// ===== METRIC CARD =====

interface MetricCardProps {
  metric: AnalyticsMetric;
  isLoading?: boolean;
}

export function MetricCard({ metric, isLoading }: MetricCardProps) {
  if (isLoading) return <LoadingSkeleton height={100} rounded />;
  const isPositiveGood = !metric.name.toLowerCase().includes('error') && !metric.name.toLowerCase().includes('latency');
  const isGood = isPositiveGood ? metric.trend === 'up' : metric.trend === 'down';
  return (
    <div className={styles.metricCard}>
      <span className={styles.metricName}>{metric.name}</span>
      <div className={styles.metricValue}>
        {metric.unit === '%' ? formatPercent(metric.value) : metric.unit === 'ms' ? `${metric.value}ms` : formatNumber(metric.value)}
      </div>
      <div className={styles.metricChange}>
        <span className={`${styles.changePill} ${isGood ? styles.changePillGood : styles.changePillBad}`}>
          {metric.trend === 'up' ? <TrendingUp size={11} /> : metric.trend === 'down' ? <TrendingDown size={11} /> : <Minus size={11} />}
          {Math.abs(metric.changePercent).toFixed(1)}%
        </span>
        <span className={styles.metricPrevious}>vs last period</span>
      </div>
    </div>
  );
}

// ===== LOADING SKELETON =====

interface LoadingSkeletonProps {
  height?: number;
  width?: string | number;
  rounded?: boolean;
  count?: number;
  className?: string;
}

export function LoadingSkeleton({ height = 20, width = '100%', rounded = false, count = 1, className }: LoadingSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${styles.skeleton} ${rounded ? styles.skeletonRounded : ''} ${className ?? ''}`}
          style={{ height: `${height}px`, width }}
          role="status"
          aria-label="Loading..."
        />
      ))}
    </>
  );
}

// ===== EMPTY STATE =====

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className={styles.emptyState} role="status">
      <div className={styles.emptyIcon}>{icon ?? <PackageOpen size={32} />}</div>
      <h3 className={styles.emptyTitle}>{title}</h3>
      {description && <p className={styles.emptyDesc}>{description}</p>}
      {action && <div className={styles.emptyAction}>{action}</div>}
    </div>
  );
}

// ===== ERROR STATE =====

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }: ErrorStateProps) {
  return (
    <div className={styles.errorState} role="alert">
      <AlertCircle size={28} className={styles.errorIcon} />
      <h3 className={styles.errorTitle}>{title}</h3>
      <p className={styles.errorMessage}>{message}</p>
      {onRetry && (
        <button className={styles.errorRetry} onClick={onRetry}>Try again</button>
      )}
    </div>
  );
}

// ===== PAGE HEADER =====

interface PageHeaderProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, actions, children }: PageHeaderProps) {
  return (
    <div className={styles.pageHeader}>
      <div className={styles.pageHeaderLeft}>
        <h2 className={styles.pageTitle}>{title}</h2>
        {description && <p className={styles.pageDescription}>{description}</p>}
        {children}
      </div>
      {actions && <div className={styles.pageHeaderActions}>{actions}</div>}
    </div>
  );
}

// ===== CARD =====

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export function Card({ children, className, padding = 'md', onClick }: CardProps) {
  return (
    <div
      className={`${styles.card} ${styles[`card_${padding}`]} ${onClick ? styles.cardClickable : ''} ${className ?? ''}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// ===== SECTION TITLE =====

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className={styles.sectionTitle}>{children}</h3>;
}
