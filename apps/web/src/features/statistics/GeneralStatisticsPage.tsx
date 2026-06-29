import { lazy, Suspense, useState } from 'react';
import {
  BuildingOffice2Icon,
  ChevronRightIcon,
  CircleStackIcon,
  ExclamationTriangleIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';
import { CountUp } from '../../components/react-bits/CountUp';
import { SpotlightCard } from '../../components/react-bits/SpotlightCard';
import type { MapCity } from './PanWorldMap';

const PanWorldMap = lazy(() =>
  import('./PanWorldMap').then((module) => ({
    default: module.PanWorldMap,
  })),
);

const cities = [
  { id: 'uk', name: 'United Kingdom', value: '1,733,200', color: '#59cc99', longitude: -1.5, latitude: 52.35 },
  { id: 'uae', name: 'UAE', value: '94,320', color: '#ef9b38', longitude: 54.37, latitude: 24.45 },
  { id: 'hong-kong', name: 'Hong Kong', value: '317,080', color: '#d66de5', longitude: 114.17, latitude: 22.3 },
  { id: 'singapore', name: 'Singapore', value: '173,420', color: '#4b8fdf', longitude: 103.82, latitude: 1.35 },
] as const satisfies readonly MapCity[];

const metrics = [
  { label: 'Matched messages', value: 2080000, color: '#7459ee', Icon: CircleStackIcon },
  { label: 'Unknown traffic', value: 126000, color: '#54b9e9', Icon: QuestionMarkCircleIcon },
  { label: 'Drift exceptions', value: 18, color: '#ff8455', Icon: ExclamationTriangleIcon },
];

function ProgressRing({ color, percentage }: { color: string; percentage: number }) {
  const r = 38;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg
      className="statistics-ring"
      viewBox="0 0 100 100"
      role="img"
      aria-label={`${percentage} percent`}
    >
      <circle
        cx="50"
        cy="50"
        r={r}
        className="statistics-ring-track"
      />
      <circle
        cx="50"
        cy="50"
        r={r}
        className="statistics-ring-fill"
        stroke={color}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
      <text
        className="statistics-ring-value"
        x="50"
        y="50"
      >
        {percentage}%
      </text>
    </svg>
  );
}

export function GeneralStatisticsPage() {
  const [selectedCity, setSelectedCity] = useState<(typeof cities)[number]>(cities[0]);
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <main className="general-statistics-page">
      <section className="statistics-sidebar" aria-label="Global messaging inventory summary">
        <header className="statistics-header">
          <h1>Global inventory</h1>
          <button
            aria-expanded={detailsOpen}
            className="statistics-detail-toggle"
            onClick={() => setDetailsOpen((open) => !open)}
            type="button"
          >
            <span>Production traffic</span>
            <ChevronRightIcon aria-hidden="true" />
          </button>
        </header>

        <CountUp
          className="statistics-total"
          delay={0.08}
          duration={1.6}
          to={2431340}
        />

        <div className="statistics-metrics">
          {metrics.map(({ label, value, color, Icon }) => (
            <SpotlightCard
              className="statistics-metric"
              key={label}
              spotlightColor={`${color}1f`}
            >
              <span
                className="statistics-metric-icon"
                style={{ backgroundColor: color }}
              >
                <Icon aria-hidden="true" />
              </span>
              <span className="statistics-metric-label-group">
                <strong>{label}</strong>
                <CountUp
                  className="statistics-metric-value"
                  delay={0.18}
                  duration={1.25}
                  to={value}
                />
              </span>
            </SpotlightCard>
          ))}
        </div>

        <div className="statistics-audience">
          <article>
            <ProgressRing color="var(--stat-ring-owner)" percentage={72} />
            <span>
              <strong>Owner status</strong>
              <small>Confirmed use cases</small>
            </span>
          </article>
          <article>
            <ProgressRing color="var(--stat-ring-evidence)" percentage={61} />
            <span>
              <strong>Evidence</strong>
              <small>Ready by market</small>
            </span>
          </article>
        </div>

        {detailsOpen && (
          <aside
            aria-live="polite"
            className="statistics-detail-popover"
          >
            <span>Selected market</span>
            <strong>{selectedCity.name}</strong>
            <b>{selectedCity.value} messages</b>
          </aside>
        )}
      </section>

      <Suspense fallback={<section className="statistics-map-loading" role="status">Loading map</section>}>
        <PanWorldMap
          cities={cities}
          onSelectCity={(city) => {
            const match = cities.find(({ id }) => id === city.id);
            if (match) setSelectedCity(match);
          }}
          selectedCityId={selectedCity.id}
        />
      </Suspense>

      <span aria-live="polite" className="statistics-live-status">
        <i
          aria-hidden="true"
          style={{ background: selectedCity.color }}
        />
        <span>
          <small>Selected market</small>
          <strong>{selectedCity.name}</strong>
        </span>
        <b>{selectedCity.value}</b>
      </span>
    </main>
  );
}
