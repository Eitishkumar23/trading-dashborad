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

// ── Helpers (logic unchanged) ────────────────────────────────────────────────
const getRealAssetCategoryBadge = (category) => {
  switch (category) {
    case 'PRECIOUS_METALS': return { label: 'Precious Metals', icon: Gem,      color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' };
    case 'ENERGY':          return { label: 'Energy',          icon: Zap,      color: 'bg-orange-500/10 text-orange-500' };
    case 'REAL_ESTATE':     return { label: 'Real Estate',     icon: Building, color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' };
    default:                return { label: 'Real Asset',      icon: Gem,      color: 'bg-amber-500/10 text-amber-600' };
  }
};

const getRealAssetStep = () => 1;

const getQuantityPlaceholder = (asset) => {
  if (asset?.assetType !== 'REAL_ASSET') return 'e.g. 1, 2, 10';
  switch (asset?.unit) {
    case 'gram':   return 'e.g. 10, 50, 100';
    case 'barrel': return 'e.g. 1, 5, 10';
    case 'MMBtu':  return 'e.g. 10, 50';
    case 'unit':   return 'e.g. 1, 2, 5';
    default:       return 'e.g. 1, 5, 10';
  }
};

const TABS = [
  { value: 'all',         label: 'All Assets' },
  { value: 'stocks',      label: 'Stocks'     },
  { value: 'crypto',      label: 'Crypto'     },
  { value: 'real_assets', label: 'Real Assets'},
];

const Market = () => {
  const [searchQuery,   setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeTab,     setActiveTab]     = useState('all');
  const [buyModal,      setBuyModal]      = useState(null);
  const [buyQuantity,   setBuyQuantity]   = useState('');
  const [buyLoading,    setBuyLoading]    = useState(false);
  const [buyError,      setBuyError]      = useState('');
  const [buySuccess,    setBuySuccess]    = useState('');
  const [walletBalance, setWalletBalance] = useState(0);
  const [searchParams]  = useSearchParams();

  const { data: markets = [], isLoading } = useMarkets();
  const { data: overview }                = useMarketOverview();
  const { data: watchlist = [], refetch: refetchWatchlist } = useWatchlist();
  const queryClient  = useQueryClient();
  const navigate     = useNavigate();
  const { maintenanceMode, message: maintenanceMessage } = useMaintenance();
  const { preferred: currency } = useSelector((state) => state.currency);

  useEffect(() => {
    const s = searchParams.get('search');
    if (s) setSearchQuery(s);
  }, [searchParams]);

  useEffect(() => {
    walletAPI.getDetails().then(({ data }) => setWalletBalance(data.balance)).catch(() => {});
  }, [buySuccess]);

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
    : activeTab === 'stocks'        ? markets.filter((m) => m.assetType === 'STOCK')
    : activeTab === 'crypto'        ? markets.filter((m) => m.assetType === 'CRYPTO')
    : activeTab === 'real_assets'   ? markets.filter((m) => m.assetType === 'REAL_ASSET')
    : activeTab === 'precious_metals' ? markets.filter((m) => m.assetType === 'REAL_ASSET' && m.category === 'PRECIOUS_METALS')
    : activeTab === 'energy'        ? markets.filter((m) => m.assetType === 'REAL_ASSET' && m.category === 'ENERGY')
    : activeTab === 'real_estate'   ? markets.filter((m) => m.assetType === 'REAL_ASSET' && m.category === 'REAL_ESTATE')
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
    if (maintenanceMode) { setBuyError(maintenanceMessage); return; }
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

  // ── Asset type badge ─────────────────────────────────────────────────────
  const renderAssetTypeBadge = (asset) => {
    if (asset.assetType === 'REAL_ASSET') {
      const { label, color } = getRealAssetCategoryBadge(asset.category);
      return (
        <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-[10px] font-semibold tracking-wide ${color}`}>
          {label}
        </span>
      );
    }
    return (
      <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-[10px] font-semibold tracking-wide ${
        asset.assetType === 'CRYPTO' ? 'bg-purple-500/10 text-purple-500' : 'bg-blue-500/10 text-blue-500'
      }`}>
        {asset.assetType === 'CRYPTO' ? 'Crypto' : 'Stock'}
      </span>
    );
  };

  // ── Tab active-state helpers ─────────────────────────────────────────────
  const isRealAssetFamily = ['precious_metals','energy','real_estate'].includes(activeTab);
  const tabIsActive = (val) =>
    activeTab === val || (val === 'real_assets' && isRealAssetFamily);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.22 } }}
      className="lg:h-full lg:overflow-hidden flex flex-col gap-5 pb-2"
    >
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[1.5rem] font-bold tracking-[-0.02em] text-primary leading-tight">
            Live Market
          </h1>
          <p className="text-[12px] text-secondary mt-0.5">Real-time prices · Paper trading</p>
        </div>
      </div>

      {/* ── Main 77/23 layout ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:flex-row gap-5 lg:overflow-hidden min-h-0">

        {/* ── Left column ─────────────────────────────────────────────── */}
        <div className="w-full lg:flex-1 lg:min-w-0 flex flex-col gap-4 lg:overflow-hidden min-h-0">

          {/* Segmented tab bar */}
          <div className="flex-shrink-0 dash-card px-3 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              {TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => {
                    setActiveTab(tab.value);
                    if (searchQuery) { setSearchQuery(''); navigate('/market', { replace: true }); }
                  }}
                  className={`px-4 py-2 rounded-xl text-[12px] font-semibold transition-all duration-200 ${
                    tabIsActive(tab.value)
                      ? (tab.value === 'real_assets' || isRealAssetFamily)
                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                        : 'bg-[#10B981] text-white shadow-md shadow-emerald-500/25'
                      : 'text-secondary hover:text-primary hover:bg-black/5 dark:hover:bg-white/8'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); navigate('/market', { replace: true }); }}
                className="flex items-center gap-1.5 text-[11px] text-secondary hover:text-loss transition-colors font-medium flex-shrink-0 px-2.5 py-1.5 rounded-lg hover:bg-loss/8"
              >
                <X size={12} />
                <span className="hidden sm:inline">Clear search</span>
              </button>
            )}
          </div>

          {/* Real Assets sub-category filter pills */}
          <AnimatePresence>
            {(activeTab === 'real_assets' || isRealAssetFamily) && !searchQuery && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                className="flex-shrink-0 flex flex-wrap gap-2"
              >
                {[
                  { value: 'real_assets',     label: 'All Real Assets',          icon: Gem,      color: 'border-amber-500/25 bg-amber-500/8 text-amber-600 dark:text-amber-400',         activeColor: 'bg-amber-500 text-white border-amber-500 shadow-amber-500/20' },
                  { value: 'precious_metals', label: 'Precious Metals',          icon: Gem,      color: 'border-yellow-500/25 bg-yellow-500/8 text-yellow-600 dark:text-yellow-400',     activeColor: 'bg-yellow-500 text-white border-yellow-500 shadow-yellow-500/20' },
                  { value: 'energy',          label: 'Energy',                   icon: Zap,      color: 'border-orange-500/25 bg-orange-500/8 text-orange-500',                          activeColor: 'bg-orange-500 text-white border-orange-500 shadow-orange-500/20' },
                  { value: 'real_estate',     label: 'Real Estate (Fractional)', icon: Building, color: 'border-emerald-500/25 bg-emerald-500/8 text-emerald-600 dark:text-emerald-400', activeColor: 'bg-emerald-500 text-white border-emerald-500 shadow-emerald-500/20' },
                ].map(({ value, label, icon: Icon, color, activeColor }) => {
                  const isActive = activeTab === value;
                  return (
                    <button
                      key={value}
                      onClick={() => setActiveTab(value)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-all duration-200 ${
                        isActive ? `${activeColor} shadow-md` : `${color} hover:opacity-90`
                      }`}
                    >
                      <Icon size={10} strokeWidth={2.5} />
                      {label}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Market Table ─────────────────────────────────────────── */}
          <div className="flex-1 dash-card overflow-hidden flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto scrollbar-on-hover min-h-0">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="sticky top-0 z-10 bg-card">
                    <th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-secondary">Asset</th>
                    <th className="px-3 py-4 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-secondary">Category</th>
                    <th className="px-3 py-4 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-secondary">Price ({getCurrencySymbol(currency)})</th>
                    <th className="px-3 py-4 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-secondary">24h</th>
                    <th className="px-3 py-4 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-secondary">High</th>
                    <th className="px-3 py-4 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-secondary">Low</th>
                    <th className="px-6 py-4 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-secondary">Actions</th>
                  </tr>
                  <tr aria-hidden>
                    <td colSpan={7} style={{ height: '1px', backgroundColor: 'var(--color-border)', padding: 0, opacity: 0.6 }} />
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    [...Array(8)].map((_, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        {[...Array(7)].map((__, j) => (
                          <td key={j} className="px-3 py-4">
                            <div className="h-4 rounded-lg skeleton" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    filteredMarkets.map((asset, idx) => (
                      <motion.tr
                        key={asset.symbol}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: Math.min(idx * 0.015, 0.3) }}
                        className="group transition-colors duration-150"
                        style={{ borderBottom: '1px solid var(--color-border)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-row-hover)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; }}
                      >
                        {/* Asset name */}
                        <td className="px-6 py-4">
                          <p className="text-[13px] font-semibold text-primary leading-tight">{asset.symbol}</p>
                          <p className="text-[11px] text-secondary mt-0.5 leading-tight">{asset.name}</p>
                          {asset.unit && (
                            <p className="text-[10px] text-secondary/50 mt-0.5">per {asset.unit}</p>
                          )}
                        </td>

                        {/* Category badge */}
                        <td className="px-3 py-4 text-center">
                          {renderAssetTypeBadge(asset)}
                        </td>

                        {/* Price */}
                        <td className="px-3 py-4 text-right text-[13px] font-semibold text-primary tabular-nums">
                          {formatCurrency(asset.price, currency, { maximumFractionDigits: 2 })}
                        </td>

                        {/* 24h change */}
                        <td className={`px-3 py-4 text-right font-semibold text-[12px] tabular-nums ${asset.change >= 0 ? 'text-profit' : 'text-loss'}`}>
                          <div className="flex items-center justify-end gap-1">
                            {asset.change >= 0
                              ? <TrendingUp size={11} strokeWidth={2.5} />
                              : <TrendingDown size={11} strokeWidth={2.5} />}
                            {asset.change >= 0 ? '+' : ''}{asset.change}%
                          </div>
                        </td>

                        {/* High */}
                        <td className="px-3 py-4 text-right text-[12px] text-secondary tabular-nums">
                          {formatCurrency(asset.high, currency, { maximumFractionDigits: 0 })}
                        </td>

                        {/* Low */}
                        <td className="px-3 py-4 text-right text-[12px] text-secondary tabular-nums">
                          {formatCurrency(asset.low, currency, { maximumFractionDigits: 0 })}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            {/* Star / watchlist */}
                            <button
                              onClick={() => handleToggleWatchlist(asset.symbol, asset.assetType)}
                              disabled={maintenanceMode}
                              title={maintenanceMode ? maintenanceMessage : 'Add to watchlist'}
                              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${
                                watchlistSymbols.includes(asset.symbol)
                                  ? 'text-amber-500 bg-amber-500/12'
                                  : 'text-secondary hover:text-amber-500 hover:bg-amber-500/10 opacity-0 group-hover:opacity-100'
                              }`}
                            >
                              <Star
                                size={13}
                                strokeWidth={watchlistSymbols.includes(asset.symbol) ? 0 : 2}
                                fill={watchlistSymbols.includes(asset.symbol) ? 'currentColor' : 'none'}
                              />
                            </button>

                            {/* Buy button */}
                            <button
                              onClick={() => openBuyModal(asset)}
                              disabled={maintenanceMode}
                              title={maintenanceMode ? maintenanceMessage : `Buy ${asset.symbol}`}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#10B981]/10 hover:bg-[#10B981] text-[#10B981] hover:text-white rounded-xl text-[11px] font-semibold border border-[#10B981]/20 hover:border-[#10B981] hover:shadow-md hover:shadow-emerald-500/25 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#10B981]/10 disabled:hover:text-[#10B981] disabled:hover:shadow-none"
                            >
                              <ShoppingCart size={11} strokeWidth={2.5} />
                              Buy
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
        {/* ── End left column ─────────────────────────────────────────── */}

        {/* ── Right column: market widgets ──────────────────────────────── */}
        <div className="w-full lg:w-52 xl:w-60 flex flex-col gap-3.5 lg:shrink-0 lg:overflow-y-auto lg:overflow-x-hidden min-h-0">
          {overview && [
            { label: 'Top Gainers', data: overview.gainers?.slice(0, 3),  accent: 'text-profit',    iconBg: 'bg-profit/10',    icon: TrendingUp   },
            { label: 'Trending',    data: overview.trending?.slice(0, 3), accent: 'text-amber-500', iconBg: 'bg-amber-500/10', icon: Flame        },
            { label: 'Top Losers',  data: overview.losers?.slice(0, 3),   accent: 'text-loss',      iconBg: 'bg-loss/10',      icon: TrendingDown },
          ].map(({ label, data, accent, iconBg, icon: Icon }) => (
            <div key={label} className="dash-card flex-shrink-0 px-4 py-4">
              {/* Widget header */}
              <div className="flex items-center gap-2 mb-3.5">
                <div className={`w-6 h-6 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
                  <Icon size={12} strokeWidth={2.5} className={accent} />
                </div>
                <span className={`text-[11px] font-semibold uppercase tracking-[0.08em] truncate ${accent}`}>
                  {label}
                </span>
              </div>

              {/* Rows */}
              <div className="space-y-0">
                {data?.map((a, i) => (
                  <div
                    key={a.symbol}
                    className={`flex items-center justify-between gap-3 py-2.5 min-w-0 ${
                      i < (data.length - 1) ? 'border-b border-token' : ''
                    }`}
                    style={{ borderBottomColor: i < (data.length - 1) ? 'var(--color-border)' : undefined }}
                  >
                    <span className="text-[13px] font-semibold text-primary leading-none truncate min-w-0 flex-1">
                      {a.symbol}
                    </span>
                    <span className={`text-[12px] font-semibold tabular-nums shrink-0 ${a.change >= 0 ? 'text-profit' : 'text-loss'}`}>
                      {a.change >= 0 ? '+' : ''}{a.change}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>
      {/* ── End main layout ─────────────────────────────────────────────── */}

      {/* ── Buy Modal ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {buyModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.55 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black z-40 backdrop-blur-sm"
              onClick={() => setBuyModal(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ type: 'spring', stiffness: 120, damping: 18 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="w-full max-w-md dash-card p-7">

                {/* Modal header */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-2.5 mb-1">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-secondary">Buy Order</span>
                    </div>
                    <h3 className="text-xl font-bold text-primary tracking-[-0.02em]">{buyModal.symbol}</h3>
                    <p className="text-[12px] text-secondary mt-0.5">{buyModal.name}</p>
                    {buyModal.assetType === 'REAL_ASSET' && buyModal.unit && (
                      <span className={`inline-flex items-center gap-1 mt-2 text-[10px] font-semibold px-2.5 py-1 rounded-lg border ${getRealAssetCategoryBadge(buyModal.category).color}`}>
                        {buyModal.category === 'REAL_ESTATE' ? '🏠 Fractional Ownership' : `Traded per ${buyModal.unit}`}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setBuyModal(null)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-secondary hover:text-primary hover:bg-card-hover transition-all duration-200 mt-0.5"
                  >
                    <X size={16} strokeWidth={2} />
                  </button>
                </div>

                {/* Price / balance row */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="rounded-2xl p-3.5" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-secondary mb-1.5">
                      {buyModal.unit ? `Price / ${buyModal.unit}` : 'Current Price'}
                    </p>
                    <p className="text-[15px] font-bold text-primary tabular-nums leading-tight">
                      {formatCurrency(buyModal.price, currency, { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="rounded-2xl p-3.5" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-secondary mb-1.5">Wallet Balance</p>
                    <p className="text-[15px] font-bold text-accent tabular-nums leading-tight">
                      {formatCurrency(walletBalance, currency, { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {buySuccess ? (
                  <div className="py-5 px-4 rounded-2xl border border-accent/25 bg-accent/[0.07] text-center">
                    <p className="text-[13px] font-semibold text-accent">{buySuccess}</p>
                  </div>
                ) : (
                  <>
                    <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-secondary mb-2">
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
                      <div
                        className="flex items-center justify-between text-sm mb-4 px-4 py-3 rounded-xl"
                        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                      >
                        <span className="text-[12px] text-secondary">Total Cost</span>
                        <span className={`text-[13px] font-bold tabular-nums ${totalCost > walletBalance ? 'text-loss' : 'text-primary'}`}>
                          {formatCurrency(totalCost, currency, { maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}

                    {buyError && (
                      <div className="mb-4 px-4 py-3 rounded-xl border border-loss/20 bg-loss/[0.07]">
                        <p className="text-[11px] font-semibold text-loss">{buyError}</p>
                      </div>
                    )}

                    <button
                      onClick={handleBuy}
                      disabled={maintenanceMode || buyLoading || !buyQuantity}
                      title={maintenanceMode ? maintenanceMessage : undefined}
                      className="w-full py-3.5 rounded-xl text-[13px] font-semibold text-white bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30 flex items-center justify-center gap-2"
                    >
                      {maintenanceMode
                        ? 'Buying Unavailable'
                        : buyLoading
                        ? <><Loader2 size={16} className="animate-spin" /> Processing…</>
                        : <><ShoppingCart size={15} strokeWidth={2.2} /> Confirm Buy — {buyModal.symbol}</>
                      }
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
