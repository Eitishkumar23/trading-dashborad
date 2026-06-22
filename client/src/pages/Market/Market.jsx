import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, TrendingUp, TrendingDown, Flame, Plus, X, ShoppingCart, Star, StarOff, Loader2 } from 'lucide-react';
import { useMarkets, useMarketOverview, useWatchlist } from '../../hooks/useMarketData.js';
import { marketAPI, tradeAPI, walletAPI } from '../../services/api.js';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';

const Market = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [buyModal, setBuyModal] = useState(null);
  const [buyQuantity, setBuyQuantity] = useState('');
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyError, setBuyError] = useState('');
  const [buySuccess, setBuySuccess] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);
  const [searchParams] = useSearchParams();

  const { data: markets = [], isLoading } = useMarkets();
  const { data: overview } = useMarketOverview();
  const { data: watchlist = [], refetch: refetchWatchlist } = useWatchlist();
  const queryClient = useQueryClient();

  // Handle URL search param from global search
  useEffect(() => {
    const searchFromUrl = searchParams.get('search');
    if (searchFromUrl) setSearchQuery(searchFromUrl);
  }, [searchParams]);

  // Fetch wallet balance
  useEffect(() => {
    walletAPI.getDetails().then(({ data }) => setWalletBalance(data.balance)).catch(() => { });
  }, [buySuccess]);

  // Debounced live search
  useEffect(() => {
    const t = setTimeout(async () => {
      if (searchQuery.trim()) {
        const { data } = await marketAPI.searchMarkets(searchQuery);
        setSearchResults(data);
      } else {
        setSearchResults([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const watchlistSymbols = watchlist.map((w) => w.symbol);

  const filteredMarkets = searchQuery
    ? searchResults
    : activeTab === 'stocks'
      ? markets.filter((m) => m.assetType === 'STOCK')
      : activeTab === 'crypto'
        ? markets.filter((m) => m.assetType === 'CRYPTO')
        : markets;

  const handleToggleWatchlist = async (symbol, assetType) => {
    if (watchlistSymbols.includes(symbol)) {
      await marketAPI.removeFromWatchlist(symbol);
    } else {
      await marketAPI.addToWatchlist(symbol, assetType);
    }
    refetchWatchlist();
  };

  const openBuyModal = async (asset) => {
    setBuyModal(asset);
    setBuyQuantity('');
    setBuyError('');
    setBuySuccess('');
  };

  const handleBuy = async () => {
    const qty = parseFloat(buyQuantity);
    if (!qty || qty <= 0) { setBuyError('Enter a valid quantity'); return; }
    const total = qty * buyModal.price;
    if (total > walletBalance) { setBuyError(`Insufficient balance. Need ₹${total.toLocaleString()} but have ₹${walletBalance.toLocaleString()}`); return; }
    setBuyLoading(true);
    setBuyError('');
    try {
      await tradeAPI.buyAsset({ symbol: buyModal.symbol, assetType: buyModal.assetType, quantity: qty, price: buyModal.price });
      setBuySuccess(`Successfully bought ${qty} ${buyModal.symbol}!`);
      setWalletBalance((prev) => prev - total);
      queryClient.invalidateQueries(['dashboard']);
      queryClient.invalidateQueries(['holdings']);
      setTimeout(() => setBuyModal(null), 1800);
    } catch (err) {
      setBuyError(err.response?.data?.message || 'Purchase failed.');
    } finally {
      setBuyLoading(false);
    }
  };

  const totalCost = parseFloat(buyQuantity) * (buyModal?.price || 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="lg:h-full lg:overflow-hidden flex flex-col gap-4 pb-2"
    >
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Live Market</h1>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 glass-panel rounded-2xl text-sm font-semibold border border-slate-200/50 dark:border-dark-border">
          <span className="w-2 h-2 bg-brand-500 rounded-full animate-pulse" />
          <span>Wallet: ₹{walletBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* Main 77/23 Layout */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 lg:overflow-hidden min-h-0">
        {/* Left column (77%): Search/Tabs + Asset Table */}
        <div className="w-full lg:w-[77%] flex flex-col gap-4 lg:overflow-hidden min-h-0">
          {/* Search + Tabs */}
          <div className="flex-shrink-0 glass-panel p-3 rounded-2xl border border-slate-200/50 dark:border-dark-border flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-light-muted dark:text-dark-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by symbol or name..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-900/40 rounded-2xl text-sm border border-slate-200/50 dark:border-slate-800/40 focus:border-brand-500 outline-none transition-colors"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-light-muted dark:text-dark-muted">
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              {['all', 'stocks', 'crypto'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-2xl text-xs font-bold capitalize transition-all ${
                    activeTab === tab
                      ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                      : 'text-light-muted dark:text-dark-muted hover:bg-slate-200/50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  {tab === 'all' ? 'All Assets' : tab === 'stocks' ? 'Stocks' : 'Crypto'}
                </button>
              ))}
            </div>
          </div>

          {/* Market Table */}
          <div className="flex-1 glass-panel rounded-3xl border border-slate-200/50 dark:border-dark-border overflow-hidden flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto min-h-0">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/50 dark:border-slate-800/50 text-xs uppercase font-bold text-light-muted dark:text-dark-muted sticky top-0 bg-slate-50/90 dark:bg-[#101423]/90 backdrop-blur-md z-10">
                    <th className="px-4 py-3 lg:px-3 text-left">Asset</th>
                    <th className="px-4 py-3 lg:px-3 text-left">Type</th>
                    <th className="px-4 py-3 lg:px-3 text-right">Price (₹)</th>
                    <th className="px-4 py-3 lg:px-3 text-right">24h Change</th>
                    <th className="px-4 py-3 lg:px-3 text-right">High</th>
                    <th className="px-4 py-3 lg:px-3 text-right">Low</th>
                    <th className="px-4 py-3 lg:px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    [...Array(8)].map((_, i) => (
                      <tr key={i} className="border-b border-slate-100/50 dark:border-slate-800/20">
                        {[...Array(7)].map((__, j) => (
                          <td key={j} className="px-4 py-3 lg:px-3">
                            <div className="h-4 bg-slate-200 dark:bg-slate-800/50 rounded skeleton" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    filteredMarkets.map((asset) => (
                      <motion.tr
                        key={asset.symbol}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="border-b border-slate-100/50 dark:border-slate-800/15 hover:bg-slate-50 dark:hover:bg-slate-800/15 transition-colors group"
                      >
                        <td className="px-4 py-3 lg:px-3">
                          <div>
                            <p className="font-bold">{asset.symbol}</p>
                            <p className="text-xs text-light-muted dark:text-dark-muted">{asset.name}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 lg:px-3">
                          <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                            asset.assetType === 'CRYPTO' ? 'bg-purple-500/10 text-purple-500' : 'bg-blue-500/10 text-blue-500'
                          }`}>
                            {asset.assetType}
                          </span>
                        </td>
                        <td className="px-4 py-3 lg:px-3 text-right font-bold">₹{asset.price.toLocaleString()}</td>
                        <td className={`px-4 py-3 lg:px-3 text-right font-bold ${asset.change >= 0 ? 'text-brand-500' : 'text-danger-500'}`}>
                          <div className="flex items-center justify-end gap-1">
                            {asset.change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            <span>{asset.change >= 0 ? '+' : ''}{asset.change}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 lg:px-3 text-right text-xs text-light-muted dark:text-dark-muted">₹{asset.high.toLocaleString()}</td>
                        <td className="px-4 py-3 lg:px-3 text-right text-xs text-light-muted dark:text-dark-muted">₹{asset.low.toLocaleString()}</td>
                        <td className="px-4 py-3 lg:px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleToggleWatchlist(asset.symbol, asset.assetType)}
                              className={`p-1.5 rounded-xl transition-colors ${
                                watchlistSymbols.includes(asset.symbol)
                                  ? 'text-amber-500 bg-amber-500/10'
                                  : 'text-light-muted dark:text-dark-muted hover:text-amber-500 hover:bg-amber-500/10'
                              }`}
                            >
                              {watchlistSymbols.includes(asset.symbol) ? <Star size={14} fill="currentColor" /> : <Star size={14} />}
                            </button>
                            <button
                              onClick={() => openBuyModal(asset)}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-brand-500/10 hover:bg-brand-500 hover:text-white text-brand-500 rounded-xl text-xs font-bold transition-all duration-200 border border-brand-500/20 hover:border-brand-500 hover:shadow-lg hover:shadow-brand-500/20"
                            >
                              <ShoppingCart size={11} />
                              <span>Buy</span>
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right column (23%): Top Gainers, Trending, Top Losers stacked vertically */}
        <div className="w-full lg:w-[23%] flex flex-col gap-3 flex-shrink-0 lg:overflow-hidden min-h-0">
          {overview &&
            [
              { label: 'Top Gainers', data: overview.gainers?.slice(0, 3), color: 'text-brand-500', icon: TrendingUp },
              { label: 'Trending', data: overview.trending?.slice(0, 3), color: 'text-amber-500', icon: Flame },
              { label: 'Top Losers', data: overview.losers?.slice(0, 3), color: 'text-danger-500', icon: TrendingDown },
            ].map(({ label, data, color, icon: Icon }) => (
              <div key={label} className="glass-panel p-3.5 rounded-2xl border border-slate-200/50 dark:border-dark-border flex-1 flex flex-col justify-center min-h-0">
                <div className={`flex items-center gap-1.5 text-xs font-extrabold uppercase mb-2 ${color} flex-shrink-0`}>
                  <Icon size={13} />
                  <span>{label}</span>
                </div>
                <div className="space-y-2.5 flex-1 flex flex-col justify-center">
                  {data?.map((a) => (
                    <div key={a.symbol} className="flex items-center justify-between text-xs leading-none">
                      <span className="font-semibold text-light-text dark:text-dark-text">{a.symbol}</span>
                      <span className={`font-bold ${a.change >= 0 ? 'text-brand-500' : 'text-danger-500'}`}>
                        {a.change >= 0 ? '+' : ''}
                        {a.change}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Buy Modal */}
      <AnimatePresence>
        {buyModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-40"
              onClick={() => setBuyModal(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-lg font-extrabold">Buy {buyModal.symbol}</h3>
                    <p className="text-xs text-light-muted dark:text-dark-muted">{buyModal.name}</p>
                  </div>
                  <button onClick={() => setBuyModal(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                    <X size={18} />
                  </button>
                </div>

                <div className="p-4 bg-slate-100/50 dark:bg-slate-950 rounded-2xl mb-4 flex justify-between text-sm">
                  <div>
                    <p className="text-xs text-light-muted dark:text-dark-muted">Current Price</p>
                    <p className="font-extrabold text-lg">₹{buyModal.price.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-light-muted dark:text-dark-muted">Wallet Balance</p>
                    <p className="font-bold text-brand-500">₹{walletBalance.toLocaleString()}</p>
                  </div>
                </div>

                {buySuccess ? (
                  <div className="p-4 bg-brand-500/10 border border-brand-500/30 rounded-2xl text-brand-500 font-bold text-sm text-center">
                    {buySuccess}
                  </div>
                ) : (
                  <>
                    <label className="block text-xs font-bold uppercase text-light-muted dark:text-dark-muted mb-1.5">Quantity</label>
                    <input
                      type="number"
                      min="0.000001"
                      step="any"
                      value={buyQuantity}
                      onChange={(e) => setBuyQuantity(e.target.value)}
                      placeholder="e.g. 0.5, 1, 10"
                      className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-4 text-sm font-semibold focus:border-brand-500 outline-none transition-colors mb-4"
                    />

                    {buyQuantity && !isNaN(parseFloat(buyQuantity)) && (
                      <div className="flex items-center justify-between text-sm mb-4 p-3 bg-slate-100/50 dark:bg-slate-950/40 rounded-xl border border-slate-200/50 dark:border-slate-800/30">
                        <span className="text-light-muted dark:text-dark-muted">Total Cost</span>
                        <span className={`font-extrabold ${totalCost > walletBalance ? 'text-danger-500' : 'text-light-text dark:text-dark-text'}`}>
                          ₹{totalCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}

                    {buyError && (
                      <div className="mb-4 p-3 bg-danger-500/10 border border-danger-500/20 rounded-xl text-danger-500 text-xs font-semibold">
                        {buyError}
                      </div>
                    )}

                    <button
                      onClick={handleBuy}
                      disabled={buyLoading || !buyQuantity}
                      className="w-full py-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white rounded-2xl font-extrabold transition-all shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2"
                    >
                      {buyLoading ? <Loader2 size={18} className="animate-spin" /> : <><ShoppingCart size={16} /><span>Confirm Buy</span></>}
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

export default Market;
