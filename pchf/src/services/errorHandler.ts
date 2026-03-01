import { toast } from 'sonner';

/**
 * Centralized error handler to prevent duplicate error messages.
 * Tracks shown errors and prevents showing the same error twice within 2 seconds.
 */
class ErrorHandlerService {
  private shownErrors = new Set<string>();
  private errorTimestamps = new Map<string, number>();

  /**
   * Handle an error, show toast only once per unique error
   * @param error - error object or any value
   * @param fallback - fallback message if error cannot be parsed
   * @returns the error message for state management
   */
  handle(error: any, fallback = 'An error occurred'): string {
    const message = this.extractMessage(error, fallback);
    
    // Check if same error was shown recently
    const lastShown = this.errorTimestamps.get(message);
    const now = Date.now();

    if (lastShown && now - lastShown < 2000) {
      return message; // Suppress toast but return message for state
    }

    // Show toast once
    if (!this.shownErrors.has(message)) {
      toast.error(message);
      this.shownErrors.add(message);
      this.errorTimestamps.set(message, now);

      // Auto-cleanup after 3 seconds
      setTimeout(() => {
        this.shownErrors.delete(message);
        this.errorTimestamps.delete(message);
      }, 3000);
    }

    return message;
  }

  /**
   * Extract message from various error formats
   */
  private extractMessage(error: any, fallback: string): string {
    if (typeof error === 'string') return error;
    if (!error) return fallback;

    return (
      error?.message ||
      error?.body?.error ||
      error?.response?.data?.error ||
      error?.data?.error ||
      fallback
    );
  }

  /**
   * Clear all tracking (useful for testing or on logout)
   */
  clear() {
    this.shownErrors.clear();
    this.errorTimestamps.clear();
  }
}

export const errorHandler = new ErrorHandlerService();
