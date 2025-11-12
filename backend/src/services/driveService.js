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
  const settings = await SystemSettings.findOneAndUpdate(
    { id: 'system' },
    { driveRefreshToken: tokens.refresh_token, updatedAt: new Date() },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
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

  await SystemSettings.findOneAndUpdate(
    { id: 'system' },
    { backupLastRun: new Date(), backupLastError: '', updatedAt: new Date() },
    { upsert: true }
  );

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
  await SystemSettings.findOneAndUpdate(
    { id: 'system' },
    { driveFolderId: folderId, updatedAt: new Date() },
    { upsert: true }
  );
  return folderId;
};

export const runScheduledBackupIfEnabled = async () => {
  try {
    const settings = await SystemSettings.findOne({ id: 'system' });
    if (!settings?.backupEnabled) return { skipped: true };
    await uploadBackup();
    return { success: true };
  } catch (err) {
    await SystemSettings.findOneAndUpdate(
      { id: 'system' },
      { backupLastError: err.message || String(err), updatedAt: new Date() },
      { upsert: true }
    );
    return { success: false, error: err.message };
  }
};
