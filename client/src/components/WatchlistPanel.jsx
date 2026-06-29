import { motion } from 'framer-motion';
import { Star, Trash2 } from 'lucide-react';
import { useWatchlist } from '../hooks/useMarketData.js';
import { marketAPI } from '../services/api.js';

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

  const handleRemove = async (symbol) => {
    try {
      await marketAPI.removeFromWatchlist(symbol);
      refetchWatchlist();
    } catch (err) {
      console.error('Failed to remove from watchlist', err);
    }
  };

  return (
    <section
      style={{ height }}
      className={`glass-panel flex flex-col overflow-hidden rounded-3xl border border-slate-200/50 p-6 dark:border-dark-border ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <Star size={18} className="text-amber-500" />
          <div>
            <h2 className="font-bold text-base">{header}</h2>
            {showCount && (
              <p className="text-xs text-light-muted dark:text-dark-muted">
                {watchlist.length} tracked symbols
              </p>
            )}
          </div>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-light-muted dark:text-dark-muted">
          Live Tickers
        </span>
      </div>

      {/* Scrollable body */}
      <div className="mt-5 flex-1 overflow-y-auto scrollbar-on-hover pr-1 min-h-0">
        <div className="space-y-3">
          {watchlist.length === 0 ? (
            <p className="py-8 text-center text-xs italic text-light-muted dark:text-dark-muted">
              No symbols in watchlist. Star assets from the Market page.
            </p>
          ) : (
            watchlist.map((item) => (
              <motion.div
                key={item.symbol}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ type: 'spring', stiffness: 140, damping: 18 }}
                className="flex items-center justify-between rounded-2xl border border-slate-200/30 bg-slate-100/50 p-3.5 dark:border-slate-800/30 dark:bg-slate-900/30"
              >
                {/* Left: symbol + live price */}
                <div>
                  <p className="text-sm font-bold">{item.symbol}</p>
                  {item.live && (
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="text-xs font-semibold">
                        ₹{item.live.price.toLocaleString()}
                      </span>
                      <span
                        className={`text-[10px] font-bold ${
                          item.live.change >= 0 ? 'text-brand-500' : 'text-danger-500'
                        }`}
                      >
                        {item.live.change >= 0 ? '+' : ''}
                        {item.live.change}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Right: asset type badge + remove */}
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-lg px-2 py-0.5 text-[10px] font-bold ${
                      item.assetType === 'CRYPTO'
                        ? 'bg-purple-500/10 text-purple-500'
                        : 'bg-blue-500/10 text-blue-500'
                    }`}
                  >
                    {item.assetType}
                  </span>
                  <button
                    onClick={() => handleRemove(item.symbol)}
                    aria-label={`Remove ${item.symbol} from watchlist`}
                    className="rounded-lg p-1.5 text-danger-500 transition-colors hover:bg-danger-500/10"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default WatchlistPanel;
