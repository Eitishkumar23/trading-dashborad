import React, { useState, useEffect } from 'react';
import { BrowserProvider, formatEther } from "ethers";
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  TrendingUp,
  Briefcase,
  History,
  BarChart3,
  User,
  Wallet,
  Sun,
  Moon,
  LogOut,
  Search,
  Menu,
  X,
  Bell,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';
import { logout } from '../redux/authSlice.js';
import { toggleTheme } from '../redux/themeSlice.js';
import { walletAPI, marketAPI } from '../services/api.js';
import { useMaintenance } from '../context/MaintenanceContext.jsx';
import { formatCurrency } from '../utils/currencyUtils.js';

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [walletConnected, setWalletConnected] = useState(false);
  const [ethBalance, setEthBalance] = useState("");
  const [networkName, setNetworkName] = useState("");

  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const isMarketPage = location.pathname === '/market';

  const { user } = useSelector((state) => state.auth);
  const { mode } = useSelector((state) => state.theme);
  const { preferred: currency } = useSelector((state) => state.currency);
  const { maintenanceMode, message: maintenanceMessage } = useMaintenance();

  // Apply body classes for theme
  useEffect(() => {
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.className = 'bg-dark-bg text-dark-text';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.className = 'bg-light-bg text-light-text';
    }
  }, [mode]);

  // Fetch Wallet Balance dynamically
  const fetchWallet = async () => {
    try {
      const { data } = await walletAPI.getDetails();
      setWalletBalance(data.balance);
    } catch (error) {
      console.error('Failed to load wallet balance', error);
    }
  };

  useEffect(() => {
    fetchWallet();
    checkWalletConnection();
    // Poll wallet balance every 5 seconds
    const interval = setInterval(fetchWallet, 5000);
    return () => clearInterval(interval);
  }, []);

  // Handle live search suggestions
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length > 0) {
        if (isMarketPage) {
          // On the market page: update URL param to drive the table filter directly.
          // Do NOT show the autocomplete dropdown; the table shows all results.
          navigate(`/market?search=${encodeURIComponent(searchQuery.trim())}`, { replace: true });
          setSearchResults([]);
          setShowSearchDropdown(false);
        } else {
          try {
            const { data } = await marketAPI.searchMarkets(searchQuery);
            setSearchResults(data.slice(0, 5)); // Keep top 5 suggestions
            setShowSearchDropdown(true);
          } catch (error) {
            console.error('Search failed', error);
          }
        }
      } else {
        setSearchResults([]);
        setShowSearchDropdown(false);
        if (isMarketPage) {
          // Clear the URL search param when input is cleared
          navigate('/market', { replace: true });
        }
      }
    }, 250);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, isMarketPage]);

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Market', path: '/market', icon: TrendingUp },
    { name: 'Portfolio', path: '/portfolio', icon: Briefcase },
    { name: 'Transactions', path: '/transactions', icon: History },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Profile & Alerts', path: '/profile', icon: User },
    { name: 'Wallet Ledger', path: '/wallet', icon: Wallet },
  ];

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert("Please install MetaMask.");
        return;
      }

      const provider = new BrowserProvider(window.ethereum);

      const accounts = await provider.send("eth_requestAccounts", []);

      setWalletAddress(accounts[0]);
      setWalletConnected(true);

      // Fetch ETH balance after connecting
      const rawBalance = await provider.getBalance(accounts[0]);
      setEthBalance(parseFloat(formatEther(rawBalance)).toFixed(4));

      // Fetch network name after connecting
      const network = await provider.getNetwork();
      setNetworkName(network.name);

      console.log("Wallet Connected:", accounts[0]);
    } catch (err) {
      console.error(err);
    }
  };

  const checkWalletConnection = async () => {
    try {
      if (!window.ethereum) return;

      const provider = new BrowserProvider(window.ethereum);

      const accounts = await provider.send("eth_accounts", []);

      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
        setWalletConnected(true);

        // Fetch ETH balance on auto-reconnect
        const rawBalance = await provider.getBalance(accounts[0]);
        setEthBalance(parseFloat(formatEther(rawBalance)).toFixed(4));

        // Fetch network name on auto-reconnect
        const network = await provider.getNetwork();
        setNetworkName(network.name);

        console.log("Wallet Auto Connected:", accounts[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleSearchSelect = (symbol) => {
    setSearchQuery('');
    setShowSearchDropdown(false);
    navigate(`/market?search=${symbol}`);
  };

  // Sync global search bar value when navigating to/from the market page
  // We clear the search in the nav link onClick (user event) instead of a useEffect
  // to avoid calling setState synchronously inside an effect body.
  const clearSearchOnNavigate = (targetPath) => {
    if (isMarketPage && targetPath !== '/market') {
      setSearchQuery('');
      setShowSearchDropdown(false);
    }
  };

  return (
    <div className="min-h-screen flex transition-colors duration-300">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 glass-panel border-r border-dark-border dark:border-dark-border m-4 rounded-3xl sticky top-4 h-[calc(100vh-2rem)] z-30 overflow-hidden">
        <div className="p-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-gradient-to-tr from-brand-600 to-brand-500 p-2.5 rounded-2xl text-white shadow-lg shadow-brand-500/20">
              <TrendingUp size={22} className="animate-pulse" />
            </div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-brand-500 to-emerald-400 bg-clip-text text-transparent">
              AI QUANT
            </span>
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-1 py-4">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            const Icon = link.icon;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => clearSearchOnNavigate(link.path)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl font-medium transition-all duration-200 ${isActive
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25 scale-[1.02]'
                  : 'text-light-muted hover:text-light-text dark:text-dark-muted dark:hover:text-dark-text hover:bg-slate-200/50 dark:hover:bg-slate-800/40'
                  }`}
              >
                <Icon size={20} />
                <span>{link.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User profile section in Sidebar */}
        <div className="w-full min-w-0 px-4 pt-1 pb-2 border-t border-slate-200/50 dark:border-slate-800/50 shrink-0">
          <div className="flex w-full max-w-full min-w-0 items-center justify-between gap-3 px-2 py-1 rounded-2xl bg-slate-100/55 dark:bg-slate-900/40 border border-slate-200/30 dark:border-slate-800/30 overflow-hidden box-border">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center font-bold">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="block text-sm font-semibold truncate leading-none mb-1">
                  {user?.name || 'User'}
                </p>
                <p className="block text-xs text-light-muted dark:text-dark-muted truncate leading-none">
                  {user?.email || ''}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="shrink-0 p-2 text-danger-500 hover:bg-danger-500/10 rounded-xl transition-colors"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Sidebar - Mobile Toggle Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-64 glass-panel m-4 rounded-3xl z-50 flex flex-col h-[calc(100vh-2rem)] lg:hidden"
            >
              <div className="p-6 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2" onClick={() => setSidebarOpen(false)}>
                  <div className="bg-brand-500 p-2 rounded-xl text-white">
                    <TrendingUp size={20} />
                  </div>
                  <span className="font-bold text-lg text-light-text dark:text-dark-text">AI QUANT</span>
                </Link>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1 text-light-muted dark:text-dark-muted hover:bg-slate-200/50 dark:hover:bg-slate-800/40 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>

              <nav className="flex-1 px-4 space-y-1 py-4">
                {navLinks.map((link) => {
                  const isActive = location.pathname === link.path;
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => {
                        setSidebarOpen(false);
                        clearSearchOnNavigate(link.path);
                      }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition-colors ${isActive
                        ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                        : 'text-light-muted hover:text-light-text dark:text-dark-muted dark:hover:text-dark-text hover:bg-slate-200/50 dark:hover:bg-slate-800/40'
                        }`}
                    >
                      <Icon size={18} />
                      <span>{link.name}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="p-4 border-t border-slate-200/50 dark:border-slate-800/50">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-danger-500/10 text-danger-500 hover:bg-danger-500/20 transition-colors font-semibold"
                >
                  <LogOut size={18} />
                  <span>Logout</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col p-4 lg:py-4 lg:px-6 lg:pl-2 lg:h-screen lg:overflow-hidden min-h-screen overflow-x-hidden">
        {/* Top Header Navbar */}
        <header className="glass-panel rounded-3xl p-4 lg:mb-4 mb-6 flex-shrink-0 flex items-center justify-between z-20 border border-slate-200/50 dark:border-slate-800/50">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2.5 text-light-muted dark:text-dark-muted hover:bg-slate-200/50 dark:hover:bg-slate-800/40 rounded-2xl"
            >
              <Menu size={22} />
            </button>

            {/* Live Autocomplete Search — only visible on the Market page */}
            {isMarketPage && <div className="relative sm:block hidden w-40 sm:w-52 md:w-72 lg:w-96">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-light-muted dark:text-dark-muted">
                <Search size={18} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => !isMarketPage && searchResults.length > 0 && setShowSearchDropdown(true)}
                onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                placeholder={isMarketPage ? 'Search assets...' : 'Search stocks or crypto (e.g. AAPL, BTC)...'}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-100/50 dark:bg-slate-900/30 hover:bg-slate-200/30 dark:hover:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-950/80 rounded-2xl text-sm border border-slate-200/50 dark:border-slate-800/30 focus:border-brand-500 dark:focus:border-brand-500 outline-none transition-all duration-200"
              />

              {/* Search results dropdown — hidden on the market page since the table filters directly */}
              <AnimatePresence>
                {!isMarketPage && showSearchDropdown && searchResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden z-50 p-2"
                  >
                    {searchResults.map((asset) => (
                      <button
                        key={asset.symbol}
                        onClick={() => handleSearchSelect(asset.symbol)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-xl transition-colors text-left"
                      >
                        <div>
                          <p className="font-semibold text-sm">{asset.symbol}</p>
                          <p className="text-xs text-light-muted dark:text-dark-muted">{asset.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{formatCurrency(asset.price, currency, { maximumFractionDigits: 2 })}</p>
                          <span className={`text-xs font-semibold ${asset.change >= 0 ? 'text-brand-500' : 'text-danger-500'}`}>
                            {asset.change >= 0 ? '+' : ''}{asset.change}%
                          </span>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>}
          </div>

          <div className="flex items-center gap-3">
            {/* Wallet Quick Balance Pill */}
            <Link
              to="/wallet"
              className="flex items-center gap-2 pl-3 pr-4 py-2 bg-brand-500/10 hover:bg-brand-500/20 text-brand-500 dark:text-brand-500 border border-brand-500/20 rounded-2xl text-sm font-bold transition-all duration-200 group hover:scale-[1.02]"
            >
              <Wallet size={16} className="group-hover:rotate-12 transition-transform" />
              <span>{formatCurrency(walletBalance, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </Link>

            {/* Connect Wallet Button */}
            {walletConnected ? (
              <div className="flex flex-col items-center px-4 py-1.5 rounded-2xl bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 font-semibold text-xs leading-tight">
                <span className="font-bold text-indigo-300">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </span>
                <span className="text-[10px] text-indigo-400/80 mt-0.5">
                  {ethBalance} ETH
                </span>
                {networkName && (
                  <span className="text-[10px] text-indigo-300/70 mt-0.5 capitalize">
                    {networkName}
                  </span>
                )}
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition"
              >
                Connect Wallet
              </button>
            )}

            {/* Dark Mode Toggle */}
            <button
              onClick={() => dispatch(toggleTheme())}
              className="p-2.5 bg-slate-100/50 dark:bg-slate-900/30 hover:bg-slate-200/50 dark:hover:bg-slate-800/40 rounded-2xl text-light-muted dark:text-dark-muted border border-slate-200/30 dark:border-slate-800/30 transition-colors"
              title="Toggle Theme"
            >
              {mode === 'dark' ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
            </button>

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                onBlur={() => setTimeout(() => setProfileDropdownOpen(false), 200)}
                className="w-10 h-10 rounded-2xl bg-slate-200 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800/50 flex items-center justify-center font-bold hover:border-brand-500 dark:hover:border-brand-500 transition-colors"
              >
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </button>

              <AnimatePresence>
                {profileDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-2 z-50"
                  >
                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                      <p className="text-xs text-light-muted dark:text-dark-muted">Signed in as</p>
                      <p className="text-sm font-semibold truncate">{user?.name}</p>
                    </div>
                    <Link
                      to="/profile"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <User size={16} />
                      <span>My Profile</span>
                    </Link>
                    <Link
                      to="/wallet"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <Wallet size={16} />
                      <span>Wallet Ledger</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-danger-500 hover:bg-danger-500/10 transition-colors text-left"
                    >
                      <LogOut size={16} />
                      <span>Sign Out</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {maintenanceMode && (
          <div className="mb-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-700 dark:text-amber-300">
            {maintenanceMessage}
          </div>
        )}

        {/* Dynamic Nested Routes */}
        <main className="flex-1 lg:overflow-y-auto min-h-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
