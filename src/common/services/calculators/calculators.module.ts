import { Module } from '@nestjs/common';

import { CapacityCalculatorService } from './capacity-calculator.service';

@Module({
  providers: [CapacityCalculatorService],
  exports: [CapacityCalculatorService],
})
export class CalculatorsModule {}
