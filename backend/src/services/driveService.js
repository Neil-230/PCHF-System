import { google } from 'googleapis';
import { Readable } from 'stream';
import { SystemSettings, User, Product, Transaction, PendingAdmin } from '../database/mongodb.js';

const getOAuth2Client = () => {
  const clientId = process.env.DRIVE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.DRIVE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.DRIVE_REDIRECT_URL || `${process.env.BACKEND_BASE_URL || 'http://localhost:4000'}/api/settings/drive/callback`;
  if (!clientId || !clientSecret) {
    throw new Error('Google Drive OAuth credentials are not configured');
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
};

const getOrCreateSystemSettings = async () => {
  let settings = await SystemSettings.findOne({ id: 'system' });
  if (!settings) {
    settings = new SystemSettings({ id: 'system' });
  }
  return settings;
};

const saveSystemSettings = async (settings, conflictMessage = 'Conflict: system settings were updated concurrently. Please retry.') => {
  try {
    await settings.save();
  } catch (err) {
    if (err?.name === 'VersionError') {
      throw Object.assign(new Error(conflictMessage), { status: 409 });
    }
    throw err;
  }
  return settings;
};

export const getAuthUrl = async () => {
  const oAuth2Client = getOAuth2Client();
  const scopes = ['https://www.googleapis.com/auth/drive.file'];
  const url = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes,
  });
  return url;
};

export const handleOAuthCallback = async (code) => {
  const oAuth2Client = getOAuth2Client();
  const { tokens } = await oAuth2Client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error('No refresh token returned by Google. Try again with consent.');
  }
  // Save refresh token in SystemSettings
  const settings = await getOrCreateSystemSettings();
  settings.driveRefreshToken = tokens.refresh_token;
  settings.updatedAt = new Date();
  await saveSystemSettings(settings, 'Conflict: Google Drive settings were updated concurrently. Please retry.');
  return settings;
};

const getDriveClient = async () => {
  const settings = await SystemSettings.findOne({ id: 'system' });
  if (!settings?.driveRefreshToken) {
    throw new Error('Google Drive is not connected');
  }
  const oAuth2Client = getOAuth2Client();
  oAuth2Client.setCredentials({ refresh_token: settings.driveRefreshToken });
  return google.drive({ version: 'v3', auth: oAuth2Client });
};

const generateBackupPayload = async () => {
  const [users, products, transactions, pending, sys] = await Promise.all([
    User.find({}).lean(),
    Product.find({}).lean(),
    Transaction.find({}).lean(),
    PendingAdmin.find({}).lean(),
    SystemSettings.findOne({ id: 'system' }).lean(),
  ]);
  return {
    generatedAt: new Date().toISOString(),
    users,
    products,
    transactions,
    pendingAdmins: pending,
    systemSettings: sys,
  };
};

export const uploadBackup = async () => {
  const settings = await SystemSettings.findOne({ id: 'system' });
  if (!settings?.driveRefreshToken) {
    throw new Error('Google Drive is not connected');
  }
  const drive = await getDriveClient();
  const payload = await generateBackupPayload();
  const json = JSON.stringify(payload, null, 2);

  const name = `pch-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const fileMetadata = {
    name,
    mimeType: 'application/json',
    ...(settings.driveFolderId ? { parents: [settings.driveFolderId] } : {}),
  };

  const media = {
    mimeType: 'application/json',
    body: Readable.from([json]),
  };

  const res = await drive.files.create({ requestBody: fileMetadata, media, fields: 'id, name' });

  settings.backupLastRun = new Date();
  settings.backupLastError = '';
  settings.updatedAt = new Date();
  await saveSystemSettings(settings, 'Conflict: system settings were updated concurrently while recording backup completion. Please retry.');

  return res.data;
};

export const ensureFolder = async (folderName = 'PCH_Backups') => {
  const drive = await getDriveClient();
  // Try to find folder
  const list = await drive.files.list({
    q: `mimeType='application/vnd.google-apps.folder' and name='${folderName.replace(/'/g, "\\'")}' and trashed=false`,
    fields: 'files(id, name)',
    pageSize: 1,
  });
  let folderId = list.data.files?.[0]?.id;
  if (!folderId) {
    const create = await drive.files.create({
      requestBody: { name: folderName, mimeType: 'application/vnd.google-apps.folder' },
      fields: 'id,name',
    });
    folderId = create.data.id;
  }
  const settings = await getOrCreateSystemSettings();
  settings.driveFolderId = folderId;
  settings.updatedAt = new Date();
  await saveSystemSettings(settings, 'Conflict: drive settings were updated concurrently. Please retry.');
  return folderId;
};

export const runScheduledBackupIfEnabled = async () => {
  try {
    const settings = await SystemSettings.findOne({ id: 'system' });
    if (!settings?.backupEnabled) return { skipped: true };
    await uploadBackup();
    return { success: true };
  } catch (err) {
    try {
      const settings = await getOrCreateSystemSettings();
      settings.backupLastError = err.message || String(err);
      settings.updatedAt = new Date();
      await saveSystemSettings(settings, 'Conflict: system settings were updated concurrently while recording backup error state. Please retry.');
    } catch (saveErr) {
      if (saveErr?.status === 409) {
        console.warn('Conflict while recording backup error state. Please retry.');
      } else {
        console.error('Failed to record backup error state:', saveErr);
      }
    }
    return { success: false, error: err.message };
  }
};
