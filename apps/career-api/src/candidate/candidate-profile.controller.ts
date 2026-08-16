import { Body, Controller, Get, NotFoundException, Put } from '@nestjs/common';
import {
  ApiBody,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  candidateProfileInputSchema,
  type CandidateProfileInput,
} from '@career/contracts';
import {
  CurrentUser,
  type CurrentUserType,
} from '../authz/current-user.decorator';
import { RequireRoles } from '../authz/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CandidateProfileService } from './candidate-profile.service';
import { CandidateProfileInputDto } from './dto/candidate-profile-input.dto';
import { CandidateProfileResponseDto } from './dto/candidate-profile-response.dto';

/**
 * The candidate's own profile (RR-008). Gated to CANDIDATE; the owner is always
 * the session user (@CurrentUser) — there is no userId param, so a candidate can
 * only read/update their own profile. Assistant access via assignment permission
 * arrives with RR-011/RR-012.
 */
@ApiTags('candidate')
@Controller('candidate/profile')
@RequireRoles('CANDIDATE')
export class CandidateProfileController {
  constructor(private readonly service: CandidateProfileService) {}

  @Get()
  @ApiOperation({
    operationId: 'getMyCandidateProfile',
    summary: 'Get my candidate profile',
  })
  @ApiOkResponse({ type: CandidateProfileResponseDto })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiNotFoundResponse({ description: 'Profile not created yet' })
  async getMine(
    @CurrentUser() user: CurrentUserType,
  ): Promise<CandidateProfileResponseDto> {
    const profile = await this.service.getMine(user.id);
    if (!profile) {
      throw new NotFoundException('Candidate profile not created yet');
    }
    return profile;
  }

  @Put()
  @ApiOperation({
    operationId: 'updateMyCandidateProfile',
    summary: 'Create or update my candidate profile',
  })
  @ApiBody({ type: CandidateProfileInputDto })
  @ApiOkResponse({ type: CandidateProfileResponseDto })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  async updateMine(
    @CurrentUser() user: CurrentUserType,
    @Body(new ZodValidationPipe(candidateProfileInputSchema))
    input: CandidateProfileInput,
  ): Promise<CandidateProfileResponseDto> {
    return this.service.upsertMine(user.id, input);
  }
}
