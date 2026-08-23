import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { CandidateProfileController } from './candidate-profile.controller';
import { CandidateProfileService } from './candidate-profile.service';
import { ResumeController } from './resume.controller';
import { ResumeService } from './resume.service';

@Module({
  imports: [StorageModule],
  controllers: [CandidateProfileController, ResumeController],
  providers: [CandidateProfileService, ResumeService],
  // Exported so AssignmentsModule (RR-012) can reuse the profile read behind a
  // delegated-authorization check.
  exports: [CandidateProfileService],
})
export class CandidateModule {}
