'use client';
import styles from '../assistant.module.css';
import type { EndReason } from '../types';

interface CallEndedViewProps {
  reason: EndReason;
  onStartNew: () => void;
}

export function CallEndedView({ reason, onStartNew }: CallEndedViewProps) {
  return (
    <div className={styles.center}>
      <div className={styles.setupCard}>
        <div
          className={styles.setupIcon}
          style={{
            color:
              reason === 'agent'
                ? 'var(--color-warning, #f59e0b)'
                : 'var(--color-success, #22c55e)',
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.58.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.61 21 3 13.39 3 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.58.11.35.03.74-.24 1.01L6.6 10.8z" />
          </svg>
        </div>

        <div>
          <h2 className={styles.setupTitle}>Call ended</h2>
          <p className={styles.setupDesc}>
            {reason === 'agent'
              ? 'The assistant ended the call.'
              : 'You ended the call.'}
          </p>
        </div>

        <button onClick={onStartNew} className={styles.startBtn}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C11.61 21 4 13.39 4 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.24 1.01l-2.21 2.21z" />
          </svg>
          Start new call
        </button>
      </div>
    </div>
  );
}