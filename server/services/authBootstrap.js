import User from '../models/User.js';
import { ADMIN_EMAIL, ADMIN_PASSWORD } from '../config/authConstants.js';

export const ensureAdminAccount = async () => {
  const adminName = 'Administrator';
  const adminUser = await User.findOne({ email: ADMIN_EMAIL }).select('+password');
  const legacyAdmins = await User.find({
    role: 'admin',
    email: { $ne: ADMIN_EMAIL },
  }).select('_id role');

  if (legacyAdmins.length) {
    await User.updateMany(
      { _id: { $in: legacyAdmins.map((user) => user._id) } },
      { $set: { role: 'user' } }
    );
  }

  if (!adminUser) {
    await User.create({
      name: adminName,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      role: 'admin',
      authProvider: 'local',
    });
    return;
  }

  let needsSave = false;

  if (adminUser.role !== 'admin') {
    adminUser.role = 'admin';
    needsSave = true;
  }

  if (adminUser.authProvider !== 'local') {
    adminUser.authProvider = 'local';
    needsSave = true;
  }

  if (adminUser.googleId) {
    adminUser.googleId = null;
    needsSave = true;
  }

  if (!adminUser.name) {
    adminUser.name = adminName;
    needsSave = true;
  }

  const passwordMatches = await adminUser.comparePassword(ADMIN_PASSWORD);
  if (!passwordMatches) {
    adminUser.password = ADMIN_PASSWORD;
    needsSave = true;
  }

  if (needsSave) {
    await adminUser.save();
  }
};
