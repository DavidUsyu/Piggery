import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule], // ✅ gives JwtGuard access to JwtService
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}