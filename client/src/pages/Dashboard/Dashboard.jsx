import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Percent,
  Layers,
  BellRing,
  Award,
  AlertTriangle,
  Flame,
  ArrowRight,
  BriefcaseBusiness,
  Landmark,
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { useDashboard, useAlerts } from '../../hooks/useMarketData.js';
import { marketAPI } from '../../services/api.js';
import WatchlistPanel from '../../components/WatchlistPanel.jsx';
import { formatCurrency } from '../../utils/currencyUtils.js';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

const Dashboard = () => {
  const { data, isLoading, error } = useDashboard();
  const { data: alertsData, refetch: refetchAlerts } = useAlerts();
  const [triggeredAlerts, setTriggeredAlerts] = useState([]);

  const { mode } = useSelector((state) => state.theme);
  const { preferred: currency } = useSelector((state) => state.currency);
  const isDark = mode === 'dark';

  const tooltipContentStyle = {
    backgroundColor: isDark ? '#111827' : '#ffffff',
    borderColor: isDark ? '#374151' : '#e5e7eb',
    borderRadius: '12px',
    boxShadow: '0 12px 30px rgba(15, 23, 42, 0.14)',
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

  useEffect(() => {
    if (alertsData) {
      setTriggeredAlerts(alertsData.filter((a) => a.isTriggered));
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
      transition: { staggerChildren: 0.06 },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120 } },
  };

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-14 w-80 bg-slate-200 dark:bg-slate-800/50 rounded-2xl skeleton" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-32 bg-slate-200 dark:bg-slate-800/50 rounded-3xl skeleton" />
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
          <div className="xl:col-span-3 h-96 bg-slate-200 dark:bg-slate-800/50 rounded-3xl skeleton" />
          <div className="xl:col-span-2 h-96 bg-slate-200 dark:bg-slate-800/50 rounded-3xl skeleton" />
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
  const displayHoldings = topHoldings.slice(0, 5);
  const returnsPositive = metrics.totalProfitLoss >= 0;

  const metricCards = [
    {
      title: 'Wallet Balance',
      value: formatCurrency(metrics.walletBalance, currency),
      subtitle: 'Virtual cash funds',
      icon: Wallet,
      color: 'from-blue-500 to-indigo-600 shadow-blue-500/20',
      link: '/wallet',
    },
    {
      title: 'Total Investment',
      value: formatCurrency(metrics.totalInvestment, currency),
      subtitle: 'Original cost basis',
      icon: Landmark,
      color: 'from-violet-500 to-fuchsia-600 shadow-violet-500/20',
      link: '/portfolio',
    },
    {
      title: 'Portfolio Value',
      value: formatCurrency(metrics.currentPortfolioValue, currency),
      subtitle: 'Valued at live prices',
      icon: BriefcaseBusiness,
      color: 'from-emerald-500 to-teal-600 shadow-emerald-500/20',
      link: '/portfolio',
    },
    {
      title: 'Total Returns',
      value: formatCurrency(metrics.totalProfitLoss, currency),
      subtitle: `${metrics.totalReturnPercent >= 0 ? '+' : ''}${metrics.totalReturnPercent.toFixed(2)}%`,
      icon: Percent,
      color: returnsPositive
        ? 'from-emerald-500 to-green-600 shadow-emerald-500/20'
        : 'from-rose-500 to-red-600 shadow-rose-500/20',
      link: '/analytics',
      isReturn: true,
    },
  ];

  const insightCards = [
    {
      title: "Today's P&L",
      icon: Flame,
      body: formatCurrency(metrics.todayProfitLoss, currency),
      meta: `${metrics.todayProfitLoss >= 0 ? '+' : ''}${metrics.todayReturnPercent.toFixed(2)}%`,
      positive: metrics.todayProfitLoss >= 0,
    },
    {
      title: 'Top Performer',
      icon: Award,
      body: insights.bestPerforming?.symbol || 'No holdings',
      meta: insights.bestPerforming
        ? `+${insights.bestPerforming.returnPercent.toFixed(2)}% (${formatCurrency(insights.bestPerforming.profit, currency, { maximumFractionDigits: 0 })})`
        : 'Start building positions',
      positive: true,
    },
    {
      title: 'Worst Performer',
      icon: TrendingDown,
      body: insights.worstPerforming?.symbol || 'No holdings',
      meta: insights.worstPerforming
        ? `${insights.worstPerforming.returnPercent >= 0 ? '+' : ''}${insights.worstPerforming.returnPercent.toFixed(2)}% (${formatCurrency(insights.worstPerforming.profit, currency, { maximumFractionDigits: 0 })})`
        : 'No downside yet',
      positive: !insights.worstPerforming || insights.worstPerforming.profit >= 0,
    },
    {
      title: 'Top Holding',
      icon: Layers,
      body: insights.mostInvested?.symbol || 'No holdings',
      meta: insights.mostInvested
        ? `Invested: ${formatCurrency(insights.mostInvested.investedAmount, currency, { maximumFractionDigits: 0 })}`
        : 'No capital deployed',
      positive: true,
    },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-4 pb-6"
    >
      <AnimatePresence>
        {triggeredAlerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="space-y-2"
          >
            {triggeredAlerts.map((alert) => (
              <div
                key={alert._id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-500 rounded-2xl shadow-sm text-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-amber-500/25 p-2 rounded-xl">
                    <BellRing size={18} className="animate-bounce" />
                  </div>
                  <div>
                    <span className="font-bold">{alert.symbol}</span> Price Alert Triggered! Asset price is{' '}
                    <span className="font-bold">
                      {alert.condition === 'ABOVE' ? 'above' : 'below'} {formatCurrency(alert.value, currency, { maximumFractionDigits: 0 })}
                    </span>{' '}
                    (Current: {formatCurrency(alert.currentPrice, currency, { maximumFractionDigits: 0 })})
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

      <section>
        <h1 className="text-2xl font-extrabold tracking-tight">
          Financial Dashboard
        </h1>

        <p className="text-sm text-light-muted dark:text-dark-muted">
          Track investments, wallet balances, and profits.
        </p>
      </section>
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <motion.div key={card.title} variants={cardVariants}>
              <Link
                to={card.link}
                className="group relative block h-full min-h-[136px] p-5 bg-white/80 dark:bg-dark-card/80 border border-slate-200/60 dark:border-dark-border rounded-3xl shadow-sm hover:shadow-xl dark:shadow-glass-dark hover:border-brand-500/30 transition-all duration-300 overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-tr from-brand-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-bl-full" />
                <div className="relative flex items-start justify-between gap-3 mb-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-light-muted dark:text-dark-muted">
                      {card.title}
                    </span>
                    <h3
                      className={`text-lg xl:text-xl font-extrabold tracking-tight mt-2 break-words ${card.isReturn ? (returnsPositive ? 'text-brand-500' : 'text-danger-500') : ''
                        }`}
                    >
                      {card.value}
                    </h3>
                  </div>
                  <div className={`p-2.5 rounded-2xl bg-gradient-to-tr ${card.color} text-white shadow-lg shrink-0`}>
                    <Icon size={18} />
                  </div>
                </div>
                <p className={`relative text-xs font-semibold ${card.isReturn ? (returnsPositive ? 'text-brand-500' : 'text-danger-500') : 'text-light-muted dark:text-dark-muted'}`}>
                  {card.subtitle}
                </p>
              </Link>
            </motion.div>
          );
        })}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-5 gap-4 items-stretch">
        <motion.div
          variants={cardVariants}
          className="xl:col-span-3 glass-panel p-5 rounded-3xl border border-slate-200/50 dark:border-dark-border flex flex-col h-[386px] overflow-hidden min-h-0 hover:shadow-xl transition-shadow"
        >
          <div className="flex items-center justify-between mb-3 shrink-0">
            <h2 className="text-base font-extrabold">Top Holdings</h2>
            <Link to="/portfolio" className="text-xs text-brand-500 hover:underline font-bold">View All Holdings</Link>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-on-hover min-h-0">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200/50 dark:border-slate-800/50 text-xs uppercase font-bold text-light-muted dark:text-dark-muted sticky top-0 bg-slate-50/90 dark:bg-[#101423]/90 backdrop-blur-md z-10">
                  <th className="py-3 text-left">Asset</th>
                  <th className="py-3 text-left">Qty</th>
                  <th className="py-3 text-right">Avg Price</th>
                  <th className="py-3 text-right">Current Value</th>
                  <th className="py-3 text-right">Returns</th>
                </tr>
              </thead>
              <tbody>
                {displayHoldings.length > 0 ? (
                  displayHoldings.map((h) => (
                    <tr key={h.symbol} className="border-b border-slate-100/60 dark:border-slate-800/30 last:border-none hover:bg-slate-100/40 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="py-3.5 pr-3 font-semibold">
                        <span className="block">{h.symbol}</span>
                        <span className="text-[10px] text-light-muted dark:text-dark-muted font-normal line-clamp-1">{h.name}</span>
                      </td>
                      <td className="py-3.5 pr-3 font-medium">{h.quantity}</td>
                      <td className="py-3.5 pr-3 text-right">{formatCurrency(h.averageBuyPrice, currency, { maximumFractionDigits: 0 })}</td>
                      <td className="py-3.5 pr-3 text-right font-semibold">{formatCurrency(h.currentValue, currency, { maximumFractionDigits: 0 })}</td>
                      <td className={`py-3.5 text-right font-bold ${h.profitLoss >= 0 ? 'text-brand-500' : 'text-danger-500'}`}>
                        {h.returnPercent >= 0 ? '+' : ''}{h.returnPercent.toFixed(1)}%
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-light-muted dark:text-dark-muted text-xs italic">
                      No holdings available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        <motion.div
          variants={cardVariants}
          className="xl:col-span-2 glass-panel p-5 rounded-3xl flex flex-col border border-slate-200/50 dark:border-dark-border h-[386px] hover:shadow-xl transition-shadow"
        >
          <div className="flex items-start justify-between gap-3 mb-3 shrink-0">
            <div>
              <h2 className="text-base font-extrabold">Portfolio Asset Allocation</h2>
              <p className="text-xs text-light-muted dark:text-dark-muted">Distribution of holdings</p>
            </div>
            <Link
              to="/analytics"
              className="text-xs font-bold text-brand-500 flex items-center gap-1 hover:underline shrink-0"
            >
              <span>Detailed Charts</span>
              <ArrowRight size={12} />
            </Link>
          </div>

          <div className="flex-1 flex items-center justify-center min-h-0">
            {charts.distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <Pie
                    data={charts.distribution}
                    cx="52%"
                    cy="48%"
                    innerRadius="42%"
                    outerRadius="64%"
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
                    layout="horizontal"
                    align="center"
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
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
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold">Portfolio Insights</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {insightCards.map((item) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                variants={cardVariants}
                className="min-h-[118px] p-4 bg-white/80 dark:bg-slate-900/35 border border-slate-200/50 dark:border-slate-800/40 rounded-3xl shadow-sm hover:shadow-xl transition-all flex flex-col justify-between"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] text-light-muted dark:text-dark-muted font-bold uppercase tracking-wider">
                    {item.title}
                  </span>
                  <div className={`p-2 rounded-xl ${item.positive ? 'bg-brand-500/15 text-brand-500' : 'bg-danger-500/15 text-danger-500'}`}>
                    <Icon size={14} />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-extrabold truncate">{item.body}</p>
                  <span className={`text-[11px] font-bold block truncate ${item.positive ? 'text-brand-500' : 'text-danger-500'}`}>
                    {item.meta}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      <motion.div variants={cardVariants}>
        <WatchlistPanel
          height="320px"
          className="hover:shadow-xl transition-shadow"
        />
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;
