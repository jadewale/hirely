'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import type { Resume } from '@/lib/contracts';
import {
  RESUME_ACCEPT,
  deleteResume,
  listResumes,
  openResumeDownload,
  uploadResume,
  validateResumeFile,
} from '@/lib/resumes';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

/**
 * Résumé section of the candidate dashboard (RR-018). Lists the candidate's
 * own résumés and drives the direct-to-S3 upload: pick a file → PUT to a signed
 * URL → confirm. The API never sees the file bytes.
 */
export function ResumeManager() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    listResumes()
      .then((r) => active && setResumes(r))
      .catch(() => active && setError('Could not load your résumés.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  async function refresh() {
    setResumes(await listResumes());
  }

  async function onPick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Allow re-picking the same file next time.
    event.target.value = '';
    if (!file) return;

    setError(null);
    const invalid = validateResumeFile(file);
    if (invalid) {
      setError(invalid);
      return;
    }

    setUploading(true);
    try {
      await uploadResume(file);
      await refresh();
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function onDelete(id: string) {
    setError(null);
    setBusyId(id);
    try {
      await deleteResume(id);
      await refresh();
    } catch {
      setError('Could not delete that résumé.');
    } finally {
      setBusyId(null);
    }
  }

  async function onDownload(id: string) {
    setError(null);
    setBusyId(id);
    try {
      await openResumeDownload(id);
    } catch {
      setError('Could not open that résumé.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-medium">Résumés</h2>
          <p className="text-sm text-neutral-500">PDF or Word, up to 10 MB.</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={RESUME_ACCEPT}
          className="hidden"
          onChange={onPick}
        />
        <Button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? 'Uploading…' : 'Upload résumé'}
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-neutral-500">Loading…</p>
      ) : resumes.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No résumés yet. Upload one to get started.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-neutral-100">
          {resumes.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{r.fileName}</p>
                <p className="text-xs text-neutral-500">
                  {formatBytes(r.sizeBytes)} · {r.status.toLowerCase()} ·{' '}
                  {formatDate(r.createdAt)}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => onDownload(r.id)}
                  className="text-sm underline disabled:opacity-50"
                >
                  Download
                </button>
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => onDelete(r.id)}
                  className="text-sm text-red-600 underline disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}
