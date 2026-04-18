import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

const AUTH_COOKIE_NAME = 'piggery_access_token';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const token = this.extractToken(req);

    try {
      const payload = await this.jwt.verifyAsync(token);
      req.user = payload; // attach user info to request
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractToken(req: any) {
    const auth = req.headers['authorization'];
    if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
      return auth.slice('Bearer '.length).trim();
    }

    const cookieHeader = req.headers?.cookie;
    if (typeof cookieHeader === 'string') {
      const cookies = cookieHeader.split(';');

      for (const cookie of cookies) {
        const [rawName, ...rawValue] = cookie.trim().split('=');
        if (rawName === AUTH_COOKIE_NAME) {
          const value = rawValue.join('=').trim();
          if (value) {
            return decodeURIComponent(value);
          }
        }
      }
    }

    throw new UnauthorizedException('Authentication required');
  }
}
