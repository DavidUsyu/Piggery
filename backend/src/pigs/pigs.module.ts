import { Module } from '@nestjs/common';
import { PigsController } from './pigs.controller';
import { PigsService } from './pigs.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule], // ✅ allows JwtGuard to access JwtService
  controllers: [PigsController],
  providers: [PigsService],
})
export class PigsModule {}