import { SetMetadata } from '@nestjs/common';

export type AuthRateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

export const AUTH_RATE_LIMIT_KEY = 'auth-rate-limit';

export const AuthRateLimit = (options: AuthRateLimitOptions) =>
  SetMetadata(AUTH_RATE_LIMIT_KEY, options);
