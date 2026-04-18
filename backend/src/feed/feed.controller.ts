import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/auth.jwt.guard';
import { FARM_WRITE_ROLES, Roles } from '../auth/roles.decorator';
import { FeedService } from './feed.service';
import { CreateFeedTypeDto } from './dto/create-feed-type.dto';
import { CreateFeedPurchaseDto } from './dto/create-feed-purchase.dto';
import { CreateFeedUsageDto } from './dto/create-feed-usage.dto';

@Controller('feed')
@UseGuards(JwtGuard)
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Post('types')
  @Roles(...FARM_WRITE_ROLES)
  createFeedType(@Req() req: any, @Body() dto: CreateFeedTypeDto) {
    return this.feedService.createFeedType(req.user.farmId, dto);
  }

  @Get('types')
  listFeedTypes(@Req() req: any) {
    return this.feedService.listFeedTypes(req.user.farmId);
  }

  @Post('purchases')
  @Roles(...FARM_WRITE_ROLES)
  createFeedPurchase(@Req() req: any, @Body() dto: CreateFeedPurchaseDto) {
    return this.feedService.createFeedPurchase(req.user.farmId, dto);
  }

  @Get('purchases')
  listFeedPurchases(@Req() req: any) {
    return this.feedService.listFeedPurchases(req.user.farmId);
  }

  @Post('usage')
  @Roles(...FARM_WRITE_ROLES)
  recordFeedUsage(@Req() req: any, @Body() dto: CreateFeedUsageDto) {
    return this.feedService.recordFeedUsage(req.user.farmId, dto);
  }
}
