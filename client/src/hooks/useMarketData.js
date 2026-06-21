import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { portfolioAPI, marketAPI } from '../services/api.js';
import { useSelector } from 'react-redux';

// Polling interval of 5 seconds
const LIVE_REFETCH_INTERVAL = 5000;

export const useDashboard = () => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await portfolioAPI.getDashboard();
      return data;
    },
    enabled: isAuthenticated,
    refetchInterval: LIVE_REFETCH_INTERVAL,
    refetchIntervalInBackground: false,
  });
};

export const useHoldings = () => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  return useQuery({
    queryKey: ['holdings'],
    queryFn: async () => {
      const { data } = await portfolioAPI.getHoldings();
      return data;
    },
    enabled: isAuthenticated,
    refetchInterval: LIVE_REFETCH_INTERVAL,
  });
};

export const useMarketOverview = () => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  return useQuery({
    queryKey: ['marketOverview'],
    queryFn: async () => {
      const { data } = await marketAPI.getOverview();
      return data;
    },
    enabled: isAuthenticated,
    refetchInterval: LIVE_REFETCH_INTERVAL,
  });
};

export const useMarkets = () => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  return useQuery({
    queryKey: ['markets'],
    queryFn: async () => {
      const { data } = await marketAPI.getMarkets();
      return data;
    },
    enabled: isAuthenticated,
    refetchInterval: LIVE_REFETCH_INTERVAL,
  });
};

export const useWatchlist = () => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  return useQuery({
    queryKey: ['watchlist'],
    queryFn: async () => {
      const { data } = await marketAPI.getWatchlist();
      return data;
    },
    enabled: isAuthenticated,
    refetchInterval: LIVE_REFETCH_INTERVAL,
  });
};

export const useAlerts = () => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  return useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      const { data } = await marketAPI.getAlerts();
      return data;
    },
    enabled: isAuthenticated,
    refetchInterval: LIVE_REFETCH_INTERVAL,
  });
};
