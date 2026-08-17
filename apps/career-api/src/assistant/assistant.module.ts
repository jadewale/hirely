import { Module } from '@nestjs/common';
import { AssistantController } from './assistant.controller';
import { AssistantAdminController } from './assistant-admin.controller';
import { AssistantProfileService } from './assistant-profile.service';

/**
 * Assistant profiles (RR-010). Exports AssistantProfileService so later tickets
 * — notably the delegated-authorization service (RR-012), which reads assistant
 * `status` — can reuse it instead of re-querying the table.
 */
@Module({
  controllers: [AssistantController, AssistantAdminController],
  providers: [AssistantProfileService],
  exports: [AssistantProfileService],
})
export class AssistantModule {}
