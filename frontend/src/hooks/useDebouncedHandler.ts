import { useCallback, useRef } from 'react';

/**
 * Hook to debounce async handlers and prevent rapid-fire execution.
 * Useful for preventing multiple API calls from rapid button clicks.
 * @param handler - async function to execute
 * @param delay - debounce delay in milliseconds (default: 500ms)
 */
export const useDebouncedHandler = <T extends any[]>(
  handler: (...args: T) => Promise<void>,
  delay = 500
) => {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isProcessingRef = useRef(false);

  return useCallback(
    async (...args: T) => {
      // Prevent concurrent executions
      if (isProcessingRef.current) return;
      
      isProcessingRef.current = true;

      // Clear any pending debounce
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Schedule handler execution
      timeoutRef.current = setTimeout(async () => {
        try {
          await handler(...args);
        } finally {
          isProcessingRef.current = false;
        }
      }, delay);
    },
    [handler, delay]
  );
};
