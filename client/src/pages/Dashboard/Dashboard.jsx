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
import { getAssetColor } from '../../utils/assetColors.js';

const Dashboard = () => {
  const { data, isLoading, error } = useDashboard();
  const { data: alertsData, refetch: refetchAlerts } = useAlerts();
  const [triggeredAlerts, setTriggeredAlerts] = useState([]);

  const { mode } = useSelector((state) => state.theme);
  const { preferred: currency } = useSelector((state) => state.currency);
  const isDark = mode === 'dark';

  // ── Recharts tooltip — reads live CSS variables so it flips with theme ──
  const cssVar = (name) =>
    typeof document !== 'undefined'
      ? getComputedStyle(document.documentElement).getPropertyValue(name).trim()
      : '';

  const tooltipContentStyle = {
    backgroundColor: cssVar('--color-card')    || (isDark ? '#1B2129' : '#FFFFFF'),
    borderColor:     cssVar('--color-border')  || (isDark ? '#2A313C' : '#E4E7EC'),
    borderRadius:    '14px',
    boxShadow:       isDark
      ? '0 16px 48px rgba(0,0,0,0.65), 0 4px 12px rgba(0,0,0,0.35)'
      : '0 8px 24px rgba(16,24,40,0.12)',
    padding: '10px 14px',
    border:  `1px solid ${cssVar('--color-border') || (isDark ? '#2A313C' : '#E4E7EC')}`,
  };
  const tooltipLabelStyle  = { color: cssVar('--color-text-secondary') || (isDark ? '#8B9AB0' : '#667085'), fontWeight: '600', fontSize: '11px', marginBottom: '6px', letterSpacing: '0.02em' };
  const tooltipItemStyle   = { color: cssVar('--color-text-primary')   || (isDark ? '#F1F5F9' : '#101828'), fontSize: '12px', fontWeight: '500' };
  const legendWrapperStyle = { fontSize: '11px', paddingTop: '12px',   color: cssVar('--color-text-secondary') || (isDark ? '#8B9AB0' : '#667085'), lineHeight: '1.8' };

  useEffect(() => {
    if (alertsData) setTriggeredAlerts(alertsData.filter((a) => a.isTriggered));
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
    show:   { opacity: 1, transition: { staggerChildren: 0.06 } },
  };
  const cardVariants = {
    hidden: { opacity: 0, y: 18 },
    show:   { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 20 } },
  };

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 pb-8">
        <div className="h-12 w-72 rounded-2xl skeleton" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {[1,2,3,4].map((n) => <div key={n} className="h-36 rounded-[20px] skeleton" />)}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
          <div className="xl:col-span-3 h-[420px] rounded-[20px] skeleton" />
          <div className="xl:col-span-2 h-[420px] rounded-[20px] skeleton" />
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="p-10 text-center dash-card max-w-md mx-auto mt-16 border border-danger-500/15">
        <div className="w-12 h-12 rounded-2xl bg-danger-500/10 flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="text-danger-500" size={22} />
        </div>
        <h3 className="text-base font-semibold mb-2 text-primary">Failed to Load Dashboard</h3>
        <p className="text-sm text-secondary mb-7 leading-relaxed">
          {error.response?.data?.message || 'We had trouble reaching the backend API.'}
        </p>
        <Link
          to="/login"
          className="inline-flex items-center px-5 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl font-semibold text-sm transition-all duration-200 shadow-card"
        >
          Back to Login
        </Link>
      </div>
    );
  }

  const { metrics, topHoldings, recentTransactions, insights, charts } = data;
  const displayHoldings = topHoldings.slice(0, 5);
  const returnsPositive  = metrics.totalProfitLoss >= 0;

  // ── Metric card definitions ───────────────────────────────────────────────
  // Portfolio Value is index 2 — designated as the primary card
  const metricCards = [
    {
      title:    'Wallet Balance',
      value:    formatCurrency(metrics.walletBalance, currency),
      subtitle: 'Available cash',
      icon:     Wallet,
      gradient: 'from-blue-500 to-indigo-600',
      glow:     'shadow-blue-500/25',
      link:     '/wallet',
      primary:  false,
    },
    {
      title:    'Total Investment',
      value:    formatCurrency(metrics.totalInvestment, currency),
      subtitle: 'Cost basis',
      icon:     Landmark,
      gradient: 'from-violet-500 to-fuchsia-600',
      glow:     'shadow-violet-500/25',
      link:     '/portfolio',
      primary:  false,
    },
    {
      title:    'Portfolio Value',
      value:    formatCurrency(metrics.currentPortfolioValue, currency),
      subtitle: 'Live market value',
      icon:     BriefcaseBusiness,
      gradient: 'from-emerald-500 to-teal-500',
      glow:     'shadow-emerald-500/30',
      link:     '/portfolio',
      primary:  true,   // ← primary visual focus
    },
    {
      title:    'Total Returns',
      value:    formatCurrency(metrics.totalProfitLoss, currency),
      subtitle: `${metrics.totalReturnPercent >= 0 ? '+' : ''}${metrics.totalReturnPercent.toFixed(2)}%`,
      icon:     Percent,
      gradient: returnsPositive ? 'from-emerald-500 to-green-500' : 'from-rose-500 to-red-600',
      glow:     returnsPositive ? 'shadow-emerald-500/25' : 'shadow-rose-500/25',
      link:     '/analytics',
      isReturn: true,
      primary:  false,
    },
  ];

  // ── Insight card definitions ──────────────────────────────────────────────
  const insightCards = [
    {
      title:    "Today's P&L",
      icon:     Flame,
      body:     formatCurrency(metrics.todayProfitLoss, currency),
      meta:     `${metrics.todayProfitLoss >= 0 ? '+' : ''}${metrics.todayReturnPercent.toFixed(2)}%`,
      positive: metrics.todayProfitLoss >= 0,
    },
    {
      title:    'Top Performer',
      icon:     Award,
      body:     insights.bestPerforming?.symbol || 'No holdings',
      meta:     insights.bestPerforming
        ? `+${insights.bestPerforming.returnPercent.toFixed(2)}% (${formatCurrency(insights.bestPerforming.profit, currency, { maximumFractionDigits: 0 })})`
        : 'Start building positions',
      positive: true,
    },
    {
      title:    'Worst Performer',
      icon:     TrendingDown,
      body:     insights.worstPerforming?.symbol || 'No holdings',
      meta:     insights.worstPerforming
        ? `${insights.worstPerforming.returnPercent >= 0 ? '+' : ''}${insights.worstPerforming.returnPercent.toFixed(2)}% (${formatCurrency(insights.worstPerforming.profit, currency, { maximumFractionDigits: 0 })})`
        : 'No downside yet',
      positive: !insights.worstPerforming || insights.worstPerforming.profit >= 0,
    },
    {
      title:    'Top Holding',
      icon:     Layers,
      body:     insights.mostInvested?.symbol || 'No holdings',
      meta:     insights.mostInvested
        ? `${formatCurrency(insights.mostInvested.investedAmount, currency, { maximumFractionDigits: 0 })} invested`
        : 'No capital deployed',
      positive: true,
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6 pb-10">

      {/* ── Triggered price alerts ──────────────────────────────────────── */}
      <AnimatePresence>
        {triggeredAlerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22 }}
            className="space-y-2.5"
          >
            {triggeredAlerts.map((alert) => (
              <div
                key={alert._id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 rounded-[16px] border border-amber-500/25 bg-amber-500/[0.06] text-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                    <BellRing size={14} className="text-amber-500 animate-bounce" />
                  </div>
                  <span className="text-secondary leading-snug">
                    <span className="font-semibold text-amber-600 dark:text-amber-400">{alert.symbol}</span>{' '}
                    alert — price is {alert.condition === 'ABOVE' ? 'above' : 'below'}{' '}
                    <span className="font-semibold text-primary">{formatCurrency(alert.value, currency, { maximumFractionDigits: 0 })}</span>
                    <span className="text-secondary"> · now {formatCurrency(alert.currentPrice, currency, { maximumFractionDigits: 0 })}</span>
                  </span>
                </div>
                <button
                  onClick={() => dismissAlert(alert._id)}
                  className="shrink-0 self-start sm:self-auto px-3.5 py-1.5 rounded-xl text-xs font-semibold border border-amber-500/20 bg-amber-500/[0.08] hover:bg-amber-500/[0.16] text-amber-600 dark:text-amber-400 transition-all duration-200"
                >
                  Dismiss
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <section className="space-y-0.5">
        <h1 className="text-[1.6rem] font-bold tracking-[-0.02em] text-primary leading-tight">
          Financial Dashboard
        </h1>
        <p className="text-sm text-secondary">
          Track investments, wallet balances, and profits.
        </p>
      </section>

      {/* ── Metric cards ────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {metricCards.map((card) => {
          const Icon = card.icon;
          const isPrimary = card.primary;

          return (
            <motion.div key={card.title} variants={cardVariants} className="h-full">
              <Link
                to={card.link}
                className={`group relative flex flex-col h-full overflow-hidden ${
                  isPrimary ? 'metric-card-primary' : 'metric-card'
                }`}
                style={{ padding: isPrimary ? '22px 22px 20px' : '20px 20px 18px' }}
              >
                {/* Subtle radial glow on hover */}
                <div className="pointer-events-none absolute inset-0 rounded-[20px] bg-gradient-to-br from-accent/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400" />

                {/* Top: label + icon */}
                <div className="relative flex items-start justify-between gap-3 mb-5">
                  <span className={`text-[10px] font-semibold uppercase tracking-[0.1em] ${isPrimary ? 'text-accent' : 'text-secondary'}`}>
                    {card.title}
                  </span>
                  <div className={`p-2.5 rounded-xl bg-gradient-to-br ${card.gradient} shadow-lg ${card.glow} shrink-0 transition-transform duration-220 group-hover:scale-105`}>
                    <Icon size={15} className="text-white" strokeWidth={2.2} />
                  </div>
                </div>

                {/* Value — primary card gets larger type, always single line */}
                <h3 className={`relative font-bold tracking-tight whitespace-nowrap overflow-hidden text-ellipsis leading-none ${
                  isPrimary ? 'text-[1.5rem]' : 'text-[1.3rem]'
                } ${
                  card.isReturn
                    ? (returnsPositive ? 'text-profit' : 'text-loss')
                    : 'text-primary'
                }`}>
                  {card.value}
                </h3>

                {/* Subtitle */}
                <p className={`relative mt-2.5 text-[11px] font-medium leading-none ${
                  card.isReturn
                    ? (returnsPositive ? 'text-profit' : 'text-loss')
                    : isPrimary ? 'text-accent/80' : 'text-secondary'
                }`}>
                  {card.subtitle}
                </p>

                {/* Primary card accent underline */}
                {isPrimary && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-accent/0 via-accent/40 to-accent/0 rounded-b-[20px]" />
                )}
              </Link>
            </motion.div>
          );
        })}
      </section>

      {/* ── Holdings table + Pie chart ───────────────────────────────────── */}
      <section className="grid grid-cols-1 xl:grid-cols-5 gap-5 items-stretch">

        {/* Holdings table */}
        <motion.div variants={cardVariants} className="xl:col-span-3 dash-card flex flex-col h-[420px] overflow-hidden">
          <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
            <div>
              <h2 className="text-[15px] font-semibold text-primary tracking-[-0.01em]">Top Holdings</h2>
              <p className="text-[11px] text-secondary mt-0.5">Your largest positions by value</p>
            </div>
            <Link
              to="/portfolio"
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-accent hover:text-accent-hover transition-colors duration-200 group"
            >
              View All
              <ArrowRight size={12} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>
          <div className="token-divider mx-6 shrink-0" />

          <div className="flex-1 overflow-y-auto scrollbar-on-hover min-h-0">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="sticky top-0 z-10 bg-card">
                  <th className="px-6 py-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-secondary">Asset</th>
                  <th className="px-3 py-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-secondary">Qty</th>
                  <th className="px-3 py-3.5 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-secondary">Avg Price</th>
                  <th className="px-3 py-3.5 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-secondary">Value</th>
                  <th className="px-6 py-3.5 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-secondary">Return</th>
                </tr>
                {/* Thead bottom border */}
                <tr aria-hidden className="h-px">
                  <td colSpan={5} className="p-0 bg-token" style={{ backgroundColor: 'var(--color-border)', height: '1px', opacity: 0.6 }} />
                </tr>
              </thead>
              <tbody>
                {displayHoldings.length > 0 ? (
                  displayHoldings.map((h, idx) => (
                    <tr
                      key={h.symbol}
                      className={`group transition-colors duration-150 ${idx < displayHoldings.length - 1 ? 'border-b border-token' : ''}`}
                      style={{ borderBottomColor: 'var(--color-border)', borderBottomWidth: idx < displayHoldings.length - 1 ? '1px' : '0' }}
                    >
                      <td
                        className="px-6 py-4 transition-colors duration-150"
                        style={{ backgroundColor: 'inherit' }}
                        onMouseEnter={(e) => e.currentTarget.closest('tr').style.backgroundColor = 'var(--color-row-hover)'}
                        onMouseLeave={(e) => e.currentTarget.closest('tr').style.backgroundColor = ''}
                      >
                        <span className="block text-[13px] font-semibold text-primary leading-tight">{h.symbol}</span>
                        <span className="block text-[10px] text-secondary font-normal mt-0.5 truncate max-w-[120px] leading-tight">{h.name}</span>
                        {h.assetType === 'REAL_ASSET' && (
                          <span className="inline-flex items-center mt-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                            {h.category === 'PRECIOUS_METALS' ? 'Metals'
                              : h.category === 'ENERGY' ? 'Energy'
                              : h.category === 'REAL_ESTATE' ? 'Real Estate'
                              : 'Real Asset'}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-4 text-[13px] text-secondary tabular-nums">
                        {h.quantity}
                        {h.unit && <span className="text-[10px] ml-0.5 opacity-70">{h.unit}</span>}
                      </td>
                      <td className="px-3 py-4 text-right text-[13px] text-secondary tabular-nums">
                        {formatCurrency(h.averageBuyPrice, currency, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-3 py-4 text-right text-[13px] font-medium text-primary tabular-nums">
                        {formatCurrency(h.currentValue, currency, { maximumFractionDigits: 0 })}
                      </td>
                      <td className={`px-6 py-4 text-right text-[13px] font-semibold tabular-nums ${h.profitLoss >= 0 ? 'text-profit' : 'text-loss'}`}>
                        {h.returnPercent >= 0 ? '+' : ''}{h.returnPercent.toFixed(1)}%
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-secondary text-xs">
                      No holdings yet. Buy assets from the Market page.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Pie chart */}
        <motion.div variants={cardVariants} className="xl:col-span-2 dash-card flex flex-col h-[420px]">
          <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-4 shrink-0">
            <div>
              <h2 className="text-[15px] font-semibold text-primary tracking-[-0.01em]">Asset Allocation</h2>
              <p className="text-[11px] text-secondary mt-0.5">Distribution of holdings</p>
            </div>
            <Link
              to="/analytics"
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-accent hover:text-accent-hover transition-colors duration-200 shrink-0 mt-0.5 group"
            >
              Detailed
              <ArrowRight size={12} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>
          <div className="token-divider mx-6 shrink-0" />

          <div className="flex-1 flex items-center justify-center min-h-0 px-4 pb-4 pt-2">
            {charts.distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                  <Pie
                    data={charts.distribution}
                    cx="50%" cy="46%"
                    innerRadius="40%" outerRadius="62%"
                    paddingAngle={2}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {charts.distribution.map((entry) => (
                      <Cell key={`cell-${entry.name}`} fill={getAssetColor(entry.name)} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipContentStyle}
                    labelStyle={tooltipLabelStyle}
                    itemStyle={tooltipItemStyle}
                    formatter={(value) => [`${value}%`, 'Allocation']}
                    cursor={false}
                  />
                  <Legend
                    layout="horizontal" align="center" verticalAlign="bottom"
                    iconType="circle" iconSize={7}
                    wrapperStyle={legendWrapperStyle}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-token mx-auto flex items-center justify-center">
                  <BriefcaseBusiness size={20} className="text-secondary opacity-40" />
                </div>
                <div>
                  <p className="text-sm font-medium text-secondary">No assets owned</p>
                  <p className="text-[11px] text-secondary/60 mt-0.5">Buy assets to see your allocation</p>
                </div>
                <Link
                  to="/market"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-semibold border border-accent/20 bg-accent/[0.07] text-accent hover:bg-accent/[0.12] transition-colors duration-200"
                >
                  Go to Market <ArrowRight size={11} />
                </Link>
              </div>
            )}
          </div>
        </motion.div>
      </section>

      {/* ── Portfolio Insights ───────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-baseline gap-2">
          <h2 className="text-[15px] font-semibold text-primary tracking-[-0.01em]">Portfolio Insights</h2>
          <span className="text-[11px] text-secondary">Today's summary</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {insightCards.map((item) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                variants={cardVariants}
                className="group dash-card p-5 flex flex-col justify-between min-h-[130px]"
              >
                {/* Top */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-secondary">
                    {item.title}
                  </span>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-220 group-hover:scale-105 ${
                    item.positive
                      ? 'bg-accent/10 text-accent'
                      : 'bg-loss/10 text-loss'
                  }`}>
                    <Icon size={13} strokeWidth={2.2} />
                  </div>
                </div>

                {/* Bottom */}
                <div>
                  <p className="text-[15px] font-semibold truncate text-primary leading-tight">{item.body}</p>
                  <span className={`text-[11px] font-medium block truncate mt-1.5 leading-tight ${
                    item.positive ? 'text-profit' : 'text-loss'
                  }`}>
                    {item.meta}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── Watchlist ────────────────────────────────────────────────────── */}
      <motion.div variants={cardVariants}>
        <WatchlistPanel height="340px" />
      </motion.div>

    </motion.div>
  );
};

export default Dashboard;
