import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { Resend } from 'resend';

@Injectable()
export class AuthService {
  private readonly resend = new Resend(process.env.RESEND_API_KEY);
  private readonly passwordResetResponse = {
    message: 'If the email exists, a reset link has been sent.',
  };
  private readonly accountRecoveryResponse = {
    message:
      'If the account is eligible for recovery, it has been restored. Please try signing in again.',
  };

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async register(
    name: string,
    email: string,
    password: string,
    farmName: string,
  ) {
    const existing = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email, passwordHash },
      });

      const farm = await tx.farm.create({
        data: { name: farmName },
      });

      await tx.farmMember.create({
        data: {
          userId: user.id,
          farmId: farm.id,
          role: 'OWNER',
        },
      });

      return { userId: user.id, farmId: farm.id };
    });

    return {
      message: 'User and farm created successfully',
      ...result,
    };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: {
            farm: true,
          },
        },
      },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive || user.deletedAt) {
      throw new UnauthorizedException('Account has been deleted or disabled');
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const membership = user.memberships[0];

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      farmId: membership?.farmId,
      role: membership?.role,
    });

    return { accessToken };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            farm: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const membership = user.memberships[0];

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      farmId: membership?.farmId ?? null,
      farmName: membership?.farm?.name ?? null,
      role: membership?.role ?? null,
    };
  }

  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return this.passwordResetResponse;
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiry = new Date(Date.now() + 1000 * 60 * 30);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: tokenHash,
        resetTokenExpiry: expiry,
      },
    });

    const frontendBaseUrl =
      process.env.FRONTEND_URL?.trim() || 'http://localhost:3000';
    const resetLink = `${frontendBaseUrl}/reset-password?token=${token}`;

    await this.resend.emails.send({
      from: 'onboarding@resend.dev',
      to: user.email,
      subject: 'Reset your password',
      html: `
        <h2>Password Reset</h2>
        <p>Hello ${user.name ?? 'User'},</p>
        <p>You requested to reset your password.</p>
        <p>
          <a href="${resetLink}" style="padding:10px 16px;background:black;color:white;text-decoration:none;border-radius:8px;">
            Reset Password
          </a>
        </p>
        <p>This link expires in 30 minutes.</p>
      `,
    });

    return this.passwordResetResponse;
  }

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = this.hashToken(token);

    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: tokenHash,
        resetTokenExpiry: {
          gte: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return { message: 'Password updated successfully' };
  }

  async deleteAccount(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const deletedAt = new Date();
    const scheduledPurgeAt = new Date(
      deletedAt.getTime() + 30 * 24 * 60 * 60 * 1000,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        deletedAt,
        scheduledPurgeAt,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return {
      message: 'Account deleted. You can recover it within 30 days.',
      deletedAt,
      scheduledPurgeAt,
    };
  }

  async recoverAccount(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.deletedAt || !user.scheduledPurgeAt) {
      return this.accountRecoveryResponse;
    }

    if (user.scheduledPurgeAt.getTime() < Date.now()) {
      return this.accountRecoveryResponse;
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isActive: true,
        deletedAt: null,
        scheduledPurgeAt: null,
      },
    });

    return this.accountRecoveryResponse;
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
