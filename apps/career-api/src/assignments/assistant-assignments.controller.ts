import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import {
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  CurrentUser,
  type CurrentUserType,
} from '../authz/current-user.decorator';
import { RequireRoles } from '../authz/roles.decorator';
import { CandidateProfileService } from '../candidate/candidate-profile.service';
import { CandidateProfileResponseDto } from '../candidate/dto/candidate-profile-response.dto';
import { AssignmentsService } from './assignments.service';
import { AssignmentListDto } from './dto/assignment.dto';

/**
 * Assistant-facing surface for assignments (RR-012). An assistant sees which
 * candidates they may act on, and reaches a candidate's data ONLY through the
 * delegated-authorization check — never by impersonation on their own authority.
 * The profile read here is the reference example: it succeeds only with an
 * ACTIVE assignment carrying `candidate.profile.read`.
 */
@ApiTags('assignments')
@Controller('assistant')
@RequireRoles('ASSISTANT')
export class AssistantAssignmentsController {
  constructor(
    private readonly assignments: AssignmentsService,
    private readonly candidateProfiles: CandidateProfileService,
  ) {}

  @Get('assignments')
  @ApiOperation({
    operationId: 'listMyAssignments',
    summary: 'List the candidates I am assigned to (active)',
  })
  @ApiOkResponse({ type: AssignmentListDto })
  async myAssignments(
    @CurrentUser() assistant: CurrentUserType,
  ): Promise<AssignmentListDto> {
    return this.assignments.list({
      assistantUserId: assistant.id,
      status: 'ACTIVE',
      page: 1,
      pageSize: 100,
    });
  }

  @Get('candidates/:candidateUserId/profile')
  @ApiOperation({
    operationId: 'readAssignedCandidateProfile',
    summary: "Read an assigned candidate's profile (delegated)",
  })
  @ApiOkResponse({ type: CandidateProfileResponseDto })
  @ApiForbiddenResponse({ description: 'No assignment grants this access' })
  @ApiNotFoundResponse({ description: 'Profile not created yet' })
  async readCandidateProfile(
    @CurrentUser() assistant: CurrentUserType,
    @Param('candidateUserId') candidateUserId: string,
  ): Promise<CandidateProfileResponseDto> {
    await this.assignments.assertPermission(
      assistant.id,
      candidateUserId,
      'candidate.profile.read',
    );
    const profile = await this.candidateProfiles.getMine(candidateUserId);
    if (!profile) {
      throw new NotFoundException('Candidate profile not created yet');
    }
    return profile;
  }
}
