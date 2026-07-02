import { motion } from 'framer-motion';
import { Star, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useWatchlist } from '../hooks/useMarketData.js';
import { marketAPI } from '../services/api.js';
import { formatCurrency } from '../utils/currencyUtils.js';

/**
 * WatchlistPanel — reusable, self-contained watchlist card.
 *
 * Props:
 *   height      {string}  CSS height applied to the root element. Default: '430px'.
 *   header      {string}  Card header text. Default: 'Watchlist'.
 *   showCount   {boolean} Show "N tracked symbols" subtitle. Default: true.
 *   className   {string}  Extra classes appended to the root element.
 */
const WatchlistPanel = ({
  height = '430px',
  header = 'Watchlist',
  showCount = true,
  className = '',
}) => {
  const { data: watchlist = [], refetch: refetchWatchlist } = useWatchlist();
  const { preferred: currency } = useSelector((state) => state.currency);

  const handleRemove = async (symbol) => {
    try {
      await marketAPI.removeFromWatchlist(symbol);
      refetchWatchlist();
    } catch (err) {
      console.error('Failed to remove from watchlist', err);
    }
  };

  const getAssetBadge = (item) => {
    if (item.assetType === 'CRYPTO')      return { label: 'Crypto',      cls: 'bg-purple-500/10 text-purple-500' };
    if (item.assetType === 'REAL_ASSET') {
      if (item.live?.category === 'PRECIOUS_METALS') return { label: 'Metals',      cls: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' };
      if (item.live?.category === 'ENERGY')          return { label: 'Energy',      cls: 'bg-orange-500/10 text-orange-500' };
      if (item.live?.category === 'REAL_ESTATE')     return { label: 'Real Estate', cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' };
      return { label: 'Real Asset', cls: 'bg-amber-500/10 text-amber-500' };
    }
    return { label: 'Stock', cls: 'bg-blue-500/10 text-blue-500' };
  };

  return (
    <section
      style={{ height }}
      className={`dash-card flex flex-col overflow-hidden ${className}`}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 px-6 pt-5 pb-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
            <Star size={13} className="text-amber-500" fill="currentColor" strokeWidth={0} />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-primary tracking-[-0.01em] leading-tight">{header}</h2>
            {showCount && (
              <p className="text-[11px] text-secondary mt-0.5 leading-tight">
                {watchlist.length} tracked symbol{watchlist.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-secondary">
          Live Tickers
        </span>
      </div>

      <div className="token-divider mx-6 shrink-0" />

      {/* ── Scrollable list ── */}
      <div className="flex-1 overflow-y-auto scrollbar-on-hover px-4 py-3 min-h-0">
        {watchlist.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 py-8">
            <div className="w-10 h-10 rounded-2xl border border-dashed border-token flex items-center justify-center opacity-50">
              <Star size={16} className="text-secondary" />
            </div>
            <p className="text-xs text-secondary text-center max-w-[180px] leading-relaxed">
              No symbols yet. Star assets from the Market page to track them here.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {watchlist.map((item) => {
              const badge = getAssetBadge(item);
              const isUp  = item.live?.change >= 0;

              return (
                <motion.div
                  key={item.symbol}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ type: 'spring', stiffness: 160, damping: 20 }}
                  className="watchlist-row flex items-center justify-between gap-3 px-4 py-3 group"
                >
                  {/* Left: symbol + price */}
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Color dot keyed by asset type */}
                    <div className={`w-1.5 h-8 rounded-full shrink-0 ${badge.cls.includes('purple') ? 'bg-purple-500' : badge.cls.includes('blue') ? 'bg-blue-500' : badge.cls.includes('yellow') ? 'bg-yellow-500' : badge.cls.includes('orange') ? 'bg-orange-500' : badge.cls.includes('emerald') ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-primary leading-tight">{item.symbol}</p>
                      {item.live ? (
                        <p className="text-[11px] text-secondary mt-0.5 tabular-nums leading-tight">
                          {formatCurrency(item.live.price, currency, { maximumFractionDigits: 2 })}
                        </p>
                      ) : (
                        <p className="text-[11px] text-secondary/50 mt-0.5">Loading…</p>
                      )}
                    </div>
                  </div>

                  {/* Right: change % + badge + remove */}
                  <div className="flex items-center gap-2 shrink-0">
                    {item.live && (
                      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold ${
                        isUp ? 'bg-profit/10 text-profit' : 'bg-loss/10 text-loss'
                      }`}>
                        {isUp
                          ? <TrendingUp size={10} strokeWidth={2.5} />
                          : <TrendingDown size={10} strokeWidth={2.5} />}
                        {isUp ? '+' : ''}{item.live.change}%
                      </div>
                    )}
                    <span className={`hidden sm:inline-flex rounded-lg px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${badge.cls}`}>
                      {badge.label}
                    </span>
                    <button
                      onClick={() => handleRemove(item.symbol)}
                      aria-label={`Remove ${item.symbol} from watchlist`}
                      className="w-6 h-6 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 text-secondary hover:text-danger-500 hover:bg-danger-500/10 transition-all duration-200"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default WatchlistPanel;
