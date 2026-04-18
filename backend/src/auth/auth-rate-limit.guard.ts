import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  AUTH_RATE_LIMIT_KEY,
  AuthRateLimitOptions,
} from './auth-rate-limit.decorator';

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, RateLimitBucket>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<AuthRateLimitOptions>(
      AUTH_RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!options) {
      return true;
    }

    const http = context.switchToHttp();
    const req = http.getRequest();
    const res = http.getResponse();
    const now = Date.now();

    this.cleanupExpired(now);

    const bucketKey = `${options.key}:${this.getClientIp(req)}`;
    const existingBucket = this.buckets.get(bucketKey);

    if (!existingBucket || existingBucket.resetAt <= now) {
      const resetAt = now + options.windowMs;
      this.buckets.set(bucketKey, { count: 1, resetAt });
      this.setHeaders(res, options, 1, resetAt, now);
      return true;
    }

    if (existingBucket.count >= options.limit) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((existingBucket.resetAt - now) / 1000),
      );

      this.setHeaders(
        res,
        options,
        existingBucket.count,
        existingBucket.resetAt,
        now,
      );
      res?.setHeader?.('Retry-After', String(retryAfterSeconds));

      throw new HttpException(
        `Too many ${options.key} attempts. Try again in ${retryAfterSeconds} seconds.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    existingBucket.count += 1;
    this.buckets.set(bucketKey, existingBucket);
    this.setHeaders(
      res,
      options,
      existingBucket.count,
      existingBucket.resetAt,
      now,
    );

    return true;
  }

  private getClientIp(req: any): string {
    const forwardedFor = req?.headers?.['x-forwarded-for'];
    if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
      return forwardedFor.split(',')[0].trim();
    }

    if (typeof req?.ip === 'string' && req.ip.trim()) {
      return req.ip;
    }

    if (typeof req?.socket?.remoteAddress === 'string') {
      return req.socket.remoteAddress;
    }

    return 'unknown';
  }

  private cleanupExpired(now: number) {
    for (const [key, bucket] of this.buckets.entries()) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }

  private setHeaders(
    res: any,
    options: AuthRateLimitOptions,
    count: number,
    resetAt: number,
    now: number,
  ) {
    const remaining = Math.max(options.limit - count, 0);
    const resetInSeconds = Math.max(0, Math.ceil((resetAt - now) / 1000));

    res?.setHeader?.('X-RateLimit-Limit', String(options.limit));
    res?.setHeader?.('X-RateLimit-Remaining', String(remaining));
    res?.setHeader?.('X-RateLimit-Reset', String(resetInSeconds));
  }
}
