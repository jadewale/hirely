import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
} from '@nestjs/common';
import {
  ApiBody,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  updateAssistantStatusSchema,
  type UpdateAssistantStatusInput,
} from '@career/contracts';
import { RequireRoles } from '../authz/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AssistantProfileService } from './assistant-profile.service';
import { AssistantProfileDto } from './dto/assistant-profile.dto';
import { UpdateAssistantStatusDto } from './dto/update-assistant-status.dto';

/**
 * Admin management of assistant profiles (RR-010). Behind
 * @RequireRoles('ADMIN'). Here `:userId` names the TARGET assistant, not the
 * actor — an admin legitimately acts on other users (the session still
 * identifies the admin). Suspending an assistant here is what the delegated-
 * authorization service (RR-012) reads to reject their assignment actions.
 */
@ApiTags('admin')
@Controller('admin/assistants/:userId')
@RequireRoles('ADMIN')
export class AssistantAdminController {
  constructor(private readonly profiles: AssistantProfileService) {}

  @Get('profile')
  @ApiOperation({
    operationId: 'adminGetAssistantProfile',
    summary: "Get an assistant's profile by user id",
  })
  @ApiParam({ name: 'userId', description: 'Target assistant user id' })
  @ApiOkResponse({ type: AssistantProfileDto })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Authenticated but not ADMIN' })
  @ApiNotFoundResponse({ description: 'No profile for that user' })
  async getProfile(
    @Param('userId') userId: string,
  ): Promise<AssistantProfileDto> {
    const row = await this.profiles.getByUserId(userId);
    if (!row) throw new NotFoundException('No assistant profile for that user');
    return AssistantProfileService.toDto(row);
  }

  @Patch('status')
  @ApiOperation({
    operationId: 'adminSetAssistantStatus',
    summary: 'Activate or suspend an assistant',
  })
  @ApiParam({ name: 'userId', description: 'Target assistant user id' })
  @ApiBody({ type: UpdateAssistantStatusDto })
  @ApiOkResponse({ type: AssistantProfileDto })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Authenticated but not ADMIN' })
  @ApiNotFoundResponse({ description: 'No profile for that user' })
  async setStatus(
    @Param('userId') userId: string,
    @Body(new ZodValidationPipe(updateAssistantStatusSchema))
    body: UpdateAssistantStatusInput,
  ): Promise<AssistantProfileDto> {
    const row = await this.profiles.setStatus(userId, body.status);
    return AssistantProfileService.toDto(row);
  }
}
