import React, { useState, useEffect } from 'react';
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
      className="space-y-6 pb-12"
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
          <h1 className="text-2xl font-extrabold tracking-tight">Financial Dashboard</h1>
          <p className="text-sm text-light-muted dark:text-dark-muted">
            Track investments, wallet balances, and profits. Live market refreshes every 5s.
          </p>
        </div>
        
        {/* Real-time-like profit indicator */}
        <div className="flex flex-col items-end">
          <span className="text-xs text-light-muted dark:text-dark-muted font-medium mb-1">Total Profits/Losses</span>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold ${
            metrics.totalProfitLoss >= 0 
              ? 'bg-brand-500/10 text-brand-500' 
              : 'bg-danger-500/10 text-danger-500'
          }`}>
            {metrics.totalProfitLoss >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            <span>₹{metrics.totalProfitLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="text-xs">({metrics.totalReturnPercent >= 0 ? '+' : ''}{metrics.totalReturnPercent.toFixed(2)}%)</span>
          </div>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div key={idx} variants={cardVariants}>
              <Link
                to={card.link}
                className="group relative block p-6 bg-white dark:bg-dark-card border border-slate-200/50 dark:border-dark-border rounded-3xl shadow-sm hover:shadow-xl dark:shadow-glass-dark hover:border-brand-500/30 transition-all duration-300 overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-tr opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-300 rounded-bl-full" />
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-light-muted dark:text-dark-muted">
                    {card.title}
                  </span>
                  <div className={`p-2.5 rounded-2xl bg-gradient-to-tr ${card.color} text-white shadow-lg`}>
                    <Icon size={18} />
                  </div>
                </div>
                <h3 className="text-xl font-extrabold tracking-tight mb-1 group-hover:translate-x-0.5 transition-transform duration-200">
                  {card.value}
                </h3>
                <p className="text-xs text-light-muted dark:text-dark-muted">{card.subtitle}</p>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Charts & Top Holdings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Portfolio Distribution Pie Chart */}
        <motion.div
          variants={cardVariants}
          className="lg:col-span-2 glass-panel p-6 rounded-3xl flex flex-col justify-between border border-slate-200/50 dark:border-dark-border"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold">Portfolio Asset Allocation</h2>
              <p className="text-xs text-light-muted dark:text-dark-muted">Percent distribution of asset holdings</p>
            </div>
            <Link
              to="/analytics"
              className="text-xs font-bold text-brand-500 flex items-center gap-1 hover:underline"
            >
              <span>Detailed Charts</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="h-64 flex items-center justify-center">
            {charts.distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.distribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {charts.distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(15, 23, 42, 0.9)',
                      border: 'none',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                    formatter={(value) => `${value}%`}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12">
                <p className="text-sm text-light-muted dark:text-dark-muted mb-4">No assets currently owned</p>
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

        {/* Portfolio Performance Insights */}
        <motion.div
          variants={cardVariants}
          className="glass-panel p-6 rounded-3xl flex flex-col border border-slate-200/50 dark:border-dark-border justify-between"
        >
          <div>
            <h2 className="text-lg font-bold mb-4">Portfolio Insights</h2>
            
            <div className="space-y-4">
              {/* Daily Return indicator */}
              <div className="p-4 bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200/20 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-brand-500/15 p-2.5 rounded-xl text-brand-500">
                    <Flame size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-light-muted dark:text-dark-muted font-medium">Today's Profit/Loss</p>
                    <p className="text-sm font-extrabold mt-0.5">
                      {metrics.todayProfitLoss >= 0 ? '+' : ''}
                      ₹{metrics.todayProfitLoss.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                  metrics.todayProfitLoss >= 0 
                    ? 'bg-brand-500/10 text-brand-500' 
                    : 'bg-danger-500/10 text-danger-500'
                }`}>
                  {metrics.todayProfitLoss >= 0 ? '+' : ''}{metrics.todayReturnPercent.toFixed(2)}%
                </span>
              </div>

              {/* Best performer */}
              {insights.bestPerforming ? (
                <div className="p-4 bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200/20 rounded-2xl space-y-2">
                  <p className="text-xs text-light-muted dark:text-dark-muted font-medium">Top Performing Holding</p>
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm">{insights.bestPerforming.symbol}</span>
                    <span className="text-xs font-bold text-brand-500">
                      +{insights.bestPerforming.returnPercent.toFixed(2)}% (₹{insights.bestPerforming.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })})
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-light-muted dark:text-dark-muted italic">Holdings details will show here</p>
              )}

              {/* Worst performer */}
              {insights.worstPerforming && (
                <div className="p-4 bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200/20 rounded-2xl space-y-2">
                  <p className="text-xs text-light-muted dark:text-dark-muted font-medium">Worst Performing Holding</p>
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm">{insights.worstPerforming.symbol}</span>
                    <span className={`text-xs font-bold ${insights.worstPerforming.profit >= 0 ? 'text-brand-500' : 'text-danger-500'}`}>
                      {insights.worstPerforming.returnPercent >= 0 ? '+' : ''}{insights.worstPerforming.returnPercent.toFixed(2)}% (₹{insights.worstPerforming.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })})
                    </span>
                  </div>
                </div>
              )}

              {/* Most invested */}
              {insights.mostInvested && (
                <div className="p-4 bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200/20 rounded-2xl space-y-2">
                  <p className="text-xs text-light-muted dark:text-dark-muted font-medium">Highest Value Allocation</p>
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm">{insights.mostInvested.symbol}</span>
                    <span className="text-xs font-bold">
                      Invested: ₹{insights.mostInvested.investedAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Top Holdings & Recent Transactions List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Holdings */}
        <motion.div
          variants={cardVariants}
          className="glass-panel p-6 rounded-3xl border border-slate-200/50 dark:border-dark-border"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Top Holdings</h2>
            <Link to="/portfolio" className="text-xs text-brand-500 hover:underline font-semibold">View All Holdings</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200/50 dark:border-slate-800/50 text-light-muted dark:text-dark-muted text-xs uppercase font-bold">
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
                      <td className="py-3 font-semibold flex flex-col">
                        <span>{h.symbol}</span>
                        <span className="text-[10px] text-light-muted dark:text-dark-muted font-normal">{h.name}</span>
                      </td>
                      <td className="py-3">{h.quantity}</td>
                      <td className="py-3 text-right">₹{h.averageBuyPrice.toLocaleString()}</td>
                      <td className="py-3 text-right font-semibold">₹{h.currentValue.toLocaleString()}</td>
                      <td className={`py-3 text-right font-bold ${h.profitLoss >= 0 ? 'text-brand-500' : 'text-danger-500'}`}>
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

        {/* Recent Transactions */}
        <motion.div
          variants={cardVariants}
          className="glass-panel p-6 rounded-3xl border border-slate-200/50 dark:border-dark-border"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Recent Trade Orders</h2>
            <Link to="/transactions" className="text-xs text-brand-500 hover:underline font-semibold">View All Trades</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200/50 dark:border-slate-800/50 text-light-muted dark:text-dark-muted text-xs uppercase font-bold">
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
                      <td className="py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-extrabold ${
                          tx.type === 'BUY' 
                            ? 'bg-brand-500/10 text-brand-500' 
                            : 'bg-danger-500/10 text-danger-500'
                        }`}>
                          {tx.type === 'BUY' ? 'BUY' : 'SELL'}
                        </span>
                      </td>
                      <td className="py-3 font-semibold">{tx.symbol}</td>
                      <td className="py-3 text-right">₹{tx.price.toLocaleString()}</td>
                      <td className="py-3 text-right font-semibold">₹{tx.totalAmount.toLocaleString()}</td>
                      <td className="py-3 text-right text-xs text-light-muted dark:text-dark-muted">
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
