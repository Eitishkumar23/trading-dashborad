import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, X, Loader2, ArrowDownCircle } from 'lucide-react';
import { useHoldings } from '../../hooks/useMarketData.js';
import { tradeAPI } from '../../services/api.js';
import { useQueryClient } from '@tanstack/react-query';

const Portfolio = () => {
  const { data: holdings = [], isLoading, refetch } = useHoldings();
  const [sellModal, setSellModal] = useState(null);
  const [sellQty, setSellQty] = useState('');
  const [sellLoading, setSellLoading] = useState(false);
  const [sellError, setSellError] = useState('');
  const [sellSuccess, setSellSuccess] = useState('');
  const queryClient = useQueryClient();

  const handleSell = async () => {
    const qty = parseFloat(sellQty);
    if (!qty || qty <= 0) { setSellError('Enter a valid quantity'); return; }
    if (qty > sellModal.quantity) { setSellError(`Max sellable: ${sellModal.quantity}`); return; }
    setSellLoading(true);
    setSellError('');
    try {
      await tradeAPI.sellAsset({ symbol: sellModal.symbol, quantity: qty, price: sellModal.currentPrice });
      setSellSuccess(`Successfully sold ${qty} ${sellModal.symbol}!`);
      queryClient.invalidateQueries(['dashboard']);
      queryClient.invalidateQueries(['holdings']);
      refetch();
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">My Portfolio</h1>
        <p className="text-sm text-light-muted dark:text-dark-muted">Active holdings with live P&L tracking</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Invested', value: `₹${totalInvested.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: 'bg-blue-500/10 text-blue-500' },
          { label: 'Current Value', value: `₹${totalCurrentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: 'bg-brand-500/10 text-brand-500' },
          { label: 'Total P&L', value: `${totalPL >= 0 ? '+' : ''}₹${totalPL.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: totalPL >= 0 ? 'bg-brand-500/10 text-brand-500' : 'bg-danger-500/10 text-danger-500' },
          { label: 'Total Return', value: `${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}%`, color: totalReturn >= 0 ? 'bg-brand-500/10 text-brand-500' : 'bg-danger-500/10 text-danger-500' },
        ].map((c) => (
          <div key={c.label} className="glass-panel p-5 rounded-3xl border border-slate-200/50 dark:border-dark-border">
            <p className="text-xs text-light-muted dark:text-dark-muted font-medium mb-2">{c.label}</p>
            <p className={`text-base font-extrabold px-2.5 py-1 rounded-lg inline-block ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Holdings Table */}
      <div className="glass-panel rounded-3xl border border-slate-200/50 dark:border-dark-border overflow-hidden">
        <div className="p-5 border-b border-slate-200/50 dark:border-slate-800/50">
          <h2 className="text-lg font-bold">Holdings ({holdings.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-xs uppercase font-bold text-light-muted dark:text-dark-muted bg-slate-50/50 dark:bg-slate-900/20">
                <th className="px-6 py-4 text-left">Asset</th>
                <th className="px-6 py-4 text-right">Qty</th>
                <th className="px-6 py-4 text-right">Avg Buy Price</th>
                <th className="px-6 py-4 text-right">Current Price</th>
                <th className="px-6 py-4 text-right">Invested</th>
                <th className="px-6 py-4 text-right">Current Value</th>
                <th className="px-6 py-4 text-right">P&L</th>
                <th className="px-6 py-4 text-right">Return %</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i} className="border-b border-slate-100/50 dark:border-slate-800/20">
                    {[...Array(9)].map((__, j) => <td key={j} className="px-6 py-4"><div className="h-4 skeleton rounded" /></td>)}
                  </tr>
                ))
              ) : holdings.length === 0 ? (
                <tr><td colSpan={9} className="py-16 text-center text-sm text-light-muted dark:text-dark-muted italic">No holdings yet. Buy assets from the Market page.</td></tr>
              ) : (
                holdings.map((h) => (
                  <tr key={h._id} className="border-b border-slate-100/50 dark:border-slate-800/15 hover:bg-slate-50 dark:hover:bg-slate-800/15 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold">{h.symbol}</p>
                        <p className="text-xs text-light-muted dark:text-dark-muted">{h.name}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${h.assetType === 'CRYPTO' ? 'bg-purple-500/10 text-purple-500' : 'bg-blue-500/10 text-blue-500'}`}>{h.assetType}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold">{h.quantity}</td>
                    <td className="px-6 py-4 text-right">₹{h.averageBuyPrice.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right font-semibold">
                      <div className="flex flex-col items-end">
                        <span>₹{h.currentPrice.toLocaleString()}</span>
                        <span className={`text-[10px] font-bold ${h.change >= 0 ? 'text-brand-500' : 'text-danger-500'}`}>{h.change >= 0 ? '+' : ''}{h.change}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">₹{h.investmentAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    <td className="px-6 py-4 text-right font-semibold">₹{h.currentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    <td className={`px-6 py-4 text-right font-bold ${h.profitLoss >= 0 ? 'text-brand-500' : 'text-danger-500'}`}>
                      {h.profitLoss >= 0 ? '+' : ''}₹{h.profitLoss.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className={`px-6 py-4 text-right font-extrabold ${h.returnPercent >= 0 ? 'text-brand-500' : 'text-danger-500'}`}>
                      {h.returnPercent >= 0 ? '+' : ''}{h.returnPercent.toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => { setSellModal(h); setSellQty(''); setSellError(''); setSellSuccess(''); }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-danger-500/10 hover:bg-danger-500 hover:text-white text-danger-500 rounded-xl text-xs font-bold border border-danger-500/20 hover:border-danger-500 transition-all duration-200 mx-auto"
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

      {/* Sell Modal */}
      <AnimatePresence>
        {sellModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black z-40" onClick={() => setSellModal(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-lg font-extrabold text-danger-500">Sell {sellModal.symbol}</h3>
                    <p className="text-xs text-light-muted dark:text-dark-muted">{sellModal.name} — You own {sellModal.quantity}</p>
                  </div>
                  <button onClick={() => setSellModal(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"><X size={18} /></button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    { label: 'Avg Buy Price', val: `₹${sellModal.averageBuyPrice.toLocaleString()}` },
                    { label: 'Current Price', val: `₹${sellModal.currentPrice.toLocaleString()}` },
                    { label: 'Unrealized P&L', val: `${sellModal.profitLoss >= 0 ? '+' : ''}₹${sellModal.profitLoss.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: sellModal.profitLoss >= 0 ? 'text-brand-500' : 'text-danger-500' },
                    { label: 'Total Holdings', val: sellModal.quantity },
                  ].map((item) => (
                    <div key={item.label} className="p-3 bg-slate-100/50 dark:bg-slate-950 rounded-xl">
                      <p className="text-xs text-light-muted dark:text-dark-muted">{item.label}</p>
                      <p className={`font-bold mt-0.5 ${item.color || ''}`}>{item.val}</p>
                    </div>
                  ))}
                </div>

                {sellSuccess ? (
                  <div className="p-4 bg-brand-500/10 border border-brand-500/30 rounded-2xl text-brand-500 font-bold text-sm text-center">{sellSuccess}</div>
                ) : (
                  <>
                    <label className="block text-xs font-bold uppercase text-light-muted dark:text-dark-muted mb-1.5">Quantity to Sell (Max: {sellModal.quantity})</label>
                    <input
                      type="number"
                      min="0"
                      max={sellModal.quantity}
                      step="any"
                      value={sellQty}
                      onChange={(e) => setSellQty(e.target.value)}
                      placeholder={`0 – ${sellModal.quantity}`}
                      className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-4 text-sm font-semibold focus:border-danger-500 outline-none transition-colors mb-4"
                    />
                    {sellQty && !isNaN(parseFloat(sellQty)) && (
                      <div className="flex justify-between text-sm mb-4 p-3 bg-slate-100/50 dark:bg-slate-950/40 rounded-xl border border-slate-200/50 dark:border-slate-800/30">
                        <span className="text-light-muted dark:text-dark-muted">Expected Proceeds</span>
                        <span className="font-extrabold text-brand-500">₹{(parseFloat(sellQty) * sellModal.currentPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {sellError && <div className="mb-4 p-3 bg-danger-500/10 border border-danger-500/20 rounded-xl text-danger-500 text-xs font-semibold">{sellError}</div>}
                    <button
                      onClick={handleSell}
                      disabled={sellLoading || !sellQty}
                      className="w-full py-3 bg-danger-500 hover:bg-danger-600 disabled:opacity-60 text-white rounded-2xl font-extrabold transition-all flex items-center justify-center gap-2"
                    >
                      {sellLoading ? <Loader2 size={18} className="animate-spin" /> : <><ArrowDownCircle size={16} /><span>Confirm Sell</span></>}
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
