import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';

/**
 * @Global so any feature module can inject `AuditService` without re-importing.
 * Audit is a cross-cutting compliance concern (RR-008 profile edits, RR-013
 * admin actions, RR-023 application transitions, …) — every write path should
 * be able to call `auditService.record(...)` without wiring dependencies.
 */
@Global()
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
