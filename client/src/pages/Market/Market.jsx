import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Flame, X, ShoppingCart, Star, Loader2, Gem, Zap, Building } from 'lucide-react';
import { useMarkets, useMarketOverview, useWatchlist } from '../../hooks/useMarketData.js';
import { marketAPI, tradeAPI, walletAPI } from '../../services/api.js';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import ThemedNumberInput from '../../components/ThemedNumberInput.jsx';
import { useMaintenance } from '../../context/MaintenanceContext.jsx';
import { formatCurrency, getCurrencySymbol } from '../../utils/currencyUtils.js';

// Helper to get Real Asset sub-category badge
const getRealAssetCategoryBadge = (category) => {
  switch (category) {
    case 'PRECIOUS_METALS': return { label: 'Precious Metals', icon: Gem, color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' };
    case 'ENERGY':          return { label: 'Energy',          icon: Zap, color: 'bg-orange-500/10 text-orange-500' };
    case 'REAL_ESTATE':     return { label: 'Real Estate',     icon: Building, color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' };
    default:                return { label: 'Real Asset',      icon: Gem, color: 'bg-amber-500/10 text-amber-600' };
  }
};

// Step size for real assets — whole integers only
const getRealAssetStep = (unit) => 1;

const getQuantityPlaceholder = (asset) => {
  if (asset?.assetType !== 'REAL_ASSET') return 'e.g. 1, 2, 10';
  switch (asset?.unit) {
    case 'gram':   return 'e.g. 10g, 50g, 100g';
    case 'barrel': return 'e.g. 1, 5, 10 barrels';
    case 'MMBtu':  return 'e.g. 10, 50 MMBtu';
    case 'unit':   return 'e.g. 0.05, 0.10 units';
    default:       return 'e.g. 1, 5, 10';
  }
};

const TABS = [
  { value: 'all',         label: 'All Assets' },
  { value: 'stocks',      label: 'Stocks' },
  { value: 'crypto',      label: 'Crypto' },
  { value: 'real_assets', label: 'Real Assets' },
];

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
  const navigate = useNavigate();
  const { maintenanceMode, message: maintenanceMessage } = useMaintenance();
  const { preferred: currency } = useSelector((state) => state.currency);

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
        : activeTab === 'real_assets'
          ? markets.filter((m) => m.assetType === 'REAL_ASSET')
          : activeTab === 'precious_metals'
            ? markets.filter((m) => m.assetType === 'REAL_ASSET' && m.category === 'PRECIOUS_METALS')
            : activeTab === 'energy'
              ? markets.filter((m) => m.assetType === 'REAL_ASSET' && m.category === 'ENERGY')
              : activeTab === 'real_estate'
                ? markets.filter((m) => m.assetType === 'REAL_ASSET' && m.category === 'REAL_ESTATE')
                : markets;

  const handleToggleWatchlist = async (symbol, assetType) => {
    if (maintenanceMode) return;

    if (watchlistSymbols.includes(symbol)) {
      await marketAPI.removeFromWatchlist(symbol);
    } else {
      await marketAPI.addToWatchlist(symbol, assetType);
    }
    refetchWatchlist();
  };

  const openBuyModal = async (asset) => {
    if (maintenanceMode) return;
    setBuyModal(asset);
    setBuyQuantity(asset.assetType === 'REAL_ASSET' ? '1' : '');
    setBuyError('');
    setBuySuccess('');
  };

  const handleBuy = async () => {
    if (maintenanceMode) {
      setBuyError(maintenanceMessage);
      return;
    }

    const qty = parseFloat(buyQuantity);
    if (!qty || qty <= 0) { setBuyError('Enter a valid quantity'); return; }
    const total = qty * buyModal.price;
    if (total > walletBalance) {
      setBuyError(`Insufficient balance. Need ${formatCurrency(total, currency)} but have ${formatCurrency(walletBalance, currency)}`);
      return;
    }
    setBuyLoading(true);
    setBuyError('');
    try {
      await tradeAPI.buyAsset({ symbol: buyModal.symbol, assetType: buyModal.assetType, quantity: qty, price: buyModal.price });
      const unitLabel = buyModal.unit ? buyModal.unit : '';
      setBuySuccess(`Successfully bought ${qty}${unitLabel ? ' ' + unitLabel + ' of' : ''} ${buyModal.symbol}!`);
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

  // Badge renderer for asset type column
  const renderAssetTypeBadge = (asset) => {
    if (asset.assetType === 'REAL_ASSET') {
      const { label, color } = getRealAssetCategoryBadge(asset.category);
      return (
        <span className={`inline-flex items-center justify-center px-2 py-1 rounded-lg text-xs font-bold ${color}`}>
          {label}
        </span>
      );
    }
    return (
      <span className={`inline-flex items-center justify-center px-2 py-1 rounded-lg text-xs font-bold ${
        asset.assetType === 'CRYPTO' ? 'bg-purple-500/10 text-purple-500' : 'bg-blue-500/10 text-blue-500'
      }`}>
        {asset.assetType}
      </span>
    );
  };

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
          <span>Wallet: {formatCurrency(walletBalance, currency, { maximumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* Main 77/23 Layout */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 lg:overflow-hidden min-h-0">
        {/* Left column (77%): Search/Tabs + Asset Table */}
        <div className="w-full lg:w-[77%] flex flex-col gap-4 lg:overflow-hidden min-h-0">
          {/* Filter Tabs */}
          <div className="flex-shrink-0 glass-panel p-3 rounded-2xl border border-slate-200/50 dark:border-dark-border flex items-center justify-between gap-3">
            <div className="flex gap-2 flex-wrap">
              {TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => {
                    setActiveTab(tab.value);
                    if (searchQuery) {
                      setSearchQuery('');
                      navigate('/market', { replace: true });
                    }
                  }}
                  className={`px-4 py-2 rounded-2xl text-xs font-bold capitalize transition-all ${
                    activeTab === tab.value ||
                    (tab.value === 'real_assets' && ['precious_metals', 'energy', 'real_estate'].includes(activeTab))
                      ? tab.value === 'real_assets' ||
                        ['precious_metals', 'energy', 'real_estate'].includes(activeTab)
                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                        : 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                      : 'text-light-muted dark:text-dark-muted hover:bg-slate-200/50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  navigate('/market', { replace: true });
                }}
                className="flex items-center gap-1.5 text-xs text-light-muted dark:text-dark-muted hover:text-danger-500 dark:hover:text-danger-400 transition-colors font-medium flex-shrink-0"
              >
                <X size={13} />
                <span className="hidden sm:inline">Clear search</span>
              </button>
            )}
          </div>

          {/* Real Assets Sub-category Legend (shown when real_assets tab or a sub-category is active) */}
          <AnimatePresence>
            {(activeTab === 'real_assets' || activeTab === 'precious_metals' || activeTab === 'energy' || activeTab === 'real_estate') && !searchQuery && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex-shrink-0 flex flex-wrap gap-2 px-1"
              >
                {[
                  { value: 'real_assets',     label: 'All Real Assets',          icon: Gem,      color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',       activeColor: 'bg-amber-500 text-white border-amber-500' },
                  { value: 'precious_metals', label: 'Precious Metals',          icon: Gem,      color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20', activeColor: 'bg-yellow-500 text-white border-yellow-500' },
                  { value: 'energy',          label: 'Energy',                   icon: Zap,      color: 'bg-orange-500/10 text-orange-500 border-orange-500/20',                      activeColor: 'bg-orange-500 text-white border-orange-500' },
                  { value: 'real_estate',     label: 'Real Estate (Fractional)', icon: Building, color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', activeColor: 'bg-emerald-500 text-white border-emerald-500' },
                ].map(({ value, label, icon: Icon, color, activeColor }) => {
                  const isActive = activeTab === value;
                  return (
                    <button
                      key={value}
                      onClick={() => setActiveTab(value)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        isActive ? activeColor : `${color} hover:opacity-80`
                      }`}
                    >
                      <Icon size={11} />
                      {label}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Market Table */}
          <div className="flex-1 glass-panel rounded-3xl border border-slate-200/50 dark:border-dark-border overflow-hidden flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto min-h-0">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/50 dark:border-slate-800/50 text-xs uppercase font-bold text-light-muted dark:text-dark-muted sticky top-0 bg-slate-50/90 dark:bg-[#101423]/90 backdrop-blur-md z-10">
                    <th className="px-4 py-3 lg:px-3 text-left">Asset</th>
                    <th className="px-4 py-3 lg:px-3 text-center">Category</th>
                    <th className="px-4 py-3 lg:px-3 text-right">Price ({getCurrencySymbol(currency)})</th>
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
                            {asset.unit && (
                              <p className="text-[10px] text-light-muted dark:text-dark-muted opacity-70">per {asset.unit}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 lg:px-3 text-center">
                          {renderAssetTypeBadge(asset)}
                        </td>
                        <td className="px-4 py-3 lg:px-3 text-right font-bold tabular-nums">
                          {formatCurrency(asset.price, currency, { maximumFractionDigits: 2 })}
                        </td>
                        <td className={`px-4 py-3 lg:px-3 text-right font-bold ${asset.change >= 0 ? 'text-brand-500' : 'text-danger-500'}`}>
                          <div className="flex items-center justify-end gap-1">
                            {asset.change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            <span>{asset.change >= 0 ? '+' : ''}{asset.change}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 lg:px-3 text-right text-xs text-light-muted dark:text-dark-muted">
                          {formatCurrency(asset.high, currency, { maximumFractionDigits: 0 })}
                        </td>
                        <td className="px-4 py-3 lg:px-3 text-right text-xs text-light-muted dark:text-dark-muted">
                          {formatCurrency(asset.low, currency, { maximumFractionDigits: 0 })}
                        </td>
                        <td className="px-4 py-3 lg:px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleToggleWatchlist(asset.symbol, asset.assetType)}
                              disabled={maintenanceMode}
                              title={maintenanceMode ? maintenanceMessage : undefined}
                              className={`p-1.5 rounded-xl transition-colors ${
                                watchlistSymbols.includes(asset.symbol)
                                  ? 'text-amber-500 bg-amber-500/10'
                                  : 'text-light-muted dark:text-dark-muted hover:text-amber-500 hover:bg-amber-500/10'
                              } disabled:cursor-not-allowed disabled:opacity-50`}
                            >
                              {watchlistSymbols.includes(asset.symbol) ? <Star size={14} fill="currentColor" /> : <Star size={14} />}
                            </button>
                            <button
                              onClick={() => openBuyModal(asset)}
                              disabled={maintenanceMode}
                              title={maintenanceMode ? maintenanceMessage : undefined}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-brand-500/10 hover:bg-brand-500 hover:text-white text-brand-500 rounded-xl text-xs font-bold transition-all duration-200 border border-brand-500/20 hover:border-brand-500 hover:shadow-lg hover:shadow-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-brand-500/10 disabled:hover:text-brand-500 disabled:hover:shadow-none"
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
                    {buyModal.assetType === 'REAL_ASSET' && buyModal.unit && (
                      <span className={`inline-flex items-center gap-1 mt-1 text-[10px] font-bold px-2 py-0.5 rounded-lg ${getRealAssetCategoryBadge(buyModal.category).color}`}>
                        {buyModal.category === 'REAL_ESTATE' ? '🏠 Fractional Ownership' : `Traded per ${buyModal.unit}`}
                      </span>
                    )}
                  </div>
                  <button onClick={() => setBuyModal(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                    <X size={18} />
                  </button>
                </div>

                <div className="p-4 bg-slate-100/50 dark:bg-slate-950 rounded-2xl mb-4 flex justify-between text-sm">
                  <div>
                    <p className="text-xs text-light-muted dark:text-dark-muted">
                      Price{buyModal.unit ? ` / ${buyModal.unit}` : ''}
                    </p>
                    <p className="font-extrabold text-lg">{formatCurrency(buyModal.price, currency, { maximumFractionDigits: 2 })}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-light-muted dark:text-dark-muted">Wallet Balance</p>
                    <p className="font-bold text-brand-500">{formatCurrency(walletBalance, currency, { maximumFractionDigits: 2 })}</p>
                  </div>
                </div>

                {buySuccess ? (
                  <div className="p-4 bg-brand-500/10 border border-brand-500/30 rounded-2xl text-brand-500 font-bold text-sm text-center">
                    {buySuccess}
                  </div>
                ) : (
                  <>
                    <label className="block text-xs font-bold uppercase text-light-muted dark:text-dark-muted mb-1.5">
                      Quantity{buyModal.unit ? ` (${buyModal.unit}s)` : ''}
                    </label>
                    <ThemedNumberInput
                      value={buyQuantity}
                      min={1}
                      step={getRealAssetStep(buyModal.unit)}
                      onChange={setBuyQuantity}
                      placeholder={getQuantityPlaceholder(buyModal)}
                      className="mb-4"
                      inputMode="numeric"
                    />

                    {buyQuantity && !isNaN(parseFloat(buyQuantity)) && (
                      <div className="flex items-center justify-between text-sm mb-4 p-3 bg-slate-100/50 dark:bg-slate-950/40 rounded-xl border border-slate-200/50 dark:border-slate-800/30">
                        <span className="text-light-muted dark:text-dark-muted">Total Cost</span>
                        <span className={`font-extrabold ${totalCost > walletBalance ? 'text-danger-500' : 'text-light-text dark:text-dark-text'}`}>
                          {formatCurrency(totalCost, currency, { maximumFractionDigits: 2 })}
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
                      disabled={maintenanceMode || buyLoading || !buyQuantity}
                      title={maintenanceMode ? maintenanceMessage : undefined}
                      className="w-full py-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white rounded-2xl font-extrabold transition-all shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2"
                    >
                      {maintenanceMode ? <span>Buying Unavailable</span> : buyLoading ? <Loader2 size={18} className="animate-spin" /> : <><ShoppingCart size={16} /><span>Confirm Buy</span></>}
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
