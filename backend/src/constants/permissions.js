export const PERMISSION_CATALOG = [
  {
    id: 'posAccess',
    label: 'POS Access',
    resource: 'transaction',
    description: 'Access to Point of Sale for creating transactions.',
    actions: [
      { action: 'create', possession: 'any', label: 'Access POS', defaultRoles: ['owner', 'admin', 'cashier'] },
    ],
  },
  {
    id: 'inventoryAccess',
    label: 'Inventory Access',
    resource: 'product',
    description: 'Access to view and manage inventory.',
    actions: [
      { action: 'read', possession: 'any', label: 'Access Inventory', defaultRoles: ['owner', 'admin'] },
    ],
  },
  {
    id: 'transactionsAccess',
    label: 'Transactions Access',
    resource: 'transaction',
    description: 'Access to view transaction history.',
    actions: [
      { action: 'read', possession: 'any', label: 'Access Transactions', defaultRoles: ['owner', 'admin', 'cashier'] },
    ],
  },
  {
    id: 'settingsAccess',
    label: 'Settings Access',
    resource: 'storeSetting',
    description: 'Access to store settings and configuration.',
    actions: [
      { action: 'read', possession: 'any', label: 'Access Settings', defaultRoles: ['owner', 'admin', 'cashier'] },
    ],
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    resource: 'dashboard',
    description: 'Analytics snapshots, KPIs, and system status.',
    actions: [
      { action: 'read', possession: 'any', label: 'View dashboard', defaultRoles: ['owner', 'admin'] },
      { action: 'delete', possession: 'any', label: 'Reset dashboard widgets', defaultRoles: ['owner', 'admin'] },
    ],
  },
  {
    id: 'transactions',
    label: 'Transactions (Advanced)',
    resource: 'transaction',
    description: 'Detailed transaction permissions including deletion.',
    actions: [
      { action: 'create', possession: 'any', label: 'Create transactions / accept payments', defaultRoles: ['owner', 'admin', 'cashier'] },
      { action: 'read', possession: 'any', label: 'View transaction history', defaultRoles: ['owner', 'admin', 'cashier'] },
      { action: 'delete', possession: 'any', label: 'Delete transactions (bulk or single)', defaultRoles: ['owner', 'admin'] },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventory (Advanced)',
    resource: 'product',
    description: 'Detailed product management controls.',
    actions: [
      { action: 'create', possession: 'any', label: 'Add products', defaultRoles: ['owner', 'admin'] },
      { action: 'read', possession: 'any', label: 'View products', defaultRoles: ['owner', 'admin', 'cashier'] },
      { action: 'update', possession: 'any', label: 'Edit products', defaultRoles: ['owner', 'admin'] },
      { action: 'delete', possession: 'any', label: 'Delete products', defaultRoles: ['owner'] },
    ],
  },
  {
    id: 'storeSettings',
    label: 'Store Settings (Advanced)',
    resource: 'storeSetting',
    description: 'Branding, store profile, and policies.',
    actions: [
      { action: 'read', possession: 'any', label: 'View store settings', defaultRoles: ['owner', 'admin'] },
      { action: 'update', possession: 'any', label: 'Update store settings', defaultRoles: ['owner', 'admin'] },
    ],
  },
  {
    id: 'notifications',
    label: 'Notifications',
    resource: 'notificationSetting',
    description: 'Alerts and notification thresholds.',
    actions: [
      { action: 'read', possession: 'any', label: 'View notification settings', defaultRoles: ['owner', 'admin'] },
      { action: 'update', possession: 'any', label: 'Update notification settings', defaultRoles: ['owner', 'admin'] },
    ],
  },
  {
    id: 'backup',
    label: 'Backup',
    resource: 'backupSetting',
    description: 'Cloud backup configuration and status.',
    actions: [
      { action: 'read', possession: 'any', label: 'View backup configuration', defaultRoles: ['owner', 'admin'] },
      { action: 'update', possession: 'any', label: 'Modify backup configuration', defaultRoles: ['owner', 'admin'] },
    ],
  },
  {
    id: 'signup',
    label: 'Signup Controls',
    resource: 'signupSetting',
    description: 'Invitation rules and public signup toggles.',
    actions: [
      { action: 'read', possession: 'any', label: 'View signup controls', defaultRoles: ['owner'] },
      { action: 'update', possession: 'any', label: 'Modify signup controls', defaultRoles: ['owner'] },
    ],
  },
  {
    id: 'userPermissions',
    label: 'Permission Management',
    resource: 'userPermission',
    description: 'Grant or revoke admin/cashier privileges.',
    actions: [
      { action: 'update', possession: 'any', label: "Adjust others' permissions", defaultRoles: ['owner'] },
    ],
  },
];

const validKey = (resource, action, possession = 'any') => `${resource}:${action}:${possession}`;

const VALID_PERMISSION_KEYS = new Set(
  PERMISSION_CATALOG.flatMap((group) =>
    group.actions.map((entry) => validKey(group.resource, entry.action, entry.possession || 'any')),
  ),
);

export const isValidPermission = (resource, action, possession = 'any') =>
  VALID_PERMISSION_KEYS.has(validKey(resource, action, possession));
