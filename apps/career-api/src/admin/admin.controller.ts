import { Controller, Get } from '@nestjs/common';
import {
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  CurrentUser,
  type CurrentUserType,
} from '../authz/current-user.decorator';
import { RequireRoles } from '../authz/roles.decorator';
import { AdminOverviewDto } from './dto/admin-overview.dto';

/**
 * Admin-only surface (RR-006 demonstration of role gating). The whole
 * controller is behind @RequireRoles('ADMIN'): anonymous requests get 401 (the
 * global AuthGuard), and authenticated non-admins get 403 (RolesGuard). The real
 * admin features are built here by RR-013 / RR-032.
 */
@ApiTags('admin')
@Controller('admin')
@RequireRoles('ADMIN')
export class AdminController {
  @Get()
  @ApiOperation({
    operationId: 'adminOverview',
    summary: 'Admin-only demo route',
  })
  @ApiOkResponse({ type: AdminOverviewDto })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Authenticated but not ADMIN' })
  overview(@CurrentUser() user: CurrentUserType): AdminOverviewDto {
    return {
      ok: true,
      message: 'admin-only',
      userId: user.id,
      role: user.role ?? 'CANDIDATE',
    };
  }
}
