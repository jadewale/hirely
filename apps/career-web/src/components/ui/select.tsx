import type { SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Select({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-neutral-900',
        className,
      )}
      {...props}
    />
  );
}
