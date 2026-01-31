import { hashEmail } from './encryption.js';

export const emailHashFilter = (email, extra = {}, options = {}) => {
  if (!email) {
    throw new Error('emailHashFilter requires an email value');
  }
  const { field = 'emailHash' } = options;
  if (!field) {
    throw new Error('emailHashFilter requires a hash field name');
  }
  return {
    [field]: hashEmail(email),
    ...extra,
  };
};
