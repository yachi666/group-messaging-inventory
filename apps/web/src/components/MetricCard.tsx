import { StatusChip } from './StatusChip';

type MetricCardProps = {
  label: string;
  value: string;
  trend: string;
  note: string;
  tone: 'success' | 'warning' | 'danger' | 'accent';
};

export function MetricCard({ label, note, tone, trend, value }: MetricCardProps) {
  return (
    <article className="metric-card">
      <div className="metric-card-top">
        <p className="metric-label">{label}</p>
        <StatusChip tone={tone}>{trend}</StatusChip>
      </div>
      <p className="metric-value">{value}</p>
      <p className="metric-note">{note}</p>
    </article>
  );
}
