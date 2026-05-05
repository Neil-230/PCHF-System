export const loadRecaptcha = () => {
  return new Promise<void>((resolve, reject) => {
    // If already loaded
    if ((window as any).grecaptcha && (window as any).grecaptcha.execute) {
      resolve();
      return;
    }

    // Avoid duplicate script tags
    const existing = document.getElementById('recaptcha-script');
    if (existing) {
      const onLoad = () => resolve();
      const onError = () => reject(new Error('Failed to load reCAPTCHA script'));
      existing.addEventListener('load', onLoad, { once: true });
      existing.addEventListener('error', onError, { once: true });
      return;
    }

    const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
    const script = document.createElement('script');
    script.id = 'recaptcha-script';
    script.src = siteKey
      ? `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`
      : 'https://www.google.com/recaptcha/api.js';
    script.async = true;
    script.defer = true;
    const timeout = window.setTimeout(() => {
      reject(new Error('reCAPTCHA script load timeout'));
    }, 10000);
    script.onload = () => {
      window.clearTimeout(timeout);
      resolve();
    };
    script.onerror = () => {
      window.clearTimeout(timeout);
      reject(new Error('Failed to load reCAPTCHA script'));
    };
    document.head.appendChild(script);
  });
};

export const executeRecaptcha = (action: string = 'submit'): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
    if (!siteKey) {
      reject(new Error('reCAPTCHA site key missing. Set VITE_RECAPTCHA_SITE_KEY in pchf/.env'));
      return;
    }

    try {
      if (!(window as any).grecaptcha) {
        await loadRecaptcha();
      }

      let timedOut = false;
      const readyTimeout = window.setTimeout(() => {
        timedOut = true;
        reject(new Error('reCAPTCHA ready timeout'));
      }, 8000);

      (window as any).grecaptcha.ready(() => {
        if (timedOut) return;
        (window as any).grecaptcha
          .execute(siteKey, { action })
          .then((token: string) => {
            window.clearTimeout(readyTimeout);
            resolve(token);
          })
          .catch((error: any) => {
            window.clearTimeout(readyTimeout);
            reject(error);
          });
      });
    } catch (err) {
      reject(err as Error);
    }
  });
};
