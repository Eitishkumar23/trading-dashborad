import Settings from '../models/Settings.js';

export const maintenanceMessage =
  'Platform is under maintenance. Trading and account modifications are temporarily unavailable.';

export const getMaintenanceStatus = async (_req, res) => {
  try {
    const settings = await Settings.getSettings();
    res.json({
      maintenanceMode: Boolean(settings.maintenanceMode),
      message: maintenanceMessage,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const requireWritablePlatform = async (_req, res, next) => {
  try {
    const settings = await Settings.getSettings();

    if (settings.maintenanceMode) {
      return res.status(503).json({ message: maintenanceMessage });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
