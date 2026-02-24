'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InfoDisclosureProps {
  label?: string;
  title?: string;
  className?: string;
  children: React.ReactNode;
}

const PANEL_WIDTH = 320;
const VIEWPORT_GUTTER = 8;
const PANEL_ANIMATION_CLASS =
  'transition-all duration-150 ease-out motion-reduce:transition-none data-[state=closed]:pointer-events-none data-[state=closed]:-translate-y-1 data-[state=closed]:opacity-0 data-[state=open]:pointer-events-auto data-[state=open]:translate-y-0 data-[state=open]:opacity-100';

export function InfoDisclosure({
  label = '안내 보기',
  title = '안내',
  className,
  children,
}: InfoDisclosureProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: PANEL_WIDTH });
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

    const computePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const maxWidth = Math.min(PANEL_WIDTH, window.innerWidth - VIEWPORT_GUTTER * 2);
      const nextLeft = Math.min(
        Math.max(VIEWPORT_GUTTER, rect.right - maxWidth),
        window.innerWidth - maxWidth - VIEWPORT_GUTTER
      );

      setPosition({
        top: rect.bottom + 8,
        left: nextLeft,
        width: maxWidth,
      });
    };

    computePosition();

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      const root = rootRef.current;
      if (root?.contains(target)) return;

      const panel = document.getElementById(panelId);
      if (panel?.contains(target)) return;

      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('resize', computePosition);
    window.addEventListener('scroll', computePosition, true);
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', computePosition);
      window.removeEventListener('scroll', computePosition, true);
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, panelId]);

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

      {open && typeof document !== 'undefined' && createPortal(
          <section
            id={panelId}
            data-state={open ? 'open' : 'closed'}
            className={cn(
              'fixed z-50 max-h-[60vh] overflow-y-auto rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900 shadow-lg',
              PANEL_ANIMATION_CLASS
            )}
            style={{ top: position.top, left: position.left, width: position.width }}
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
          </section>,
          document.body
        )}
    </div>
  );
}
