// Realtime database disabled. Provide no-op stubs.
export const publishInventoryVersion = async () => ({ skipped: true });
export const publishTransactionsVersion = async () => ({ skipped: true });
export const publishProductSnapshot = async () => ({ skipped: true });
export const publishTransactionEvent = async () => ({ skipped: true });
