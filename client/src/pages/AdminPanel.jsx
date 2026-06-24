import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  LogOut, 
  Trash2, 
  Plus, 
  Loader2, 
  AlertCircle, 
  CheckCircle,
  Database,
  RefreshCw,
  Coins,
  BarChart4,
  Users,
  Activity,
  ArrowLeftRight,
  Percent,
  Clock,
  Search,
  Filter,
  UserX,
  UserCheck,
  KeyRound,
  AlertTriangle,
  Radio,
  Volume2,
  DollarSign,
  Power,
  Edit2,
  Check,
  X,
  ShieldAlert,
  Download,
  FileText,
  ChevronRight,
  Eye,
  ShieldCheck,
  Settings
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  LineChart, 
  Line 
} from 'recharts';
import { logout, updateUserProfileLocal } from '../redux/authSlice.js';
import { adminAPI, authAPI } from '../services/api.js';
import AccountPasswordForm from '../components/AccountPasswordForm.jsx';

const ADMIN_EMAIL = 'eitishkoundal34@gmail.com';
const adminTabs = [
  { id: 'dashboard', route: '', label: 'Dashboard', mobileLabel: 'Dashboard', icon: BarChart4 },
  { id: 'users', route: 'users', label: 'User Management', mobileLabel: 'Users', icon: Users },
  { id: 'orders', route: 'orders', label: 'Orders Monitor', mobileLabel: 'Orders', icon: ArrowLeftRight },
  { id: 'withdrawals', route: 'withdrawals', label: 'Withdrawal Queue', mobileLabel: 'Withdrawals', icon: Clock },
  { id: 'assets', route: 'assets', label: 'Asset Limits', mobileLabel: 'Assets', icon: Database },
  { id: 'settings', route: 'settings', label: 'Platform Settings', mobileLabel: 'Settings', icon: Settings },
  { id: 'account-settings', route: 'account-settings', label: 'Account Settings', mobileLabel: 'Account', icon: KeyRound },
  { id: 'audit', route: 'audit', label: 'Audit Log', mobileLabel: 'Audit', icon: FileText },
];

const getTabFromSection = (section) => {
  return adminTabs.find((tab) => tab.route === (section || ''))?.id || 'dashboard';
};

const getRouteFromTab = (tabId) => {
  return adminTabs.find((tab) => tab.id === tabId)?.route || '';
};

const AdminPanel = () => {
  const { section } = useParams();
  const [activeTab, setActiveTab] = useState(() => getTabFromSection(section));
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [actionLoadingSymbol, setActionLoadingSymbol] = useState('');
  const [actionLoadingUser, setActionLoadingUser] = useState('');
  const [actionLoadingTx, setActionLoadingTx] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' }); // type: 'success' | 'error'
  
  // Lists
  const [assets, setAssets] = useState([]);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);

  // Stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeToday: 0,
    totalTradesToday: 0,
    platformVolume: 0,
    feesCollected: 0,
    pendingWithdrawals: 0,
    topAssets: [],
    volumeLast7Days: [],
    signupsLast7Days: []
  });

  // Settings
  const [settings, setSettings] = useState({
    tradingFeePercent: 0.15,
    maintenanceMode: false,
    userTiers: []
  });

  // Form fields (Asset limit)
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [assetType, setAssetType] = useState('crypto');
  const [totalQuantity, setTotalQuantity] = useState('');

  // Search & Filter
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [withdrawalTab, setWithdrawalTab] = useState('pending');
  const [auditFilter, setAuditFilter] = useState('all');
  const [auditSearch, setAuditSearch] = useState('');

  // Editing state
  const [editingSymbol, setEditingSymbol] = useState(null);
  const [editingValue, setEditingValue] = useState('');

  // Modals / Dialogs
  const [deleteConfirmAsset, setDeleteConfirmAsset] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null); // { title, message, onConfirm, type: 'danger' | 'info' }
  const [profileModalUser, setProfileModalUser] = useState(null);
  const [profileModalData, setProfileModalData] = useState({ holdings: [], trades: [], walletTxs: [] });
  const [profileLoading, setProfileLoading] = useState(false);
  const [reasonModalTx, setReasonModalTx] = useState(null); // withdrawal to reject
  const [rejectionReason, setRejectionReason] = useState('');

  // Settings modification
  const [settingsFee, setSettingsFee] = useState('0.15');
  const [editingTierIdx, setEditingTierIdx] = useState(null);
  const [editingTierValue, setEditingTierValue] = useState({ withdrawalLimit: '', feeDiscount: '' });
  const [announcementText, setAnnouncementText] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Local storage logs
  const [auditLog, setAuditLog] = useState(() => {
    const saved = localStorage.getItem('admin_audit_log');
    return saved ? JSON.parse(saved) : [];
  });

  // Orders Live Refresh countdown
  const [countdown, setCountdown] = useState(10);

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    setActiveTab(getTabFromSection(section));
  }, [section]);

  // Authenticate Admin
  useEffect(() => {
    if (!user || user.email !== ADMIN_EMAIL) {
      navigate('/login');
    }
  }, [user, navigate]);

  useEffect(() => {
    const refreshAdminProfile = async () => {
      if (!user || user.email !== ADMIN_EMAIL) return;

      try {
        const { data } = await authAPI.getProfile();
        dispatch(updateUserProfileLocal(data));
      } catch (error) {
        console.error('Failed to refresh admin profile', error);
      }
    };

    refreshAdminProfile();
  }, [dispatch, user?.email]);

  // Body scroll lock when user detail panel is open
  useEffect(() => {
    if (profileModalUser) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [profileModalUser]);

  // Toast status helper
  const showStatus = useCallback((text, type) => {
    setMessage({ text, type });
    const timer = setTimeout(() => {
      setMessage({ text: '', type: '' });
    }, 4500);
    return () => clearTimeout(timer);
  }, []);

  // Local Action Log helper
  const logAction = useCallback((actionType, target, description) => {
    const newLog = {
      timestamp: new Date().toISOString(),
      adminEmail: user?.email || ADMIN_EMAIL,
      actionType,
      target,
      description
    };
    setAuditLog(prev => {
      const updated = [newLog, ...prev];
      localStorage.setItem('admin_audit_log', JSON.stringify(updated));
      return updated;
    });
  }, [user]);

  // Global Fetch Route mapper
  const fetchData = useCallback(async (tab) => {
    setLoading(true);
    try {
      if (tab === 'dashboard') {
        const { data } = await adminAPI.getStats();
        setStats(data);
      } else if (tab === 'users') {
        const { data } = await adminAPI.getUsers();
        setUsers(data);
      } else if (tab === 'orders') {
        const { data } = await adminAPI.getOrders();
        setOrders(data);
      } else if (tab === 'withdrawals') {
        const { data } = await adminAPI.getWithdrawals();
        setWithdrawals(data);
      } else if (tab === 'assets') {
        const { data } = await adminAPI.getAssets();
        setAssets(data);
      } else if (tab === 'settings') {
        const { data } = await adminAPI.getSettings();
        setSettings(data);
        setSettingsFee(data.tradingFeePercent.toString());
      }
    } catch (error) {
      showStatus(error.response?.data?.message || `Failed to fetch data for ${tab}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [showStatus]);

  // Fetch initial data
  useEffect(() => {
    if (user && user.email === ADMIN_EMAIL) {
      const timer = setTimeout(() => {
        fetchData(activeTab);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [activeTab, user, fetchData]);

  // Live monitor effect (Orders tab only)
  useEffect(() => {
    if (activeTab !== 'orders') return;
    
    // Set state asynchronously to avoid ESLint/React warning
    const resetTimer = setTimeout(() => {
      setCountdown(10);
    }, 0);

    const interval = setInterval(() => {
      fetchData('orders');
      setCountdown(10);
    }, 10000);

    const timer = setInterval(() => {
      setCountdown(c => c > 1 ? c - 1 : 10);
    }, 1000);

    return () => {
      clearTimeout(resetTimer);
      clearInterval(interval);
      clearInterval(timer);
    };
  }, [activeTab, fetchData]);

  // ── Action Handlers ──

  // Global Logout
  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleTabChange = (tabId) => {
    const route = getRouteFromTab(tabId);
    setActiveTab(tabId);
    navigate(route ? `/admin/${route}` : '/admin');
  };

  // Add Asset Limit
  const handleAddAsset = async (e) => {
    e.preventDefault();
    if (!symbol || !name || !assetType || !totalQuantity) {
      showStatus('Please fill in all fields', 'error');
      return;
    }
    
    try {
      setSubmitLoading(true);
      const payload = {
        symbol: symbol.toUpperCase().trim(),
        name: name.trim(),
        assetType,
        totalQuantity: parseFloat(totalQuantity),
      };
      
      const { data } = await adminAPI.addAsset(payload);
      showStatus(`Successfully added limit for ${payload.symbol}!`, 'success');
      logAction('Asset Limits', payload.symbol, `Created new asset limit of ${payload.totalQuantity} units.`);
      
      // Reset form
      setSymbol('');
      setName('');
      setAssetType('crypto');
      setTotalQuantity('');
      
      // Refresh list
      setAssets([data, ...assets]);
    } catch (error) {
      showStatus(error.response?.data?.message || 'Failed to add asset limit.', 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Submit Quantity Update (Asset limit)
  const handleUpdateQuantity = async (asset) => {
    if (editingValue.trim() === '' || isNaN(editingValue)) {
      setEditingSymbol(null);
      return;
    }

    const newQty = parseFloat(editingValue);
    if (newQty === asset.totalQuantity) {
      setEditingSymbol(null);
      return;
    }

    try {
      setActionLoadingSymbol(asset.symbol);
      const { data } = await adminAPI.updateAsset(asset.symbol, { totalQuantity: newQty });
      showStatus(`Updated quantity for ${asset.symbol} to ${newQty}!`, 'success');
      logAction('Asset Limits', asset.symbol, `Updated total quantity from ${asset.totalQuantity} to ${newQty}.`);
      
      setAssets(assets.map(a => a.symbol === asset.symbol ? data : a));
    } catch (error) {
      showStatus(error.response?.data?.message || 'Failed to update asset limit.', 'error');
    } finally {
      setActionLoadingSymbol('');
      setEditingSymbol(null);
    }
  };

  // Delete Asset Limit
  const handleDeleteAsset = async () => {
    if (!deleteConfirmAsset) return;
    
    const symbolToDelete = deleteConfirmAsset.symbol;
    try {
      setActionLoadingSymbol(symbolToDelete);
      await adminAPI.deleteAsset(symbolToDelete);
      showStatus(`Deleted limit for ${symbolToDelete}.`, 'success');
      logAction('Asset Limits', symbolToDelete, `Removed trading limit restriction.`);
      
      setAssets(assets.filter(a => a.symbol !== symbolToDelete));
    } catch (error) {
      showStatus(error.response?.data?.message || 'Failed to delete asset limit.', 'error');
    } finally {
      setActionLoadingSymbol('');
      setDeleteConfirmAsset(null);
    }
  };

  // Update User status (Suspend / Ban / Reinstate)
  const handleUpdateUserStatus = async (userId, targetEmail, newStatus) => {
    try {
      setActionLoadingUser(userId);
      await adminAPI.updateUserStatus(userId, newStatus);
      showStatus(`User status updated to ${newStatus}!`, 'success');
      logAction('User Management', targetEmail, `Changed account status to "${newStatus}".`);
      
      // Update local state
      setUsers(users.map(u => u._id === userId ? { ...u, status: newStatus } : u));
    } catch (error) {
      showStatus(error.response?.data?.message || 'Failed to update user status.', 'error');
    } finally {
      setActionLoadingUser('');
    }
  };

  // Reset 2FA (Mock action)
  const handleReset2FA = async (userId, targetEmail) => {
    try {
      setActionLoadingUser(userId);
      const { data } = await adminAPI.resetUser2FA(userId);
      showStatus(data.message, 'success');
      logAction('User Management', targetEmail, 'Reset two-factor authentication credentials.');
    } catch (error) {
      showStatus(error.response?.data?.message || 'Failed to reset 2FA.', 'error');
    } finally {
      setActionLoadingUser('');
    }
  };

  // View User Profile (fetch holdings, trades, and wallet transaction history)
  const handleViewProfile = async (u) => {
    setProfileModalUser(u);
    setProfileLoading(true);
    try {
      const { data } = await adminAPI.getUserProfile(u._id);
      setProfileModalData(data);
    } catch (error) {
      showStatus(error.response?.data?.message || 'Failed to retrieve user profile.', 'error');
      setProfileModalUser(null);
    } finally {
      setProfileLoading(false);
    }
  };

  // Cancel Trade (Simulation / removal from list)
  const handleCancelOrder = async (orderId, symbol, email, qty, price) => {
    try {
      setActionLoadingTx(orderId);
      await adminAPI.cancelOrder(orderId);
      showStatus(`Cancelled trade for ${symbol}`, 'success');
      logAction('Orders Monitor', email, `Cancelled trade: Bought/Sold ${qty} units of ${symbol} @ ₹${price.toLocaleString()}.`);
      
      setOrders(orders.filter(o => o._id !== orderId));
    } catch (error) {
      showStatus(error.response?.data?.message || 'Failed to cancel order.', 'error');
    } finally {
      setActionLoadingTx('');
    }
  };

  // Update Withdrawal Status
  const handleUpdateWithdrawalStatus = async (txId, userEmail, amount, status, reason = '') => {
    try {
      setActionLoadingTx(txId);
      await adminAPI.updateWithdrawalStatus(txId, status, reason);
      showStatus(`Withdrawal ${status} successfully!`, 'success');
      logAction('Withdrawal Queue', userEmail, `Marked withdrawal of ₹${amount.toLocaleString()} as "${status}"${reason ? ` (Reason: ${reason})` : ''}.`);
      
      setWithdrawals(withdrawals.map(w => w._id === txId ? { ...w, status } : w));
    } catch (error) {
      showStatus(error.response?.data?.message || 'Failed to update status.', 'error');
    } finally {
      setActionLoadingTx('');
      setReasonModalTx(null);
      setRejectionReason('');
    }
  };

  // Save Settings
  const handleSaveSettings = async (field, value) => {
    setSettingsLoading(true);
    try {
      const payload = { [field]: value };
      const { data } = await adminAPI.updateSettings(payload);
      setSettings(data.settings);
      showStatus('Settings updated successfully', 'success');
      logAction('Platform Settings', field, `Changed global setting "${field}" to: ${JSON.stringify(value)}`);
    } catch (error) {
      showStatus(error.response?.data?.message || 'Failed to save settings.', 'error');
    } finally {
      setSettingsLoading(false);
    }
  };

  // Save Tier edits
  const handleSaveTier = async (idx) => {
    const updatedTiers = [...settings.userTiers];
    updatedTiers[idx] = {
      ...updatedTiers[idx],
      withdrawalLimit: Number(editingTierValue.withdrawalLimit),
      feeDiscount: Number(editingTierValue.feeDiscount)
    };
    await handleSaveSettings('userTiers', updatedTiers);
    setEditingTierIdx(null);
  };

  // Broadcast announcement
  const handleBroadcastAnnouncement = () => {
    if (!announcementText.trim()) return;
    
    showStatus(`Broadcasted: "${announcementText.trim()}" to all active users`, 'success');
    logAction('Platform Settings', 'All Users', `Broadcast announcement: "${announcementText.trim()}"`);
    setAnnouncementText('');
  };

  // Export CSV Helper
  const handleExportCSV = () => {
    if (auditLog.length === 0) {
      showStatus('No audit logs to export', 'error');
      return;
    }
    const headers = ['Timestamp', 'Admin Email', 'Action Type', 'Target', 'Description'];
    const rows = auditLog.map(log => [
      new Date(log.timestamp).toLocaleString(),
      log.adminEmail,
      log.actionType,
      log.target,
      log.description
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.map(val => `"${typeof val === 'string' ? val.replace(/"/g, '""') : val}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `audit_log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showStatus('Audit log exported successfully', 'success');
  };

  // Helper to open confirm modals
  const openConfirmDialog = (title, message, onConfirm, type = 'danger') => {
    setConfirmDialog({ title, message, onConfirm, type });
  };

  // ── Render Helpers ──

  // SECTION 1: DASHBOARD
  const renderDashboard = () => {
    const formattedVolume = `₹${stats.platformVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    const formattedFees = `₹${stats.feesCollected.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

    const cards = [
      { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
      { label: 'Active Today', value: stats.activeToday, icon: Activity, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
      { label: 'Trades Today', value: stats.totalTradesToday, icon: ArrowLeftRight, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
      { label: 'Platform Volume', value: formattedVolume, icon: DollarSign, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
      { label: 'Fees Collected', value: formattedFees, icon: Percent, color: 'text-teal-400 bg-teal-500/10 border-teal-500/20' },
      { label: 'Pending Withdrawals', value: stats.pendingWithdrawals, icon: Clock, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
    ];

    return (
      <div className="space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md flex flex-col justify-between h-32 relative overflow-hidden group shadow-lg"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{card.label}</span>
                <div className={`p-2.5 rounded-xl border ${card.color.split(' ')[0]} ${card.color.split(' ')[1]} ${card.color.split(' ')[2]}`}>
                  <card.icon size={16} />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-extrabold text-white mt-2 font-mono">{card.value}</h3>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily trading volume */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 shadow-xl">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Coins size={16} className="text-amber-500" />
              Daily Trading Volume (Last 7 Days)
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.volumeLast7Days} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(val) => `₹${val >= 1000 ? (val/1000) + 'k' : val}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                    labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                    itemStyle={{ color: '#10b981' }}
                    formatter={(val) => [`₹${val.toLocaleString()}`, 'Volume']}
                  />
                  <Bar dataKey="volume" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={35} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* New Signups */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 shadow-xl">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Users size={16} className="text-blue-500" />
              New User Signups (Last 7 Days)
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.signupsLast7Days} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                    labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                    itemStyle={{ color: '#3b82f6' }}
                    formatter={(val) => [val, 'Signups']}
                  />
                  <Line type="monotone" dataKey="signups" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Top Assets */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 shadow-xl">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-emerald-400" />
            Top 5 Most Traded Assets This Week
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase font-bold">
                  <th className="pb-3 text-center w-12">Rank</th>
                  <th className="pb-3">Symbol</th>
                  <th className="pb-3 text-right">Volume traded</th>
                  <th className="pb-3 text-right">Total trades</th>
                </tr>
              </thead>
              <tbody>
                {stats.topAssets.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">No trading activity recorded this week.</td>
                  </tr>
                ) : (
                  stats.topAssets.map((asset) => (
                    <tr key={asset.rank} className="border-b border-slate-800/40 last:border-none hover:bg-slate-900/20">
                      <td className="py-3.5 text-center font-bold text-slate-400">{asset.rank}</td>
                      <td className="py-3.5 font-bold text-white text-base">{asset.symbol}</td>
                      <td className="py-3.5 text-right text-emerald-400 font-bold font-mono">₹{asset.volume.toLocaleString()}</td>
                      <td className="py-3.5 text-right text-slate-300 font-mono">{asset.tradesCount}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // SECTION 2: USER MANAGEMENT
  const renderUserManagement = () => {
    const filteredUsers = users.filter(u => {
      const matchesSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
                            u.email.toLowerCase().includes(userSearch.toLowerCase());
      const matchesFilter = userFilter === 'all' || u.status === userFilter;
      return matchesSearch && matchesFilter;
    });

    return (
      <div className="space-y-6 bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 shadow-xl">
        {/* Table Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-3 text-slate-500" size={16} />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <Filter size={16} className="text-slate-500" />
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 rounded-xl py-2 px-3 text-sm text-white outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="banned">Banned</option>
            </select>
          </div>
        </div>

        {/* Row Counts */}
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Showing {filteredUsers.length} of {users.length} users
        </p>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase font-bold">
                <th className="pb-3">Name</th>
                <th className="pb-3">Email</th>
                <th className="pb-3">KYC Status</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Join Date</th>
                <th className="pb-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">No users match the search filters.</td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isActionLoading = actionLoadingUser === u._id;
                  return (
                    <tr key={u._id} className="border-b border-slate-800/40 last:border-none hover:bg-slate-900/20">
                      <td className="py-4 font-bold text-white flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-extrabold text-brand-400 border border-slate-700/60 uppercase">
                          {u.name.slice(0, 2)}
                        </div>
                        {u.name}
                      </td>
                      <td className="py-4 text-slate-300 font-medium font-mono">{u.email}</td>
                      <td className="py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          u.kycStatus === 'Verified' 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : u.kycStatus === 'Pending'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                        }`}>
                          {u.kycStatus}
                        </span>
                      </td>
                      <td className="py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          u.status === 'active' 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : u.status === 'suspended'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="py-4 text-slate-400 font-mono">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {isActionLoading ? (
                            <Loader2 size={16} className="animate-spin text-slate-500" />
                          ) : (
                            <>
                              {/* View Profile */}
                              <button
                                onClick={() => handleViewProfile(u)}
                                className="p-1.5 text-slate-400 hover:text-white bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-lg transition-colors"
                                title="View profile & portfolio"
                              >
                                <Eye size={15} />
                              </button>

                              {/* Suspend / Reactivate */}
                              {u.status === 'suspended' ? (
                                <button
                                  onClick={() => openConfirmDialog(
                                    'Reactivate User Account',
                                    `Are you sure you want to reactivate the account for ${u.name}?`,
                                    () => handleUpdateUserStatus(u._id, u.email, 'active'),
                                    'info'
                                  )}
                                  className="p-1.5 text-amber-500 hover:text-emerald-500 bg-slate-950 hover:bg-emerald-500/10 border border-slate-800 hover:border-emerald-500/20 rounded-lg transition-colors"
                                  title="Unsuspend user"
                                >
                                  <UserCheck size={15} />
                                </button>
                              ) : (
                                <button
                                  onClick={() => openConfirmDialog(
                                    'Suspend User Account',
                                    `Are you sure you want to suspend user ${u.name}? Suspended users will not be able to trade or request withdrawals.`,
                                    () => handleUpdateUserStatus(u._id, u.email, 'suspended'),
                                    'danger'
                                  )}
                                  className="p-1.5 text-slate-400 hover:text-amber-500 bg-slate-950 hover:bg-amber-500/10 border border-slate-800 hover:border-amber-500/20 rounded-lg transition-colors"
                                  title="Suspend user"
                                  disabled={u.email === ADMIN_EMAIL}
                                >
                                  <UserX size={15} />
                                </button>
                              )}

                              {/* Ban / Reinstate */}
                              {u.status === 'banned' ? (
                                <button
                                  onClick={() => openConfirmDialog(
                                    'Reinstate User Account',
                                    `Are you sure you want to reinstate the account for banned user ${u.name}?`,
                                    () => handleUpdateUserStatus(u._id, u.email, 'active'),
                                    'info'
                                  )}
                                  className="p-1.5 text-rose-500 hover:text-emerald-500 bg-slate-950 hover:bg-emerald-500/10 border border-slate-800 hover:border-emerald-500/20 rounded-lg transition-colors"
                                  title="Reinstate user"
                                >
                                  <ShieldCheck size={15} />
                                </button>
                              ) : (
                                <button
                                  onClick={() => openConfirmDialog(
                                    'BAN User Account',
                                    `CRITICAL WARNING: Are you sure you want to BAN user ${u.name}? Banned users will be locked out and cannot log in.`,
                                    () => handleUpdateUserStatus(u._id, u.email, 'banned'),
                                    'danger'
                                  )}
                                  className="p-1.5 text-slate-400 hover:text-rose-500 bg-slate-950 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/20 rounded-lg transition-colors"
                                  title="Ban user"
                                  disabled={u.email === ADMIN_EMAIL}
                                >
                                  <ShieldAlert size={15} />
                                </button>
                              )}

                              {/* Reset 2FA */}
                              <button
                                onClick={() => openConfirmDialog(
                                  'Reset 2FA Authentication',
                                  `Are you sure you want to reset the Two-Factor Authentication credentials for user ${u.name}?`,
                                  () => handleReset2FA(u._id, u.email),
                                  'danger'
                                )}
                                className="p-1.5 text-slate-400 hover:text-blue-400 bg-slate-950 hover:bg-blue-500/10 border border-slate-800 hover:border-blue-500/20 rounded-lg transition-colors"
                                title="Reset 2FA"
                              >
                                <KeyRound size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // SECTION 3: ORDERS MONITOR
  const renderOrdersMonitor = () => {
    const filteredOrders = orders.filter(o => {
      const query = orderSearch.toLowerCase();
      const symbolMatch = o.symbol.toLowerCase().includes(query);
      const userMatch = o.userId?.email?.toLowerCase().includes(query) || 
                        o.userId?.name?.toLowerCase().includes(query);
      return symbolMatch || userMatch;
    });

    return (
      <div className="space-y-6 bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 shadow-xl">
        {/* Table Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-3 text-slate-500" size={16} />
            <input
              type="text"
              placeholder="Search by Symbol or User email..."
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-all"
            />
          </div>
          {/* Live countdown badge */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2">
            <RefreshCw size={14} className="animate-spin text-brand-500" />
            <span>Auto-refreshing in <span className="text-white font-bold font-mono">{countdown}s</span></span>
          </div>
        </div>

        {/* Record count */}
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Showing {filteredOrders.length} of {orders.length} transactions
        </p>

        {/* Orders Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase font-bold">
                <th className="pb-3">User</th>
                <th className="pb-3">Asset</th>
                <th className="pb-3">Type</th>
                <th className="pb-3 text-right">Quantity</th>
                <th className="pb-3 text-right">Price</th>
                <th className="pb-3 text-right">Total amount</th>
                <th className="pb-3">Time</th>
                <th className="pb-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">No platform trade records found.</td>
                </tr>
              ) : (
                filteredOrders.map((o) => {
                  const isActionLoading = actionLoadingTx === o._id;
                  // Flag suspicious orders > ₹150,000
                  const isSuspicious = o.totalAmount >= 150000;

                  return (
                    <tr key={o._id} className={`border-b border-slate-800/40 last:border-none hover:bg-slate-900/20 ${isSuspicious ? 'bg-rose-500/5 hover:bg-rose-500/10' : ''}`}>
                      <td className="py-4 font-bold text-white">
                        <span className="block max-w-[130px] truncate" title={o.userId?.email || 'N/A'}>
                          {o.userId?.email || 'N/A'}
                        </span>
                      </td>
                      <td className="py-4">
                        <span className="font-bold text-white">{o.symbol}</span>
                      </td>
                      <td className="py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-extrabold ${
                          o.type === 'BUY' 
                            ? 'bg-emerald-500/10 text-emerald-400' 
                            : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {o.type}
                        </span>
                      </td>
                      <td className="py-4 text-right font-bold text-slate-200 font-mono">{o.quantity}</td>
                      <td className="py-4 text-right font-medium text-slate-300 font-mono">₹{o.price.toLocaleString()}</td>
                      <td className="py-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-extrabold text-white font-mono">₹{o.totalAmount.toLocaleString()}</span>
                          {isSuspicious && (
                            <span className="text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/30 px-1 py-0.2 rounded mt-0.5 font-bold flex items-center gap-0.5">
                              <AlertTriangle size={10} />
                              Suspicious (High Value)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 text-slate-400 font-mono text-xs">
                        {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        <span className="block text-[10px] text-slate-500">{new Date(o.createdAt).toLocaleDateString()}</span>
                      </td>
                      <td className="py-4 text-center">
                        {isActionLoading ? (
                          <Loader2 size={16} className="animate-spin text-slate-500 mx-auto" />
                        ) : (
                          <button
                            onClick={() => openConfirmDialog(
                              'Cancel Executed Order',
                              `WARNING: You are about to cancel this executed trade. This deletes the transaction record from history. Continue?`,
                              () => handleCancelOrder(o._id, o.symbol, o.userId?.email || 'N/A', o.quantity, o.price),
                              'danger'
                            )}
                            className="p-1.5 text-slate-500 hover:text-rose-500 bg-slate-950 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/20 rounded-lg transition-colors"
                            title="Cancel executed trade"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // SECTION 4: WITHDRAWAL QUEUE
  const renderWithdrawalQueue = () => {
    const filteredWithdrawals = withdrawals.filter(w => w.status === withdrawalTab);

    // Calculate totals for summary bar
    const totalPending = withdrawals
      .filter(w => w.status === 'pending')
      .reduce((acc, curr) => acc + curr.amount, 0);

    const today = new Date().toDateString();
    const totalApprovedToday = withdrawals
      .filter(w => w.status === 'approved' && new Date(w.createdAt).toDateString() === today)
      .reduce((acc, curr) => acc + curr.amount, 0);

    const totalRejectedToday = withdrawals
      .filter(w => w.status === 'rejected' && new Date(w.createdAt).toDateString() === today)
      .reduce((acc, curr) => acc + curr.amount, 0);

    return (
      <div className="space-y-6">
        {/* Summary Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-900/40 border border-slate-800/80 rounded-3xl p-5 backdrop-blur-md">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Pending Amount</span>
            <span className="text-xl font-extrabold text-amber-400 mt-1 font-mono">₹{totalPending.toLocaleString()}</span>
          </div>
          <div className="flex flex-col border-t sm:border-t-0 sm:border-l border-slate-800/80 pt-3 sm:pt-0 sm:pl-5">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Approved Today</span>
            <span className="text-xl font-extrabold text-emerald-400 mt-1 font-mono">₹{totalApprovedToday.toLocaleString()}</span>
          </div>
          <div className="flex flex-col border-t sm:border-t-0 sm:border-l border-slate-800/80 pt-3 sm:pt-0 sm:pl-5">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Rejected Today</span>
            <span className="text-xl font-extrabold text-rose-400 mt-1 font-mono">₹{totalRejectedToday.toLocaleString()}</span>
          </div>
        </div>

        {/* Withdrawal Status Tabs */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex border-b border-slate-800 overflow-x-auto">
            {['pending', 'approved', 'rejected', 'on_hold'].map((status) => {
              const count = withdrawals.filter(w => w.status === status).length;
              return (
                <button
                  key={status}
                  onClick={() => setWithdrawalTab(status)}
                  className={`py-3 px-6 text-sm font-bold border-b-2 capitalize whitespace-nowrap transition-all flex items-center gap-2 ${
                    withdrawalTab === status 
                      ? 'border-brand-500 text-brand-400 bg-brand-500/5' 
                      : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/20'
                  }`}
                >
                  {status.replace('_', ' ')}
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold font-mono ${
                    withdrawalTab === status ? 'bg-brand-500/20 text-brand-400' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Record Count */}
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Showing {filteredWithdrawals.length} withdrawal requests
          </p>

          {/* Withdrawals Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase font-bold">
                  <th className="pb-3">User</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Destination</th>
                  <th className="pb-3">Requested At</th>
                  <th className="pb-3 text-center">Risk Score</th>
                  {withdrawalTab === 'pending' && <th className="pb-3 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredWithdrawals.length === 0 ? (
                  <tr>
                    <td colSpan={withdrawalTab === 'pending' ? 6 : 5} className="py-12 text-center text-slate-500">
                      No withdrawals found in this category.
                    </td>
                  </tr>
                ) : (
                  filteredWithdrawals.map((w) => {
                    const isActionLoading = actionLoadingTx === w._id;
                    // Risk score model
                    const riskScore = Math.min(100, Math.floor((w.amount / 50000) * 10) + (w.amount > 100000 ? 55 : 0));
                    
                    return (
                      <tr key={w._id} className="border-b border-slate-800/40 last:border-none hover:bg-slate-900/20">
                        <td className="py-4 font-bold text-white">
                          <span className="block max-w-[130px] truncate" title={w.userId?.email || 'N/A'}>
                            {w.userId?.email || 'N/A'}
                          </span>
                        </td>
                        <td className="py-4 font-extrabold text-white font-mono">₹{w.amount.toLocaleString()}</td>
                        <td className="py-4 text-slate-300 font-medium">{w.description}</td>
                        <td className="py-4 text-slate-400 font-mono text-xs">
                          {new Date(w.createdAt).toLocaleString()}
                        </td>
                        <td className="py-4 text-center">
                          <div className="flex flex-col items-center">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full font-mono ${
                              riskScore > 75 
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                                : riskScore > 35 
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}>
                              {riskScore}%
                            </span>
                          </div>
                        </td>
                        {withdrawalTab === 'pending' && (
                          <td className="py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {isActionLoading ? (
                                <Loader2 size={16} className="animate-spin text-slate-500" />
                              ) : (
                                <>
                                  {/* Approve */}
                                  <button
                                    onClick={() => openConfirmDialog(
                                      'Approve Withdrawal',
                                      `Are you sure you want to approve this withdrawal request for ₹${w.amount.toLocaleString()}?`,
                                      () => handleUpdateWithdrawalStatus(w._id, w.userId?.email || 'N/A', w.amount, 'approved'),
                                      'info'
                                    )}
                                    className="p-1.5 text-emerald-500 hover:text-white bg-slate-950 hover:bg-emerald-500 border border-slate-800 hover:border-emerald-500 rounded-lg transition-all"
                                    title="Approve request"
                                  >
                                    <Check size={14} />
                                  </button>

                                  {/* Reject */}
                                  <button
                                    onClick={() => setReasonModalTx(w)}
                                    className="p-1.5 text-rose-500 hover:text-white bg-slate-950 hover:bg-rose-500 border border-slate-800 hover:border-rose-500 rounded-lg transition-all"
                                    title="Reject request"
                                  >
                                    <X size={14} />
                                  </button>

                                  {/* On Hold */}
                                  <button
                                    onClick={() => openConfirmDialog(
                                      'Put Withdrawal on Hold',
                                      `Put this withdrawal request on hold? This will notify the user of a compliance review.`,
                                      () => handleUpdateWithdrawalStatus(w._id, w.userId?.email || 'N/A', w.amount, 'on_hold'),
                                      'info'
                                    )}
                                    className="p-1.5 text-amber-500 hover:text-white bg-slate-950 hover:bg-amber-500 border border-slate-800 hover:border-amber-500 rounded-lg transition-all"
                                    title="Put on hold"
                                  >
                                    <Clock size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // SECTION 5: ASSET LIMITS (enhanced)
  const renderAssetLimits = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form: Add Limit */}
        <div className="lg:col-span-1">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 shadow-xl sticky top-24">
            <div className="flex items-center gap-2 mb-6">
              <Database className="text-brand-500" size={20} />
              <h2 className="text-lg font-bold text-white">Create Asset Limit</h2>
            </div>

            <form onSubmit={handleAddAsset} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Asset Symbol</label>
                <input
                  type="text"
                  placeholder="e.g. BTC, TSLA, USD/INR"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 rounded-xl py-2.5 px-4 text-sm text-white outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Asset Name</label>
                <input
                  type="text"
                  placeholder="e.g. Bitcoin, Tesla, Dollar-Rupee"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 rounded-xl py-2.5 px-4 text-sm text-white outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Asset Type</label>
                <select
                  value={assetType}
                  onChange={(e) => setAssetType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 rounded-xl py-2.5 px-4 text-sm text-white outline-none"
                >
                  <option value="crypto">Cryptocurrency</option>
                  <option value="stock">Stock Equity</option>
                  <option value="forex">Foreign Exchange (Forex)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Total Allowed Quantity</label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 1000, 250"
                  value={totalQuantity}
                  onChange={(e) => setTotalQuantity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 rounded-xl py-2.5 px-4 text-sm text-white outline-none transition-all"
                  required
                  min="0"
                />
              </div>

              <button
                type="submit"
                disabled={submitLoading}
                className="w-full bg-brand-500 hover:bg-brand-600 active:scale-[0.98] text-white py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25 disabled:opacity-60 mt-6"
              >
                {submitLoading ? <Loader2 size={18} className="animate-spin" /> : <><Plus size={16} /><span>Add Limit</span></>}
              </button>
            </form>
          </div>
        </div>

        {/* Table: Limits List */}
        <div className="lg:col-span-2">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <BarChart4 className="text-brand-500" size={20} />
                <h2 className="text-lg font-bold text-white">Active Asset Limits</h2>
              </div>
              <button
                onClick={() => fetchData('assets')}
                disabled={loading}
                className="p-2 text-slate-400 hover:text-white bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl transition-colors"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>

            {loading && assets.length === 0 ? (
              <div className="py-24 text-center">
                <Loader2 size={36} className="animate-spin text-brand-500 mx-auto mb-4" />
                <p className="text-slate-400 text-sm">Loading limits...</p>
              </div>
            ) : assets.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-slate-800 rounded-2xl">
                <Coins size={36} className="text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 font-medium text-sm">No asset restrictions configured.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase font-bold">
                      <th className="pb-3">Symbol</th>
                      <th className="pb-3">Type</th>
                      <th className="pb-3 text-right">Limit Quantity</th>
                      <th className="pb-3">Usage & Progress</th>
                      <th className="pb-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map((asset) => {
                      const isEditing = editingSymbol === asset.symbol;
                      const isActionLoading = actionLoadingSymbol === asset.symbol;
                      
                      // Calculate remaining progress bar
                      const remainingPercent = asset.totalQuantity > 0 
                        ? (asset.remainingQuantity / asset.totalQuantity) * 100 
                        : 0;
                      const isWarning = remainingPercent < 20;

                      return (
                        <tr key={asset.symbol} className="border-b border-slate-800/40 last:border-none hover:bg-slate-900/20">
                          <td className="py-4">
                            <span className="font-extrabold text-white block text-base">{asset.symbol}</span>
                            <span className="text-slate-400 text-xs truncate max-w-[130px] block">{asset.name}</span>
                          </td>
                          <td className="py-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                              asset.assetType === 'crypto' 
                                ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' 
                                : asset.assetType === 'stock'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {asset.assetType}
                            </span>
                          </td>
                          <td className="py-4 text-right">
                            {isEditing ? (
                              <input
                                type="number"
                                step="any"
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                className="w-20 bg-slate-950 border border-brand-500 text-right text-sm text-white px-2 py-1 rounded outline-none"
                                autoFocus
                              />
                            ) : (
                              <span className="font-bold text-white font-mono">{asset.totalQuantity}</span>
                            )}
                          </td>
                          <td className="py-4">
                            <div className="w-40">
                              <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold mb-1">
                                <span>Rem: <strong className="text-slate-200">{asset.remainingQuantity.toFixed(2)}</strong></span>
                                <span className={isWarning ? 'text-rose-400 flex items-center gap-0.5 font-extrabold' : 'text-slate-400'}>
                                  {isWarning && <AlertTriangle size={10} />}
                                  {remainingPercent.toFixed(0)}%
                                </span>
                              </div>
                              <div className="w-full bg-slate-950 h-1.5 border border-slate-900 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    isWarning ? 'bg-rose-500' : 'bg-brand-500'
                                  }`} 
                                  style={{ width: `${Math.max(0, Math.min(100, remainingPercent))}%` }} 
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {isActionLoading ? (
                                <Loader2 size={16} className="animate-spin text-slate-500" />
                              ) : isEditing ? (
                                <>
                                  <button
                                    onClick={() => handleUpdateQuantity(asset)}
                                    className="p-1.5 text-emerald-400 hover:text-white bg-slate-950 hover:bg-emerald-500 border border-slate-800 hover:border-emerald-500 rounded-lg"
                                    title="Save limit"
                                  >
                                    <Check size={13} />
                                  </button>
                                  <button
                                    onClick={() => setEditingSymbol(null)}
                                    className="p-1.5 text-slate-400 hover:text-white bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-lg"
                                    title="Cancel"
                                  >
                                    <X size={13} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditingSymbol(asset.symbol);
                                      setEditingValue(asset.totalQuantity.toString());
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-white bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-lg"
                                    title="Edit quantity"
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmAsset(asset)}
                                    className="p-1.5 text-slate-500 hover:text-rose-500 bg-slate-950 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/20 rounded-lg"
                                    title="Delete limit"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // SECTION 6: PLATFORM SETTINGS
  const renderPlatformSettings = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Global fee % and Maintenance toggle */}
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Settings className="text-brand-500" size={20} />
              Global Trading Config
            </h3>

            <div className="space-y-5">
              {/* Fee rate Input */}
              <div className="flex flex-col">
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Global Trading Fee (%)</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="10"
                      value={settingsFee}
                      onChange={(e) => setSettingsFee(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 rounded-xl py-2.5 px-4 text-sm text-white outline-none"
                    />
                    <Percent className="absolute right-3.5 top-3 text-slate-500" size={16} />
                  </div>
                  <button
                    onClick={() => handleSaveSettings('tradingFeePercent', parseFloat(settingsFee))}
                    disabled={settingsLoading}
                    className="bg-brand-500 hover:bg-brand-600 active:scale-[0.98] py-2 px-5 text-sm font-bold text-white rounded-xl shadow-lg shadow-brand-500/25 transition-all"
                  >
                    {settingsLoading ? <Loader2 size={16} className="animate-spin" /> : 'Save'}
                  </button>
                </div>
              </div>

              <hr className="border-slate-800" />

              {/* Maintenance toggle */}
              <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl border ${
                    settings.maintenanceMode 
                      ? 'text-rose-500 bg-rose-500/10 border-rose-500/20' 
                      : 'text-slate-400 bg-slate-800/40 border-slate-800'
                  }`}>
                    <Power size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">System Maintenance Mode</h4>
                    <p className="text-xs text-slate-400">Halts all user-side trades & transfers immediately.</p>
                  </div>
                </div>
                <button
                  onClick={() => handleSaveSettings('maintenanceMode', !settings.maintenanceMode)}
                  disabled={settingsLoading}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    settings.maintenanceMode ? 'bg-rose-600' : 'bg-slate-700'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.maintenanceMode ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          {/* Broadcaster */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Radio className="text-blue-400" size={20} />
              Announcement Broadcaster
            </h3>

            <div className="space-y-4">
              <p className="text-xs text-slate-400">Broadcasting will publish a banner alert to all active user dashboards instantly.</p>
              <textarea
                placeholder="Type your system announcement message here..."
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 rounded-xl py-3 px-4 text-sm text-white placeholder-slate-600 outline-none h-28 resize-none transition-all"
              />
              <button
                onClick={handleBroadcastAnnouncement}
                className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] py-2.5 rounded-xl font-bold text-sm text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25"
              >
                <Volume2 size={16} />
                <span>Broadcast Announcement</span>
              </button>
            </div>
          </div>
        </div>

        {/* User Tier limits editor */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 shadow-xl">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Coins className="text-emerald-400" size={20} />
            User Tier Settings
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase font-bold">
                  <th className="pb-3">Tier Name</th>
                  <th className="pb-3 text-right">Withdraw Limit (₹)</th>
                  <th className="pb-3 text-right">Fee Discount (%)</th>
                  <th className="pb-3 text-center">Edit</th>
                </tr>
              </thead>
              <tbody>
                {settings.userTiers && settings.userTiers.map((tier, idx) => {
                  const isEditing = editingTierIdx === idx;
                  return (
                    <tr key={tier.tier} className="border-b border-slate-800/40 last:border-none hover:bg-slate-900/10">
                      <td className="py-4 font-bold text-white">{tier.tier}</td>
                      <td className="py-4 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editingTierValue.withdrawalLimit}
                            onChange={(e) => setEditingTierValue({ ...editingTierValue, withdrawalLimit: e.target.value })}
                            className="w-24 bg-slate-950 border border-brand-500 text-right px-2 py-1 rounded text-sm text-white"
                          />
                        ) : (
                          <span className="font-bold text-slate-200 font-mono">₹{tier.withdrawalLimit.toLocaleString()}</span>
                        )}
                      </td>
                      <td className="py-4 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editingTierValue.feeDiscount}
                            onChange={(e) => setEditingTierValue({ ...editingTierValue, feeDiscount: e.target.value })}
                            className="w-16 bg-slate-950 border border-brand-500 text-right px-2 py-1 rounded text-sm text-white"
                          />
                        ) : (
                          <span className="font-bold text-slate-200 font-mono">{tier.feeDiscount}%</span>
                        )}
                      </td>
                      <td className="py-4 text-center">
                        {isEditing ? (
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => handleSaveTier(idx)}
                              className="p-1 text-emerald-400 hover:text-white bg-slate-950 hover:bg-emerald-500 border border-slate-800 rounded"
                            >
                              <Check size={13} />
                            </button>
                            <button
                              onClick={() => setEditingTierIdx(null)}
                              className="p-1 text-slate-400 hover:text-white bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingTierIdx(idx);
                              setEditingTierValue({
                                withdrawalLimit: tier.withdrawalLimit.toString(),
                                feeDiscount: tier.feeDiscount.toString()
                              });
                            }}
                            className="p-1 text-slate-400 hover:text-white bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded"
                          >
                            <Edit2 size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // SECTION 7: AUDIT LOG
  const renderAccountSettings = () => {
    const authProvider = user?.authProvider || 'local';
    const hasPassword = Boolean(user?.hasPassword);
    const statusCards = [
      { label: 'Email', value: user?.email || ADMIN_EMAIL, accent: 'text-slate-200' },
      { label: 'Auth Provider', value: authProvider === 'google' ? 'Google' : 'Local', accent: 'text-brand-400' },
      { label: 'Has Password', value: hasPassword ? 'Enabled' : 'Not set', accent: hasPassword ? 'text-brand-400' : 'text-amber-400' },
    ];

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Account Settings</h2>
          <p className="text-sm text-slate-400 mt-1">Manage admin sign-in methods and application password access.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {statusCards.map((card) => (
            <div key={card.label} className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{card.label}</span>
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400">
                  {card.label === 'Email' && <Users size={15} />}
                  {card.label === 'Auth Provider' && <ShieldCheck size={15} />}
                  {card.label === 'Has Password' && <KeyRound size={15} />}
                </div>
              </div>
              <p className={`text-base font-extrabold break-words ${card.accent}`}>{card.value}</p>
            </div>
          ))}
        </div>

        <AccountPasswordForm
          hasPassword={hasPassword}
          theme="admin"
          onSaved={(updatedUser) => {
            showStatus(updatedUser?.hasPassword ? 'Admin password saved successfully.' : 'Account updated.', 'success');
          }}
        />
      </div>
    );
  };

  // SECTION 8: AUDIT LOG
  const renderAuditLog = () => {
    const filteredLogs = auditLog.filter(log => {
      const matchesSearch = log.target.toLowerCase().includes(auditSearch.toLowerCase()) || 
                            log.description.toLowerCase().includes(auditSearch.toLowerCase());
      const matchesFilter = auditFilter === 'all' || log.actionType === auditFilter;
      return matchesSearch && matchesFilter;
    });

    return (
      <div className="space-y-6 bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 shadow-xl">
        {/* Table Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-3 text-slate-500" size={16} />
            <input
              type="text"
              placeholder="Search description or target..."
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
            <Filter size={16} className="text-slate-500" />
            <select
              value={auditFilter}
              onChange={(e) => setAuditFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 rounded-xl py-2 px-3 text-sm text-white outline-none"
            >
              <option value="all">All Action Types</option>
              <option value="Asset Limits">Asset Limits</option>
              <option value="User Management">User Management</option>
              <option value="Orders Monitor">Orders Monitor</option>
              <option value="Withdrawal Queue">Withdrawals</option>
              <option value="Platform Settings">Settings</option>
            </select>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-brand-400 py-2 px-4 rounded-xl text-sm font-bold transition-all shadow-md"
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Record count */}
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Showing {filteredLogs.length} admin action logs
        </p>

        {/* Audit Log Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase font-bold">
                <th className="pb-3">Timestamp</th>
                <th className="pb-3">Admin</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Target</th>
                <th className="pb-3">Description</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">No admin activities logged yet.</td>
                </tr>
              ) : (
                filteredLogs.map((log, idx) => (
                  <tr key={idx} className="border-b border-slate-800/40 last:border-none hover:bg-slate-900/10">
                    <td className="py-3.5 text-slate-400 font-mono text-xs whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3.5 text-slate-300 font-semibold">{log.adminEmail}</td>
                    <td className="py-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-slate-800 text-slate-300 border border-slate-700/60">
                        {log.actionType}
                      </span>
                    </td>
                    <td className="py-3.5 font-bold text-white truncate max-w-[150px]" title={log.target}>
                      {log.target}
                    </td>
                    <td className="py-3.5 text-slate-300 max-w-[300px] truncate" title={log.description}>
                      {log.description}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden">
      {/* ── Background decoration ── */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-brand-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-danger-500/5 rounded-full blur-[120px] pointer-events-none" />
      
      {/* ── Top Header / Navbar ── */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-slate-950 border-b border-slate-900 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-brand-600 to-brand-500 p-2.5 rounded-2xl text-white shadow-lg shadow-brand-500/25">
              <TrendingUp size={22} className="animate-pulse" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-brand-500 to-emerald-400 bg-clip-text text-transparent">
                AI QUANT
              </span>
              <span className="ml-2 text-xs font-semibold uppercase tracking-widest bg-brand-500/10 text-brand-500 px-2 py-0.5 rounded-md border border-brand-500/20">
                Admin
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col text-right">
              <p className="text-xs text-slate-400 font-medium">Logged in as admin</p>
              <p className="text-sm font-semibold text-slate-200">{user?.email || ADMIN_EMAIL}</p>
            </div>
            
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 py-2 px-4 rounded-xl text-sm font-bold transition-all duration-150 text-danger-500 group shadow-md"
            >
              <LogOut size={16} className="group-hover:translate-x-0.5 transition-transform" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Toast Notifications — positioned above everything */}
      <AnimatePresence>
        {message.text && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-20 right-4 z-[60] p-4 rounded-2xl shadow-xl flex items-center gap-3 max-w-md border ${
              message.type === 'success' 
                ? 'bg-emerald-950/90 border-brand-500/30 text-brand-400' 
                : 'bg-rose-950/90 border-danger-500/30 text-rose-400'
            }`}
          >
            {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span className="text-sm font-semibold">{message.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Fixed Sidebar Navigation ── */}
      <aside className="hidden lg:block fixed top-16 left-0 w-60 h-[calc(100vh-4rem)] bg-slate-950 border-r border-slate-900 z-40 overflow-y-auto">
        <div className="p-4 space-y-1">
          <span className="block px-4 py-2 text-[10px] font-extrabold uppercase text-slate-500 tracking-widest">
            Navigation
          </span>

          {adminTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                activeTab === tab.id 
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <tab.icon size={17} />
                <span>{tab.label}</span>
              </div>
              <ChevronRight size={14} className={activeTab === tab.id ? 'opacity-100 translate-x-0.5 transition-transform' : 'opacity-0'} />
            </button>
          ))}
        </div>
      </aside>

      {/* ── Mobile Sidebar (scrolls horizontally at top) ── */}
      <div className="lg:hidden fixed top-16 left-0 right-0 bg-slate-950 border-b border-slate-900 z-40 overflow-x-auto">
        <div className="flex gap-1 p-2 min-w-max">
          {adminTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === tab.id 
                  ? 'bg-brand-500 text-white' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <tab.icon size={14} />
              <span>{tab.mobileLabel}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Content Area (only this scrolls) ── */}
      <main className="mt-16 lg:ml-60 h-[calc(100vh-4rem)] overflow-y-auto">
        {/* On mobile, account for the horizontal tab bar */}
        <div className="pt-12 lg:pt-0 p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === 'dashboard' && renderDashboard()}
              {activeTab === 'users' && renderUserManagement()}
              {activeTab === 'orders' && renderOrdersMonitor()}
              {activeTab === 'withdrawals' && renderWithdrawalQueue()}
              {activeTab === 'assets' && renderAssetLimits()}
              {activeTab === 'settings' && renderPlatformSettings()}
              {activeTab === 'account-settings' && renderAccountSettings()}
              {activeTab === 'audit' && renderAuditLog()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* ── Global Confirmation Dialog ── */}
      <AnimatePresence>
        {confirmDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-xs"
              onClick={() => setConfirmDialog(null)}
            />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md relative z-10 shadow-2xl"
            >
              <h3 className="text-lg font-bold text-white mb-2">{confirmDialog.title}</h3>
              <p className="text-sm text-slate-400 mb-6">{confirmDialog.message}</p>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="bg-slate-950 hover:bg-slate-900 border border-slate-800 py-2 px-4 rounded-xl text-sm font-bold transition-colors text-slate-400"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    confirmDialog.onConfirm();
                    setConfirmDialog(null);
                  }}
                  className={`py-2 px-4 rounded-xl text-sm font-bold transition-colors text-white shadow-lg active:scale-[0.98] ${
                    confirmDialog.type === 'danger' 
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/15' 
                      : 'bg-brand-500 hover:bg-brand-600 shadow-brand-500/15'
                  }`}
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── User Profile Detail Modal (User management) ── */}
      <AnimatePresence>
        {profileModalUser && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 top-16 bg-black/70 backdrop-blur-xs z-20"
              onClick={() => setProfileModalUser(null)}
            />

            {/* Slide-over Panel Container */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', ease: 'easeOut', duration: 0.3 }}
              className="fixed right-0 bg-slate-900 border-l border-slate-800 w-full max-w-3xl overflow-y-auto z-30 shadow-2xl p-6 space-y-6"
              style={{
                top: '64px',
                height: 'calc(100vh - 64px)'
              }}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-850 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 text-lg font-extrabold uppercase">
                    {profileModalUser.name.slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{profileModalUser.name}</h3>
                    <p className="text-sm text-slate-400 font-mono">{profileModalUser.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setProfileModalUser(null)}
                  className="p-1.5 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              {profileLoading ? (
                <div className="py-20 text-center">
                  <Loader2 size={36} className="animate-spin text-brand-500 mx-auto mb-4" />
                  <p className="text-slate-400 text-sm">Retrieving profile portfolio & history...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Holdings & Metadata details */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">Portfolio Asset Holdings</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {profileModalData.holdings.length === 0 ? (
                        <div className="col-span-2 py-6 text-center border border-dashed border-slate-800 rounded-2xl text-slate-500 text-sm">
                          User does not hold any assets.
                        </div>
                      ) : (
                        profileModalData.holdings.map((h, idx) => (
                          <div key={idx} className="p-4 bg-slate-950 border border-slate-850 rounded-2xl flex justify-between items-center">
                            <div>
                              <span className="font-extrabold text-white block text-base">{h.symbol}</span>
                              <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded font-bold uppercase">{h.assetType}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-slate-200 block font-mono">Qty: {h.quantity}</span>
                              <span className="text-xs text-slate-400 font-mono">Avg Price: ₹{h.averageBuyPrice.toLocaleString()}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Trade History */}
                  <div className="space-y-2">
                    <div className="py-3">
                      <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Recent Trade Orders</h4>
                    </div>
                    <div className="bg-slate-950 border border-slate-850 rounded-2xl overflow-hidden">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-900">
                          <tr className="border-b border-slate-850 bg-slate-900 text-slate-400 uppercase font-bold">
                            <th className="p-3">Asset</th>
                            <th className="p-3">Type</th>
                            <th className="p-3 text-right">Quantity</th>
                            <th className="p-3 text-right">Price</th>
                            <th className="p-3">Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {profileModalData.trades.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-6 text-center text-slate-600">No trades completed yet.</td>
                            </tr>
                          ) : (
                            profileModalData.trades.map((t) => (
                              <tr key={t._id} className="border-b border-slate-850/40 last:border-none hover:bg-slate-900/10">
                                <td className="p-3 font-bold text-white">{t.symbol}</td>
                                <td className="p-3">
                                  <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-extrabold ${
                                    t.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                                  }`}>
                                    {t.type}
                                  </span>
                                </td>
                                <td className="p-3 text-right font-bold text-slate-300 font-mono">{t.quantity}</td>
                                <td className="p-3 text-right font-medium text-slate-400 font-mono">₹{t.price.toLocaleString()}</td>
                                <td className="p-3 text-slate-400 font-mono">{new Date(t.createdAt).toLocaleDateString()}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Wallet Ledger */}
                  <div className="space-y-2">
                    <div className="py-3">
                      <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Wallet Ledger History</h4>
                    </div>
                    <div className="bg-slate-950 border border-slate-850 rounded-2xl overflow-hidden">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-900">
                          <tr className="border-b border-slate-850 bg-slate-900 text-slate-400 uppercase font-bold">
                            <th className="p-3">Type</th>
                            <th className="p-3">Amount</th>
                            <th className="p-3">Description</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {profileModalData.walletTxs.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-6 text-center text-slate-600">No transactions recorded.</td>
                            </tr>
                          ) : (
                            profileModalData.walletTxs.map((tx) => (
                              <tr key={tx._id} className="border-b border-slate-850/40 last:border-none hover:bg-slate-900/10">
                                <td className="p-3 font-bold">
                                  <span className={tx.transactionType === 'CREDIT' ? 'text-emerald-400' : 'text-amber-400'}>
                                    {tx.transactionType}
                                  </span>
                                </td>
                                <td className="p-3 font-extrabold text-white font-mono">₹{tx.amount.toLocaleString()}</td>
                                <td className="p-3 text-slate-300">{tx.description}</td>
                                <td className="p-3">
                                  <span className={`inline-flex px-1.5 py-0.2 rounded font-extrabold capitalize text-[10px] ${
                                    tx.status === 'approved' 
                                      ? 'bg-emerald-500/15 text-emerald-400' 
                                      : tx.status === 'pending'
                                      ? 'bg-amber-500/15 text-amber-400 animate-pulse'
                                      : tx.status === 'on_hold'
                                      ? 'bg-blue-500/15 text-blue-400'
                                      : 'bg-rose-500/15 text-rose-400'
                                  }`}>
                                    {tx.status}
                                  </span>
                                </td>
                                <td className="p-3 text-slate-400 font-mono">{new Date(tx.createdAt).toLocaleDateString()}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Rejection Reason Modal (Withdrawal queue) ── */}
      <AnimatePresence>
        {reasonModalTx && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-xs"
              onClick={() => setReasonModalTx(null)}
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md relative z-10 shadow-2xl space-y-4"
            >
              <h3 className="text-lg font-bold text-white">Specify Rejection Reason</h3>
              <p className="text-sm text-slate-400">
                Please provide a brief explanation for rejecting the withdrawal of{' '}
                <span className="font-bold text-white">₹{reasonModalTx.amount.toLocaleString()}</span> for{' '}
                <span className="font-bold text-white">{reasonModalTx.userId?.email || 'N/A'}</span>.
              </p>

              <input
                type="text"
                placeholder="e.g. Invalid bank details, Suspicious AML check"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 rounded-xl py-2.5 px-4 text-sm text-white placeholder-slate-600 outline-none"
              />

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setReasonModalTx(null)}
                  className="bg-slate-950 hover:bg-slate-900 border border-slate-800 py-2 px-4 rounded-xl text-sm font-bold text-slate-400"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUpdateWithdrawalStatus(
                    reasonModalTx._id, 
                    reasonModalTx.userId?.email || 'N/A', 
                    reasonModalTx.amount, 
                    'rejected', 
                    rejectionReason
                  )}
                  disabled={!rejectionReason.trim()}
                  className="bg-rose-600 hover:bg-rose-700 active:scale-[0.98] py-2 px-4 rounded-xl text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-rose-600/15"
                >
                  Reject Request
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Delete asset limits confirmation (original preserved) */}
      <AnimatePresence>
        {deleteConfirmAsset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-xs"
              onClick={() => setDeleteConfirmAsset(null)}
            />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md relative z-10 shadow-2xl"
            >
              <h3 className="text-lg font-bold text-white mb-2">Delete Limit Restriction</h3>
              <p className="text-sm text-slate-400 mb-6">
                Are you sure you want to remove the trading limit for{' '}
                <span className="font-extrabold text-white">{deleteConfirmAsset.symbol}</span>? 
                This will allow users to buy any quantity of this asset.
              </p>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirmAsset(null)}
                  className="bg-slate-950 hover:bg-slate-900 border border-slate-800 py-2 px-4 text-sm font-bold text-slate-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAsset}
                  className="bg-rose-600 hover:bg-rose-700 active:scale-[0.98] py-2 px-4 text-sm font-bold text-white shadow-lg shadow-rose-500/15"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminPanel;
