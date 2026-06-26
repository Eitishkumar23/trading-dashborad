import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  PlusCircle,
  History,
  CheckCircle2,
} from 'lucide-react';
import { walletAPI } from '../../services/api.js';
import { useMaintenance } from '../../context/MaintenanceContext.jsx';

const QUICK_AMOUNTS = [10000, 50000, 100000, 500000];

const currencyWithDecimals = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const currencyWhole = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const formatCurrency = (amount, formatter = currencyWhole) => formatter.format(Number(amount || 0));

const WalletPage = () => {
  const [walletDetails, setWalletDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [showSuccessMsg, setShowSuccessMsg] = useState(false);
  const [activeQuickAmount, setActiveQuickAmount] = useState(null);
  const { maintenanceMode, message: maintenanceMessage } = useMaintenance();

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      amount: 0,
      description: '',
    },
  });

  const amountValue = watch('amount');
  const depositAmount = Number(amountValue || 0);
  const isDepositDisabled =
    maintenanceMode || submitLoading || !Number.isFinite(depositAmount) || depositAmount <= 0;

  const fetchWalletDetails = async () => {
    try {
      setLoading(true);
      const { data } = await walletAPI.getDetails();
      setWalletDetails(data);
    } catch (error) {
      console.error('Failed to fetch wallet ledger details', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletDetails();
  }, []);

  useEffect(() => {
    if (!successMsg) {
      setShowSuccessMsg(false);
      return undefined;
    }

    setShowSuccessMsg(true);

    const hideTimer = window.setTimeout(() => {
      setShowSuccessMsg(false);
    }, 4000);

    const resetTimer = window.setTimeout(() => {
      setSuccessMsg('');
    }, 4300);

    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(resetTimer);
    };
  }, [successMsg]);

  const flashQuickAmount = (amount) => {
    setActiveQuickAmount(amount);
    window.setTimeout(() => {
      setActiveQuickAmount((current) => (current === amount ? null : current));
    }, 180);
  };

  const handleQuickAmount = (amount) => {
    if (maintenanceMode) return;

    const currentAmount = Number(getValues('amount') || 0);
    const safeAmount = Number.isFinite(currentAmount) && currentAmount > 0 ? currentAmount : 0;
    const nextAmount = safeAmount + amount;

    setValue('amount', nextAmount, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    flashQuickAmount(amount);
  };

  const handleClearAmount = () => {
    if (maintenanceMode) return;

    setValue('amount', 0, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    setActiveQuickAmount(null);
  };

  const onSubmit = async (formData) => {
    if (maintenanceMode) return;

    const amount = Number(formData.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }

    try {
      setSubmitLoading(true);
      setSuccessMsg('');
      await walletAPI.addFunds(amount, formData.description);
      setSuccessMsg(`Successfully credited ${formatCurrency(amount)} to your wallet!`);
      reset({ amount: 0, description: '' });

      const detailsRes = await walletAPI.getDetails();
      setWalletDetails(detailsRes.data);
    } catch (error) {
      console.error('Failed to deposit funds', error);
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading && !walletDetails) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-slate-200 dark:bg-slate-800/50 rounded-xl skeleton" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 h-96 bg-slate-200 dark:bg-slate-800/50 rounded-3xl skeleton" />
          <div className="lg:col-span-2 h-96 bg-slate-200 dark:bg-slate-800/50 rounded-3xl skeleton" />
        </div>
      </div>
    );
  }

  const { balance, totalCredits, totalDebits, history } = walletDetails || {
    balance: 0,
    totalCredits: 0,
    totalDebits: 0,
    history: [],
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 pb-12"
    >
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Virtual Wallet</h1>
        <p className="text-sm text-light-muted dark:text-dark-muted">
          Add paper funds to buy and sell stocks and cryptos. Balance is calculated from ledger
          transactions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <div className="relative p-6 bg-gradient-to-br from-brand-600 to-emerald-500 rounded-3xl text-white shadow-xl shadow-brand-500/10 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full pointer-events-none" />
            <div className="flex items-center justify-between mb-8">
              <span className="text-xs uppercase tracking-widest font-extrabold text-emerald-100">
                Virtual Wallet Balance
              </span>
              <Wallet size={20} className="text-emerald-100" />
            </div>
            <h2 className="text-3xl font-extrabold mb-1 tracking-tight">
              {formatCurrency(balance, currencyWithDecimals)}
            </h2>
            <p className="text-xs text-emerald-100">100% simulated paper trade account</p>

            <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/10 text-xs">
              <div>
                <p className="text-emerald-100/70 font-medium">Total Credits</p>
                <p className="text-sm font-bold mt-0.5">{formatCurrency(totalCredits)}</p>
              </div>
              <div>
                <p className="text-emerald-100/70 font-medium">Total Debits</p>
                <p className="text-sm font-bold mt-0.5">{formatCurrency(totalDebits)}</p>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-slate-200/50 dark:border-dark-border">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <PlusCircle size={18} className="text-brand-500" />
              <span>Deposit Funds</span>
            </h3>

            <AnimatePresence mode="wait">
              {successMsg && showSuccessMsg && (
                <motion.div
                  key={successMsg}
                  initial={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
                  transition={{ duration: 0.28, ease: 'easeOut' }}
                  className="mb-4 overflow-hidden rounded-2xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-[0_10px_30px_-18px_rgba(16,185,129,0.7)]"
                >
                  <div className="flex items-center gap-2 px-3.5 py-3 text-xs font-semibold">
                    <CheckCircle2 size={16} />
                    <span>{successMsg}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {maintenanceMode && (
              <div className="mb-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-3.5 py-3 text-xs font-semibold text-amber-700 dark:text-amber-300">
                {maintenanceMessage}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <label className="block text-xs font-bold text-light-muted dark:text-dark-muted uppercase">
                    Amount
                  </label>
                  <span className="text-xs font-semibold text-brand-500">
                    {formatCurrency(depositAmount)}
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  placeholder="Enter amount (e.g. 50000)"
                  disabled={maintenanceMode}
                  onKeyDown={(event) => {
                    if (['-', '+', 'e', 'E', '.', ','].includes(event.key)) {
                      event.preventDefault();
                    }
                  }}
                  {...register('amount', {
                    valueAsNumber: true,
                    required: 'Amount is required',
                    validate: (value) => {
                      const numericValue = Number(value || 0);
                      return (
                        (Number.isFinite(numericValue) && numericValue > 0) ||
                        'Enter a positive amount'
                      );
                    },
                    max: { value: 10000000, message: 'Maximum deposit is Rs.1,00,00,000' },
                  })}
                  className="no-spinner w-full rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 text-sm font-semibold text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:shadow-[0_0_0_1px_rgba(14,165,233,0.25),0_0_0_6px_rgba(14,165,233,0.08)] dark:border-slate-800 dark:bg-slate-950/90 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-700 dark:hover:bg-slate-950 dark:focus:border-brand-500 dark:focus:bg-slate-950"
                />
                {errors.amount && (
                  <p className="text-xs text-rose-500 mt-1">{errors.amount.message}</p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {QUICK_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleQuickAmount(amt)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150 active:scale-95 ${
                      activeQuickAmount === amt
                        ? 'bg-brand-500/15 text-brand-500 border-brand-500/30 shadow-sm shadow-brand-500/10'
                        : 'bg-slate-200/50 dark:bg-slate-800/40 border-transparent hover:bg-brand-500/10 hover:text-brand-500 hover:border-brand-500/20'
                    }`}
                    disabled={maintenanceMode}
                  >
                    +{formatCurrency(amt)}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleClearAmount}
                  disabled={maintenanceMode}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-300/70 dark:border-slate-700 text-light-muted dark:text-dark-muted hover:text-rose-500 hover:border-rose-500/30 hover:bg-rose-500/10 transition-all duration-150 active:scale-95"
                >
                  Clear
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-light-muted dark:text-dark-muted mb-1.5 uppercase">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="Bank transfer reference / comment"
                  disabled={maintenanceMode}
                  {...register('description')}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-4 text-sm focus:border-brand-500 outline-none transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isDepositDisabled}
                title={maintenanceMode ? maintenanceMessage : undefined}
                className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 disabled:bg-slate-400 disabled:dark:bg-slate-700 disabled:cursor-not-allowed disabled:shadow-none text-white rounded-xl font-bold transition-all shadow-lg shadow-brand-500/10 flex items-center justify-center gap-2"
              >
                {maintenanceMode ? 'Deposits Unavailable' : submitLoading ? 'Depositing...' : 'Add Funds to Wallet'}
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="glass-panel p-6 rounded-3xl border border-slate-200/50 dark:border-dark-border h-full flex flex-col">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <History size={18} className="text-brand-500" />
              <span>Wallet Ledger History</span>
            </h3>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/50 dark:border-slate-800/50 text-light-muted dark:text-dark-muted text-xs uppercase font-bold">
                    <th className="pb-3">Type</th>
                    <th className="pb-3">Description</th>
                    <th className="pb-3 text-right">Amount</th>
                    <th className="pb-3 text-right">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length > 0 ? (
                    history.map((tx) => (
                      <tr
                        key={tx._id}
                        className="border-b border-slate-100/55 dark:border-slate-800/20 last:border-none"
                      >
                        <td className="py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold ${
                              tx.transactionType === 'CREDIT'
                                ? 'bg-brand-500/10 text-brand-500'
                                : 'bg-danger-500/10 text-danger-500'
                            }`}
                          >
                            {tx.transactionType === 'CREDIT' ? (
                              <>
                                <ArrowUpRight size={12} />
                                <span>CREDIT</span>
                              </>
                            ) : (
                              <>
                                <ArrowDownLeft size={12} />
                                <span>DEBIT</span>
                              </>
                            )}
                          </span>
                        </td>
                        <td className="py-3.5 text-xs lg:text-sm font-medium">{tx.description}</td>
                        <td
                          className={`py-3.5 text-right font-bold ${
                            tx.transactionType === 'CREDIT'
                              ? 'text-brand-500'
                              : 'text-danger-500'
                          }`}
                        >
                          {tx.transactionType === 'CREDIT' ? '+' : '-'}
                          {formatCurrency(tx.amount)}
                        </td>
                        <td className="py-3.5 text-right text-xs text-light-muted dark:text-dark-muted">
                          {new Date(tx.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-12 text-center text-light-muted dark:text-dark-muted text-xs italic"
                      >
                        No transactions registered in the ledger.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default WalletPage;
