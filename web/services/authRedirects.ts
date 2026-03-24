const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const getAppBaseUrl = () => {
  const configuredBaseUrl = import.meta.env.VITE_APP_URL?.trim();
  const fallbackBaseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  return trimTrailingSlash(configuredBaseUrl || fallbackBaseUrl);
};

export const getAuthCallbackUrl = (params?: Record<string, string | null | undefined>) => {
  const url = new URL(`${getAppBaseUrl()}/auth/callback`);

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
};
