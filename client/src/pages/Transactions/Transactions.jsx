import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownLeft, Filter } from 'lucide-react';
import { useSelector } from 'react-redux';
import { tradeAPI } from '../../services/api.js';
import { formatCurrency } from '../../utils/currencyUtils.js';

const FILTERS = [
  { label: 'All Time', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'This Year', value: 'year' },
];

const Transactions = () => {
  const [filter, setFilter] = useState('all');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const { preferred: currency } = useSelector((state) => state.currency);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data } = await tradeAPI.getHistory(filter);
      setHistory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, [filter]);

  const totalBuys = history.filter((t) => t.type === 'BUY').reduce((s, t) => s + t.totalAmount, 0);
  const totalSells = history.filter((t) => t.type === 'SELL').reduce((s, t) => s + t.totalAmount, 0);
  const totalProfit = history.filter((t) => t.type === 'SELL').reduce((s, t) => s + (t.profit || 0), 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Trade History</h1>
        <p className="text-sm text-light-muted dark:text-dark-muted">Complete log of all buy and sell transactions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Purchased', value: formatCurrency(totalBuys, currency, { maximumFractionDigits: 0 }), color: 'bg-blue-500/10 text-blue-500' },
          { label: 'Total Sold', value: formatCurrency(totalSells, currency, { maximumFractionDigits: 0 }), color: 'bg-purple-500/10 text-purple-500' },
          { label: 'Realized P&L', value: `${totalProfit >= 0 ? '+' : ''}${formatCurrency(totalProfit, currency, { maximumFractionDigits: 0 })}`, color: totalProfit >= 0 ? 'bg-brand-500/10 text-brand-500' : 'bg-danger-500/10 text-danger-500' },
        ].map((c) => (
          <div key={c.label} className="glass-panel p-5 rounded-3xl border border-slate-200/50 dark:border-dark-border">
            <p className="text-xs font-medium text-light-muted dark:text-dark-muted mb-2">{c.label}</p>
            <p className={`text-base font-extrabold px-2.5 py-1 rounded-lg inline-block ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 glass-panel p-2 rounded-2xl border border-slate-200/50 dark:border-dark-border w-fit">
        <Filter size={16} className="ml-2 text-light-muted dark:text-dark-muted" />
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filter === f.value ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' : 'text-light-muted dark:text-dark-muted hover:bg-slate-200/50 dark:hover:bg-slate-800/40'
              }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Transactions Table */}
      <div className="glass-panel rounded-3xl border border-slate-200/50 dark:border-dark-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-xs uppercase font-bold text-light-muted dark:text-dark-muted bg-slate-50/50 dark:bg-slate-900/20">
                <th className="px-6 py-4 text-left">Asset</th>
                <th className="px-6 py-4 text-center">Type</th>
                <th className="px-6 py-4 text-right">Qty</th>
                <th className="px-6 py-4 text-right">Price</th>
                <th className="px-6 py-4 text-right">Total</th>
                <th className="px-6 py-4 text-right">Realized P&L</th>
                <th className="px-6 py-4 text-right">Date &amp; Time</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="border-b border-slate-100/50 dark:border-slate-800/20">
                    {[...Array(7)].map((__, j) => <td key={j} className="px-6 py-4"><div className="h-4 skeleton rounded" /></td>)}
                  </tr>
                ))
              ) : history.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center text-sm text-light-muted dark:text-dark-muted italic">No transactions found for the selected period.</td></tr>
              ) : (
                history.map((tx) => (
                  <tr key={tx._id} className="border-b border-slate-100/50 dark:border-slate-800/15 hover:bg-slate-50 dark:hover:bg-slate-800/15 transition-colors">
                    <td className="px-6 py-4 font-bold">
                      {tx.symbol}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-extrabold ${tx.type === 'BUY' ? 'bg-brand-500/10 text-brand-500' : 'bg-danger-500/10 text-danger-500'}`}>
                          {tx.type === 'BUY' ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
                          {tx.type}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">{tx.quantity}</td>
                    <td className="px-6 py-4 text-right">{formatCurrency(tx.price, currency, { maximumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 text-right font-semibold">{formatCurrency(tx.totalAmount, currency, { maximumFractionDigits: 0 })}</td>
                    <td className={`px-6 py-4 text-right font-bold ${tx.type === 'SELL' ? (tx.profit >= 0 ? 'text-brand-500' : 'text-danger-500') : 'text-light-muted dark:text-dark-muted'}`}>
                      {tx.type === 'SELL' ? `${tx.profit >= 0 ? '+' : ''}${formatCurrency(tx.profit, currency, { maximumFractionDigits: 0 })}` : '—'}
                    </td>
                    <td className="px-6 py-4 text-right text-xs text-light-muted dark:text-dark-muted">
                      {new Date(tx.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}<br />
                      <span>{new Date(tx.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

export default Transactions;
