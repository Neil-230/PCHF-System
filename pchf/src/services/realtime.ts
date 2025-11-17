// Firebase Realtime Database disabled. Provide no-op stubs for compatibility.

export const onInventoryVersion = (_cb: () => void): (() => void) => {
  return () => {};
};

export const onTransactionsVersion = (_cb: () => void): (() => void) => {
  return () => {};
};

export const onProduct = (_productId: string, _cb: (p: any) => void): (() => void) => {
  return () => {};
};
