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
import { FinanceService } from './finance.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

@Controller('finance')
@UseGuards(JwtGuard)
export class FinanceController {
  constructor(private financeService: FinanceService) {}

  @Get('summary')
  summary(
    @Req() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.financeService.summary(req.user.farmId, from, to);
  }

  @Get('pig/:pigId/profit')
  pigProfit(@Req() req: any, @Param('pigId') pigId: string) {
    return this.financeService.pigProfit(req.user.farmId, pigId);
  }

  @Post('sales')
  createSale(@Req() req: any, @Body() dto: CreateSaleDto) {
    return this.financeService.createSale(req.user.farmId, dto);
  }

  @Get('sales')
  listSales(@Req() req: any) {
    return this.financeService.listSales(req.user.farmId);
  }

  @Patch('sales/:saleId')
  updateSale(
    @Req() req: any,
    @Param('saleId') saleId: string,
    @Body() dto: UpdateSaleDto,
  ) {
    return this.financeService.updateSale(req.user.farmId, saleId, dto);
  }

  @Delete('sales/:saleId')
  deleteSale(@Req() req: any, @Param('saleId') saleId: string) {
    return this.financeService.deleteSale(req.user.farmId, saleId);
  }

  @Post('expenses')
  createExpense(@Req() req: any, @Body() dto: CreateExpenseDto) {
    return this.financeService.createExpense(req.user.farmId, dto);
  }

  @Get('expenses')
  listExpenses(@Req() req: any) {
    return this.financeService.listExpenses(req.user.farmId);
  }

  @Patch('expenses/:expenseId')
  updateExpense(
    @Req() req: any,
    @Param('expenseId') expenseId: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.financeService.updateExpense(req.user.farmId, expenseId, dto);
  }

  @Delete('expenses/:expenseId')
  deleteExpense(@Req() req: any, @Param('expenseId') expenseId: string) {
    return this.financeService.deleteExpense(req.user.farmId, expenseId);
  }
}