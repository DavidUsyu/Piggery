import { Body, Controller, Get, Post, Req, UseGuards, Delete } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtGuard } from './auth.jwt.guard';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() body: RegisterDto) {
    return this.authService.register(
      body.name,
      body.email,
      body.password,
      body.farmName,
    );
  }


  @Post('login')
  login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @Post("forgot-password")
  forgotPassword(@Body("email") email: string) {
    return this.authService.requestPasswordReset(email);
  }

  @Post("reset-password")
  resetPassword(
    @Body("token") token: string,
    @Body("password") password: string,
  ) {
    return this.authService.resetPassword(token, password);
  }

  @UseGuards(JwtGuard)
  @Get('me')
    me(@Req() req: any) {
      return this.authService.me(req.user.sub);
    }
  @Delete('account')
  @UseGuards(JwtGuard)
  deleteAccount(@Req() req: any) {
    return this.authService.deleteAccount(req.user.sub);
  }

  @Post('recover-account')
  recoverAccount(@Body('email') email: string) {
    return this.authService.recoverAccount(email);
  }
}