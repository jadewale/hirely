import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { JobsService } from "./jobs.service";

@Controller("jobs")
@UseGuards(AuthGuard)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  async listJobs() {
    return this.jobsService.listJobs();
  }

  @Get(":id")
  async getJob(@Param("id") id: string) {
    return this.jobsService.getJob(id);
  }

  @Post()
  async createJob(@Body() body: any) {
    return this.jobsService.createJob(body);
  }

  @Post(":id/apply")
  async apply(@Param("id") jobId: string, @Req() req: any) {
    return this.jobsService.applyToJob({
      jobId,
      userId: req.user.id,
      appliedBy: req.session.impersonatedBy ?? undefined,
    });
  }

  @Get("applications/me")
  async myApplications(@Req() req: any) {
    return this.jobsService.getUserApplications(req.user.id);
  }

  @Patch("applications/:id/status")
  async updateStatus(
    @Param("id") id: string,
    @Body("status") status: string,
  ) {
    return this.jobsService.updateApplicationStatus(id, status as any);
  }
}
