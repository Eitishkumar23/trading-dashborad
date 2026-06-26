import { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { maintenanceAPI } from '../services/api.js';

export const MAINTENANCE_MESSAGE =
  'Platform is under maintenance. Trading and account modifications are temporarily unavailable.';

const MaintenanceContext = createContext({
  maintenanceMode: false,
  message: MAINTENANCE_MESSAGE,
});

export const MaintenanceProvider = ({ children }) => {
  const { data } = useQuery({
    queryKey: ['maintenanceStatus'],
    queryFn: async () => {
      const { data: status } = await maintenanceAPI.getStatus();
      return status;
    },
    refetchInterval: 30000,
    retry: 1,
  });

  return (
    <MaintenanceContext.Provider
      value={{
        maintenanceMode: Boolean(data?.maintenanceMode),
        message: data?.message || MAINTENANCE_MESSAGE,
      }}
    >
      {children}
    </MaintenanceContext.Provider>
  );
};

export const useMaintenance = () => useContext(MaintenanceContext);
