import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/auth.jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { FARM_WRITE_ROLES, Roles } from '../auth/roles.decorator';
import { PigGroupsService } from './pig-groups.service';
import { CreatePigGroupDto } from './dto/create-pig-group.dto';
import { AssignPigsDto } from './dto/assign-pigs.dto';

@Controller('pig-groups')
@UseGuards(JwtGuard, RolesGuard)
export class PigGroupsController {
  constructor(private pigGroupsService: PigGroupsService) {}

  @Post()
  @Roles(...FARM_WRITE_ROLES)
  create(@Req() req: any, @Body() dto: CreatePigGroupDto) {
    return this.pigGroupsService.create(req.user.farmId, dto);
  }

  @Get()
  list(@Req() req: any) {
    return this.pigGroupsService.list(req.user.farmId);
  }

  @Patch(':id/assign-pigs')
  @Roles(...FARM_WRITE_ROLES)
  assignPigs(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: AssignPigsDto,
  ) {
    return this.pigGroupsService.assignPigs(req.user.farmId, id, dto);
  }

  @Delete(':id/pigs/:pigId')
  @Roles(...FARM_WRITE_ROLES)
  removePig(@Req() req: any, @Param('id') id: string, @Param('pigId') pigId: string) {
    return this.pigGroupsService.removePig(req.user.farmId, id, pigId);
  }
}
