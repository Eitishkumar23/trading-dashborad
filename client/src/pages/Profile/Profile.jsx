import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Plus,
  BellOff,
  BellRing,
  Trash2,
  Loader2,
  Globe,
} from 'lucide-react';
import { useAlerts } from '../../hooks/useMarketData.js';
import { marketAPI, authAPI } from '../../services/api.js';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { updateUserProfileLocal } from '../../redux/authSlice.js';
import { setPreferredCurrency } from '../../redux/currencySlice.js';
import AccountPasswordForm from '../../components/AccountPasswordForm.jsx';
import ThemedNumberInput from '../../components/ThemedNumberInput.jsx';
import { useMaintenance } from '../../context/MaintenanceContext.jsx';
import {
  CURRENCY_OPTIONS,
  getCurrencySymbol,
  formatCurrency,
} from '../../utils/currencyUtils.js';

const Profile = () => {
  const { user } = useSelector((s) => s.auth);
  const { preferred: currency } = useSelector((s) => s.currency);
  const dispatch = useDispatch();
  const { data: alerts = [], refetch: refetchAlerts } = useAlerts();
  const queryClient = useQueryClient();

  const [alertLoading, setAlertLoading] = useState(false);
  const [alertSuccess, setAlertSuccess] = useState('');
  const [showAlertForm, setShowAlertForm] = useState(false);
  const { maintenanceMode, message: maintenanceMessage } = useMaintenance();

  const { register, handleSubmit, reset, setValue, watch } = useForm();

  const hasPassword = Boolean(user?.hasPassword);
  const isAdminAccount = user?.role === 'admin';
  const accountSettingsDisabled = isAdminAccount || maintenanceMode;
  const alertTargetValue = watch('value');

  const accountProvider = user?.authProvider
    ? user.authProvider.charAt(0).toUpperCase() + user.authProvider.slice(1)
    : 'Local';
  const accountType = isAdminAccount ? 'Admin Account' : user?.role === 'demo' ? 'Demo Account' : 'User Account';
  const activeAlertsCount = alerts.filter((a) => !a.isTriggered).length;
  const profileStats = [
    { label: 'Account Type', value: accountType },
    { label: 'Sign-in Provider', value: accountProvider },
    { label: 'Email Password Status', value: hasPassword ? 'Enabled' : 'Not Set' },
    { label: 'Active Alerts Count', value: String(activeAlertsCount) },
  ];

  useEffect(() => {
    const refreshProfile = async () => {
      try {
        const { data } = await authAPI.getProfile();
        dispatch(updateUserProfileLocal(data));
      } catch (error) {
        console.error('Failed to refresh profile', error);
      }
    };

    refreshProfile();
  }, [dispatch]);

  const handleDeleteAlert = async (id) => {
    if (maintenanceMode) return;
    await marketAPI.deleteAlert(id);
    refetchAlerts();
  };

  const onCreateAlert = async (data) => {
    if (maintenanceMode) return;

    setAlertLoading(true);
    setAlertSuccess('');
    try {
      await marketAPI.createAlert({
        symbol: data.symbol.toUpperCase(),
        condition: data.condition,
        value: parseFloat(data.value),
      });
      setAlertSuccess(
        `Alert created: ${data.symbol.toUpperCase()} ${data.condition} ${getCurrencySymbol(currency)}${data.value}`
      );
      reset();
      setShowAlertForm(false);
      refetchAlerts();
    } catch (err) {
      console.error(err);
    } finally {
      setAlertLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Profile & Alerts</h1>
        <p className="text-sm text-light-muted dark:text-dark-muted">Manage price alerts and account settings</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
        {/* ── Profile Card ── */}
        <section className="glass-panel relative flex h-full min-h-[420px] flex-col overflow-hidden rounded-3xl border border-slate-200/50 p-6 dark:border-dark-border">
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-brand-500/8 via-transparent to-emerald-500/8" />

          <div className="relative flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <div className="w-24 h-24 shrink-0 rounded-[1.5rem] bg-gradient-to-br from-brand-500 to-emerald-600 text-white flex items-center justify-center text-4xl font-extrabold shadow-xl shadow-brand-500/20">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-light-muted dark:text-dark-muted">
                  Profile Hero
                </p>
                <h2 className="mt-2 truncate text-2xl font-extrabold tracking-tight">{user?.name || 'User'}</h2>
                <p className="mt-1 truncate text-sm text-light-muted dark:text-dark-muted">{user?.email || ''}</p>
                {isAdminAccount && (
                  <div className="mt-3 inline-flex flex-col gap-1 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-500">
                    <span>Administrator Account</span>
                    <span>System Managed</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-2">
              <span className="inline-flex items-center rounded-full bg-brand-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-500">
                Active Account
              </span>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${hasPassword ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                {hasPassword ? 'Password Ready' : 'Google Setup'}
              </span>
            </div>
          </div>

          <div className="relative mt-5 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full bg-slate-100/80 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-light-muted dark:bg-slate-900/50 dark:text-dark-muted">
              {accountType}
            </span>
            <span className="inline-flex items-center rounded-full bg-slate-100/80 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-light-muted dark:bg-slate-900/50 dark:text-dark-muted">
              {accountProvider}
            </span>
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${hasPassword ? 'bg-brand-500/10 text-brand-500' : 'bg-amber-500/10 text-amber-500'}`}>
              {hasPassword ? 'Email Password Enabled' : 'Email Password Not Set'}
            </span>
          </div>

          <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {profileStats.map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200/50 bg-slate-50/80 p-4 dark:border-slate-800/40 dark:bg-slate-900/35">
                <p className="text-[10px] font-bold uppercase tracking-wider text-light-muted dark:text-dark-muted">
                  {item.label}
                </p>
                <p className="mt-2 truncate text-sm font-extrabold">{item.value}</p>
              </div>
            ))}
          </div>

          {/* ── Preferred Currency ── */}
          <div className="relative mt-6">
            <div className="rounded-2xl border border-slate-200/50 bg-slate-50/80 p-4 dark:border-slate-800/40 dark:bg-slate-900/35">
              <div className="flex items-center gap-2 mb-3">
                <Globe size={15} className="text-brand-500 shrink-0" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-light-muted dark:text-dark-muted">
                  Preferred Currency
                </p>
              </div>
              <p className="text-xs text-light-muted dark:text-dark-muted mb-3">
                All monetary values across the app will be displayed in this currency.
              </p>
              <select
                value={currency}
                onChange={(e) => dispatch(setPreferredCurrency(e.target.value))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-all dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-brand-500 cursor-pointer"
              >
                {CURRENCY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-[10px] text-light-muted dark:text-dark-muted">
                Currently: <span className="font-bold text-brand-500">{CURRENCY_OPTIONS.find((o) => o.value === currency)?.label}</span>
              </p>
            </div>
          </div>
        </section>

        {/* ── Account Password Form ── */}
        <div className="flex h-full min-h-[420px] flex-col gap-6">
          <div className="[&>div]:h-full [&>div]:w-full">
            <AccountPasswordForm
              hasPassword={hasPassword}
              disabled={accountSettingsDisabled}
              disabledReason={maintenanceMode ? maintenanceMessage : undefined}
              onSaved={() => queryClient.invalidateQueries({ queryKey: ['profile'] })}
            />
          </div>
        </div>
      </div>

      {/* ── Price Alerts ── */}
      <section className="glass-panel flex h-[430px] flex-col overflow-hidden rounded-3xl border border-slate-200/50 p-6 dark:border-dark-border">
          <div className="flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-brand-500" />
              <div>
                <h2 className="font-bold text-base">Price Alerts</h2>
                <p className="text-xs text-light-muted dark:text-dark-muted">{alerts.length} configured alerts</p>
              </div>
            </div>
            <button
              onClick={() => setShowAlertForm(!showAlertForm)}
              className="flex items-center gap-1.5 rounded-xl bg-brand-500/10 px-3 py-1.5 text-xs font-bold text-brand-500 transition-all hover:bg-brand-500/20"
            >
              <Plus size={14} />
              <span>Add Alert</span>
            </button>
          </div>

          <div className="mt-5 flex-1 overflow-y-auto pr-1">
            <AnimatePresence>
              {showAlertForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <form onSubmit={handleSubmit(onCreateAlert)} className="mb-4 space-y-3 rounded-2xl border border-slate-200/30 bg-slate-100/50 p-4 dark:border-slate-800/30 dark:bg-slate-900/30">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold uppercase text-light-muted dark:text-dark-muted">Symbol</label>
                        <input
                          {...register('symbol', { required: true })}
                          placeholder="BTC, AAPL..."
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-brand-500 dark:border-slate-800 dark:bg-slate-950"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase text-light-muted dark:text-dark-muted">Condition</label>
                        <select
                          {...register('condition', { required: true })}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-brand-500 dark:border-slate-800 dark:bg-slate-950"
                        >
                          <option value="ABOVE">Price Goes Above</option>
                          <option value="BELOW">Price Goes Below</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-light-muted dark:text-dark-muted">
                        Target Price ({getCurrencySymbol(currency)})
                      </label>
                      <input
                        {...register('value', { required: true, min: 0.01 })}
                        type="hidden"
                      />
                      <ThemedNumberInput
                        value={alertTargetValue ?? ''}
                        min={0}
                        step={1000}
                        onChange={(nextValue) => setValue('value', nextValue, { shouldDirty: true })}
                        placeholder="e.g. 6500000"
                        className="mt-1"
                        inputClassName="rounded-xl py-2 pr-16 text-xs"
                      />
                    </div>
                    <button type="submit" disabled={alertLoading} className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-500 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-600">
                      {alertLoading ? <Loader2 size={14} className="animate-spin" /> : <><Bell size={13} /><span>Set Alert</span></>}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {alertSuccess && (
              <div className="mb-3 rounded-xl border border-brand-500/20 bg-brand-500/10 p-3 text-xs font-semibold text-brand-500">
                {alertSuccess}
              </div>
            )}

            <div className="space-y-3">
              {alerts.length === 0 ? (
                <p className="py-8 text-center text-xs italic text-light-muted dark:text-dark-muted">
                  No alerts configured. Click &quot;Add Alert&quot; to set a price target.
                </p>
              ) : (
                alerts.map((alert) => (
                  <div key={alert._id} className={`flex items-center justify-between rounded-2xl border p-3.5 ${alert.isTriggered ? 'border-amber-500/30 bg-amber-500/10' : 'border-slate-200/30 bg-slate-100/50 dark:border-slate-800/30 dark:bg-slate-900/30'}`}>
                    <div className="flex items-center gap-3">
                      {alert.isTriggered ? (
                        <BellRing size={16} className="animate-bounce text-amber-500" />
                      ) : (
                        <BellOff size={16} className="text-light-muted dark:text-dark-muted" />
                      )}
                      <div>
                        <p className="text-sm font-bold">
                          {alert.symbol}{' '}
                          <span className={`ml-1 text-[10px] font-bold ${alert.condition === 'ABOVE' ? 'text-brand-500' : 'text-danger-500'}`}>
                            {alert.condition}
                          </span>
                        </p>
                        <p className="text-xs text-light-muted dark:text-dark-muted">
                          Target: {formatCurrency(alert.value, currency, { maximumFractionDigits: 0 })} | Now:{' '}
                          {alert.currentPrice != null
                            ? formatCurrency(alert.currentPrice, currency, { maximumFractionDigits: 0 })
                            : '—'}
                        </p>
                        {alert.isTriggered && (
                          <p className="mt-0.5 text-[10px] font-bold text-amber-500">⚡ Alert Triggered!</p>
                        )}
                      </div>
                    </div>
                    <button onClick={() => handleDeleteAlert(alert._id)} className="rounded-lg p-1.5 text-danger-500 transition-colors hover:bg-danger-500/10">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
    </motion.div>
  );
};

export default Profile;
