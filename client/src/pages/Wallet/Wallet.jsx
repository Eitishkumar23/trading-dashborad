import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  PlusCircle,
  MinusCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  Search,
  Download,
  CheckCircle2,
  AlertCircle,
  Shield,
  Building2,
  CreditCard,
  Banknote,
  Smartphone,
  Filter,
  Calendar,
  RefreshCw,
  XCircle,
  ChevronDown,
  Check,
} from 'lucide-react';
import { walletAPI } from '../../services/api.js';
import { useMaintenance } from '../../context/MaintenanceContext.jsx';
import { useSelector } from 'react-redux';
import {
  formatCurrency,
  formatCurrencyDecimal,
  getCurrencySymbol,
} from '../../utils/currencyUtils.js';

/* ─────────────────────────── Constants ─────────────────────────── */

const QUICK_AMOUNTS = [10000, 50000, 100000, 500000];

const PAYMENT_METHODS = [
  { value: 'upi', label: 'UPI', icon: Smartphone },
  { value: 'netbanking', label: 'Net Banking', icon: Building2 },
  { value: 'card', label: 'Debit / Credit Card', icon: CreditCard },
  { value: 'neft', label: 'NEFT / RTGS', icon: Banknote },
];

const BANK_ACCOUNTS = [
  { value: 'hdfc_1234', label: 'HDFC Bank •••• 1234' },
  { value: 'icici_5678', label: 'ICICI Bank •••• 5678' },
  { value: 'sbi_9012', label: 'State Bank •••• 9012' },
  { value: 'axis_3456', label: 'Axis Bank •••• 3456' },
];

const TYPE_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Deposits', value: 'deposits' },
  { label: 'Withdrawals', value: 'withdrawals' },
  { label: 'Trading', value: 'trading' },
  { label: 'Rewards', value: 'rewards' },
  { label: 'Refunds', value: 'refunds' },
];

const MONTH_OPTIONS = [
  { value: 'all', label: 'All Months' },
  { value: '0', label: 'January' },
  { value: '1', label: 'February' },
  { value: '2', label: 'March' },
  { value: '3', label: 'April' },
  { value: '4', label: 'May' },
  { value: '5', label: 'June' },
  { value: '6', label: 'July' },
  { value: '7', label: 'August' },
  { value: '8', label: 'September' },
  { value: '9', label: 'October' },
  { value: '10', label: 'November' },
  { value: '11', label: 'December' },
];

/* ─────────────────────────── Helpers ─────────────────────────── */

const classifyTx = (tx) => {
  const desc = (tx.description || '').toLowerCase();
  if (tx.transactionType === 'CREDIT') {
    if (desc.includes('reward') || desc.includes('bonus') || desc.includes('cashback')) return 'rewards';
    if (desc.includes('refund')) return 'refunds';
    return 'deposits';
  }
  if (tx.transactionType === 'DEBIT') {
    if (desc.includes('withdrawal') || desc.includes('withdraw')) return 'withdrawals';
    return 'trading';
  }
  return 'other';
};

const exportCSV = (rows) => {
  const headers = ['Date & Time', 'Type', 'Description', 'Amount', 'Status'];
  const csvRows = rows.map((tx) => [
    new Date(tx.createdAt).toLocaleString('en-IN'),
    tx.transactionType,
    `"${tx.description}"`,
    tx.transactionType === 'CREDIT' ? `+${tx.amount}` : `-${tx.amount}`,
    tx.status || 'approved',
  ]);
  const content = [headers, ...csvRows].map((r) => r.join(',')).join('\n');
  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `wallet-ledger-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

/* ─────────────────────────── MetricCard ─────────────────────────── */

const MetricCard = ({ icon: Icon, label, value, iconColor, valueCls }) => (
  <div className="p-3 rounded-2xl bg-white/8">
    <div className="flex items-center gap-1.5 mb-2">
      <div className={`p-1.5 rounded-lg bg-white/10 ${iconColor}`}>
        <Icon size={12} />
      </div>
      <p className="text-[10px] text-white/55 font-semibold uppercase tracking-wider leading-none">
        {label}
      </p>
    </div>
    <p className={`text-sm font-extrabold leading-tight ${valueCls || 'text-white'}`}>{value}</p>
  </div>
);

/* ─────────────────────────── Toast ─────────────────────────── */

const Toast = ({ msg, type, visible }) => (
  <AnimatePresence>
    {msg && visible && (
      <motion.div
        key={msg}
        initial={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className={`mb-4 overflow-hidden rounded-2xl border text-xs font-semibold ${
          type === 'error'
            ? 'border-rose-500/25 bg-rose-500/10 text-rose-400 shadow-[0_10px_30px_-18px_rgba(244,63,94,0.6)]'
            : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400 shadow-[0_10px_30px_-18px_rgba(16,185,129,0.7)]'
        }`}
      >
        <div className="flex items-center gap-2 px-3.5 py-3">
          {type === 'error' ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
          <span>{msg}</span>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

/* ─────────────────────────── Custom Select Dropdown ─────────────────────────── */

const CustomSelect = ({ value, onChange, options, placeholder = 'Select an option…', disabled = false }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={[
          'w-full flex items-center justify-between gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition-all duration-200',
          'bg-white/90 dark:bg-slate-950/90 text-slate-900 dark:text-slate-100',
          open
            ? 'border-brand-500 ring-4 ring-brand-500/10'
            : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        ].join(' ')}
      >
        <span className={selected ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}>
          {selected ? (
            <span className="flex items-center gap-2">
              {selected.icon && <selected.icon size={14} className="shrink-0 text-light-muted dark:text-dark-muted" />}
              {selected.label}
            </span>
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown
          size={15}
          className={`shrink-0 text-light-muted dark:text-dark-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            className="absolute z-50 top-full mt-1.5 left-0 right-0 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xl shadow-slate-900/10 dark:shadow-black/40 overflow-hidden py-1.5"
            role="listbox"
          >
            {options.map((opt) => {
              const isSelected = value === opt.value;
              return (
                <li key={opt.value} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    onClick={() => { onChange(opt.value); setOpen(false); }}
                    className={[
                      'w-full text-left px-4 py-2.5 text-sm font-medium flex items-center gap-2.5 transition-colors',
                      isSelected
                        ? 'bg-brand-500/10 text-brand-500'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60',
                    ].join(' ')}
                  >
                    {opt.icon && (
                      <opt.icon
                        size={14}
                        className={`shrink-0 ${isSelected ? 'text-brand-500' : 'text-slate-400 dark:text-slate-500'}`}
                      />
                    )}
                    <span className="flex-1">{opt.label}</span>
                    {isSelected && <Check size={13} className="shrink-0 text-brand-500" />}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ─────────────────────────── Input style ─────────────────────────── */

const inputCls =
  'no-spinner w-full rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-2.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-slate-800 dark:bg-slate-950/90 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand-500 transition-all duration-200';

/* ─────────────────────────── Main Component ─────────────────────────── */

const WalletPage = () => {
  /* ── Data State ── */
  const [walletDetails, setWalletDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  /* ── UI State ── */
  const [activeTab, setActiveTab] = useState('deposit');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [toast, setToast] = useState({ msg: '', type: 'success', visible: false });
  const [activeQuickAmount, setActiveQuickAmount] = useState(null);

  /* ── Filter State ── */
  const [typeFilter, setTypeFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  /* ── Height sync ── */
  const leftColRef = useRef(null);
  const [rightColHeight, setRightColHeight] = useState(null);

  const { maintenanceMode, message: maintenanceMessage } = useMaintenance();

  /* ── Currency ── */
  const { preferred: currency } = useSelector((state) => state.currency);
  /* Convenience wrappers that always use the currently selected currency */
  const fmt = useCallback(
    (n, whole = true) =>
      whole
        ? formatCurrency(n, currency, { maximumFractionDigits: 0 })
        : formatCurrencyDecimal(n, currency),
    [currency]
  );

  /* ── Forms ── */
  const depositForm = useForm({ defaultValues: { amount: 0, paymentMethod: 'upi', description: '' } });
  const withdrawForm = useForm({ defaultValues: { amount: 0, bankAccount: '', description: '' } });

  const depositAmt = Number(depositForm.watch('amount') || 0);
  const withdrawAmt = Number(withdrawForm.watch('amount') || 0);
  const selectedPaymentMethod = depositForm.watch('paymentMethod');
  const selectedBankAccount = withdrawForm.watch('bankAccount');

  /* ── Fetch wallet ── */
  const fetchWallet = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await walletAPI.getDetails();
      setWalletDetails(data);
    } catch (err) {
      console.error('Wallet fetch failed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  /* ── Sync right column height to left column ── */
  useEffect(() => {
    const el = leftColRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setRightColHeight(entry.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [walletDetails]); // re-attach after initial data load

  /* ── Toast helper ── */
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type, visible: true });
    const t1 = setTimeout(() => setToast((p) => ({ ...p, visible: false })), 4000);
    const t2 = setTimeout(() => setToast({ msg: '', type: 'success', visible: false }), 4300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  /* ── Quick amount ── */
  const handleQuickAmount = (amt) => {
    if (maintenanceMode) return;
    const cur = Number(depositForm.getValues('amount') || 0);
    const safe = Number.isFinite(cur) && cur > 0 ? cur : 0;
    depositForm.setValue('amount', safe + amt, { shouldDirty: true, shouldValidate: true });
    setActiveQuickAmount(amt);
    setTimeout(() => setActiveQuickAmount((c) => (c === amt ? null : c)), 180);
  };

  /* ── Deposit submit ── */
  const onDeposit = async (data) => {
    if (maintenanceMode) return;
    const amount = Number(data.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) return;

    try {
      setSubmitLoading(true);
      await walletAPI.addFunds(amount, data.description || `Deposit via ${data.paymentMethod?.toUpperCase()}`);
      showToast(`Successfully credited ${fmt(amount)} to your wallet!`);
      depositForm.reset({ amount: 0, paymentMethod: 'upi', description: '' });
      const { data: fresh } = await walletAPI.getDetails();
      setWalletDetails(fresh);
    } catch (err) {
      showToast(err?.response?.data?.message || 'Deposit failed. Please try again.', 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  /* ── Withdraw submit ── */
  const onWithdraw = async (data) => {
    const amount = Number(data.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) return;

    const balance = walletDetails?.balance ?? 0;
    if (amount > balance) {
      showToast(`Insufficient balance. Available: ${fmt(balance)}`, 'error');
      return;
    }

    const bankLabel =
      BANK_ACCOUNTS.find((b) => b.value === data.bankAccount)?.label || data.bankAccount || 'Bank Account';

    try {
      setSubmitLoading(true);
      await walletAPI.withdrawFunds(amount, bankLabel);
      showToast(`Withdrawal of ${fmt(amount)} submitted — pending admin approval.`);
      withdrawForm.reset({ amount: 0, bankAccount: '', description: '' });
      const { data: fresh } = await walletAPI.getDetails();
      setWalletDetails(fresh);
    } catch (err) {
      showToast(err?.response?.data?.message || 'Withdrawal failed. Please try again.', 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  /* ── Derived wallet stats ── */
  const { balance = 0, totalCredits = 0, totalDebits = 0, history = [] } = walletDetails || {};

  const pendingWithdrawals = history
    .filter((tx) => tx.transactionType === 'DEBIT' && tx.status === 'pending')
    .reduce((s, tx) => s + tx.amount, 0);

  const netCashFlow = totalCredits - totalDebits;

  /* ── Filtered history (no pagination) ── */
  const filteredHistory = useMemo(() => {
    return history.filter((tx) => {
      if (typeFilter !== 'all' && classifyTx(tx) !== typeFilter) return false;
      if (monthFilter !== 'all') {
        const txMonth = new Date(tx.createdAt).getMonth().toString();
        if (txMonth !== monthFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !tx.description?.toLowerCase().includes(q) &&
          !tx.transactionType?.toLowerCase().includes(q) &&
          !tx.amount?.toString().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [history, typeFilter, monthFilter, searchQuery]);

  /* ── Loading skeleton ── */
  if (loading && !walletDetails) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-56 skeleton rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-[35%_1fr] gap-5 items-start">
          <div className="space-y-4">
            <div className="h-64 skeleton rounded-3xl" />
            <div className="h-80 skeleton rounded-3xl" />
          </div>
          <div className="h-[640px] skeleton rounded-3xl" />
        </div>
      </div>
    );
  }

  const isDepositDisabled = maintenanceMode || submitLoading || !depositAmt || depositAmt <= 0;
  const isWithdrawDisabled = submitLoading || !withdrawAmt || withdrawAmt <= 0 || !selectedBankAccount;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Wallet Ledger</h1>
          <p className="text-sm text-light-muted dark:text-dark-muted mt-0.5">
            Manage your paper trading funds — deposits, withdrawals &amp; full transaction history
          </p>
        </div>
        <button
          onClick={fetchWallet}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold glass-panel border border-slate-200/50 dark:border-dark-border hover:border-brand-500/40 text-light-muted dark:text-dark-muted hover:text-brand-500 transition-all"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[35%_1fr] gap-5 items-start">

        {/* ═══════════════ LEFT COLUMN ═══════════════ */}
        <div ref={leftColRef} className="space-y-4">

          {/* ── Wallet Balance Card ── */}
          <div className="relative p-5 bg-gradient-to-br from-brand-600 via-brand-500 to-emerald-500 rounded-3xl text-white shadow-2xl shadow-brand-500/20 overflow-hidden">
            {/* Decorative blobs */}
            <div className="absolute -top-8 -right-8 w-36 h-36 bg-white/5 rounded-full pointer-events-none" />
            <div className="absolute -bottom-6 -left-6 w-28 h-28 bg-white/5 rounded-full pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between mb-5 relative z-10">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-white/15 rounded-xl backdrop-blur-sm">
                  <Wallet size={16} className="text-white" />
                </div>
                <span className="text-xs uppercase tracking-widest font-extrabold text-emerald-100/80">
                  Virtual Wallet
                </span>
              </div>
              <span className="text-[10px] font-bold bg-white/10 text-emerald-100 px-2.5 py-1 rounded-full border border-white/15">
                PAPER TRADING
              </span>
            </div>

            {/* Main balance */}
            <div className="relative z-10 mb-5">
              <p className="text-xs text-emerald-100/50 font-semibold mb-1 uppercase tracking-wide">
                Available Balance
              </p>
              <h2 className="text-4xl font-black tracking-tight leading-none break-all">
                {formatCurrencyDecimal(balance, currency)}
              </h2>
              <p className="text-xs text-emerald-100/60 mt-1.5">100% simulated — paper trade account</p>
            </div>

            {/* Stats 2×2 grid */}
            <div className="relative z-10 grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-white/10">
              <MetricCard
                icon={TrendingUp}
                label="Total Credits"
                value={fmt(totalCredits)}
                iconColor="text-emerald-300"
                valueCls="text-white"
              />
              <MetricCard
                icon={TrendingDown}
                label="Total Debits"
                value={fmt(totalDebits)}
                iconColor="text-rose-300"
                valueCls="text-white"
              />
              <MetricCard
                icon={Activity}
                label="Net Cash Flow"
                value={`${netCashFlow >= 0 ? '+' : ''}${fmt(netCashFlow)}`}
                iconColor={netCashFlow >= 0 ? 'text-emerald-300' : 'text-rose-300'}
                valueCls={netCashFlow >= 0 ? 'text-emerald-200' : 'text-rose-200'}
              />
              <MetricCard
                icon={Clock}
                label="Pending W/D"
                value={pendingWithdrawals > 0 ? fmt(pendingWithdrawals) : `${getCurrencySymbol(currency)}0`}
                iconColor="text-amber-300"
                valueCls={pendingWithdrawals > 0 ? 'text-amber-200' : 'text-white/70'}
              />
            </div>
          </div>

          {/* ── Funds Actions Card ── */}
          <div className="glass-panel rounded-3xl border border-slate-200/50 dark:border-dark-border overflow-hidden">
            {/* Tab bar */}
            <div className="flex border-b border-slate-200/50 dark:border-dark-border">
              <button
                onClick={() => setActiveTab('deposit')}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-bold transition-all ${
                  activeTab === 'deposit'
                    ? 'text-brand-500 border-b-2 border-brand-500 bg-brand-500/5'
                    : 'text-light-muted dark:text-dark-muted hover:text-light-text dark:hover:text-dark-text'
                }`}
              >
                <PlusCircle size={15} />
                Deposit Funds
              </button>
              <button
                onClick={() => setActiveTab('withdraw')}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-bold transition-all ${
                  activeTab === 'withdraw'
                    ? 'text-rose-500 border-b-2 border-rose-500 bg-rose-500/5'
                    : 'text-light-muted dark:text-dark-muted hover:text-light-text dark:hover:text-dark-text'
                }`}
              >
                <MinusCircle size={15} />
                Withdraw Funds
              </button>
            </div>

            <div className="p-5">
              {/* Toast */}
              <Toast msg={toast.msg} type={toast.type} visible={toast.visible} />

              {/* Maintenance banner */}
              {maintenanceMode && activeTab === 'deposit' && (
                <div className="mb-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-3.5 py-3 text-xs font-semibold text-amber-600 dark:text-amber-300">
                  {maintenanceMessage}
                </div>
              )}

              {/* ── DEPOSIT FORM ── */}
              <AnimatePresence mode="wait">
                {activeTab === 'deposit' && (
                  <motion.form
                    key="deposit"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.18 }}
                    onSubmit={depositForm.handleSubmit(onDeposit)}
                    className="space-y-4"
                  >
                    {/* Amount */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-light-muted dark:text-dark-muted uppercase tracking-wide">
                          Amount
                        </label>
                        <span className="text-xs font-bold text-brand-500">
                          {depositAmt > 0 ? fmt(depositAmt) : '—'}
                        </span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        placeholder="Enter amount (e.g. 50000)"
                        disabled={maintenanceMode}
                        onKeyDown={(e) => ['-', '+', 'e', 'E', '.', ','].includes(e.key) && e.preventDefault()}
                        {...depositForm.register('amount', {
                          valueAsNumber: true,
                          required: 'Amount is required',
                          validate: (v) =>
                            (Number.isFinite(Number(v)) && Number(v) > 0) || 'Enter a positive amount',
                          max: { value: 10000000, message: 'Maximum ₹1,00,00,000 (INR equivalent)' },
                        })}
                        className={inputCls}
                      />
                      {depositForm.formState.errors.amount && (
                        <p className="text-xs text-rose-500 mt-1">{depositForm.formState.errors.amount.message}</p>
                      )}
                    </div>

                    {/* Quick amounts */}
                    <div className="flex flex-wrap gap-2">
                      {QUICK_AMOUNTS.map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          disabled={maintenanceMode}
                          onClick={() => handleQuickAmount(amt)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all duration-150 active:scale-95 ${
                            activeQuickAmount === amt
                              ? 'bg-brand-500/15 text-brand-500 border-brand-500/30'
                              : 'bg-slate-100/80 dark:bg-slate-800/50 border-transparent hover:bg-brand-500/10 hover:text-brand-500 hover:border-brand-500/20 text-light-muted dark:text-dark-muted'
                          }`}
                        >
                          +{formatCurrency(amt, currency, { maximumFractionDigits: 0 })}
                        </button>
                      ))}
                      <button
                        type="button"
                        disabled={maintenanceMode}
                        onClick={() =>
                          depositForm.setValue('amount', 0, { shouldDirty: true, shouldValidate: true })
                        }
                        className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200/70 dark:border-slate-700 text-light-muted dark:text-dark-muted hover:text-rose-500 hover:border-rose-500/30 hover:bg-rose-500/10 transition-all active:scale-95"
                      >
                        Clear
                      </button>
                    </div>

                    {/* Payment method — custom dropdown */}
                    <div>
                      <label className="block text-xs font-bold text-light-muted dark:text-dark-muted mb-1.5 uppercase tracking-wide">
                        Payment Method
                      </label>
                      <CustomSelect
                        value={selectedPaymentMethod}
                        onChange={(val) => depositForm.setValue('paymentMethod', val)}
                        options={PAYMENT_METHODS}
                        placeholder="Select payment method…"
                        disabled={maintenanceMode}
                      />
                    </div>

                    {/* Remarks */}
                    <div>
                      <label className="block text-xs font-bold text-light-muted dark:text-dark-muted mb-1.5 uppercase tracking-wide">
                        Remarks (optional)
                      </label>
                      <input
                        type="text"
                        placeholder="Transaction reference / comment"
                        disabled={maintenanceMode}
                        {...depositForm.register('description')}
                        className={inputCls}
                      />
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={isDepositDisabled}
                      className="w-full py-3 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 disabled:from-slate-500 disabled:to-slate-600 disabled:cursor-not-allowed text-white rounded-2xl font-extrabold text-sm transition-all shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
                    >
                      {maintenanceMode ? (
                        <><XCircle size={15} /> Deposits Unavailable</>
                      ) : submitLoading ? (
                        <><RefreshCw size={15} className="animate-spin" /> Processing…</>
                      ) : (
                        <><PlusCircle size={15} /> Deposit Funds</>
                      )}
                    </button>
                  </motion.form>
                )}

                {/* ── WITHDRAW FORM ── */}
                {activeTab === 'withdraw' && (
                  <motion.form
                    key="withdraw"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.18 }}
                    onSubmit={withdrawForm.handleSubmit(onWithdraw)}
                    className="space-y-4"
                  >
                    {/* Balance badge */}
                    <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-slate-100/80 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60">
                      <span className="text-xs font-semibold text-light-muted dark:text-dark-muted">
                        Available Balance
                      </span>
                      <span className="text-sm font-extrabold text-brand-500">{formatCurrencyDecimal(balance, currency)}</span>
                    </div>

                    {/* Amount */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-light-muted dark:text-dark-muted uppercase tracking-wide">
                          Withdrawal Amount
                        </label>
                        {withdrawAmt > 0 && withdrawAmt > balance && (
                          <span className="text-xs font-bold text-rose-500">Exceeds balance</span>
                        )}
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        placeholder="Enter amount to withdraw"
                        onKeyDown={(e) => ['-', '+', 'e', 'E', '.', ','].includes(e.key) && e.preventDefault()}
                        {...withdrawForm.register('amount', {
                          valueAsNumber: true,
                          required: 'Amount is required',
                          validate: (v) => {
                            const n = Number(v || 0);
                            if (!Number.isFinite(n) || n <= 0) return 'Enter a positive amount';
                            if (n > balance) return `Insufficient balance (max ${fmt(balance)})`;
                            return true;
                          },
                        })}
                        className={`${inputCls} ${
                          withdrawAmt > 0 && withdrawAmt > balance ? '!border-rose-500 !ring-rose-500/10' : ''
                        }`}
                      />
                      {withdrawForm.formState.errors.amount && (
                        <p className="text-xs text-rose-500 mt-1">{withdrawForm.formState.errors.amount.message}</p>
                      )}
                    </div>

                    {/* Bank account — custom dropdown */}
                    <div>
                      <label className="block text-xs font-bold text-light-muted dark:text-dark-muted mb-1.5 uppercase tracking-wide">
                        Bank Account
                      </label>
                      <CustomSelect
                        value={selectedBankAccount}
                        onChange={(val) => {
                          withdrawForm.setValue('bankAccount', val, { shouldValidate: true });
                        }}
                        options={BANK_ACCOUNTS}
                        placeholder="Select bank account…"
                      />
                      {withdrawForm.formState.errors.bankAccount && (
                        <p className="text-xs text-rose-500 mt-1">
                          {withdrawForm.formState.errors.bankAccount.message}
                        </p>
                      )}
                    </div>

                    {/* Remarks */}
                    <div>
                      <label className="block text-xs font-bold text-light-muted dark:text-dark-muted mb-1.5 uppercase tracking-wide">
                        Remarks (optional)
                      </label>
                      <input
                        type="text"
                        placeholder="Purpose of withdrawal"
                        {...withdrawForm.register('description')}
                        className={inputCls}
                      />
                    </div>

                    {/* Pending notice */}
                    <div className="flex items-start gap-2 px-3.5 py-2.5 rounded-2xl bg-amber-500/8 border border-amber-500/20 dark:border-amber-500/15">
                      <Clock size={13} className="text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed font-medium">
                        Withdrawal requests are reviewed by admin. Amount is reserved immediately and refunded if rejected.
                      </p>
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={isWithdrawDisabled}
                      className="w-full py-3 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 disabled:from-slate-500 disabled:to-slate-600 disabled:cursor-not-allowed text-white rounded-2xl font-extrabold text-sm transition-all shadow-lg shadow-rose-500/20 hover:shadow-rose-500/30 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
                    >
                      {submitLoading ? (
                        <><RefreshCw size={15} className="animate-spin" /> Processing…</>
                      ) : (
                        <><MinusCircle size={15} /> Request Withdrawal</>
                      )}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Security note */}
              <div className="mt-4 flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-slate-100/60 dark:bg-slate-900/40 border border-slate-200/40 dark:border-slate-800/40">
                <Shield size={13} className="text-brand-500 shrink-0" />
                <p className="text-[10px] text-light-muted dark:text-dark-muted leading-relaxed">
                  All transactions are SSL-encrypted and secured with bank-grade 256-bit encryption. This is a simulated paper trading environment.
                </p>
              </div>
            </div>
          </div>
        </div>
        {/* ═══════════════ END LEFT COLUMN ═══════════════ */}

        {/* ═══════════════ RIGHT COLUMN ═══════════════ */}
        <div
          className="glass-panel rounded-3xl border border-slate-200/50 dark:border-dark-border flex flex-col overflow-hidden"
          style={rightColHeight ? { height: `${rightColHeight}px` } : { minHeight: '560px' }}
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-200/50 dark:border-dark-border shrink-0">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <h3 className="text-base font-extrabold flex items-center gap-2">
                <Activity size={17} className="text-brand-500" />
                Transaction History
                <span className="ml-1 text-xs font-bold bg-brand-500/10 text-brand-500 px-2 py-0.5 rounded-full">
                  {filteredHistory.length}
                </span>
              </h3>
              <button
                onClick={() => exportCSV(filteredHistory)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200/70 dark:border-slate-700 text-light-muted dark:text-dark-muted hover:text-brand-500 hover:border-brand-500/40 hover:bg-brand-500/5 transition-all"
              >
                <Download size={13} />
                Export CSV
              </button>
            </div>

            {/* Type filter tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-on-hover">
              {TYPE_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setTypeFilter(f.value)}
                  className={`flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    typeFilter === f.value
                      ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                      : 'text-light-muted dark:text-dark-muted hover:bg-slate-200/60 dark:hover:bg-slate-800/50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Search + Month filter row */}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {/* Search */}
              <div className="flex-1 min-w-[150px] relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-light-muted dark:text-dark-muted pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search transactions…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/50 text-light-text dark:text-dark-text placeholder:text-light-muted dark:placeholder:text-dark-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/10 transition-all"
                />
              </div>

              {/* Month filter */}
              <div className="relative">
                <Calendar size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-light-muted dark:text-dark-muted pointer-events-none z-10" />
                <select
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="pl-7 pr-8 py-2 text-xs font-medium rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/50 text-light-text dark:text-dark-text focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/10 transition-all cursor-pointer appearance-none"
                >
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Clear filters */}
              {(typeFilter !== 'all' || monthFilter !== 'all' || searchQuery) && (
                <button
                  onClick={() => { setTypeFilter('all'); setMonthFilter('all'); setSearchQuery(''); }}
                  className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200/70 dark:border-slate-700 text-light-muted dark:text-dark-muted hover:text-rose-500 hover:border-rose-500/30 hover:bg-rose-500/10 transition-all flex items-center gap-1"
                >
                  <Filter size={12} />
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Table area — scrollable, fills remaining height */}
          <div className="flex-1 overflow-y-auto min-h-0 scrollbar-on-hover">
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="text-[10px] uppercase font-extrabold text-light-muted dark:text-dark-muted bg-slate-50/95 dark:bg-slate-900/90 backdrop-blur-sm border-b border-slate-200/50 dark:border-slate-800/50">
                  <th className="px-5 py-3 text-left tracking-wider">Type</th>
                  <th className="px-5 py-3 text-left tracking-wider">Description</th>
                  <th className="px-5 py-3 text-center tracking-wider">Status</th>
                  <th className="px-5 py-3 text-right tracking-wider">Amount</th>
                  <th className="px-5 py-3 text-right tracking-wider">Date &amp; Time</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(8)].map((_, i) => (
                    <tr key={i} className="border-b border-slate-100/50 dark:border-slate-800/20">
                      {[...Array(5)].map((__, j) => (
                        <td key={j} className="px-5 py-3.5">
                          <div className="h-3.5 skeleton rounded" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3 text-light-muted dark:text-dark-muted">
                        <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800/50">
                          <Activity size={22} className="opacity-40" />
                        </div>
                        <p className="text-sm font-semibold">No transactions found</p>
                        <p className="text-xs opacity-60">Try adjusting your filters or search query</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((tx, idx) => {
                    const isCredit = tx.transactionType === 'CREDIT';
                    const status = tx.status || 'approved';
                    const statusMap = {
                      approved: { label: 'Completed', cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
                      pending:  { label: 'Pending',   cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
                      rejected: { label: 'Rejected',  cls: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
                      on_hold:  { label: 'On Hold',   cls: 'bg-slate-500/10 text-slate-500 dark:text-slate-400' },
                    };
                    const s = statusMap[status] || statusMap.approved;

                    return (
                      <motion.tr
                        key={tx._id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(idx * 0.02, 0.3), duration: 0.2 }}
                        className="border-b border-slate-100/50 dark:border-slate-800/15 hover:bg-slate-50/60 dark:hover:bg-slate-800/15 transition-colors group"
                      >
                        {/* Type */}
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-extrabold ${
                              isCredit
                                ? 'bg-brand-500/10 text-brand-500'
                                : 'bg-rose-500/10 text-rose-500'
                            }`}
                          >
                            {isCredit ? <ArrowDownLeft size={11} /> : <ArrowUpRight size={11} />}
                            {tx.transactionType}
                          </span>
                        </td>

                        {/* Description */}
                        <td className="px-5 py-3.5 max-w-[180px]">
                          <span className="text-xs font-medium text-light-text dark:text-dark-text group-hover:text-brand-500 transition-colors line-clamp-2">
                            {tx.description}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3.5 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${s.cls}`}>
                            {s.label}
                          </span>
                        </td>

                        {/* Amount */}
                        <td className={`px-5 py-3.5 text-right font-extrabold text-sm ${
                          isCredit ? 'text-brand-500' : 'text-rose-500'
                        }`}>
                          {isCredit ? '+' : '−'}{fmt(tx.amount)}
                        </td>

                        {/* Date */}
                        <td className="px-5 py-3.5 text-right text-[11px] text-light-muted dark:text-dark-muted whitespace-nowrap">
                          <span className="block font-semibold">
                            {new Date(tx.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric', month: 'short', year: 'numeric',
                            })}
                          </span>
                          <span className="opacity-70">
                            {new Date(tx.createdAt).toLocaleTimeString('en-IN', {
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </span>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Entry count footer */}
          <div className="px-5 py-3 border-t border-slate-200/50 dark:border-slate-800/50 shrink-0">
            <p className="text-xs font-medium text-light-muted dark:text-dark-muted">
              Showing{' '}
              <span className="font-bold text-light-text dark:text-dark-text">{filteredHistory.length}</span>
              {' '}of{' '}
              <span className="font-bold text-light-text dark:text-dark-text">{history.length}</span>
              {' '}entries
              {(typeFilter !== 'all' || monthFilter !== 'all' || searchQuery) && (
                <span className="ml-1 text-brand-500 font-semibold">(filtered)</span>
              )}
            </p>
          </div>
        </div>
        {/* ═══════════════ END RIGHT COLUMN ═══════════════ */}
      </div>
    </motion.div>
  );
};

export default WalletPage;
