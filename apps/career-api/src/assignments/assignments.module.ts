import { Module } from '@nestjs/common';
import { CandidateModule } from '../candidate/candidate.module';
import { AdminAssignmentsController } from './admin-assignments.controller';
import { AssistantAssignmentsController } from './assistant-assignments.controller';
import { AssignmentsService } from './assignments.service';

/**
 * Assignments (RR-011) + delegated authorization (RR-012). Imports CandidateModule
 * to reuse CandidateProfileService for the delegated profile read. Exports
 * AssignmentsService so later features (applications, impersonation) can reuse
 * `assertPermission`.
 */
@Module({
  imports: [CandidateModule],
  controllers: [AdminAssignmentsController, AssistantAssignmentsController],
  providers: [AssignmentsService],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
