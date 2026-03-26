import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { PigGroupsController } from './pig-groups.controller';
import { PigGroupsService } from './pig-groups.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PigGroupsController],
  providers: [PigGroupsService],
})
export class PigGroupsModule {}