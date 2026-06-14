import type { ReactNode } from 'react';

type ChipTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent';

type StatusChipProps = {
  children: ReactNode;
  tone: ChipTone;
};

export function StatusChip({ children, tone }: StatusChipProps) {
  return <span className={`chip chip-${tone}`}>{children}</span>;
}
