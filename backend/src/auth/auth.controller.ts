import { Body, Controller, Delete, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { JwtGuard } from './auth.jwt.guard';
import { AuthRateLimit } from './auth-rate-limit.decorator';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RecoverAccountDto } from './dto/recover-account.dto';

const AUTH_COOKIE_NAME = 'piggery_access_token';
const AUTH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const THIRTY_MINUTES_MS = 30 * 60 * 1000;

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @UseGuards(AuthRateLimitGuard)
  @AuthRateLimit({ key: 'register', limit: 5, windowMs: FIFTEEN_MINUTES_MS })
  register(@Body() body: RegisterDto) {
    return this.authService.register(
      body.name,
      body.email,
      body.password,
      body.farmName,
    );
  }

  @Post('login')
  @UseGuards(AuthRateLimitGuard)
  @AuthRateLimit({ key: 'login', limit: 5, windowMs: FIFTEEN_MINUTES_MS })
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken } = await this.authService.login(body.email, body.password);

    res.cookie(AUTH_COOKIE_NAME, accessToken, this.getAuthCookieOptions());

    return { message: 'Logged in successfully' };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(AUTH_COOKIE_NAME, this.getClearAuthCookieOptions());
    return { message: 'Logged out successfully' };
  }

  @Post('forgot-password')
  @UseGuards(AuthRateLimitGuard)
  @AuthRateLimit({ key: 'forgot-password', limit: 3, windowMs: FIFTEEN_MINUTES_MS })
  forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(body.email);
  }

  @Post('reset-password')
  @UseGuards(AuthRateLimitGuard)
  @AuthRateLimit({ key: 'reset-password', limit: 5, windowMs: THIRTY_MINUTES_MS })
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.token, body.password);
  }

  @UseGuards(JwtGuard)
  @Get('me')
  me(@Req() req: any) {
    return this.authService.me(req.user.sub);
  }

  @Delete('account')
  @UseGuards(JwtGuard)
  async deleteAccount(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.deleteAccount(req.user.sub);
    res.clearCookie(AUTH_COOKIE_NAME, this.getClearAuthCookieOptions());
    return result;
  }

  @Post('recover-account')
  @UseGuards(AuthRateLimitGuard)
  @AuthRateLimit({ key: 'recover-account', limit: 3, windowMs: THIRTY_MINUTES_MS })
  recoverAccount(@Body() body: RecoverAccountDto) {
    return this.authService.recoverAccount(body.email);
  }

  private getAuthCookieOptions() {
    return {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: AUTH_COOKIE_MAX_AGE_MS,
    };
  }

  private getClearAuthCookieOptions() {
    return {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    };
  }
}
