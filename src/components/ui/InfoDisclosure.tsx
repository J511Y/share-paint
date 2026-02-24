'use client';

import { useEffect, useId, useRef, useState } from 'react';
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
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const hasOpenedRef = useRef(false);

  useEffect(() => {
    if (open) {
      hasOpenedRef.current = true;
      closeButtonRef.current?.focus();
      return;
    }

    if (hasOpenedRef.current) {
      triggerRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn('relative inline-flex flex-col items-end', className)}>
      <button
        ref={triggerRef}
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
          className="absolute right-0 top-9 z-30 w-[min(22rem,calc(100vw-1rem))] max-h-[60vh] overflow-y-auto rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900 shadow-lg sm:w-80"
        >
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="font-semibold">{title}</p>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setOpen(false)}
              aria-label="안내 닫기"
              className="inline-flex h-5 w-5 items-center justify-center rounded text-blue-700 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              ×
            </button>
          </div>
          <div>{children}</div>
        </section>
      )}
    </div>
  );
}
