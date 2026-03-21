const normalizeProvider = (value: unknown) =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

export const getSessionAuthProvider = (user: any) => {
  const providerFromMetadata = normalizeProvider(user?.app_metadata?.provider);
  if (providerFromMetadata) {
    return providerFromMetadata;
  }

  const metadataProviders = Array.isArray(user?.app_metadata?.providers)
    ? user.app_metadata.providers.map(normalizeProvider).filter(Boolean)
    : [];
  if (metadataProviders.length === 1) {
    return metadataProviders[0];
  }

  const identityProviders = Array.isArray(user?.identities)
    ? user.identities.map((identity: any) => normalizeProvider(identity?.provider)).filter(Boolean)
    : [];

  if (identityProviders.includes('google')) {
    return 'google';
  }

  if (identityProviders.includes('email')) {
    return 'email';
  }

  return 'unknown';
};

export const isEmailPasswordSession = (user: any) => getSessionAuthProvider(user) === 'email';

export const isGoogleSession = (user: any) => getSessionAuthProvider(user) === 'google';

export const isEmailVerified = (user: any) => Boolean(user?.email_confirmed_at);

export const shouldBlockUnverifiedEmailSession = (user: any) =>
  isEmailPasswordSession(user) && !isEmailVerified(user);
