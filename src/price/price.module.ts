import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Price } from './price.entity';
import { PriceService } from './price.service';
import { PriceController } from './price.controller';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [TypeOrmModule.forFeature([Price]), ScheduleModule.forRoot()],
  providers: [PriceService],
  controllers: [PriceController],
})
export class PriceModule {}
