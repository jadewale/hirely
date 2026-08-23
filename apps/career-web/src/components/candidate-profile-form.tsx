'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { ApiError } from '@/lib/api-client';
import {
  extractFieldErrors,
  getCandidateProfile,
  saveCandidateProfile,
  type FieldErrors,
} from '@/lib/candidate-profile';
import type {
  CandidateProfile,
  CandidateProfileInput,
  RemotePreference,
} from '@/lib/contracts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

/**
 * Candidate onboarding form (RR-009). Reads and writes the session user's own
 * profile via the RR-008 API. It builds a partial payload — only fields the
 * user actually filled are sent, matching the API's progressive-completion
 * semantics (the server merges input over the existing row). Client validation
 * is minimal; the API's Zod pipe is authoritative and its field errors are
 * surfaced inline.
 */

const REMOTE_OPTIONS: { value: RemotePreference; label: string }[] = [
  { value: 'REMOTE', label: 'Remote' },
  { value: 'HYBRID', label: 'Hybrid' },
  { value: 'ONSITE', label: 'On-site' },
  { value: 'ANY', label: 'Any' },
];

const CURRENCY_OPTIONS = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'NGN'];

/** Local form state — everything is a string/select value for controlled inputs. */
interface FormState {
  firstName: string;
  lastName: string;
  phone: string;
  location: string;
  headline: string;
  preferredJobTitles: string;
  preferredLocations: string;
  remotePreference: '' | RemotePreference;
  minSalaryMajor: string;
  salaryCurrency: string;
  workAuthorizationCountries: string;
  sponsorshipRequired: '' | 'true' | 'false';
}

const EMPTY_FORM: FormState = {
  firstName: '',
  lastName: '',
  phone: '',
  location: '',
  headline: '',
  preferredJobTitles: '',
  preferredLocations: '',
  remotePreference: '',
  minSalaryMajor: '',
  salaryCurrency: '',
  workAuthorizationCountries: '',
  sponsorshipRequired: '',
};

/** Map an API profile onto the string-based form state. */
function toForm(profile: CandidateProfile): FormState {
  return {
    firstName: profile.firstName ?? '',
    lastName: profile.lastName ?? '',
    phone: profile.phone ?? '',
    location: profile.location ?? '',
    headline: profile.headline ?? '',
    preferredJobTitles: profile.preferredJobTitles.join(', '),
    preferredLocations: profile.preferredLocations.join(', '),
    remotePreference: profile.remotePreference ?? '',
    minSalaryMajor:
      profile.minSalaryMinor != null
        ? String(profile.minSalaryMinor / 100)
        : '',
    salaryCurrency: profile.salaryCurrency ?? '',
    workAuthorizationCountries: profile.workAuthorizationCountries.join(', '),
    sponsorshipRequired:
      profile.sponsorshipRequired == null
        ? ''
        : profile.sponsorshipRequired
          ? 'true'
          : 'false',
  };
}

/** Split a comma-separated field into trimmed, non-empty values. */
function toList(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Build the PUT payload, omitting anything the user left blank. */
function toInput(form: FormState): CandidateProfileInput {
  const input: CandidateProfileInput = {};
  const text = (v: string) => v.trim();

  if (text(form.firstName)) input.firstName = text(form.firstName);
  if (text(form.lastName)) input.lastName = text(form.lastName);
  if (text(form.phone)) input.phone = text(form.phone);
  if (text(form.location)) input.location = text(form.location);
  if (text(form.headline)) input.headline = text(form.headline);

  const titles = toList(form.preferredJobTitles);
  if (titles.length) input.preferredJobTitles = titles;
  const locations = toList(form.preferredLocations);
  if (locations.length) input.preferredLocations = locations;

  if (form.remotePreference) input.remotePreference = form.remotePreference;

  if (text(form.minSalaryMajor)) {
    const amount = Number(text(form.minSalaryMajor));
    if (Number.isFinite(amount)) input.minSalaryMinor = Math.round(amount * 100);
  }
  if (form.salaryCurrency) input.salaryCurrency = form.salaryCurrency;

  const countries = toList(form.workAuthorizationCountries).map((c) =>
    c.toUpperCase(),
  );
  if (countries.length) input.workAuthorizationCountries = countries;

  if (form.sponsorshipRequired) {
    input.sponsorshipRequired = form.sponsorshipRequired === 'true';
  }

  return input;
}

export function CandidateProfileForm() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [completion, setCompletion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    let active = true;
    getCandidateProfile()
      .then((profile) => {
        if (!active) return;
        if (profile) {
          setForm(toForm(profile));
          setCompletion(profile.profileCompletionPercentage);
        }
      })
      .catch(() => {
        if (active) setLoadError('Could not load your profile. Please refresh.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});
    setSaved(false);
    try {
      const updated = await saveCandidateProfile(toInput(form));
      setForm(toForm(updated));
      setCompletion(updated.profileCompletionPercentage);
      setSaved(true);
    } catch (err) {
      if (err instanceof ApiError) {
        const fields = extractFieldErrors(err.body);
        if (fields) setFieldErrors(fields);
        else setError('Could not save your profile. Please try again.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <p className="text-sm text-neutral-500">Loading your profile…</p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Your profile</h2>
          <span className="text-sm font-medium text-neutral-600">
            {completion}% complete
          </span>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-neutral-100"
          role="progressbar"
          aria-valuenow={completion}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-neutral-900 transition-all"
            style={{ width: `${completion}%` }}
          />
        </div>
      </header>

      {loadError && <p className="text-sm text-red-600">{loadError}</p>}

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" error={fieldErrors.firstName}>
            <Input
              value={form.firstName}
              onChange={(e) => update('firstName', e.target.value)}
              autoComplete="given-name"
            />
          </Field>
          <Field label="Last name" error={fieldErrors.lastName}>
            <Input
              value={form.lastName}
              onChange={(e) => update('lastName', e.target.value)}
              autoComplete="family-name"
            />
          </Field>
          <Field label="Phone" error={fieldErrors.phone}>
            <Input
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              autoComplete="tel"
            />
          </Field>
          <Field label="Location" error={fieldErrors.location}>
            <Input
              value={form.location}
              onChange={(e) => update('location', e.target.value)}
              autoComplete="address-level2"
            />
          </Field>
        </div>

        <Field label="Headline" error={fieldErrors.headline}>
          <Input
            value={form.headline}
            onChange={(e) => update('headline', e.target.value)}
            placeholder="e.g. Senior Backend Engineer"
          />
        </Field>

        <Field
          label="Preferred job titles"
          hint="Comma-separated"
          error={fieldErrors.preferredJobTitles}
        >
          <Input
            value={form.preferredJobTitles}
            onChange={(e) => update('preferredJobTitles', e.target.value)}
            placeholder="Backend Engineer, Platform Engineer"
          />
        </Field>

        <Field
          label="Preferred locations"
          hint="Comma-separated"
          error={fieldErrors.preferredLocations}
        >
          <Input
            value={form.preferredLocations}
            onChange={(e) => update('preferredLocations', e.target.value)}
            placeholder="London, Remote"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Remote preference" error={fieldErrors.remotePreference}>
            <Select
              value={form.remotePreference}
              onChange={(e) =>
                update(
                  'remotePreference',
                  e.target.value as FormState['remotePreference'],
                )
              }
            >
              <option value="">Not specified</option>
              {REMOTE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Needs visa sponsorship"
            error={fieldErrors.sponsorshipRequired}
          >
            <Select
              value={form.sponsorshipRequired}
              onChange={(e) =>
                update(
                  'sponsorshipRequired',
                  e.target.value as FormState['sponsorshipRequired'],
                )
              }
            >
              <option value="">Not specified</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Minimum salary"
            hint="Per year, in the currency below"
            error={fieldErrors.minSalaryMinor}
          >
            <Input
              type="number"
              min={0}
              step={1000}
              value={form.minSalaryMajor}
              onChange={(e) => update('minSalaryMajor', e.target.value)}
              placeholder="90000"
            />
          </Field>
          <Field label="Currency" error={fieldErrors.salaryCurrency}>
            <Select
              value={form.salaryCurrency}
              onChange={(e) => update('salaryCurrency', e.target.value)}
            >
              <option value="">Not specified</option>
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field
          label="Work authorization"
          hint="Comma-separated 2-letter country codes, e.g. US, GB"
          error={fieldErrors.workAuthorizationCountries}
        >
          <Input
            value={form.workAuthorizationCountries}
            onChange={(e) =>
              update('workAuthorizationCountries', e.target.value)
            }
            placeholder="US, GB"
          />
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && (
          <p className="text-sm text-green-600">Profile saved.</p>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save profile'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

/** A labelled field row with an optional hint and inline error. */
function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {hint && !error && (
        <span className="text-xs text-neutral-500">{hint}</span>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </label>
  );
}
