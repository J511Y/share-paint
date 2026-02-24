'use client';

import { useId, useState } from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InfoDisclosureProps {
  label?: string;
  title?: string;
  className?: string;
  children: React.ReactNode;
}

export function InfoDisclosure({
  label = '안내 보기',
  title = '안내',
  className,
  children,
}: InfoDisclosureProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className={cn('space-y-2', className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 sm:h-7 sm:w-7"
      >
        <Info className="h-4 w-4" />
      </button>

      {open && (
        <section
          id={panelId}
          className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900"
        >
          <p className="mb-1 font-semibold">{title}</p>
          <div>{children}</div>
        </section>
      )}
    </div>
  );
}
