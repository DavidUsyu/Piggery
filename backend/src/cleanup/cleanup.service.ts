import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async purgeDeletedUsers() {
    const now = new Date();

    const usersToPurge = await this.prisma.user.findMany({
      where: {
        deletedAt: { not: null },
        scheduledPurgeAt: { not: null, lte: now },
      },
      select: {
        id: true,
        email: true,
      },
    });

    if (usersToPurge.length === 0) {
      this.logger.log('No deleted users to purge.');
      return;
    }

    for (const user of usersToPurge) {
      try {
        // Find all farms owned/linked by this user through memberships
        const memberships = await this.prisma.farmMember.findMany({
          where: { userId: user.id },
          select: { farmId: true },
        });

        const farmIds = memberships.map((m) => m.farmId);

        // Delete farms and all their related pigs/events via cascade
        // This assumes each user owns their own farm setup in your current model.
        for (const farmId of farmIds) {
          await this.prisma.farm.delete({
            where: { id: farmId },
          });
        }

        // Finally delete the user
        await this.prisma.user.delete({
          where: { id: user.id },
        });

        this.logger.log(`Purged deleted user: ${user.email}`);
      } catch (error) {
        this.logger.error(
          `Failed to purge user ${user.email}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }
}