import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  assignmentQuerySchema,
  createAssignmentInputSchema,
  type AssignmentQuery,
  type CreateAssignmentInput,
} from '@career/contracts';
import {
  CurrentUser,
  type CurrentUserType,
} from '../authz/current-user.decorator';
import { RequireRoles } from '../authz/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AssignmentsService } from './assignments.service';
import {
  AssignmentDto,
  AssignmentListDto,
  CreateAssignmentInputDto,
} from './dto/assignment.dto';

/**
 * Admin management of assignments (RR-011): who acts for whom. Creating and
 * revoking is ADMIN-only; both are audited by the service.
 */
@ApiTags('assignments')
@Controller('admin/assignments')
@RequireRoles('ADMIN')
export class AdminAssignmentsController {
  constructor(private readonly service: AssignmentsService) {}

  @Post()
  @ApiOperation({
    operationId: 'createAssignment',
    summary: 'Assign an assistant to a candidate',
  })
  @ApiBody({ type: CreateAssignmentInputDto })
  @ApiCreatedResponse({ type: AssignmentDto })
  async create(
    @CurrentUser() admin: CurrentUserType,
    @Body(new ZodValidationPipe(createAssignmentInputSchema))
    input: CreateAssignmentInput,
  ): Promise<AssignmentDto> {
    return this.service.create(input, admin.id);
  }

  @Get()
  @ApiOperation({ operationId: 'listAssignments', summary: 'List assignments' })
  @ApiOkResponse({ type: AssignmentListDto })
  async list(
    @Query(new ZodValidationPipe(assignmentQuerySchema)) query: AssignmentQuery,
  ): Promise<AssignmentListDto> {
    return this.service.list(query);
  }

  @Post(':id/revoke')
  @ApiOperation({
    operationId: 'revokeAssignment',
    summary: 'Revoke an assignment',
  })
  @ApiOkResponse({ type: AssignmentDto })
  @ApiNotFoundResponse({ description: 'Assignment not found' })
  async revoke(
    @CurrentUser() admin: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AssignmentDto> {
    return this.service.revoke(id, admin.id);
  }
}
