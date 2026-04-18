import { FarmRole } from '@prisma/client';
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: FarmRole[]) => SetMetadata(ROLES_KEY, roles);

export const FARM_WRITE_ROLES = [
  FarmRole.OWNER,
  FarmRole.MANAGER,
  FarmRole.WORKER,
] as const;

export const FARM_ADMIN_ROLES = [FarmRole.OWNER, FarmRole.MANAGER] as const;
