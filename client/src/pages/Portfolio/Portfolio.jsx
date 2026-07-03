import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, X, Loader2, ArrowDownCircle } from 'lucide-react';
import { useHoldings } from '../../hooks/useMarketData.js';
import { tradeAPI } from '../../services/api.js';
import { useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import ThemedNumberInput from '../../components/ThemedNumberInput.jsx';
import { useMaintenance } from '../../context/MaintenanceContext.jsx';
import { formatCurrency } from '../../utils/currencyUtils.js';
import { sellAssetOnChain } from '../../blockchain/services/blockchainService';

// Badge config for all asset types
const getAssetTypeBadge = (assetType, category) => {
  if (assetType === 'CRYPTO') return 'bg-purple-500/10 text-purple-500';
  if (assetType === 'STOCK') return 'bg-blue-500/10 text-blue-500';
  if (assetType === 'REAL_ASSET') {
    if (category === 'PRECIOUS_METALS') return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400';
    if (category === 'ENERGY') return 'bg-orange-500/10 text-orange-500';
    if (category === 'REAL_ESTATE') return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    return 'bg-amber-500/10 text-amber-600';
  }
  return 'bg-slate-500/10 text-slate-500';
};

const getAssetTypeLabel = (assetType, category) => {
  if (assetType === 'CRYPTO') return 'CRYPTO';
  if (assetType === 'STOCK') return 'STOCK';
  if (assetType === 'REAL_ASSET') {
    if (category === 'PRECIOUS_METALS') return 'Metals';
    if (category === 'ENERGY') return 'Energy';
    if (category === 'REAL_ESTATE') return 'Real Estate';
    return 'Real Asset';
  }
  return assetType;
};

// Step size for sell modal input — allow decimal increments
const getSellStep = () => 0.01;

const Portfolio = () => {
  const { data: holdings = [], isLoading, refetch } = useHoldings();
  const [sellModal, setSellModal] = useState(null);
  const [sellQty, setSellQty] = useState('');
  const [sellLoading, setSellLoading] = useState(false);
  const [sellError, setSellError] = useState('');
  const [sellSuccess, setSellSuccess] = useState('');
  const [blockchainMsg, setBlockchainMsg] = useState('');
  const queryClient = useQueryClient();
  const { maintenanceMode, message: maintenanceMessage } = useMaintenance();
  const { preferred: currency } = useSelector((state) => state.currency);

  const handleSell = async () => {
    if (maintenanceMode) {
      setSellError(maintenanceMessage);
      return;
    }

    const qty = parseFloat(sellQty);
    if (!qty || qty <= 0) {
      setSellError('Enter a valid quantity');
      return;
    }
    if (qty > sellModal.quantity) {
      setSellError(`Max sellable: ${sellModal.quantity}`);
      return;
    }
    setSellLoading(true);
    setSellError('');
    setBlockchainMsg('');
    try {
      // ── Step 1: Web2 trade (source of truth — must succeed) ──────────
      await tradeAPI.sellAsset({ symbol: sellModal.symbol, quantity: qty, price: sellModal.currentPrice });

      // ── Step 2: Show success immediately (Web2 done) ─────────────────
      setSellSuccess(`Successfully sold ${qty} ${sellModal.symbol}!`);
      queryClient.invalidateQueries(['dashboard']);
      queryClient.invalidateQueries(['holdings']);
      refetch();

      // ── Step 3: Blockchain (best-effort, only if wallet connected) ───
      const wasDisconnected = localStorage.getItem("walletDisconnected") === "true";

      if (!wasDisconnected) {
        const chainResult = await sellAssetOnChain(
          sellModal.symbol,
          qty,
          sellModal.currentPrice
        );

        if (chainResult.success) {
          setBlockchainMsg(`⛓️ On-chain recorded! Tx: ${chainResult.txHash.slice(0, 18)}...`);
        } else {
          setBlockchainMsg(`⚠️ On-chain skipped: ${chainResult.error}`);
        }
      }
      // walletDisconnected = true → blockchain silently skipped, no popup

      setTimeout(() => setSellModal(null), 1800);
    } catch (err) {
      setSellError(err.response?.data?.message || 'Sale failed.');
    } finally {
      setSellLoading(false);
    }
  };

  const totalInvested = holdings.reduce((s, h) => s + h.investmentAmount, 0);
  const totalCurrentValue = holdings.reduce((s, h) => s + h.currentValue, 0);
  const totalPL = totalCurrentValue - totalInvested;
  const totalReturn = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-12 overflow-x-hidden">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">My Portfolio</h1>
        <p className="text-sm text-light-muted dark:text-dark-muted">Active holdings with live P&L tracking</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Invested',
            value: formatCurrency(totalInvested, currency, { maximumFractionDigits: 0 }),
            lightColor: 'bg-blue-500/10 text-blue-500',
            darkAccent: 'text-blue-400',
            gradient: 'from-blue-500 to-indigo-600',
            glow: 'shadow-blue-500/30',
            radial: 'rgba(59,130,246,0.12)',
          },
          {
            label: 'Current Value',
            value: formatCurrency(totalCurrentValue, currency, { maximumFractionDigits: 0 }),
            lightColor: 'bg-brand-500/10 text-brand-500',
            darkAccent: 'text-emerald-400',
            gradient: 'from-emerald-500 to-teal-500',
            glow: 'shadow-emerald-500/30',
            radial: 'rgba(16,185,129,0.12)',
          },
          {
            label: 'Total P&L',
            value: `${totalPL >= 0 ? '+' : ''}${formatCurrency(totalPL, currency, { maximumFractionDigits: 0 })}`,
            lightColor: totalPL >= 0 ? 'bg-brand-500/10 text-brand-500' : 'bg-danger-500/10 text-danger-500',
            darkAccent: totalPL >= 0 ? 'text-emerald-400' : 'text-rose-400',
            gradient: totalPL >= 0 ? 'from-emerald-500 to-green-500' : 'from-rose-500 to-red-600',
            glow: totalPL >= 0 ? 'shadow-emerald-500/25' : 'shadow-rose-500/25',
            radial: totalPL >= 0 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
          },
          {
            label: 'Total Return',
            value: `${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}%`,
            lightColor: totalReturn >= 0 ? 'bg-brand-500/10 text-brand-500' : 'bg-danger-500/10 text-danger-500',
            darkAccent: totalReturn >= 0 ? 'text-cyan-400' : 'text-rose-400',
            gradient: totalReturn >= 0 ? 'from-cyan-500 to-blue-500' : 'from-rose-500 to-red-600',
            glow: totalReturn >= 0 ? 'shadow-cyan-500/25' : 'shadow-rose-500/25',
            radial: totalReturn >= 0 ? 'rgba(6,182,212,0.12)' : 'rgba(239,68,68,0.12)',
          },
        ].map((c) => (
          <div
            key={c.label}
            className="pf-stat-card glass-panel p-5 rounded-3xl border border-slate-200/50 dark:border-dark-border"
            style={{ '--pf-radial': c.radial }}
          >
            {/* Dark mode: gradient icon chip */}
            <div className="hidden dark:flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-secondary">{c.label}</p>
              <div className={`p-2 rounded-xl bg-gradient-to-br ${c.gradient} shadow-lg ${c.glow} shrink-0`} />
            </div>
            {/* Light mode label */}
            <p className="dark:hidden text-xs text-light-muted font-medium mb-2">{c.label}</p>

            <p className={`text-base font-extrabold dark:hidden px-2.5 py-1 rounded-lg inline-block ${c.lightColor}`}>{c.value}</p>
            <p className={`hidden dark:block text-xl font-extrabold tracking-tight ${c.darkAccent}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="pf-table-wrap glass-panel rounded-3xl border border-slate-200/50 dark:border-dark-border overflow-hidden">
        <div className="pf-table-header-bar p-5 border-b border-slate-200/50 dark:border-slate-800/50">
          <h2 className="text-lg font-bold">Holdings ({holdings.length})</h2>
        </div>
        <div className="overflow-x-hidden">
          <table className="w-full table-fixed text-sm border-collapse">
            <thead>
              <tr className="pf-thead-row text-xs uppercase font-bold text-light-muted dark:text-dark-muted bg-slate-50/50 dark:bg-slate-900/20">
                <th className="px-4 py-4 text-left w-[17%]">Asset</th>
                <th className="px-3 py-4 text-right w-[7%]">Qty</th>
                <th className="px-3 py-4 text-right w-[12%]">Avg Buy Price</th>
                <th className="px-3 py-4 text-right w-[12%]">Current Price</th>
                <th className="px-3 py-4 text-right w-[11%]">Invested</th>
                <th className="px-3 py-4 text-right w-[12%]">Current Value</th>
                <th className="px-3 py-4 text-right w-[10%]">P&L</th>
                <th className="px-3 py-4 text-right w-[9%]">Return %</th>
                <th className="px-3 py-4 text-center w-[10%]">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i} className="border-b border-slate-100/50 dark:border-slate-800/20">
                    {[...Array(9)].map((__, j) => <td key={j} className="px-4 py-4"><div className="h-4 skeleton rounded" /></td>)}
                  </tr>
                ))
              ) : holdings.length === 0 ? (
                <tr><td colSpan={9} className="py-16 text-center text-sm text-light-muted dark:text-dark-muted italic">No holdings yet. Buy assets from the Market page.</td></tr>
              ) : (
                holdings.map((h) => (
                  <tr key={h._id} className="pf-data-row border-b border-slate-100/50 dark:border-slate-800/15 hover:bg-slate-50 dark:hover:bg-slate-800/15 transition-colors">
                    <td className="px-4 py-4">
                      <div className="min-w-0">
                        <p className="font-bold truncate">{h.symbol}</p>
                        <p className="text-xs text-light-muted dark:text-dark-muted truncate">{h.name}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${getAssetTypeBadge(h.assetType, h.category)}`}>
                          {getAssetTypeLabel(h.assetType, h.category)}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-right font-semibold">
                      {h.quantity}
                      {h.unit && <span className="text-[10px] text-light-muted dark:text-dark-muted ml-1">{h.unit}</span>}
                    </td>
                    <td className="px-3 py-4 text-right truncate">{formatCurrency(h.averageBuyPrice, currency, { maximumFractionDigits: 2 })}</td>
                    <td className="px-3 py-4 text-right font-semibold">
                      <div className="flex flex-col items-end">
                        <span className="truncate">{formatCurrency(h.currentPrice, currency, { maximumFractionDigits: 2 })}</span>
                        <span className={`text-[10px] font-bold ${h.change >= 0 ? 'text-brand-500' : 'text-danger-500'}`}>{h.change >= 0 ? '+' : ''}{h.change}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-right truncate">{formatCurrency(h.investmentAmount, currency, { maximumFractionDigits: 0 })}</td>
                    <td className="px-3 py-4 text-right font-semibold truncate">{formatCurrency(h.currentValue, currency, { maximumFractionDigits: 0 })}</td>
                    <td className={`px-3 py-4 text-right font-bold truncate ${h.profitLoss >= 0 ? 'text-brand-500' : 'text-danger-500'}`}>
                      {h.profitLoss >= 0 ? '+' : ''}{formatCurrency(h.profitLoss, currency, { maximumFractionDigits: 0 })}
                    </td>
                    <td className={`px-3 py-4 text-right font-extrabold ${h.returnPercent >= 0 ? 'text-brand-500' : 'text-danger-500'}`}>
                      {h.returnPercent >= 0 ? '+' : ''}{h.returnPercent.toFixed(2)}%
                    </td>
                    <td className="px-3 py-4 text-center">
                      <button
                        onClick={() => { setSellModal(h); setSellQty('1'); setSellError(''); setSellSuccess(''); }}
                        disabled={maintenanceMode}
                        title={maintenanceMode ? maintenanceMessage : undefined}
                        className="pf-sell-btn flex items-center gap-1 px-3 py-1.5 bg-danger-500/10 hover:bg-danger-500 hover:text-white text-danger-500 rounded-xl text-xs font-bold border border-danger-500/20 hover:border-danger-500 transition-all duration-200 mx-auto whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-danger-500/10 disabled:hover:text-danger-500"
                      >
                        <ArrowDownCircle size={12} /><span>Sell</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {sellModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black z-40" onClick={() => setSellModal(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="pf-modal-card w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-lg font-extrabold text-danger-500">Sell {sellModal.symbol}</h3>
                    <p className="text-xs text-light-muted dark:text-dark-muted">{sellModal.name} — You own {sellModal.quantity}{sellModal.unit ? ' ' + sellModal.unit + 's' : ''}</p>
                  </div>
                  <button onClick={() => setSellModal(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"><X size={18} /></button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    { label: 'Avg Buy Price', val: formatCurrency(sellModal.averageBuyPrice, currency, { maximumFractionDigits: 2 }) },
                    { label: 'Current Price', val: formatCurrency(sellModal.currentPrice, currency, { maximumFractionDigits: 2 }) },
                    { label: 'Unrealized P&L', val: `${sellModal.profitLoss >= 0 ? '+' : ''}${formatCurrency(sellModal.profitLoss, currency, { maximumFractionDigits: 0 })}`, color: sellModal.profitLoss >= 0 ? 'text-brand-500' : 'text-danger-500' },
                    { label: 'Total Holdings', val: sellModal.quantity },
                  ].map((item) => (
                    <div key={item.label} className="pf-modal-info-cell p-3 bg-slate-100/50 dark:bg-slate-950 rounded-xl">
                      <p className="text-xs text-light-muted dark:text-dark-muted">{item.label}</p>
                      <p className={`font-bold mt-0.5 ${item.color || ''}`}>{item.val}</p>
                    </div>
                  ))}
                </div>

                {sellSuccess ? (
                  <div className="p-4 bg-brand-500/10 border border-brand-500/30 rounded-2xl text-brand-500 font-bold text-sm text-center">
                    {sellSuccess}
                    {blockchainMsg && (
                      <p className="mt-2 text-xs font-medium text-light-muted dark:text-dark-muted">{blockchainMsg}</p>
                    )}
                  </div>
                ) : (
                  <>
                    <label className="block text-xs font-bold uppercase text-light-muted dark:text-dark-muted mb-1.5">Quantity to Sell (Max: {sellModal.quantity}{sellModal.unit ? ' ' + sellModal.unit + 's' : ''})</label>
                    <input
                      type="number"
                      value={sellQty}
                      min={0.000001}
                      max={sellModal.quantity}
                      step="any"
                      inputMode="decimal"
                      placeholder={`0.01 - ${sellModal.quantity}${sellModal.unit ? ' ' + sellModal.unit + 's' : ''}`}
                      onChange={(e) => setSellQty(e.target.value)}
                      onKeyDown={(e) => ['e', 'E', '+'].includes(e.key) && e.preventDefault()}
                      className="no-spinner mb-4 w-full rounded-2xl border py-3 pl-4 pr-4 text-sm font-semibold outline-none transition-all duration-200
                        border-slate-200/80 bg-white/90 text-slate-900 placeholder:text-slate-400 hover:border-slate-300
                        focus:border-danger-500 focus:ring-4 focus:ring-danger-500/10
                        focus:shadow-[0_0_0_1px_rgba(239,68,68,0.2),0_0_0_6px_rgba(239,68,68,0.08)]
                        dark:border-slate-800 dark:bg-slate-950/90 dark:text-slate-100 dark:placeholder:text-slate-500
                        dark:hover:border-slate-700 dark:focus:border-danger-500"
                    />
                    {sellQty && !Number.isNaN(parseFloat(sellQty)) && (
                      <div className="flex justify-between text-sm mb-4 p-3 bg-slate-100/50 dark:bg-slate-950/40 rounded-xl border border-slate-200/50 dark:border-slate-800/30">
                        <span className="text-light-muted dark:text-dark-muted">Expected Proceeds</span>
                        <span className="font-extrabold text-brand-500">
                          {formatCurrency(parseFloat(sellQty) * sellModal.currentPrice, currency, { maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    {sellError && <div className="mb-4 p-3 bg-danger-500/10 border border-danger-500/20 rounded-xl text-danger-500 text-xs font-semibold">{sellError}</div>}
                    <button
                      onClick={handleSell}
                      disabled={maintenanceMode || sellLoading || !sellQty}
                      title={maintenanceMode ? maintenanceMessage : undefined}
                      className="pf-modal-confirm-btn w-full py-3 bg-danger-500 hover:bg-danger-600 disabled:opacity-60 text-white rounded-2xl font-extrabold transition-all flex items-center justify-center gap-2"
                    >
                      {maintenanceMode ? <span>Selling Unavailable</span> : sellLoading ? <Loader2 size={18} className="animate-spin" /> : <><ArrowDownCircle size={16} /><span>Confirm Sell</span></>}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Portfolio;
