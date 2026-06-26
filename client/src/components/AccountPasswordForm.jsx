import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useDispatch } from 'react-redux';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { authAPI } from '../services/api.js';
import { updateUserProfileLocal } from '../redux/authSlice.js';

const themeClasses = {
  app: {
    panel: 'glass-panel p-6 rounded-3xl border border-slate-200/50 dark:border-dark-border',
    label: 'text-light-muted dark:text-dark-muted',
    input: 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-light-text dark:text-dark-text',
    success: 'bg-brand-500/10 border-brand-500/20 text-brand-500',
    error: 'bg-danger-500/10 border-danger-500/20 text-danger-500',
    badge: 'text-brand-500 bg-brand-500/10',
  },
  admin: {
    panel: 'bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 shadow-xl',
    label: 'text-slate-400',
    input: 'bg-slate-950 border-slate-800 text-white',
    success: 'bg-emerald-950/70 border-brand-500/30 text-brand-400',
    error: 'bg-rose-950/70 border-danger-500/30 text-rose-400',
    badge: 'text-brand-400 bg-brand-500/10 border border-brand-500/20',
  },
};

const PasswordInput = ({ name, registration, className, placeholder, visible, onToggle, disabled }) => (
  <div className="relative mt-1 min-w-0">
    <input
      type={visible ? 'text' : 'password'}
      placeholder={placeholder}
      disabled={disabled}
      {...registration}
      className={`${className} mt-0 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap pr-10`}
    />
    <button
      type="button"
      aria-label={visible ? `Hide ${name}` : `Show ${name}`}
      onClick={onToggle}
      disabled={disabled}
      className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-light-muted transition-colors hover:text-brand-500 dark:text-dark-muted"
    >
      {visible ? <EyeOff size={15} /> : <Eye size={15} />}
    </button>
  </div>
);

const AccountPasswordForm = ({ hasPassword, theme = 'app', onSaved, disabled = false, disabledReason }) => {
  const dispatch = useDispatch();
  const classes = themeClasses[theme] || themeClasses.app;
  const hasExistingPassword = hasPassword === true;
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [visibleFields, setVisibleFields] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const {
    register,
    handleSubmit,
    getValues,
    reset,
    formState: { errors },
  } = useForm();

  const inputClassName = `w-full border rounded-xl py-2.5 px-3 text-xs font-semibold outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 ${classes.input}`;

  useEffect(() => {
    if (!success) return undefined;
    const timer = setTimeout(() => setSuccess(''), 4000);
    return () => clearTimeout(timer);
  }, [success]);

  useEffect(() => {
    if (!error) return undefined;
    const timer = setTimeout(() => setError(''), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  const toggleVisibility = (field) => {
    setVisibleFields((current) => ({
      ...current,
      [field]: !current[field],
    }));
  };

  const onSubmit = async (data) => {
    if (disabled) return;

    setLoading(true);
    setSuccess('');
    setError('');

    try {
      const payload = {
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      };

      if (hasExistingPassword) {
        payload.currentPassword = data.currentPassword;
      }

      const { data: response } = await authAPI.setPassword(payload);
      dispatch(updateUserProfileLocal(response.user));
      setSuccess(response.message || 'Password saved successfully');
      reset();
      onSaved?.(response.user);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not save password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={classes.panel}>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-2">
          <KeyRound size={18} className="text-brand-500" />
          <h2 className="font-bold text-base text-inherit">Account Security</h2>
        </div>
        <div className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-xl ${classes.badge}`}>
          <ShieldCheck size={13} />
          <span>{disabled ? 'System managed' : hasExistingPassword ? 'Email login enabled' : 'Google login only'}</span>
        </div>
      </div>

      {disabled && (
        <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs font-semibold text-amber-500">
          {disabledReason || 'Administrator Account. System Managed.'}
        </div>
      )}

      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className={`mb-4 p-3 border rounded-xl text-xs font-semibold ${classes.success}`}
          >
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className={`mb-4 p-3 border rounded-xl text-xs font-semibold ${classes.error}`}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {hasExistingPassword && (
          <div className="min-w-0">
            <label className={`text-[10px] font-bold uppercase ${classes.label}`}>Current Password</label>
            <PasswordInput
              name="current password"
              visible={visibleFields.currentPassword}
              onToggle={() => toggleVisibility('currentPassword')}
              registration={register('currentPassword', { required: 'Current password is required' })}
              className={inputClassName}
              disabled={disabled}
            />
            {errors.currentPassword && (
              <p className="text-xs text-danger-500 mt-1">{errors.currentPassword.message}</p>
            )}
          </div>
        )}

        <div className="min-w-0">
          <label className={`text-[10px] font-bold uppercase ${classes.label}`}>New Password</label>
          <PasswordInput
            name="new password"
            placeholder="At least 6 characters"
            visible={visibleFields.newPassword}
            onToggle={() => toggleVisibility('newPassword')}
            registration={register('newPassword', {
              required: 'New password is required',
              minLength: { value: 6, message: 'Password must be at least 6 characters' },
            })}
            className={inputClassName}
            disabled={disabled}
          />
          {errors.newPassword && (
            <p className="text-xs text-danger-500 mt-1">{errors.newPassword.message}</p>
          )}
        </div>

        <div className="min-w-0">
          <label className={`text-[10px] font-bold uppercase ${classes.label}`}>Confirm New Password</label>
          <PasswordInput
            name="confirm new password"
            placeholder="Repeat password"
            visible={visibleFields.confirmPassword}
            onToggle={() => toggleVisibility('confirmPassword')}
            registration={register('confirmPassword', {
              required: 'Confirm your password',
              validate: (value) => value === getValues('newPassword') || 'Passwords do not match',
            })}
            className={inputClassName}
            disabled={disabled}
          />
          {errors.confirmPassword && (
            <p className="text-xs text-danger-500 mt-1">{errors.confirmPassword.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || disabled}
          className={`md:self-end py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60 ${hasExistingPassword ? 'md:col-start-3' : ''}`}
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <>
              <KeyRound size={13} />
              <span>{hasExistingPassword ? 'Update Password' : 'Set Password'}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default AccountPasswordForm;
