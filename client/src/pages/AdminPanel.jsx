import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  BarChart4
} from 'lucide-react';
import { logout } from '../redux/authSlice.js';
import { adminAPI } from '../services/api.js';

const AdminPanel = () => {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [actionLoadingSymbol, setActionLoadingSymbol] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' }); // type: 'success' | 'error'
  
  // Form fields
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [assetType, setAssetType] = useState('crypto');
  const [totalQuantity, setTotalQuantity] = useState('');

  // Editing state
  const [editingSymbol, setEditingSymbol] = useState(null);
  const [editingValue, setEditingValue] = useState('');

  // Delete confirmation modal state
  const [deleteConfirmAsset, setDeleteConfirmAsset] = useState(null);

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  // Fetch all assets
  const fetchAssets = async () => {
    try {
      setLoading(true);
      const { data } = await adminAPI.getAssets();
      setAssets(data);
    } catch (error) {
      showStatus(error.response?.data?.message || 'Failed to fetch assets.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const showStatus = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => {
      setMessage({ text: '', type: '' });
    }, 4000);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
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

  // Start inline editing
  const startEditing = (asset) => {
    setEditingSymbol(asset.symbol);
    setEditingValue(asset.totalQuantity.toString());
  };

  // Submit Quantity Update
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
      
      // Update local state
      setAssets(assets.map(a => a.symbol === asset.symbol ? data : a));
    } catch (error) {
      showStatus(error.response?.data?.message || 'Failed to update asset limit.', 'error');
    } finally {
      setActionLoadingSymbol('');
      setEditingSymbol(null);
    }
  };

  // Confirm delete handler
  const handleDeleteAsset = async () => {
    if (!deleteConfirmAsset) return;
    
    const symbolToDelete = deleteConfirmAsset.symbol;
    try {
      setActionLoadingSymbol(symbolToDelete);
      await adminAPI.deleteAsset(symbolToDelete);
      showStatus(`Deleted limit for ${symbolToDelete}.`, 'success');
      
      // Update local state
      setAssets(assets.filter(a => a.symbol !== symbolToDelete));
    } catch (error) {
      showStatus(error.response?.data?.message || 'Failed to delete asset limit.', 'error');
    } finally {
      setActionLoadingSymbol('');
      setDeleteConfirmAsset(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden pb-12">
      {/* ── Background decoration ── */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-brand-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-danger-500/5 rounded-full blur-[120px] pointer-events-none" />
      
      {/* ── Top Header / Navbar ── */}
      <header className="sticky top-0 bg-slate-950/80 backdrop-blur-md border-b border-slate-900 z-40">
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
              <p className="text-sm font-semibold text-slate-200">{user?.email || 'eitishkoundal34@gmail.com'}</p>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
        
        {/* Toast notifications */}
        <AnimatePresence>
          {message.text && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`fixed top-20 right-4 z-50 p-4 rounded-2xl shadow-xl flex items-center gap-3 max-w-md border ${
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

        {/* ── Form: Add New Asset Limit ── */}
        <div className="lg:col-span-1">
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-xl sticky top-24">
            <div className="flex items-center gap-2 mb-6">
              <Database className="text-brand-500" size={20} />
              <h2 className="text-lg font-bold text-white">Create Asset Limit</h2>
            </div>

            <form onSubmit={handleAddAsset} className="space-y-4">
              {/* Symbol */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Asset Symbol
                </label>
                <input
                  type="text"
                  placeholder="e.g. BTC, TSLA, ETH"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 rounded-xl py-2.5 px-4 text-sm text-white placeholder-slate-600 outline-none transition-all duration-150"
                  required
                />
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Asset Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bitcoin, Tesla Inc."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 rounded-xl py-2.5 px-4 text-sm text-white placeholder-slate-600 outline-none transition-all duration-150"
                  required
                />
              </div>

              {/* Asset Type Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Asset Type
                </label>
                <select
                  value={assetType}
                  onChange={(e) => setAssetType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 rounded-xl py-2.5 px-4 text-sm text-white outline-none transition-all duration-150"
                >
                  <option value="crypto">Cryptocurrency</option>
                  <option value="stock">Stock Equity</option>
                </select>
              </div>

              {/* Total Quantity */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Total Allowed Quantity
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 1000, 50"
                  value={totalQuantity}
                  onChange={(e) => setTotalQuantity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 rounded-xl py-2.5 px-4 text-sm text-white placeholder-slate-600 outline-none transition-all duration-150"
                  required
                  min="0"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitLoading}
                className="w-full bg-brand-500 hover:bg-brand-600 active:scale-[0.98] text-white py-2.5 rounded-xl font-bold text-sm transition-all duration-150 flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25 disabled:opacity-60 disabled:cursor-not-allowed mt-6"
              >
                {submitLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <Plus size={16} />
                    <span>Add Limit</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* ── Table: Asset Limits List ── */}
        <div className="lg:col-span-2">
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <BarChart4 className="text-brand-500" size={20} />
                <h2 className="text-lg font-bold text-white">Active Asset Limits</h2>
              </div>
              <button
                onClick={fetchAssets}
                disabled={loading}
                className="p-2 text-slate-400 hover:text-white bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl transition-colors"
                title="Refresh List"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>

            {loading && assets.length === 0 ? (
              <div className="py-24 text-center">
                <Loader2 size={36} className="animate-spin text-brand-500 mx-auto mb-4" />
                <p className="text-slate-400 text-sm">Loading asset restrictions...</p>
              </div>
            ) : assets.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-slate-800 rounded-2xl">
                <Coins size={36} className="text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 font-medium text-sm">No asset restrictions configured.</p>
                <p className="text-slate-500 text-xs mt-1">Users can trade all assets without limit constraints.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase font-bold">
                      <th className="pb-3">Symbol</th>
                      <th className="pb-3">Name</th>
                      <th className="pb-3">Type</th>
                      <th className="pb-3 text-right">Total Limit</th>
                      <th className="pb-3 text-right">Remaining</th>
                      <th className="pb-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map((asset) => {
                      const isEditing = editingSymbol === asset.symbol;
                      const isActionLoading = actionLoadingSymbol === asset.symbol;

                      return (
                        <tr key={asset.symbol} className="border-b border-slate-800/40 hover:bg-slate-900/20 last:border-none transition-colors">
                          <td className="py-4 font-bold text-white text-base">
                            {asset.symbol}
                          </td>
                          <td className="py-4 text-slate-300 font-medium truncate max-w-[140px]">
                            {asset.name}
                          </td>
                          <td className="py-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold capitalize ${
                              asset.assetType === 'crypto' 
                                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
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
                                onBlur={() => handleUpdateQuantity(asset)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleUpdateQuantity(asset);
                                  if (e.key === 'Escape') setEditingSymbol(null);
                                }}
                                className="w-20 bg-slate-950 border border-brand-500 text-right text-sm text-white px-2 py-1 rounded outline-none"
                                autoFocus
                              />
                            ) : (
                              <div
                                onClick={() => startEditing(asset)}
                                className="cursor-pointer hover:bg-slate-800/50 px-2 py-1 rounded inline-block text-right border border-transparent hover:border-slate-800 text-slate-100 font-bold transition-all"
                                title="Click to edit limit"
                              >
                                {asset.totalQuantity}
                              </div>
                            )}
                          </td>
                          <td className="py-4 text-right">
                            <span className={`font-bold ${
                              asset.remainingQuantity > 0 ? 'text-brand-500' : 'text-danger-500'
                            }`}>
                              {asset.remainingQuantity}
                            </span>
                          </td>
                          <td className="py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {isActionLoading ? (
                                <Loader2 size={16} className="animate-spin text-slate-500" />
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirmAsset(asset)}
                                  className="p-1.5 text-slate-500 hover:text-danger-500 bg-slate-950 hover:bg-danger-500/10 border border-slate-800 hover:border-danger-500/20 rounded-lg transition-colors"
                                  title="Delete restriction"
                                >
                                  <Trash2 size={15} />
                                </button>
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
      </main>

      {/* ── Confirmation Modal ── */}
      <AnimatePresence>
        {deleteConfirmAsset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black"
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
                  className="bg-slate-950 hover:bg-slate-900 border border-slate-800 py-2 px-4 rounded-xl text-sm font-bold transition-colors text-slate-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAsset}
                  className="bg-danger-500 hover:bg-danger-600 active:scale-[0.98] py-2 px-4 rounded-xl text-sm font-bold transition-colors text-white shadow-lg shadow-danger-500/15"
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
