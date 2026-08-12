'use client';

import { RoleGate } from '@/components/role-gate';
import { Card } from '@/components/ui/card';

export default function CandidatePage() {
  return (
    <RoleGate role="CANDIDATE">
      <section className="flex flex-col gap-6">
        <header>
          <h1 className="text-2xl font-semibold">Candidate dashboard</h1>
          <p className="text-sm text-neutral-500">
            Manage your profile, resumes, and applications.
          </p>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <h2 className="font-medium">Profile</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Complete onboarding (RR-009).
            </p>
          </Card>
          <Card>
            <h2 className="font-medium">Resumes</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Upload and manage resumes (RR-018).
            </p>
          </Card>
          <Card>
            <h2 className="font-medium">Applications</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Review and approve drafts (RR-022).
            </p>
          </Card>
          <Card>
            <h2 className="font-medium">Work orders</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Purchase and fund services (RR-028).
            </p>
          </Card>
        </div>
      </section>
    </RoleGate>
  );
}
