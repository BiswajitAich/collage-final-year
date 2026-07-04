'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Eye, EyeOff, Zap, ArrowRight, Lock, Mail } from 'lucide-react';
import { loginSchema, type LoginFormData } from '@/lib/validators';
import { useAuthStore } from '@/stores';
import { sleep } from '@/lib/utils';
import styles from './login.module.css';
import { loginUser } from './action';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore(s => s.login);
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginFormData) => {
    setServerError('');
    const result = await loginUser(data);
    if (!result.success) {
      setServerError(result?.error!);
      return;
    }

    router.push('/dashboard');
  };

  return (
    <div className={styles.page}>
      {/* Background grid */}
      <div className={styles.gridBg} />

      <div className={styles.card}>
        {/* Logo */}
        <div className={styles.logoRow}>
          <div className={styles.logoIcon}><Zap size={20} /></div>
          <span className={styles.logoName}>FlowAI Platform</span>
        </div>

        <div className={styles.heading}>
          <h1 className={styles.title}>Welcome back</h1>
          <p className={styles.subtitle}>Sign in to your admin console</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
          {/* Email */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">
              Email address
            </label>
            <div className={styles.inputWrap}>
              <Mail size={15} className={styles.inputIcon} />
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="admin@company.com"
                className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                {...register('email')}
              />
            </div>
            {errors.email && <p className={styles.fieldError}>{errors.email.message}</p>}
          </div>

          {/* Password */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">
              Password
            </label>
            <div className={styles.inputWrap}>
              <Lock size={15} className={styles.inputIcon} />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                {...register('password')}
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {errors.password && <p className={styles.fieldError}>{errors.password.message}</p>}
          </div>

          <div className={styles.rememberRow}>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" {...register('rememberMe')} className={styles.checkbox} />
              Remember me
            </label>
            <Link href="#" className={styles.forgotLink}>Forgot password?</Link>
          </div>

          {serverError && <div className={styles.serverError}>{serverError}</div>}

          <button type="submit" className={styles.submitBtn} disabled={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting ? (
              <span className={styles.spinner} />
            ) : (
              <>Sign in <ArrowRight size={15} /></>
            )}
          </button>
        </form>

        <p className={styles.registerLink}>
          Don&apos;t have an account?{' '}
          <Link href="/register">Create account</Link>
        </p>
      </div>
    </div>
  );
}
