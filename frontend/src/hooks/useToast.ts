import { useRef, useCallback, useMemo } from 'react';
import { toast } from 'sonner';

interface ToastState {
  message: string;
  timestamp: number;
}

/**
 * Custom toast hook with built-in deduplication.
 * Prevents showing the same toast message within 2 seconds.
 * Automatically cleans up old entries to prevent memory leaks.
 */
export const useToast = () => {
  const lastToastRef = useRef<Map<string, ToastState>>(new Map());

  const showToast = useCallback(
    (type: 'success' | 'error' | 'warning' | 'info', message: string) => {
      // Deduplicate: ignore same message within 2 seconds
      const key = `${type}:${message}`;
      const lastToast = lastToastRef.current.get(key);
      const now = Date.now();

      if (lastToast && now - lastToast.timestamp < 2000) {
        return; // Skip duplicate toast
      }

      // Update timestamp and show toast
      lastToastRef.current.set(key, { message, timestamp: now });
      toast[type](message);

      // Cleanup old entries to prevent memory leaks
      if (lastToastRef.current.size > 10) {
        const entries = Array.from(lastToastRef.current.entries());
        const oldest = entries.sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
        if (oldest) {
          lastToastRef.current.delete(oldest[0]);
        }
      }
    },
    []
  );

  return useMemo(() => ({
    success: (msg: string) => showToast('success', msg),
    error: (msg: string) => showToast('error', msg),
    warning: (msg: string) => showToast('warning', msg),
    info: (msg: string) => showToast('info', msg),
  }), [showToast]);
};
