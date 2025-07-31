import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';

import { CoastersService } from '../modules/coasters/coasters.service';

@Injectable()
export class WagonBelongsToCoasterGuard implements CanActivate {
  constructor(private coastersService: CoastersService) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();
    const { coasterId, wagonId } = request.params;

    if (!coasterId || !wagonId) {
      throw new ForbiddenException('Coaster ID and Wagon ID must be provided');
    }

    const wagon = await this.coastersService.getWagonById(wagonId);

    if (!wagon || wagon.coasterId !== coasterId) {
      throw new ForbiddenException(`Wagon ${wagonId} does not belong to coaster ${coasterId}`);
    }

    return true;
  }
}
