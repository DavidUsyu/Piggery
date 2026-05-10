import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/auth.jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { FARM_WRITE_ROLES, Roles } from '../auth/roles.decorator';
import { CreateEventDto } from './dto/create-event.dto';
import { CreateBulkEventDto } from './dto/create-bulk-event.dto';
import { UpdateBulkEventsDto } from './dto/update-bulk-events.dto';
import { EventsService } from './events.service';

@Controller('events')
@UseGuards(JwtGuard, RolesGuard)
export class EventsController {
  constructor(private eventsService: EventsService) {}

  @Post()
  @Roles(...FARM_WRITE_ROLES)
  create(@Req() req: any, @Body() dto: CreateEventDto) {
    return this.eventsService.create(req.user.farmId, dto);
  }

  @Post('bulk')
  @Roles(...FARM_WRITE_ROLES)
  bulkCreate(@Req() req: any, @Body() dto: CreateBulkEventDto) {
    return this.eventsService.bulkCreate(req.user.farmId, dto);
  }

  @Get()
  list(@Req() req: any, @Query('pigId') pigId?: string) {
    return this.eventsService.list(req.user.farmId, pigId);
  }

  @Patch('bulk')
  @Roles(...FARM_WRITE_ROLES)
  bulkUpdate(@Req() req: any, @Body() dto: UpdateBulkEventsDto) {
    return this.eventsService.bulkUpdate(req.user.farmId, dto);
  }

  @Patch(':id')
  @Roles(...FARM_WRITE_ROLES)
  update(@Req() req: any, @Param('id') id: string, @Body() dto: CreateEventDto) {
    return this.eventsService.update(req.user.farmId, id, dto);
  }

  @Delete(':id')
  @Roles(...FARM_WRITE_ROLES)
  remove(@Req() req: any, @Param('id') id: string) {
    return this.eventsService.remove(req.user.farmId, id);
  }
}
