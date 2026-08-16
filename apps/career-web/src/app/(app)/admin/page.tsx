'use client';

import { RoleGate } from '@/components/role-gate';
import { Card } from '@/components/ui/card';

export default function AdminPage() {
  return (
    <RoleGate role="ADMIN">
      <section className="flex flex-col gap-6">
        <header>
          <h1 className="text-2xl font-semibold">Admin dashboard</h1>
          <p className="text-sm text-neutral-500">
            Assignments, work orders, payouts, and audit.
          </p>
        </header>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <h2 className="font-medium">Assignments</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Assign assistants to candidates (RR-013).
            </p>
          </Card>
          <Card>
            <h2 className="font-medium">Work orders</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Payments and payouts (RR-031).
            </p>
          </Card>
          <Card>
            <h2 className="font-medium">Audit log</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Review recorded actions (RR-016).
            </p>
          </Card>
        </div>
      </section>
    </RoleGate>
  );
}
