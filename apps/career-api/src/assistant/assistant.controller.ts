import { Body, Controller, Get, NotFoundException, Put } from '@nestjs/common';
import {
  ApiBody,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  upsertAssistantProfileSchema,
  type UpsertAssistantProfileInput,
} from '@career/contracts';
import {
  CurrentUser,
  type CurrentUserType,
} from '../authz/current-user.decorator';
import { RequireRoles } from '../authz/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AssistantProfileService } from './assistant-profile.service';
import { AssistantProfileDto } from './dto/assistant-profile.dto';
import { UpsertAssistantProfileDto } from './dto/upsert-assistant-profile.dto';

/**
 * Assistant self-service for the caller's OWN profile (RR-010). Behind
 * @RequireRoles('ASSISTANT'): anonymous → 401 (global AuthGuard), non-assistant
 * → 403 (RolesGuard). The subject is always the session user — there is no
 * userId parameter, so an assistant can never read or write another's profile.
 */
@ApiTags('assistant')
@Controller('assistant/profile')
@RequireRoles('ASSISTANT')
export class AssistantController {
  constructor(private readonly profiles: AssistantProfileService) {}

  @Get()
  @ApiOperation({
    operationId: 'getMyAssistantProfile',
    summary: "Get the current assistant's profile",
  })
  @ApiOkResponse({ type: AssistantProfileDto })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Authenticated but not ASSISTANT' })
  @ApiNotFoundResponse({ description: 'No profile created yet' })
  async getMine(
    @CurrentUser() user: CurrentUserType,
  ): Promise<AssistantProfileDto> {
    const row = await this.profiles.getByUserId(user.id);
    if (!row) throw new NotFoundException('No assistant profile yet');
    return AssistantProfileService.toDto(row);
  }

  @Put()
  @ApiOperation({
    operationId: 'upsertMyAssistantProfile',
    summary: "Create or replace the current assistant's profile",
  })
  @ApiBody({ type: UpsertAssistantProfileDto })
  @ApiOkResponse({ type: AssistantProfileDto })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Authenticated but not ASSISTANT' })
  async upsertMine(
    @CurrentUser() user: CurrentUserType,
    @Body(new ZodValidationPipe(upsertAssistantProfileSchema))
    body: UpsertAssistantProfileInput,
  ): Promise<AssistantProfileDto> {
    const row = await this.profiles.upsertForUser(user.id, body);
    return AssistantProfileService.toDto(row);
  }
}
