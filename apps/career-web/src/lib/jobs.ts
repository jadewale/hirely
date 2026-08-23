import { apiFetch } from './api-client';
import type { Job, JobList, JobQuery } from './contracts';

/**
 * Job catalog access (Model layer). Browsing/searching is open to any signed-in
 * user; create/edit (ADMIN/ASSISTANT only) lives with those flows.
 */

export async function listJobs(
  query: Partial<JobQuery> = {},
): Promise<JobList> {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.remoteType) params.set('remoteType', query.remoteType);
  if (query.employmentType) params.set('employmentType', query.employmentType);
  if (query.status) params.set('status', query.status);
  if (query.page) params.set('page', String(query.page));
  const qs = params.toString();
  return apiFetch<JobList>(`/api/jobs${qs ? `?${qs}` : ''}`);
}

export async function getJob(id: string): Promise<Job> {
  return apiFetch<Job>(`/api/jobs/${id}`);
}

/** Format a salary range from integer minor units into a display string. */
export function formatSalary(job: Job): string | null {
  const { salaryMinMinor, salaryMaxMinor, salaryCurrency } = job;
  if (salaryMinMinor == null && salaryMaxMinor == null) return null;
  const fmt = (minor: number) => {
    const major = minor / 100;
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: salaryCurrency ?? 'USD',
        maximumFractionDigits: 0,
      }).format(major);
    } catch {
      return `${major.toLocaleString()} ${salaryCurrency ?? ''}`.trim();
    }
  };
  if (salaryMinMinor != null && salaryMaxMinor != null) {
    return `${fmt(salaryMinMinor)} – ${fmt(salaryMaxMinor)}`;
  }
  return fmt((salaryMinMinor ?? salaryMaxMinor) as number);
}
