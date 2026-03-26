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
import { CreateEventDto } from './dto/create-event.dto';
import { CreateBulkEventDto } from './dto/create-bulk-event.dto';
import { EventsService } from './events.service';

@Controller('events')
@UseGuards(JwtGuard)
export class EventsController {
  constructor(private eventsService: EventsService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateEventDto) {
    return this.eventsService.create(req.user.farmId, dto);
  }

  @Post('bulk')
  bulkCreate(@Req() req: any, @Body() dto: CreateBulkEventDto) {
    return this.eventsService.bulkCreate(req.user.farmId, dto);
  }

  @Get()
  list(@Req() req: any, @Query('pigId') pigId?: string) {
    return this.eventsService.list(req.user.farmId, pigId);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: CreateEventDto) {
    return this.eventsService.update(req.user.farmId, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.eventsService.remove(req.user.farmId, id);
  }
}