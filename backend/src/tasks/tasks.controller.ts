import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/auth.jwt.guard'; // your correct path
import { TasksService } from './tasks.service';

@Controller('tasks')
@UseGuards(JwtGuard)
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Get('due')
  due(@Req() req: any) {
    return this.tasksService.dueForFarm(req.user.farmId);
  }
}