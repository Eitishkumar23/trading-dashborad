import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  PlusCircle,
  TrendingUp,
  History,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { walletAPI } from '../../services/api.js';

const WalletPage = () => {
  const [walletDetails, setWalletDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      amount: '',
      description: '',
    },
  });

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

  const onSubmit = async (formData) => {
    try {
      setSubmitLoading(true);
      setSuccessMsg('');
      const { data } = await walletAPI.addFunds(Number(formData.amount), formData.description);
      setSuccessMsg(`Successfully credited ₹${Number(formData.amount).toLocaleString()} to your wallet!`);
      reset();
      
      // Refresh details
      const detailsRes = await walletAPI.getDetails();
      setWalletDetails(detailsRes.data);
    } catch (error) {
      console.error('Failed to deposit funds', error);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleQuickAmount = (amount) => {
    setValue('amount', amount, { shouldValidate: true });
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Virtual Wallet</h1>
        <p className="text-sm text-light-muted dark:text-dark-muted">
          Add paper funds to buy and sell stocks and cryptos. Balance is calculated from ledger transactions.
        </p>
      </div>

      {/* Grid: Form & Balances */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Add Funds & Stats */}
        <div className="space-y-6">
          {/* Visual Balance Card */}
          <div className="relative p-6 bg-gradient-to-br from-brand-600 to-emerald-500 rounded-3xl text-white shadow-xl shadow-brand-500/10 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full pointer-events-none" />
            <div className="flex items-center justify-between mb-8">
              <span className="text-xs uppercase tracking-widest font-extrabold text-emerald-100">Virtual Wallet Balance</span>
              <Wallet size={20} className="text-emerald-100" />
            </div>
            <h2 className="text-3xl font-extrabold mb-1 tracking-tight">
              ₹{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
            <p className="text-xs text-emerald-100">100% simulated paper trade account</p>

            {/* Total Credits & Debits quick bar */}
            <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/10 text-xs">
              <div>
                <p className="text-emerald-100/70 font-medium">Total Credits</p>
                <p className="text-sm font-bold mt-0.5">₹{totalCredits.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-emerald-100/70 font-medium">Total Debits</p>
                <p className="text-sm font-bold mt-0.5">₹{totalDebits.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Add Funds Form Panel */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-200/50 dark:border-dark-border">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <PlusCircle size={18} className="text-brand-500" />
              <span>Deposit Funds</span>
            </h3>

            {successMsg && (
              <div className="mb-4 p-3 bg-brand-500/15 border border-brand-500/30 rounded-xl text-brand-500 text-xs flex items-center gap-2 font-semibold">
                <CheckCircle2 size={16} />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-light-muted dark:text-dark-muted mb-1.5 uppercase">Amount (₹)</label>
                <input
                  type="number"
                  placeholder="Enter amount (e.g. 50000)"
                  {...register('amount', {
                    required: 'Amount is required',
                    min: { value: 100, message: 'Minimum deposit is ₹100' },
                    max: { value: 10000000, message: 'Maximum deposit is ₹1,00,00,000' },
                  })}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-4 text-sm font-semibold focus:border-brand-500 outline-none transition-colors"
                />
                {errors.amount && <p className="text-xs text-rose-500 mt-1">{errors.amount.message}</p>}
              </div>

              {/* Quick Amount Pills */}
              <div className="flex flex-wrap gap-2">
                {[10000, 50000, 100000, 500000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleQuickAmount(amt)}
                    className="px-3 py-1.5 bg-slate-200/50 dark:bg-slate-800/40 hover:bg-brand-500/10 hover:text-brand-500 rounded-xl text-xs font-semibold border border-transparent hover:border-brand-500/20 transition-all"
                  >
                    +₹{amt.toLocaleString()}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-light-muted dark:text-dark-muted mb-1.5 uppercase">Description</label>
                <input
                  type="text"
                  placeholder="Bank transfer reference / comment"
                  {...register('description')}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-4 text-sm focus:border-brand-500 outline-none transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={submitLoading}
                className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-brand-500/10 flex items-center justify-center gap-2"
              >
                {submitLoading ? 'Depositing...' : 'Add Funds to Wallet'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: Ledger history log */}
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
                      <tr key={tx._id} className="border-b border-slate-100/55 dark:border-slate-800/20 last:border-none">
                        <td className="py-3.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold ${
                            tx.transactionType === 'CREDIT'
                              ? 'bg-brand-500/10 text-brand-500'
                              : 'bg-danger-500/10 text-danger-500'
                          }`}>
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
                        <td className={`py-3.5 text-right font-bold ${
                          tx.transactionType === 'CREDIT' ? 'text-brand-500' : 'text-danger-500'
                        }`}>
                          {tx.transactionType === 'CREDIT' ? '+' : '-'}₹{tx.amount.toLocaleString()}
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
                      <td colSpan={4} className="py-12 text-center text-light-muted dark:text-dark-muted text-xs italic">
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
