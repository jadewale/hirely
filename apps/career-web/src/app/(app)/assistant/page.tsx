'use client';

import { RoleGate } from '@/components/role-gate';
import { Card } from '@/components/ui/card';

export default function AssistantPage() {
  return (
    <RoleGate role="ASSISTANT">
      <section className="flex flex-col gap-6">
        <header>
          <h1 className="text-2xl font-semibold">Assistant dashboard</h1>
          <p className="text-sm text-neutral-500">
            Work assigned candidates through delegated permissions.
          </p>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <h2 className="font-medium">Assigned candidates</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Candidates assigned to you (RR-021).
            </p>
          </Card>
          <Card>
            <h2 className="font-medium">Applications</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Prepare drafts and submit for approval (RR-021).
            </p>
          </Card>
        </div>
      </section>
    </RoleGate>
  );
}
