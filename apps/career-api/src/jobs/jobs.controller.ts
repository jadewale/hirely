import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  jobInputSchema,
  jobQuerySchema,
  jobUpdateSchema,
  type JobInput,
  type JobQuery,
  type JobUpdate,
} from '@career/contracts';
import {
  CurrentUser,
  type CurrentUserType,
} from '../authz/current-user.decorator';
import { RequireRoles } from '../authz/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { JobsService } from './jobs.service';
import { JobDto, JobInputDto, JobListDto, JobUpdateDto } from './dto/job.dto';

/**
 * Job catalog (jobs users can browse and, later, apply to). Browse/read is open
 * to any signed-in user; creating and editing is limited to ADMIN and ASSISTANT
 * (assistants source jobs for their candidates). Deleting is ADMIN-only.
 */
@ApiTags('jobs')
@Controller('jobs')
export class JobsController {
  constructor(private readonly service: JobsService) {}

  @Get()
  @ApiOperation({ operationId: 'listJobs', summary: 'Browse/search jobs' })
  @ApiOkResponse({ type: JobListDto })
  async list(
    @Query(new ZodValidationPipe(jobQuerySchema)) query: JobQuery,
  ): Promise<JobListDto> {
    return this.service.list(query);
  }

  @Get(':id')
  @ApiOperation({ operationId: 'getJob', summary: 'Get one job' })
  @ApiOkResponse({ type: JobDto })
  @ApiNotFoundResponse({ description: 'Job not found' })
  async getOne(@Param('id', ParseUUIDPipe) id: string): Promise<JobDto> {
    return this.service.getOne(id);
  }

  @Post()
  @RequireRoles('ADMIN', 'ASSISTANT')
  @ApiOperation({ operationId: 'createJob', summary: 'Add a job' })
  @ApiBody({ type: JobInputDto })
  @ApiCreatedResponse({ type: JobDto })
  async create(
    @CurrentUser() user: CurrentUserType,
    @Body(new ZodValidationPipe(jobInputSchema)) input: JobInput,
  ): Promise<JobDto> {
    return this.service.create(user.id, input);
  }

  @Put(':id')
  @RequireRoles('ADMIN', 'ASSISTANT')
  @ApiOperation({ operationId: 'updateJob', summary: 'Update a job' })
  @ApiBody({ type: JobUpdateDto })
  @ApiOkResponse({ type: JobDto })
  @ApiNotFoundResponse({ description: 'Job not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(jobUpdateSchema)) patch: JobUpdate,
  ): Promise<JobDto> {
    return this.service.update(id, patch);
  }

  @Delete(':id')
  @RequireRoles('ADMIN')
  @HttpCode(204)
  @ApiOperation({ operationId: 'deleteJob', summary: 'Delete a job' })
  @ApiNoContentResponse({ description: 'Deleted' })
  @ApiNotFoundResponse({ description: 'Job not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.service.remove(id);
  }
}
