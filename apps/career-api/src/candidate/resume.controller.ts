import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  createResumeInputSchema,
  type CreateResumeInput,
} from '@career/contracts';
import {
  CurrentUser,
  type CurrentUserType,
} from '../authz/current-user.decorator';
import { RequireRoles } from '../authz/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ResumeService } from './resume.service';
import {
  CreateResumeInputDto,
  CreateResumeResponseDto,
  ResumeDownloadDto,
  ResumeDto,
  ResumeListDto,
} from './dto/resume.dto';

/**
 * A candidate's own résumés (RR-018). Gated to CANDIDATE; every action targets
 * the session user (@CurrentUser) and is looked up by (id, userId), so a
 * candidate can only ever touch their own files. File bytes go directly to S3
 * via pre-signed URLs — they never pass through this API.
 */
@ApiTags('candidate')
@Controller('candidate/resumes')
@RequireRoles('CANDIDATE')
export class ResumeController {
  constructor(private readonly service: ResumeService) {}

  @Post()
  @ApiOperation({
    operationId: 'createResume',
    summary: 'Request a pre-signed URL to upload a résumé',
  })
  @ApiBody({ type: CreateResumeInputDto })
  @ApiCreatedResponse({ type: CreateResumeResponseDto })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  async create(
    @CurrentUser() user: CurrentUserType,
    @Body(new ZodValidationPipe(createResumeInputSchema))
    input: CreateResumeInput,
  ): Promise<CreateResumeResponseDto> {
    return this.service.create(user.id, input);
  }

  @Get()
  @ApiOperation({ operationId: 'listResumes', summary: 'List my résumés' })
  @ApiOkResponse({ type: ResumeListDto })
  async list(@CurrentUser() user: CurrentUserType): Promise<ResumeListDto> {
    return this.service.list(user.id);
  }

  @Post(':id/confirm')
  @ApiOperation({
    operationId: 'confirmResume',
    summary: 'Confirm a résumé upload finished (marks it READY)',
  })
  @ApiOkResponse({ type: ResumeDto })
  @ApiNotFoundResponse({ description: 'Résumé not found' })
  async confirm(
    @CurrentUser() user: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ResumeDto> {
    return this.service.confirm(user.id, id);
  }

  @Get(':id/download')
  @ApiOperation({
    operationId: 'downloadResume',
    summary: 'Get a short-lived download URL for a résumé',
  })
  @ApiOkResponse({ type: ResumeDownloadDto })
  @ApiNotFoundResponse({ description: 'Résumé not found' })
  async download(
    @CurrentUser() user: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ResumeDownloadDto> {
    return this.service.download(user.id, id);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ operationId: 'deleteResume', summary: 'Delete a résumé' })
  @ApiNoContentResponse({ description: 'Deleted' })
  @ApiNotFoundResponse({ description: 'Résumé not found' })
  async remove(
    @CurrentUser() user: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.service.remove(user.id, id);
  }
}
