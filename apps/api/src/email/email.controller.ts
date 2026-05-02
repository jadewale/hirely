import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { EmailService } from "./email.service";

@Controller("emails")
@UseGuards(AuthGuard)
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Get()
  async listEmails(
    @Req() req: any,
    @Query("job_only") jobOnly?: string,
  ) {
    return this.emailService.getUserEmails(
      req.user.id,
      jobOnly === "true",
    );
  }

  @Get("alerts")
  async listAlerts(
    @Req() req: any,
    @Query("unseen_only") unseenOnly?: string,
  ) {
    return this.emailService.getUserAlerts(
      req.user.id,
      unseenOnly === "true",
    );
  }
}
