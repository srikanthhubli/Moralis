import { Controller, Get, Query, Post, Body } from '@nestjs/common';
import { PriceService } from './price.service';

@Controller('price')
export class PriceController {
  constructor(private readonly priceService: PriceService) {}

  @Get('hourly')
  async getHourlyPrices(@Query('chain') chain: string) {
    return this.priceService.getHourlyPrices(chain);
  }

  @Post('set-alert')
  async setPriceAlert(@Body() body: { chain: string; price: number; email: string }) {
    return this.priceService.setPriceAlert(body.chain, body.price, body.email);
  }

  @Get('swap-rate')
  async getSwapRate(@Query('ethAmount') ethAmount: number) {
    return this.priceService.getSwapRate(ethAmount);
  }
}
