'use client';

import { Loader2 } from 'lucide-react';
import styles from './Button.module.css';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  children,
  disabled,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        styles.btn,
        styles[`btn_${variant}`],
        styles[`btn_${size}`],
        fullWidth ? styles.fullWidth : '',
        className ?? '',
      ].filter(Boolean).join(' ')}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 size={14} className={styles.spinner} />
      ) : leftIcon ? (
        <span className={styles.iconLeft}>{leftIcon}</span>
      ) : null}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className={styles.iconRight}>{rightIcon}</span>}
    </button>
  );
}
