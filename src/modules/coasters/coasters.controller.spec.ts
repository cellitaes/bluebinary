import { Test, TestingModule } from '@nestjs/testing';

import { CoastersController } from './coasters.controller';

describe('CoastersController', () => {
  let controller: CoastersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CoastersController],
    }).compile();

    controller = module.get<CoastersController>(CoastersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
