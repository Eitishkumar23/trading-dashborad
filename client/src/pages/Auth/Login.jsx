import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Mail, TrendingUp, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { authAPI } from '../../services/api.js';
import { authStart, authSuccess, authFailure } from '../../redux/authSlice.js';

/* ─── Google "G" SVG logo ─── */
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    <path fill="none" d="M0 0h48v48H0z" />
  </svg>
);

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  /* ─── Email / Password Login ─── */
  const onSubmit = async (data) => {
    try {
      setLoading(true);
      setErrorMessage('');
      dispatch(authStart());
      const res = await authAPI.login(data);
      dispatch(authSuccess({ user: res.data, token: res.data.token }));
      navigate(res.data.role === 'admin' ? '/admin' : '/dashboard');
    } catch (error) {
      const msg = error.response?.data?.message || 'Login failed. Please check your credentials.';
      setErrorMessage(msg);
      dispatch(authFailure(msg));
    } finally {
      setLoading(false);
    }
  };

  /* ─── Google OAuth Login ─── */
  const handleGoogleSuccess = async (tokenResponse) => {
    try {
      setGoogleLoading(true);
      setErrorMessage('');
      dispatch(authStart());

      // tokenResponse.credential is the Google ID token (JWT)
      const token = tokenResponse.credential || tokenResponse.access_token;
      const res = await authAPI.googleAuth(token);
      dispatch(authSuccess({ user: res.data, token: res.data.token }));
      navigate(res.data.role === 'admin' ? '/admin' : '/dashboard');
    } catch (error) {
      const msg = error.response?.data?.message || 'Google sign-in failed. Please try again.';
      setErrorMessage(msg);
      dispatch(authFailure(msg));
    } finally {
      setGoogleLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => {
      setErrorMessage('Google sign-in was cancelled or failed. Please try again.');
      dispatch(authFailure('Google sign-in failed'));
      setGoogleLoading(false);
    },
    flow: 'implicit',
    // ux_mode: 'redirect',
    // redirect_uri: 'https://trading-dashborad.vercel.app',
  });

  /* ─── Demo Seed Access ─── */
  const handleDemoAccess = async () => {
    try {
      setSeedLoading(true);
      setErrorMessage('');
      dispatch(authStart());
      await authAPI.seedData();
      const res = await authAPI.login({ email: 'demo@trading.com', password: 'password123' });
      dispatch(authSuccess({ user: res.data, token: res.data.token }));
      navigate('/dashboard');
    } catch (error) {
      const msg = error.response?.data?.message || 'Quick access seeding failed.';
      setErrorMessage(msg);
      dispatch(authFailure(msg));
    } finally {
      setSeedLoading(false);
    }
  };

  const isAnyLoading = loading || googleLoading || seedLoading;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">

      {/* ── Ambient gradient orbs ── */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-brand-500/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-500/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-violet-500/5 rounded-full blur-[80px] pointer-events-none" />

      {/* ── Animated grid lines ── */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(#6366f1 1px, transparent 1px), linear-gradient(90deg, #6366f1 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        {/* ── Brand header ── */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.45, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center justify-center bg-gradient-to-tr from-brand-600 to-brand-400 p-4 rounded-[22px] text-white shadow-2xl shadow-brand-500/30 mb-5"
          >
            <TrendingUp size={30} />
          </motion.div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">AI QUANT</h1>
          <p className="text-sm text-slate-400 mt-1.5 font-medium">
            Trading Portfolio &amp; Asset Management
          </p>
        </div>

        {/* ── Card ── */}
        <div className="bg-slate-900/70 backdrop-blur-2xl border border-slate-700/50 rounded-3xl p-7 shadow-[0_32px_80px_rgba(0,0,0,0.5)]">
          <h2 className="text-xl font-bold text-white mb-1">Welcome back</h2>
          <p className="text-sm text-slate-400 mb-6">Sign in to continue to your portfolio</p>

          {/* Error banner */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-xl text-rose-400 text-xs font-semibold flex items-start gap-2"
              >
                <span className="mt-0.5 shrink-0">⚠</span>
                <span>{errorMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Google Sign-In Button ── */}
          <button
            id="google-signin-btn"
            type="button"
            onClick={() => {
              setGoogleLoading(true);
              googleLogin();
            }}
            disabled={isAnyLoading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-800 font-semibold py-3 px-4 rounded-xl transition-all duration-150 shadow-md disabled:opacity-60 disabled:cursor-not-allowed mb-5 group"
          >
            {googleLoading ? (
              <Loader2 size={18} className="animate-spin text-slate-600" />
            ) : (
              <GoogleIcon />
            )}
            <span className="text-sm">
              {googleLoading ? 'Signing in with Google…' : 'Continue with Google'}
            </span>
          </button>

          {/* ── Divider ── */}
          <div className="relative flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-widest whitespace-nowrap">
              or sign in with email
            </span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          {/* ── Email / Password Form ── */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                  <Mail size={15} />
                </span>
                <input
                  id="login-email"
                  type="email"
                  placeholder="name@example.com"
                  {...register('email', { required: 'Email is required' })}
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-600 outline-none transition-all duration-150"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-rose-400 mt-1.5">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                  <Lock size={15} />
                </span>
                <input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  {...register('password', { required: 'Password is required' })}
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-600 outline-none transition-all duration-150"
                />
              </div>
              {errors.password && (
                <p className="text-xs text-rose-400 mt-1.5">{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={isAnyLoading}
              className="w-full bg-brand-500 hover:bg-brand-600 active:scale-[0.98] text-white py-2.5 rounded-xl font-bold text-sm transition-all duration-150 flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25 disabled:opacity-60 disabled:cursor-not-allowed mt-1"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* ── Security note ── */}
          <div className="flex items-center gap-1.5 justify-center mt-4 mb-1">
            <ShieldCheck size={12} className="text-emerald-500" />
            <span className="text-[11px] text-slate-500">
              256-bit encrypted · Your data is secure
            </span>
          </div>

          {/* ── Divider ── */}
          <div className="relative flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-widest whitespace-nowrap">
              or quick start
            </span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          {/* ── Demo Seed Button ── */}
          <button
            id="demo-access-btn"
            type="button"
            onClick={handleDemoAccess}
            disabled={isAnyLoading}
            className="w-full bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 active:scale-[0.98] text-brand-400 hover:text-brand-300 py-3 rounded-xl font-bold text-sm transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {seedLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <span>⚡ Seed Demo Database &amp; Login</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </div>

        {/* ── Register link ── */}
        <p className="text-center text-sm text-slate-400 mt-6">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="text-brand-400 font-bold hover:text-brand-300 hover:underline transition-colors"
          >
            Create one free
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
