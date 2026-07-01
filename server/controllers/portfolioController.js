import Holding from '../models/Holding.js';
import Transaction from '../models/Transaction.js';
import WalletTransaction from '../models/WalletTransaction.js';
import * as marketService from '../services/marketService.js';

// Helper to get wallet balance
const getBalanceHelper = async (userId) => {
  const ledger = await WalletTransaction.find({ userId });
  let totalCredits = 0;
  let totalDebits = 0;
  ledger.forEach((tx) => {
    if (tx.transactionType === 'CREDIT') totalCredits += tx.amount;
    else if (tx.transactionType === 'DEBIT') totalDebits += tx.amount;
  });
  return {
    balance: totalCredits - totalDebits,
    totalCredits,
    totalDebits,
  };
};

// @desc    Get portfolio holdings enriched with live rates
// @route   GET /api/portfolio/holdings
// @access  Private
export const getPortfolioHoldings = async (req, res) => {
  try {
    const holdings = await Holding.find({ userId: req.user._id });
    
    const enrichedHoldings = holdings.map((h) => {
      const live = marketService.getAssetBySymbol(h.symbol);
      const currentPrice = live ? live.price : h.averageBuyPrice;
      const change = live ? live.change : 0;
      const name = live ? live.name : h.symbol;
      
      const investmentAmount = h.quantity * h.averageBuyPrice;
      const currentValue = h.quantity * currentPrice;
      const profitLoss = currentValue - investmentAmount;
      const returnPercent = investmentAmount > 0 ? (profitLoss / investmentAmount) * 100 : 0;

      // Daily Profit/Loss based on current price change today
      // e.g. priceChangeToday = currentPrice - (currentPrice / (1 + change/100))
      const priceChangeToday = live ? (currentPrice - (currentPrice / (1 + change / 100))) : 0;
      const todayProfitLoss = h.quantity * priceChangeToday;

      return {
        _id: h._id,
        symbol: h.symbol,
        name,
        assetType: h.assetType,
        category: live?.category || null,
        unit: live?.unit || null,
        quantity: h.quantity,
        averageBuyPrice: h.averageBuyPrice,
        currentPrice,
        change,
        investmentAmount,
        currentValue,
        profitLoss,
        returnPercent,
        todayProfitLoss,
      };
    });

    res.json(enrichedHoldings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get dashboard metrics, charts data, and insights
// @route   GET /api/portfolio/dashboard
// @access  Private
export const getDashboardData = async (req, res) => {
  try {
    const { balance, totalCredits, totalDebits } = await getBalanceHelper(req.user._id);
    const holdings = await Holding.find({ userId: req.user._id });
    
    let totalInvestment = 0;
    let currentPortfolioValue = 0;
    let totalTodayProfitLoss = 0;
    
    const enrichedHoldings = holdings.map((h) => {
      const live = marketService.getAssetBySymbol(h.symbol);
      const currentPrice = live ? live.price : h.averageBuyPrice;
      const change = live ? live.change : 0;
      const name = live ? live.name : h.symbol;
      
      const investmentAmount = h.quantity * h.averageBuyPrice;
      const currentValue = h.quantity * currentPrice;
      const profitLoss = currentValue - investmentAmount;
      const returnPercent = investmentAmount > 0 ? (profitLoss / investmentAmount) * 100 : 0;

      const priceChangeToday = live ? (currentPrice - (currentPrice / (1 + change / 100))) : 0;
      const todayProfitLoss = h.quantity * priceChangeToday;

      totalInvestment += investmentAmount;
      currentPortfolioValue += currentValue;
      totalTodayProfitLoss += todayProfitLoss;

      return {
        symbol: h.symbol,
        name,
        assetType: h.assetType,
        category: live?.category || null,
        unit: live?.unit || null,
        quantity: h.quantity,
        averageBuyPrice: h.averageBuyPrice,
        currentPrice,
        change,
        investmentAmount,
        currentValue,
        profitLoss,
        returnPercent,
        todayProfitLoss,
      };
    });

    const totalProfitLoss = currentPortfolioValue - totalInvestment;
    const totalReturnPercent = totalInvestment > 0 ? (totalProfitLoss / totalInvestment) * 100 : 0;
    const netWorth = balance + currentPortfolioValue;

    // Sort holdings by value to find top holdings
    const topHoldings = [...enrichedHoldings]
      .sort((a, b) => b.currentValue - a.currentValue)
      .slice(0, 5);

    // Fetch recent transactions (last 5)
    const recentTransactions = await Transaction.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(5);

    // Insights
    let bestAsset = null;
    let worstAsset = null;
    let mostInvestedAsset = null;

    if (enrichedHoldings.length > 0) {
      bestAsset = enrichedHoldings.reduce((prev, current) => 
        (prev.returnPercent > current.returnPercent) ? prev : current
      );
      worstAsset = enrichedHoldings.reduce((prev, current) => 
        (prev.returnPercent < current.returnPercent) ? prev : current
      );
      mostInvestedAsset = enrichedHoldings.reduce((prev, current) => 
        (prev.investmentAmount > current.investmentAmount) ? prev : current
      );
    }

    // Chart: Portfolio Distribution (Pie chart of holdings)
    const distribution = enrichedHoldings.map((h) => ({
      name: h.name,
      value: currentPortfolioValue > 0 ? parseFloat(((h.currentValue / currentPortfolioValue) * 100).toFixed(2)) : 0,
      amount: h.currentValue,
    }));

    // Chart: Asset Allocation (Bar: Stocks vs Crypto vs Real Assets)
    let stockVal = 0;
    let cryptoVal = 0;
    let realAssetVal = 0;
    enrichedHoldings.forEach((h) => {
      if (h.assetType === 'STOCK') stockVal += h.currentValue;
      else if (h.assetType === 'CRYPTO') cryptoVal += h.currentValue;
      else if (h.assetType === 'REAL_ASSET') realAssetVal += h.currentValue;
    });
    
    const allocationTotal = stockVal + cryptoVal + realAssetVal;
    const allocation = [
      { name: 'Stocks', value: allocationTotal > 0 ? parseFloat(((stockVal / allocationTotal) * 100).toFixed(2)) : 0, amount: stockVal },
      { name: 'Cryptocurrencies', value: allocationTotal > 0 ? parseFloat(((cryptoVal / allocationTotal) * 100).toFixed(2)) : 0, amount: cryptoVal },
      { name: 'Real Assets', value: allocationTotal > 0 ? parseFloat(((realAssetVal / allocationTotal) * 100).toFixed(2)) : 0, amount: realAssetVal },
    ];

    // Chart: Profit by Asset (Horizontal Bar)
    const profitByAsset = enrichedHoldings.map((h) => ({
      name: h.symbol,
      profit: parseFloat(h.profitLoss.toFixed(2)),
    }));

    // Chart: Portfolio Growth (Mocking daily history points based on transactions)
    // We'll generate a realistic curves timeline representing the last 7 days leading to current net worth
    const growth = [];
    const days = 7;
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Let's create a curved random walk that ends exactly at the current netWorth
      let dayNetWorth = netWorth;
      if (i > 0) {
        // Vary slightly backwards
        const dayFactor = 1 - (i * 0.005) + (Math.sin(i) * 0.003);
        dayNetWorth = parseFloat((netWorth * dayFactor).toFixed(2));
      }
      
      growth.push({
        date: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        value: dayNetWorth,
      });
    }

    res.json({
      metrics: {
        walletBalance: balance,
        totalInvestment,
        currentPortfolioValue,
        totalProfitLoss,
        totalReturnPercent,
        todayProfitLoss: totalTodayProfitLoss,
        todayReturnPercent: totalInvestment > 0 ? (totalTodayProfitLoss / totalInvestment) * 100 : 0,
        netWorth,
        totalCredits,
        totalDebits,
      },
      topHoldings,
      recentTransactions,
      insights: {
        bestPerforming: bestAsset ? { symbol: bestAsset.symbol, returnPercent: bestAsset.returnPercent, profit: bestAsset.profitLoss } : null,
        worstPerforming: worstAsset ? { symbol: worstAsset.symbol, returnPercent: worstAsset.returnPercent, profit: worstAsset.profitLoss } : null,
        mostInvested: mostInvestedAsset ? { symbol: mostInvestedAsset.symbol, investedAmount: mostInvestedAsset.investmentAmount } : null,
      },
      charts: {
        distribution,
        allocation,
        profitByAsset,
        growth,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
