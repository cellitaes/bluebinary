import { Test, TestingModule } from '@nestjs/testing';

import { CoastersService } from './coasters.service';

describe('CoastersService', () => {
  let service: CoastersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CoastersService],
    }).compile();

    service = module.get<CoastersService>(CoastersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
