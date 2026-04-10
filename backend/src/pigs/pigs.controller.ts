import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  Patch,
  Param,
} from '@nestjs/common';
import { JwtGuard } from '../auth/auth.jwt.guard';
import { CreatePigDto } from './dto/create-pig.dto';
import { UpdatePigDto } from './dto/update-pig.dto';
import { UpdatePigStatusDto } from './dto/update-pig-status.dto';
import { PigsService } from './pigs.service';

@Controller('pigs')
@UseGuards(JwtGuard)
export class PigsController {
  constructor(private pigsService: PigsService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreatePigDto) {
    return this.pigsService.create(req.user.farmId, dto);
  }

  @Get()
  list(@Req() req: any) {
    return this.pigsService.list(req.user.farmId);
  }

  @Get(':pigId/timeline')
  timeline(@Req() req: any, @Param('pigId') pigId: string) {
    return this.pigsService.timeline(req.user.farmId, pigId);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdatePigDto) {
    return this.pigsService.update(req.user.farmId, id, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdatePigStatusDto,
  ) {
    return this.pigsService.updateStatus(req.user.farmId, id, dto);
  }
}