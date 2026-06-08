'use client';

import { useEffect } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useUIStore } from '@/stores';
import type { Toast } from '@/lib/types';
import styles from './Toast.module.css';

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

function ToastItem({ toast }: { toast: Toast }) {
  const { removeToast } = useUIStore();
  const Icon = ICONS[toast.type];

  useEffect(() => {
    const timer = setTimeout(() => removeToast(toast.id), toast.duration ?? 4000);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, removeToast]);

  return (
    <div className={`${styles.toast} ${styles[`toast_${toast.type}`]}`} role="alert" aria-live="polite">
      <Icon size={16} className={styles.toastIcon} />
      <div className={styles.toastContent}>
        <span className={styles.toastTitle}>{toast.title}</span>
        {toast.message && <span className={styles.toastMessage}>{toast.message}</span>}
      </div>
      <button
        className={styles.toastClose}
        onClick={() => removeToast(toast.id)}
        aria-label="Dismiss"
      >
        <X size={13} />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts } = useUIStore();
  if (toasts.length === 0) return null;
  return (
    <div className={styles.container} aria-label="Notifications" role="region">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

// Hook for easy toast creation
export function useToast() {
  const { addToast } = useUIStore();
  return {
    success: (title: string, message?: string) => addToast({ type: 'success', title, message }),
    error: (title: string, message?: string) => addToast({ type: 'error', title, message }),
    warning: (title: string, message?: string) => addToast({ type: 'warning', title, message }),
    info: (title: string, message?: string) => addToast({ type: 'info', title, message }),
  };
}
