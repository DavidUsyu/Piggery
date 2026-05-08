import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
  Patch,
  Param,
} from '@nestjs/common';
import { JwtGuard } from '../auth/auth.jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { FARM_WRITE_ROLES, Roles } from '../auth/roles.decorator';
import { CreatePigDto } from './dto/create-pig.dto';
import { UpdatePigDto } from './dto/update-pig.dto';
import { UpdatePigStatusDto } from './dto/update-pig-status.dto';
import { PigsService } from './pigs.service';

@Controller('pigs')
@UseGuards(JwtGuard, RolesGuard)
export class PigsController {
  constructor(private pigsService: PigsService) {}

  @Post()
  @Roles(...FARM_WRITE_ROLES)
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
  @Roles(...FARM_WRITE_ROLES)
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdatePigDto) {
    return this.pigsService.update(req.user.farmId, id, dto);
  }

  @Patch(':id/status')
  @Roles(...FARM_WRITE_ROLES)
  updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdatePigStatusDto,
  ) {
    return this.pigsService.updateStatus(req.user.farmId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(...FARM_WRITE_ROLES)
  remove(@Req() req: any, @Param('id') id: string) {
    return this.pigsService.remove(req.user.farmId, id);
  }
}
