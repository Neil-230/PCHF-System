import AccessControl from 'accesscontrol';

// RBAC grants
// Resources: transaction, product, backupSetting, notificationSetting, storeSetting, signupSetting
const grantsObject = {
  owner: {
    dashboard: {
      'read:any': ['*'],
    },
    transaction: {
      'create:any': ['*'],
      'read:any': ['*'],
      'delete:any': ['*'],
    },
    product: {
      'create:any': ['*'],
      'read:any': ['*'],
      'update:any': ['*'],
      'delete:any': ['*'],
    },
    backupSetting: {
      'read:any': ['*'],
      'update:any': ['*'],
    },
    notificationSetting: {
      'read:any': ['*'],
      'update:any': ['*'],
    },
    storeSetting: {
      'read:any': ['*'],
      'update:any': ['*'],
    },
    signupSetting: {
      'read:any': ['*'],
      'update:any': ['*'],
    },
  },
  admin: {
    dashboard: {
      'read:any': ['*'],
    },
    transaction: {
      'create:any': ['*'],
      'read:any': ['*'],
      'delete:any': ['*'],
    },
    product: {
      'create:any': ['*'],
      'read:any': ['*'],
      'update:any': ['*'],
      // no delete on products for admin
    },
    backupSetting: {
      'read:any': ['*'],
      'update:any': ['*'],
    },
    notificationSetting: {
      'read:any': ['*'],
      'update:any': ['*'],
    },
    storeSetting: {
      'read:any': ['*'],
      'update:any': ['*'],
    },
    // admin cannot update signupSetting
  },
  cashier: {
    transaction: {
      'create:any': ['*'],
      'read:any': ['*'],
    },
    product: {
      'read:any': ['*'],
    },
    // no settings updates
  },
};

const ac = new AccessControl(grantsObject);

export { ac };
