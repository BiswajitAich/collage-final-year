'use client';
import { Zap, Mail, EyeOff, Eye, Lock, ArrowRight } from 'lucide-react';
import styles from '../login/login.module.css';
import regStyles from '../register/register.module.css';
import { useState } from 'react';
import { ForgotFormData, forgotSchema } from '@/lib/validators';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { ResetUserPassword, VerifyUserEmail } from './action';
const ForgotPage = () => {
    const [emailMatched, setEmailMatched] = useState<boolean>(false);
    const [showPassword, setShowPassword] = useState(false);
    const [serverError, setServerError] = useState('');
    const router = useRouter();
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        getValues,
        watch,
    } = useForm<ForgotFormData>({
        resolver: zodResolver(forgotSchema),
    });
    const handleSubmitCheckPassword = async (data: ForgotFormData) => {
        setServerError('');
        const result = await VerifyUserEmail(data);
        if (!result.success) {
            setServerError(result?.error!);
            return;
        } else {
            setEmailMatched(result.success);
        }
    };
    const onSubmitSetPassword = async (data: ForgotFormData) => {
        setServerError('');
        const password = getValues("password");

        if (!password || password.length < 8) {
            setServerError("Password must be at least 8 characters.");
            return;
        }
        const result = await ResetUserPassword(data);
        if (!result.success) {
            setServerError(result?.error!);
            return;
        }
        console.log(getValues());

        router.push('/login');
    };
    const password = watch('password', '');
    const strength = [
        password!.length >= 8,
        /[A-Z]/.test(password!),
        /[0-9]/.test(password!),
        /[^A-Za-z0-9]/.test(password!),
    ];
    const strengthLevel = strength.filter(Boolean).length;
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

                {!emailMatched ? (
                    <form
                        key="verify-form"
                        onSubmit={handleSubmit(handleSubmitCheckPassword)}
                        className={styles.form} noValidate>
                        <div className={styles.field}>
                            {/* Check email */}
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
                        <button type="submit" className={styles.submitBtn} disabled={isSubmitting} aria-busy={isSubmitting}>
                            {isSubmitting ? (
                                <span className={styles.spinner} />
                            ) : (
                                <>Verify <ArrowRight size={15} /></>
                            )}
                        </button>
                    </form>
                ) : (
                    <form key="reset-form" onSubmit={handleSubmit(onSubmitSetPassword)} className={styles.form} noValidate>
                        {/* set new password */}
                        <div className={styles.field}>
                            <label className={styles.label} htmlFor="password">
                                Password
                            </label>
                            <div className={styles.inputWrap}>
                                <Lock size={15} className={styles.inputIcon} />
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="new-password"
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

                        {serverError && <div className={styles.serverError}>{serverError}</div>}

                        <button type="submit" className={styles.submitBtn} disabled={isSubmitting} aria-busy={isSubmitting}>
                            {isSubmitting ? (
                                <span className={styles.spinner} />
                            ) : (
                                <>Reset Password <ArrowRight size={15} /></>
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

export default ForgotPage;