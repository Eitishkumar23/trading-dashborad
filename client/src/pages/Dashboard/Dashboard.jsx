import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Percent,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  BellRing,
  Award,
  AlertTriangle,
  Flame,
  ArrowRight
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { useDashboard, useAlerts } from '../../hooks/useMarketData.js';
import { marketAPI } from '../../services/api.js';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

const Dashboard = () => {
  const { data, isLoading, error } = useDashboard();
  const { data: alertsData, refetch: refetchAlerts } = useAlerts();
  const [triggeredAlerts, setTriggeredAlerts] = useState([]);

  const { mode } = useSelector((state) => state.theme);
  const isDark = mode === 'dark';

  const tooltipContentStyle = {
    backgroundColor: isDark ? '#111827' : '#ffffff',
    borderColor: isDark ? '#374151' : '#e5e7eb',
    borderRadius: '12px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    padding: '8px 12px',
  };

  const tooltipLabelStyle = {
    color: isDark ? '#9ca3af' : '#4b5563',
    fontWeight: '600',
    fontSize: '11px',
    marginBottom: '4px',
  };

  const tooltipItemStyle = {
    color: isDark ? '#ffffff' : '#111827',
    fontSize: '11px',
  };

  // Check if there are any newly triggered alerts to show notifications
  useEffect(() => {
    if (alertsData) {
      const activeTriggered = alertsData.filter((a) => a.isTriggered);
      setTriggeredAlerts(activeTriggered);
    }
  }, [alertsData]);

  const dismissAlert = async (id) => {
    try {
      await marketAPI.deleteAlert(id);
      refetchAlerts();
    } catch (err) {
      console.error('Failed to dismiss alert', err);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } },
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Skeleton Header */}
        <div className="h-10 w-48 bg-slate-200 dark:bg-slate-800/50 rounded-xl skeleton" />

        {/* Skeleton Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-32 bg-slate-200 dark:bg-slate-800/50 rounded-3xl skeleton" />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-slate-200 dark:bg-slate-800/50 rounded-3xl skeleton" />
          <div className="h-96 bg-slate-200 dark:bg-slate-800/50 rounded-3xl skeleton" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center glass-panel rounded-3xl border border-danger-500/20 max-w-lg mx-auto mt-12">
        <AlertTriangle className="text-danger-500 mx-auto mb-4" size={40} />
        <h3 className="text-lg font-bold mb-2">Failed to Load Dashboard</h3>
        <p className="text-sm text-light-muted dark:text-dark-muted mb-6">
          {error.response?.data?.message || 'We had issues communicating with the backend API.'}
        </p>
        <Link
          to="/login"
          className="px-6 py-2.5 bg-brand-500 text-white rounded-xl font-bold shadow-lg shadow-brand-500/20 hover:bg-brand-600"
        >
          Back to Login
        </Link>
      </div>
    );
  }

  const { metrics, topHoldings, recentTransactions, insights, charts } = data;

  const metricCards = [
    {
      title: 'Wallet Balance',
      value: `₹${metrics.walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: 'Virtual cash funds',
      icon: Wallet,
      color: 'from-blue-500 to-indigo-600 shadow-blue-500/20',
      link: '/wallet'
    },
    {
      title: 'Total Investment',
      value: `₹${metrics.totalInvestment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: 'Original cost basis',
      icon: Layers,
      color: 'from-purple-500 to-pink-600 shadow-purple-500/20',
      link: '/portfolio'
    },
    {
      title: 'Portfolio Value',
      value: `₹${metrics.currentPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: 'Valued at live prices',
      icon: TrendingUp,
      color: 'from-emerald-500 to-teal-600 shadow-emerald-500/20',
      link: '/portfolio'
    },
    {
      title: 'Net Worth',
      value: `₹${metrics.netWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: 'Wallet + Active Holdings',
      icon: Award,
      color: 'from-amber-500 to-orange-600 shadow-amber-500/20',
      link: '/analytics'
    }
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-4 pb-12"
    >
      {/* Price Alert Notifications Banner */}
      <AnimatePresence>
        {triggeredAlerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-2"
          >
            {triggeredAlerts.map((alert) => (
              <div
                key={alert._id}
                className="flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-500 rounded-2xl shadow-sm text-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-amber-500/25 p-2 rounded-xl">
                    <BellRing size={18} className="animate-bounce" />
                  </div>
                  <div>
                    <span className="font-bold">{alert.symbol}</span> Price Alert Triggered! Asset price is{' '}
                    <span className="font-bold">
                      {alert.condition === 'ABOVE' ? 'above' : 'below'} ₹{alert.value.toLocaleString()}
                    </span>{' '}
                    (Current: ₹{alert.currentPrice?.toLocaleString()})
                  </div>
                </div>
                <button
                  onClick={() => dismissAlert(alert._id)}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold text-xs shadow-md transition-colors"
                >
                  Acknowledge
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Financial Dashboard</h1>
          <p className="text-xs text-light-muted dark:text-dark-muted">
            Track investments, wallet balances, and profits.
          </p>
        </div>

        {/* Real-time-like profit indicator */}
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-light-muted dark:text-dark-muted font-medium mb-0.5">Total Profits/Losses</span>
          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold ${metrics.totalProfitLoss >= 0
            ? 'bg-brand-500/10 text-brand-500'
            : 'bg-danger-500/10 text-danger-500'
            }`}>
            {metrics.totalProfitLoss >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>₹{metrics.totalProfitLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="text-[10px]">({metrics.totalReturnPercent >= 0 ? '+' : ''}{metrics.totalReturnPercent.toFixed(2)}%)</span>
          </div>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div key={idx} variants={cardVariants}>
              <Link
                to={card.link}
                className="group relative block p-5 bg-white dark:bg-dark-card border border-slate-200/50 dark:border-dark-border rounded-3xl shadow-sm hover:shadow-xl dark:shadow-glass-dark hover:border-brand-500/30 transition-all duration-300 overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-tr opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-300 rounded-bl-full" />
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-light-muted dark:text-dark-muted">
                    {card.title}
                  </span>
                  <div className={`p-2 rounded-xl bg-gradient-to-tr ${card.color} text-white shadow-lg`}>
                    <Icon size={16} />
                  </div>
                </div>
                <h3 className="text-lg font-extrabold tracking-tight mb-0.5 group-hover:translate-x-0.5 transition-transform duration-200">
                  {card.value}
                </h3>
                <p className="text-[10px] text-light-muted dark:text-dark-muted">{card.subtitle}</p>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* ─── ROW 2 : Top Holdings (60%) │ Asset Allocation (40%) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-stretch">

        {/* ── Top Holdings ── 3/5 ≈ 60% */}
        <motion.div
          variants={cardVariants}
          className="lg:col-span-3 glass-panel p-5 rounded-3xl border border-slate-200/50 dark:border-dark-border flex flex-col h-[420px]"
        >
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <h2 className="text-base font-bold">Top Holdings</h2>
            <Link to="/portfolio" className="text-xs text-brand-500 hover:underline font-semibold">View All Holdings</Link>
          </div>
          <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 pr-1 custom-scrollbar overscroll-contain">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200/50 dark:border-slate-800/50 text-light-muted dark:text-dark-muted text-xs uppercase font-bold sticky top-0 bg-white dark:bg-dark-card z-10">
                  <th className="pb-3">Asset</th>
                  <th className="pb-3">Qty</th>
                  <th className="pb-3 text-right">Avg Price</th>
                  <th className="pb-3 text-right">Current Value</th>
                  <th className="pb-3 text-right">Returns</th>
                </tr>
              </thead>
              <tbody>
                {topHoldings.length > 0 ? (
                  topHoldings.map((h) => (
                    <tr key={h.symbol} className="border-b border-slate-100/50 dark:border-slate-800/20 last:border-none">
                      <td className="py-3.5 font-semibold flex flex-col">
                        <span>{h.symbol}</span>
                        <span className="text-[10px] text-light-muted dark:text-dark-muted font-normal">{h.name}</span>
                      </td>
                      <td className="py-3.5">{h.quantity}</td>
                      <td className="py-3.5 text-right">₹{h.averageBuyPrice.toLocaleString()}</td>
                      <td className="py-3.5 text-right font-semibold">₹{h.currentValue.toLocaleString()}</td>
                      <td className={`py-3.5 text-right font-bold ${h.profitLoss >= 0 ? 'text-brand-500' : 'text-danger-500'}`}>
                        {h.returnPercent >= 0 ? '+' : ''}{h.returnPercent.toFixed(1)}%
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-light-muted dark:text-dark-muted text-xs italic">
                      No holdings available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* ── Portfolio Asset Allocation ── 2/5 ≈ 40% */}
        <motion.div
          variants={cardVariants}
          className="lg:col-span-2 glass-panel p-4 rounded-3xl flex flex-col border border-slate-200/50 dark:border-dark-border h-[420px]"
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold">Portfolio Asset Allocation</h2>
              <p className="text-[10px] text-light-muted dark:text-dark-muted">Distribution of holdings</p>
            </div>
            <Link
              to="/analytics"
              className="text-xs font-bold text-brand-500 flex items-center gap-1 hover:underline flex-shrink-0"
            >
              <span>Detailed Charts</span>
              <ArrowRight size={12} />
            </Link>
          </div>

          <div className="flex-1 flex items-center justify-center min-h-[160px]">
            {charts.distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.distribution}
                    cx="55%"
                    cy="50%"
                    innerRadius={34}
                    outerRadius={52}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {charts.distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipContentStyle}
                    labelStyle={tooltipLabelStyle}
                    itemStyle={tooltipItemStyle}
                    formatter={(value) => `${value}%`}
                  />
                  <Legend
                    layout="vertical"
                    align="left"
                    verticalAlign="middle"
                    iconType="circle"
                    wrapperStyle={{ fontSize: '10px', paddingLeft: '4px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-4">
                <p className="text-xs text-light-muted dark:text-dark-muted mb-3">No assets currently owned</p>
                <Link
                  to="/market"
                  className="px-4 py-2 bg-brand-500/10 hover:bg-brand-500/20 text-brand-500 text-xs font-bold rounded-xl"
                >
                  Buy Tickers
                </Link>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* ─── ROW 3 : Portfolio Insights (45%) │ Recent Trade Orders (55%) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-[9fr_11fr] gap-4 items-stretch">

        {/* ── Portfolio Insights ── ≈ 45% */}
        <motion.div
          variants={cardVariants}
          className="glass-panel p-5 rounded-3xl flex flex-col border border-slate-200/50 dark:border-dark-border h-[300px]"
        >
          <h2 className="text-base font-bold mb-3 flex-shrink-0">Portfolio Insights</h2>
          <div className="grid grid-cols-2 gap-2.5 flex-1">
            {/* Daily Return */}
            <div className="p-2.5 bg-slate-100/55 dark:bg-slate-900/30 border border-slate-200/20 rounded-2xl flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-1">
                <div className="bg-brand-500/15 p-1.5 rounded-lg text-brand-500">
                  <Flame size={14} />
                </div>
                <span className="text-[10px] text-light-muted dark:text-dark-muted font-bold uppercase tracking-wider">Today's P&L</span>
              </div>
              <div>
                <p className="text-xs font-extrabold truncate">
                  {metrics.todayProfitLoss >= 0 ? '+' : ''}₹{metrics.todayProfitLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <span className={`text-[10px] font-bold ${metrics.todayProfitLoss >= 0 ? 'text-brand-500' : 'text-danger-500'}`}>
                  {metrics.todayProfitLoss >= 0 ? '+' : ''}{metrics.todayReturnPercent.toFixed(2)}%
                </span>
              </div>
            </div>

            {/* Best performer */}
            {insights.bestPerforming ? (
              <div className="p-2.5 bg-slate-100/55 dark:bg-slate-900/30 border border-slate-200/20 rounded-2xl flex flex-col justify-between">
                <span className="text-[10px] text-light-muted dark:text-dark-muted font-bold uppercase tracking-wider mb-1 block truncate">Top Performer</span>
                <div>
                  <p className="text-xs font-extrabold truncate">{insights.bestPerforming.symbol}</p>
                  <span className="text-[10px] font-bold text-brand-500 block truncate">
                    +{insights.bestPerforming.returnPercent.toFixed(2)}% (₹{insights.bestPerforming.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })})
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-2.5 bg-slate-100/55 dark:bg-slate-900/30 border border-slate-200/20 rounded-2xl flex flex-col justify-center text-center">
                <p className="text-[10px] text-light-muted dark:text-dark-muted italic">No holdings</p>
              </div>
            )}

            {/* Worst performer */}
            {insights.worstPerforming ? (
              <div className="p-2.5 bg-slate-100/55 dark:bg-slate-900/30 border border-slate-200/20 rounded-2xl flex flex-col justify-between">
                <span className="text-[10px] text-light-muted dark:text-dark-muted font-bold uppercase tracking-wider mb-1 block truncate">Worst Performer</span>
                <div>
                  <p className="text-xs font-extrabold truncate">{insights.worstPerforming.symbol}</p>
                  <span className={`text-[10px] font-bold block truncate ${insights.worstPerforming.profit >= 0 ? 'text-brand-500' : 'text-danger-500'}`}>
                    {insights.worstPerforming.returnPercent >= 0 ? '+' : ''}{insights.worstPerforming.returnPercent.toFixed(2)}% (₹{insights.worstPerforming.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })})
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-2.5 bg-slate-100/55 dark:bg-slate-900/30 border border-slate-200/20 rounded-2xl flex flex-col justify-center text-center">
                <p className="text-[10px] text-light-muted dark:text-dark-muted italic">No holdings</p>
              </div>
            )}

            {/* Most invested */}
            {insights.mostInvested ? (
              <div className="p-2.5 bg-slate-100/55 dark:bg-slate-900/30 border border-slate-200/20 rounded-2xl flex flex-col justify-between">
                <span className="text-[10px] text-light-muted dark:text-dark-muted font-bold uppercase tracking-wider mb-1 block truncate">Top Holding</span>
                <div>
                  <p className="text-xs font-extrabold truncate">{insights.mostInvested.symbol}</p>
                  <span className="text-[10px] text-light-muted dark:text-dark-muted block truncate font-medium">
                    Invested: ₹{insights.mostInvested.investedAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-2.5 bg-slate-100/55 dark:bg-slate-900/30 border border-slate-200/20 rounded-2xl flex flex-col justify-center text-center">
                <p className="text-[10px] text-light-muted dark:text-dark-muted italic">No holdings</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Recent Trade Orders ── ≈ 55% */}
        <motion.div
          variants={cardVariants}
          className="glass-panel p-5 rounded-3xl border border-slate-200/50 dark:border-dark-border flex flex-col h-[300px]"
        >
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <h2 className="text-base font-bold">Recent Trade Orders</h2>
            <Link to="/transactions" className="text-xs text-brand-500 hover:underline font-semibold">View All Trades</Link>
          </div>
          <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 pr-1 custom-scrollbar overscroll-contain">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200/50 dark:border-slate-800/50 text-light-muted dark:text-dark-muted text-xs uppercase font-bold sticky top-0 bg-white dark:bg-dark-card z-10">
                  <th className="pb-3">Action</th>
                  <th className="pb-3">Asset</th>
                  <th className="pb-3 text-right">Rate</th>
                  <th className="pb-3 text-right">Total Amount</th>
                  <th className="pb-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.length > 0 ? (
                  recentTransactions.map((tx) => (
                    <tr key={tx._id} className="border-b border-slate-100/50 dark:border-slate-800/20 last:border-none">
                      <td className="py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-extrabold ${tx.type === 'BUY'
                          ? 'bg-brand-500/10 text-brand-500'
                          : 'bg-danger-500/10 text-danger-500'
                          }`}>
                          {tx.type === 'BUY' ? 'BUY' : 'SELL'}
                        </span>
                      </td>
                      <td className="py-3.5 font-semibold">{tx.symbol}</td>
                      <td className="py-3.5 text-right">₹{tx.price.toLocaleString()}</td>
                      <td className="py-3.5 text-right font-semibold">₹{tx.totalAmount.toLocaleString()}</td>
                      <td className="py-3.5 text-right text-xs text-light-muted dark:text-dark-muted">
                        {new Date(tx.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-light-muted dark:text-dark-muted text-xs italic">
                      No recent trades
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Dashboard;
