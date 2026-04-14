import { Module } from '@nestjs/common';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule], // IMPORTANT
  controllers: [FeedController],
  providers: [FeedService, PrismaService],
})
export class FeedModule {}