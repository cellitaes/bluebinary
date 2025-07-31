import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, UseGuards } from '@nestjs/common';

import { WagonBelongsToCoasterGuard } from '../../guards/wagon-belong-to-coaster.guard';
import { ZodValidationPipe } from '../../pipes/zod-validation.pipe';
import { Coaster, CoasterStatistics, CoasterWithWagons, CreateCoaster, CreateWagon, CreateWagonSchema, UpdateCoaster, UpdateWagon, UpdateWagonSchema, Wagon } from '../../schemas';
import { CreateCoasterSchema, UpdateCoasterSchema } from '../../schemas/';

import { CoastersService } from './coasters.service';

@Controller('coasters')
export class CoastersController {
  constructor(private readonly coastersService: CoastersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  public async createCoaster(@Body(new ZodValidationPipe(CreateCoasterSchema)) createCoaster: CreateCoaster): Promise<Coaster> {
    return this.coastersService.createCoaster(createCoaster);
  }

  @Get()
  public async getAllCoasters(): Promise<Coaster[]> {
    return this.coastersService.getAllCoasters();
  }

  @Get(':coasterId')
  public async getCoasterById(@Param('coasterId') coasterId: string): Promise<CoasterWithWagons> {
    return this.coastersService.getCoasterWithWagons(coasterId);
  }

  @Put(':coasterId')
  public async updateCoaster(@Param('coasterId') coasterId: string, @Body(new ZodValidationPipe(UpdateCoasterSchema)) updateCoaster: UpdateCoaster): Promise<Coaster> {
    return this.coastersService.updateCoaster(coasterId, updateCoaster);
  }

  @Delete(':coasterId')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async deleteCoaster(@Param('coasterId') coasterId: string): Promise<Coaster[] | null> {
    return this.coastersService.deleteCoaster(coasterId);
  }

  @Post(':coasterId/wagons')
  @HttpCode(HttpStatus.CREATED)
  public async createWagon(@Param('coasterId') coasterId: string, @Body(new ZodValidationPipe(CreateWagonSchema)) createWagon: CreateWagon): Promise<Wagon> {
    return this.coastersService.createWagon(coasterId, createWagon);
  }

  @Get(':coasterId/wagons')
  public async getWagonsByCoasterId(@Param('coasterId') coasterId: string): Promise<Wagon[]> {
    return this.coastersService.getWagonsByCoasterId(coasterId);
  }

  @Get(':coasterId/wagons/:wagonId')
  @UseGuards(WagonBelongsToCoasterGuard)
  public async getWagonById(@Param('wagonId') wagonId: string): Promise<Wagon> {
    const wagon = await this.coastersService.getWagonById(wagonId);

    return wagon;
  }

  @Put(':coasterId/wagons/:wagonId')
  @UseGuards(WagonBelongsToCoasterGuard)
  public async updateWagon(@Param('coasterId') coasterId: string, @Param('wagonId') wagonId: string, @Body(new ZodValidationPipe(UpdateWagonSchema)) updateWagon: UpdateWagon): Promise<Wagon> {
    return this.coastersService.updateWagon(wagonId, updateWagon);
  }

  @Delete(':coasterId/wagons/:wagonId')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async deleteWagon(@Param('coasterId') coasterId: string, @Param('wagonId') wagonId: string): Promise<Wagon[] | null> {
    return this.coastersService.deleteWagon(coasterId, wagonId);
  }

  @Get(':coasterId/statistics')
  public async getCoasterStatistics(@Param('coasterId') coasterId: string): Promise<CoasterStatistics> {
    return this.coastersService.getCoasterStatistics(coasterId);
  }
}
