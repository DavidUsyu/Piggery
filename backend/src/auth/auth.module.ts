import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';

const jwtSecret = process.env.JWT_SECRET
  ? process.env.JWT_SECRET
  : process.env.NODE_ENV !== 'production'
    ? 'dev-secret'
    : (() => {
        throw new Error('JWT_SECRET must be set in production');
      })();

@Module({
  imports: [
    JwtModule.register({
      secret: jwtSecret,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService, AuthRateLimitGuard],
  exports: [JwtModule], // IMPORTANT
})
export class AuthModule {}
