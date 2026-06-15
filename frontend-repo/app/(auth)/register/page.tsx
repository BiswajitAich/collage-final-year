'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Eye, EyeOff, Zap, ArrowRight, User, Mail, Lock } from 'lucide-react';
import { registerSchema, type RegisterFormData } from '@/lib/validators';
import { useAuthStore } from '@/stores';
import { sleep } from '@/lib/utils';
import styles from '../login/login.module.css';
import regStyles from './register.module.css';
import { registerUser } from './actions';

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) });

  const password = watch('password', '');

  const onSubmit = async (data: RegisterFormData) => {
    const result = await registerUser({
      name: data.name,
      email: data.email,
      password: data.password,
    });

    if (!result.success) {
      alert(result.error);
      return;
    }

    if (result.user) {
      login(result.user as any, "");
    }
    router.push('/dashboard');
  };

  const strength = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const strengthLevel = strength.filter(Boolean).length;

  return (
    <div className={styles.page}>
      <div className={styles.gridBg} />
      <div className={styles.card}>
        <div className={styles.logoRow}>
          <div className={styles.logoIcon}><Zap size={20} /></div>
          <span className={styles.logoName}>FlowAI Platform</span>
        </div>

        <div className={styles.heading}>
          <h1 className={styles.title}>Create account</h1>
          <p className={styles.subtitle}>Set up your admin workspace</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="name">Full name</label>
            <div className={styles.inputWrap}>
              <User size={15} className={styles.inputIcon} />
              <input id="name" type="text" placeholder="John Smith" className={`${styles.input} ${errors.name ? styles.inputError : ''}`} {...register('name')} />
            </div>
            {errors.name && <p className={styles.fieldError}>{errors.name.message}</p>}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">Email address</label>
            <div className={styles.inputWrap}>
              <Mail size={15} className={styles.inputIcon} />
              <input id="email" type="email" placeholder="you@company.com" className={`${styles.input} ${errors.email ? styles.inputError : ''}`} {...register('email')} />
            </div>
            {errors.email && <p className={styles.fieldError}>{errors.email.message}</p>}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">Password</label>
            <div className={styles.inputWrap}>
              <Lock size={15} className={styles.inputIcon} />
              <input id="password" type={showPassword ? 'text' : 'password'} placeholder="Min. 8 characters" className={`${styles.input} ${errors.password ? styles.inputError : ''}`} {...register('password')} />
              <button type="button" className={styles.eyeBtn} onClick={() => setShowPassword((v) => !v)}>
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {password && (
              <div className={regStyles.strengthBar}>
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className={`${regStyles.strengthSegment} ${i < strengthLevel ? regStyles[`strength_${strengthLevel}`] : ''}`} />
                ))}
                <span className={regStyles.strengthLabel}>
                  {['', 'Weak', 'Fair', 'Good', 'Strong'][strengthLevel]}
                </span>
              </div>
            )}
            {errors.password && <p className={styles.fieldError}>{errors.password.message}</p>}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="confirmPassword">Confirm password</label>
            <div className={styles.inputWrap}>
              <Lock size={15} className={styles.inputIcon} />
              <input id="confirmPassword" type="password" placeholder="Re-enter password" className={`${styles.input} ${errors.confirmPassword ? styles.inputError : ''}`} {...register('confirmPassword')} />
            </div>
            {errors.confirmPassword && <p className={styles.fieldError}>{errors.confirmPassword.message}</p>}
          </div>

          <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
            {isSubmitting ? <span className={styles.spinner} /> : <> Create account <ArrowRight size={15} /></>}
          </button>
        </form>

        <p className={styles.registerLink}>
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
