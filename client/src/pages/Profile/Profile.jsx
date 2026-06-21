import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Star, Trash2, Plus, X, Loader2, BellOff, BellRing } from 'lucide-react';
import { useWatchlist, useAlerts } from '../../hooks/useMarketData.js';
import { marketAPI } from '../../services/api.js';
import { useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';

const Profile = () => {
  const { user } = useSelector((s) => s.auth);
  const { data: watchlist = [], refetch: refetchWatchlist } = useWatchlist();
  const { data: alerts = [], refetch: refetchAlerts } = useAlerts();
  const queryClient = useQueryClient();

  const [alertLoading, setAlertLoading] = useState(false);
  const [alertSuccess, setAlertSuccess] = useState('');
  const [showAlertForm, setShowAlertForm] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const handleRemoveWatchlist = async (symbol) => {
    await marketAPI.removeFromWatchlist(symbol);
    refetchWatchlist();
  };

  const handleDeleteAlert = async (id) => {
    await marketAPI.deleteAlert(id);
    refetchAlerts();
  };

  const onCreateAlert = async (data) => {
    setAlertLoading(true);
    setAlertSuccess('');
    try {
      await marketAPI.createAlert({ symbol: data.symbol.toUpperCase(), condition: data.condition, value: parseFloat(data.value) });
      setAlertSuccess(`Alert created: ${data.symbol.toUpperCase()} ${data.condition} ₹${data.value}`);
      reset();
      setShowAlertForm(false);
      refetchAlerts();
    } catch (err) {
      console.error(err);
    } finally {
      setAlertLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Profile & Alerts</h1>
        <p className="text-sm text-light-muted dark:text-dark-muted">Manage watchlist, price alerts, and account</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-200/50 dark:border-dark-border">
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-500 to-emerald-600 text-white flex items-center justify-center text-3xl font-extrabold mb-4 shadow-xl shadow-brand-500/20">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <h2 className="text-xl font-extrabold">{user?.name}</h2>
            <p className="text-sm text-light-muted dark:text-dark-muted mt-1">{user?.email}</p>
            <div className="mt-4 w-full p-4 bg-slate-100/50 dark:bg-slate-900/30 rounded-2xl text-left text-xs space-y-3">
              <div className="flex justify-between">
                <span className="text-light-muted dark:text-dark-muted font-medium">Account Type</span>
                <span className="font-bold text-brand-500">Paper Trader</span>
              </div>
              <div className="flex justify-between">
                <span className="text-light-muted dark:text-dark-muted font-medium">Watchlist Items</span>
                <span className="font-bold">{watchlist.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-light-muted dark:text-dark-muted font-medium">Active Alerts</span>
                <span className="font-bold">{alerts.filter(a => !a.isTriggered).length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Watchlist */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-200/50 dark:border-dark-border">
          <div className="flex items-center gap-2 mb-5">
            <Star size={18} className="text-amber-500" />
            <h2 className="font-bold text-base">Watchlist ({watchlist.length})</h2>
          </div>
          <div className="space-y-3">
            {watchlist.length === 0 ? (
              <p className="text-xs text-light-muted dark:text-dark-muted italic py-8 text-center">No symbols in watchlist. Star assets from the Market page.</p>
            ) : (
              watchlist.map((item) => (
                <div key={item.symbol} className="flex items-center justify-between p-3.5 bg-slate-100/50 dark:bg-slate-900/30 rounded-2xl border border-slate-200/30 dark:border-slate-800/30">
                  <div>
                    <p className="font-bold text-sm">{item.symbol}</p>
                    {item.live && (
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-semibold">₹{item.live.price.toLocaleString()}</span>
                        <span className={`text-[10px] font-bold ${item.live.change >= 0 ? 'text-brand-500' : 'text-danger-500'}`}>
                          {item.live.change >= 0 ? '+' : ''}{item.live.change}%
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-lg font-bold ${item.assetType === 'CRYPTO' ? 'bg-purple-500/10 text-purple-500' : 'bg-blue-500/10 text-blue-500'}`}>{item.assetType}</span>
                    <button onClick={() => handleRemoveWatchlist(item.symbol)} className="p-1.5 text-danger-500 hover:bg-danger-500/10 rounded-lg transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Price Alerts */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-200/50 dark:border-dark-border flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-brand-500" />
              <h2 className="font-bold text-base">Price Alerts ({alerts.length})</h2>
            </div>
            <button
              onClick={() => setShowAlertForm(!showAlertForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500/10 hover:bg-brand-500/20 text-brand-500 rounded-xl text-xs font-bold transition-all"
            >
              <Plus size={14} />
              <span>Add Alert</span>
            </button>
          </div>

          {/* Alert creation form */}
          <AnimatePresence>
            {showAlertForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <form onSubmit={handleSubmit(onCreateAlert)} className="p-4 bg-slate-100/50 dark:bg-slate-900/30 rounded-2xl border border-slate-200/30 dark:border-slate-800/30 mb-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-light-muted dark:text-dark-muted">Symbol</label>
                      <input
                        {...register('symbol', { required: true })}
                        placeholder="BTC, AAPL..."
                        className="w-full mt-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs font-semibold outline-none focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-light-muted dark:text-dark-muted">Condition</label>
                      <select
                        {...register('condition', { required: true })}
                        className="w-full mt-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs font-semibold outline-none focus:border-brand-500"
                      >
                        <option value="ABOVE">Price Goes Above</option>
                        <option value="BELOW">Price Goes Below</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-light-muted dark:text-dark-muted">Target Price (₹)</label>
                    <input
                      {...register('value', { required: true, min: 0.01 })}
                      type="number"
                      placeholder="e.g. 6500000"
                      className="w-full mt-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs font-semibold outline-none focus:border-brand-500"
                    />
                  </div>
                  <button type="submit" disabled={alertLoading} className="w-full py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors">
                    {alertLoading ? <Loader2 size={14} className="animate-spin" /> : <><Bell size={13} /><span>Set Alert</span></>}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {alertSuccess && (
            <div className="mb-3 p-3 bg-brand-500/10 border border-brand-500/20 rounded-xl text-brand-500 text-xs font-semibold">{alertSuccess}</div>
          )}

          <div className="space-y-3 flex-1 overflow-y-auto">
            {alerts.length === 0 ? (
              <p className="text-xs text-light-muted dark:text-dark-muted italic py-8 text-center">No alerts configured. Click "Add Alert" to set a price target.</p>
            ) : (
              alerts.map((alert) => (
                <div key={alert._id} className={`flex items-center justify-between p-3.5 rounded-2xl border ${alert.isTriggered ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-100/50 dark:bg-slate-900/30 border-slate-200/30 dark:border-slate-800/30'}`}>
                  <div className="flex items-center gap-3">
                    {alert.isTriggered ? (
                      <BellRing size={16} className="text-amber-500 animate-bounce" />
                    ) : (
                      <BellOff size={16} className="text-light-muted dark:text-dark-muted" />
                    )}
                    <div>
                      <p className="font-bold text-sm">{alert.symbol} <span className={`text-[10px] font-bold ml-1 ${alert.condition === 'ABOVE' ? 'text-brand-500' : 'text-danger-500'}`}>{alert.condition}</span></p>
                      <p className="text-xs text-light-muted dark:text-dark-muted">
                        Target: ₹{alert.value.toLocaleString()} | Now: ₹{alert.currentPrice?.toLocaleString() || '—'}
                      </p>
                      {alert.isTriggered && <p className="text-[10px] font-bold text-amber-500 mt-0.5">⚡ Alert Triggered!</p>}
                    </div>
                  </div>
                  <button onClick={() => handleDeleteAlert(alert._id)} className="p-1.5 text-danger-500 hover:bg-danger-500/10 rounded-lg transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Profile;
