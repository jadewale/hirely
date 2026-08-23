'use client';

import { useEffect, useState, type FormEvent } from 'react';
import type { Job, JobRemoteType } from '@/lib/contracts';
import { formatSalary, listJobs } from '@/lib/jobs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

const REMOTE_OPTIONS: { value: '' | JobRemoteType; label: string }[] = [
  { value: '', label: 'Any location type' },
  { value: 'REMOTE', label: 'Remote' },
  { value: 'HYBRID', label: 'Hybrid' },
  { value: 'ONSITE', label: 'On-site' },
];

const PAGE_SIZE = 20;

/**
 * Job catalog browse page (open to any signed-in role). Search by keyword and
 * filter by location type; results are paginated server-side.
 */
export default function JobsPage() {
  const [q, setQ] = useState('');
  const [queryText, setQueryText] = useState(''); // the submitted term
  const [remoteType, setRemoteType] = useState<'' | JobRemoteType>('');
  const [page, setPage] = useState(1);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function run() {
      setLoading(true);
      try {
        const res = await listJobs({
          q: queryText || undefined,
          remoteType: remoteType || undefined,
          status: 'OPEN',
          page,
        });
        if (!active) return;
        setJobs(res.jobs);
        setTotal(res.meta.total);
        setError(null);
      } catch {
        if (active) setError('Could not load jobs.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void run();
    return () => {
      active = false;
    };
  }, [queryText, remoteType, page]);

  function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setQueryText(q.trim());
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">Jobs</h1>
        <p className="text-sm text-neutral-500">
          Browse open roles. {total} open {total === 1 ? 'job' : 'jobs'}.
        </p>
      </header>

      <form onSubmit={onSearch} className="flex flex-wrap items-center gap-3">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search title, company, keywords…"
          className="max-w-sm"
        />
        <Select
          value={remoteType}
          onChange={(e) => {
            setPage(1);
            setRemoteType(e.target.value as '' | JobRemoteType);
          }}
          className="max-w-[180px]"
        >
          {REMOTE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <Button type="submit">Search</Button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-neutral-500">Loading…</p>
      ) : jobs.length === 0 ? (
        <p className="text-sm text-neutral-500">No jobs match your search.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 text-sm">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="underline disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-neutral-500">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="underline disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}

function JobCard({ job }: { job: Job }) {
  const salary = formatSalary(job);
  const meta = [
    job.location,
    job.remoteType && titleCase(job.remoteType),
    job.employmentType && titleCase(job.employmentType.replace('_', ' ')),
    job.seniority,
  ].filter(Boolean);

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-medium">{job.title}</h2>
          <p className="text-sm text-neutral-600">{job.company}</p>
        </div>
        {salary && (
          <span className="shrink-0 text-sm font-medium text-neutral-700">
            {salary}
          </span>
        )}
      </div>
      {meta.length > 0 && (
        <p className="text-xs text-neutral-500">{meta.join(' · ')}</p>
      )}
      {job.description && (
        <p className="line-clamp-2 text-sm text-neutral-600">
          {job.description}
        </p>
      )}
      {job.url && (
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm underline"
        >
          View posting
        </a>
      )}
    </Card>
  );
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
