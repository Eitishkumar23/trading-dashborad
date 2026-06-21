import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
} from 'recharts';
import { useDashboard } from '../../hooks/useMarketData.js';
import { TrendingUp, TrendingDown, PieChart as PieIcon, BarChart3, LineChart as LineIcon } from 'lucide-react';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e'];

const Analytics = () => {
  const { data, isLoading } = useDashboard();
  const [growthPeriod, setGrowthPeriod] = useState('7D');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 skeleton rounded-xl bg-slate-200 dark:bg-slate-800/50" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1,2,3,4].map(n => <div key={n} className="h-80 skeleton rounded-3xl bg-slate-200 dark:bg-slate-800/50" />)}
        </div>
      </div>
    );
  }

  const { charts, metrics } = data || { charts: {}, metrics: {} };
  const { distribution = [], allocation = [], profitByAsset = [], growth = [] } = charts;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 text-xs shadow-xl">
          <p className="text-slate-400 mb-1">{label}</p>
          {payload.map((p, i) => (
            <p key={i} className="font-bold" style={{ color: p.color || '#10b981' }}>
              {p.name}: {typeof p.value === 'number' && p.name !== 'value' ? `${p.value}%` : `₹${Number(p.value).toLocaleString()}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Analytics</h1>
        <p className="text-sm text-light-muted dark:text-dark-muted">Visual portfolio analysis with live data</p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Net Worth', val: `₹${(metrics.netWorth || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, positive: true },
          { label: 'Portfolio Value', val: `₹${(metrics.currentPortfolioValue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, positive: true },
          { label: 'Total Return', val: `${(metrics.totalReturnPercent || 0) >= 0 ? '+' : ''}${(metrics.totalReturnPercent || 0).toFixed(2)}%`, positive: (metrics.totalReturnPercent || 0) >= 0 },
          { label: "Today's P&L", val: `${(metrics.todayProfitLoss || 0) >= 0 ? '+' : ''}₹${(metrics.todayProfitLoss || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, positive: (metrics.todayProfitLoss || 0) >= 0 },
        ].map((c) => (
          <div key={c.label} className="glass-panel p-5 rounded-3xl border border-slate-200/50 dark:border-dark-border">
            <p className="text-xs text-light-muted dark:text-dark-muted font-medium mb-2">{c.label}</p>
            <p className={`font-extrabold text-sm ${c.positive ? 'text-brand-500' : 'text-danger-500'}`}>{c.val}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Portfolio Distribution Pie Chart */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-200/50 dark:border-dark-border">
          <div className="flex items-center gap-2 mb-5">
            <div className="p-2 bg-brand-500/10 text-brand-500 rounded-xl"><PieIcon size={18} /></div>
            <div>
              <h2 className="font-bold text-base">Portfolio Distribution</h2>
              <p className="text-xs text-light-muted dark:text-dark-muted">Allocation % by asset</p>
            </div>
          </div>
          {distribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={distribution} cx="50%" cy="50%" innerRadius={70} outerRadius={95} paddingAngle={3} dataKey="value">
                  {distribution.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-sm text-light-muted dark:text-dark-muted italic">Buy assets to see distribution</div>
          )}
        </div>

        {/* Portfolio Growth Line Chart */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-200/50 dark:border-dark-border">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl"><LineIcon size={18} /></div>
              <div>
                <h2 className="font-bold text-base">Net Worth Growth</h2>
                <p className="text-xs text-light-muted dark:text-dark-muted">Portfolio + Wallet over time</p>
              </div>
            </div>
            <div className="flex gap-1">
              {['7D', '1M', '1Y'].map(p => (
                <button key={p} onClick={() => setGrowthPeriod(p)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${growthPeriod === p ? 'bg-blue-500 text-white' : 'text-light-muted dark:text-dark-muted hover:bg-slate-200/50 dark:hover:bg-slate-800/40'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          {growth.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={growth} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="value" name="Net Worth" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-sm text-light-muted dark:text-dark-muted italic">Add funds and buy assets to see growth</div>
          )}
        </div>

        {/* Asset Allocation Bar */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-200/50 dark:border-dark-border">
          <div className="flex items-center gap-2 mb-5">
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl"><BarChart3 size={18} /></div>
            <div>
              <h2 className="font-bold text-base">Asset Class Allocation</h2>
              <p className="text-xs text-light-muted dark:text-dark-muted">Stocks vs Cryptocurrencies</p>
            </div>
          </div>
          {allocation.some(a => a.amount > 0) ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={allocation} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => `${v}%`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Allocation" radius={[8, 8, 0, 0]}>
                  {allocation.map((_, i) => <Cell key={i} fill={i === 0 ? '#3b82f6' : '#8b5cf6'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-sm text-light-muted dark:text-dark-muted italic">No holdings to display</div>
          )}
        </div>

        {/* Profit by Asset Horizontal Bar */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-200/50 dark:border-dark-border">
          <div className="flex items-center gap-2 mb-5">
            <div className="p-2 bg-purple-500/10 text-purple-500 rounded-xl"><BarChart3 size={18} /></div>
            <div>
              <h2 className="font-bold text-base">Unrealized P&L by Asset</h2>
              <p className="text-xs text-light-muted dark:text-dark-muted">Green = profit, Red = loss</p>
            </div>
          </div>
          {profitByAsset.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={profitByAsset} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => `₹${(v/1000).toFixed(1)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} width={50} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="profit" name="P&L" radius={[0, 8, 8, 0]}>
                  {profitByAsset.map((entry, i) => <Cell key={i} fill={entry.profit >= 0 ? '#10b981' : '#f43f5e'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-sm text-light-muted dark:text-dark-muted italic">No holdings to display</div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default Analytics;
