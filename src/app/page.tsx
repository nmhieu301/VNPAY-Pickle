'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, KeyRound, RefreshCw } from 'lucide-react';
import { PickleballIcon } from '@/components/icons/PickleballIcon';
import { isVnpayEmail, getEmailError } from '@/lib/auth/validateEmail';
import { useAppStore } from '@/lib/store';
import { createClient } from '@/lib/supabase/client';

type Step = 'email' | 'otp';

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="w-8 h-8 border-3 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAppStore();
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<Step>('email');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // OTP state — 6 separate digits
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isAuthenticated) router.push('/dashboard');
  }, [isAuthenticated, router]);

  // Show auth error from callback redirect
  useEffect(() => {
    const authError = searchParams.get('auth_error');
    if (authError) {
      setError(authError);
    }
  }, [searchParams]);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  function startCooldown(seconds = 60) {
    setCooldown(seconds);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setError('');
    if (value.length > 3) {
      setEmailError(getEmailError(value));
    } else {
      setEmailError(null);
    }
  };

  // ─── Send OTP ───
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const trimmedEmail = email.trim().toLowerCase();

    if (!isVnpayEmail(trimmedEmail)) {
      setError('Chỉ chấp nhận email công ty @vnpay.vn');
      return;
    }

    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: {
          shouldCreateUser: true,
        },
      });

      if (authError) {
        setError(getVietnameseError(authError.message));
        return;
      }

      setStep('otp');
      setSuccess('Mã xác thực 6 số đã được gửi đến email của bạn');
      startCooldown(60);
    } catch {
      setError('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Verify OTP ───
  const handleVerifyOtp = async (otpCode?: string) => {
    const code = otpCode || otp.join('');
    if (code.length !== 6) {
      setError('Vui lòng nhập đủ 6 số');
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: code,
        type: 'email',
      });

      if (verifyError) {
        setError(getVietnameseError(verifyError.message));
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        return;
      }

      // Success — onAuthStateChange in store will handle the rest
      setSuccess('Đăng nhập thành công! Đang chuyển hướng...');
    } catch {
      setError('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Resend OTP ───
  const handleResend = async () => {
    if (cooldown > 0) return;
    setError('');
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          shouldCreateUser: true,
        },
      });
      if (authError) {
        setError(getVietnameseError(authError.message));
        return;
      }
      setSuccess('Đã gửi lại mã xác thực mới');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      startCooldown(60);
    } catch {
      setError('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── OTP Input Handlers ───
  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits filled
    if (value && index === 5) {
      const fullCode = newOtp.join('');
      if (fullCode.length === 6) {
        handleVerifyOtp(fullCode);
      }
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter') {
      handleVerifyOtp();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length === 0) return;

    const newOtp = [...otp];
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);

    // Focus the next empty input or last one
    const nextEmpty = newOtp.findIndex(v => !v);
    inputRefs.current[nextEmpty === -1 ? 5 : nextEmpty]?.focus();

    // Auto-submit if pasted full code
    if (pastedData.length === 6) {
      handleVerifyOtp(pastedData);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side — decorative */}
      <div className="hidden lg:flex lg:w-1/2 gradient-vnpay relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-4 h-4 bg-white rounded-full"
              initial={{ x: Math.random() * 800, y: Math.random() * 1000, opacity: 0.3 }}
              animate={{
                y: [null, Math.random() * -200],
                opacity: [0.3, 0.8, 0.3],
              }}
              transition={{ duration: 3 + Math.random() * 4, repeat: Infinity, delay: Math.random() * 2 }}
            />
          ))}
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center p-12 text-white">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="mb-6"
          >
            <div className="inline-flex items-center justify-center
                            w-36 h-36 md:w-44 md:h-44
                            rounded-3xl
                            bg-white/10 backdrop-blur-md
                            border border-white/20
                            shadow-2xl
                            hover:scale-105 transition-transform duration-500">
              <img
                src="/logo.png"
                alt="VNPAY Pickle"
                className="w-28 h-28 md:w-36 md:h-36 object-contain"
                style={{ filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15))' }}
              />
            </div>
          </motion.div>
          <motion.h1
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-4xl font-display font-bold mb-4 text-center"
          >
            VNPAY <span className="text-[#FFD23F]">Pickle</span>
          </motion.h1>
          <motion.p
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-lg text-white/80 text-center max-w-md"
          >
            Nền tảng Pickleball nội bộ VNPAY — Chia cặp thông minh, giải đấu chuyên nghiệp, xếp hạng công bằng.
          </motion.p>

          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-12 flex flex-wrap justify-center gap-4"
          >
            {[
              { icon: 'pickle', label: 'Chơi hàng ngày', sub: 'Chia cặp ELO' },
              { icon: '🏆', label: 'Giải đấu', sub: 'Bracket tự động' },
              { icon: '📊', label: 'Xếp hạng', sub: 'ELO Rating' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 px-5 py-2.5
                                      bg-white/10 backdrop-blur-sm rounded-full
                                      border border-white/20 text-white text-sm">
                <span>
                  {item.icon === 'pickle' ? <PickleballIcon size={20} /> : item.icon}
                </span>
                <span className="font-medium">{item.label}</span>
                <span className="text-white/50">{item.sub}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Right side — form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-[var(--bg)]">
        <motion.div
          initial={{ x: 30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <img
              src="/logo.png"
              alt="VNPAY Pickle"
              className="w-24 h-24 object-contain mx-auto mb-3"
              style={{ filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.1))' }}
            />
            <h1 className="text-2xl font-display font-bold">
              <span className="text-gradient-vnpay">VNPAY</span> Pickle
            </h1>
            <p className="text-sm text-[var(--muted-fg)] mt-1">Nền tảng Pickleball nội bộ VNPAY</p>
          </div>

          {/* Step 1: Email Input */}
          <AnimatePresence mode="wait">
            {step === 'email' && (
              <motion.div
                key="email-step"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="card p-6 md:p-8">
                  <h2 className="text-xl font-bold mb-1">Đăng nhập</h2>
                  <p className="text-sm text-[var(--muted-fg)] mb-6">Nhập email @vnpay.vn để nhận mã xác thực</p>

                  {error && (
                    <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-start gap-2">
                      <span>⚠️</span><span>{error}</span>
                    </div>
                  )}

                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">📧 Email công ty</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-fg)]" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => handleEmailChange(e.target.value)}
                          placeholder="your.name@vnpay.vn"
                          className={`input pl-10 ${emailError ? 'error' : ''}`}
                          autoComplete="email"
                          autoFocus
                          required
                        />
                      </div>
                      <AnimatePresence>
                        {emailError && (
                          <motion.p
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="text-sm text-red-500 mt-1 flex items-center gap-1"
                          >
                            ❌ {emailError}
                          </motion.p>
                        )}
                      </AnimatePresence>
                      <p className="text-xs text-[var(--muted-fg)] mt-1">⚠️ Chỉ chấp nhận email @vnpay.vn</p>
                    </div>

                    <button
                      type="submit"
                      disabled={!isVnpayEmail(email) || isLoading}
                      className="btn btn-gradient w-full btn-lg"
                    >
                      {isLoading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Mail className="w-4 h-4" />
                          Gửi mã xác thực
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {/* Step 2: OTP Input */}
            {step === 'otp' && (
              <motion.div
                key="otp-step"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="card p-6 md:p-8">
                  <h2 className="text-xl font-bold mb-1 text-center">🔐 Nhập mã xác thực</h2>
                  <p className="text-sm text-[var(--muted-fg)] mb-6 text-center">
                    Mã 6 số đã gửi đến <strong className="text-[var(--primary)]">{email}</strong>
                  </p>

                  {error && (
                    <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-start gap-2">
                      <span>⚠️</span><span>{error}</span>
                    </div>
                  )}

                  {success && (
                    <div className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500 text-sm flex items-start gap-2">
                      <span>✅</span><span>{success}</span>
                    </div>
                  )}

                  {/* OTP 6-digit inputs */}
                  <div className="flex justify-center gap-2 mb-6" onPaste={handleOtpPaste}>
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        ref={el => { inputRefs.current[index] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={e => handleOtpChange(index, e.target.value)}
                        onKeyDown={e => handleOtpKeyDown(index, e)}
                        autoFocus={index === 0}
                        className="w-12 h-14 text-center text-2xl font-bold rounded-xl
                                   border-2 border-[var(--border-color)] bg-[var(--surface)]
                                   text-[var(--fg)] focus:border-[var(--primary)]
                                   focus:ring-2 focus:ring-[var(--primary)]/20
                                   outline-none transition-all duration-150"
                        disabled={isLoading}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleVerifyOtp()}
                    disabled={otp.join('').length !== 6 || isLoading}
                    className="btn btn-gradient w-full btn-lg mb-4"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        Xác nhận đăng nhập
                      </>
                    )}
                  </button>

                  <div className="text-center space-y-2 mb-4">
                    <p className="text-xs text-[var(--muted-fg)]">
                      ⏰ Mã có hiệu lực trong <strong>5 phút</strong>
                    </p>
                    <p className="text-xs text-[var(--muted-fg)]">
                      💡 Nếu không thấy email, kiểm tra <strong>Spam/Junk</strong>
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-[var(--border-color)]">
                    <button
                      type="button"
                      onClick={() => { setStep('email'); setError(''); setSuccess(''); setOtp(['', '', '', '', '', '']); }}
                      className="text-sm text-[var(--primary)] hover:underline"
                    >
                      ← Đổi email
                    </button>
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={cooldown > 0 || isLoading}
                      className="btn btn-secondary btn-sm"
                    >
                      {isLoading ? (
                        <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                      ) : cooldown > 0 ? (
                        `Gửi lại (${cooldown}s)`
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" />
                          Gửi lại mã
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-center text-xs text-[var(--muted-fg)] mt-4">
            💡 Sử dụng email công ty @vnpay.vn để truy cập
          </p>
        </motion.div>
      </div>
    </div>
  );
}

// ─── Vietnamese Error Messages ───

const ERROR_MESSAGES: Record<string, string> = {
  'Invalid login credentials': 'Thông tin đăng nhập không hợp lệ',
  'Email not confirmed': 'Email chưa được xác nhận',
  'Token has expired or is invalid': 'Mã xác thực đã hết hạn hoặc không hợp lệ. Vui lòng gửi lại mã mới.',
  'For security purposes, you can only request this after': 'Vui lòng đợi trước khi gửi lại',
  'Email rate limit exceeded': 'Đã vượt quá giới hạn gửi email. Vui lòng thử lại sau',
  'otp_expired': 'Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới.',
};

function getVietnameseError(errorMessage: string): string {
  if (!errorMessage) return 'Đã xảy ra lỗi. Vui lòng thử lại.';
  for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
    if (errorMessage.includes(key)) return value;
  }
  return errorMessage;
}
