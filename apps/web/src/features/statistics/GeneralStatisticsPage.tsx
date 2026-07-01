import { lazy, Suspense, useState } from 'react';
import {
  ChevronRightIcon,
  CircleStackIcon,
  ExclamationTriangleIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';
import { CountUp } from '../../components/react-bits/CountUp';
import { SpotlightCard } from '../../components/react-bits/SpotlightCard';
import { useProductInventory } from '../inventory/productInventoryApi';
import type { MapCity } from './PanWorldMap';

const PanWorldMap = lazy(() =>
  import('./PanWorldMap').then((module) => ({
    default: module.PanWorldMap,
  })),
);

const marketCoordinates: Record<string, Pick<MapCity, 'latitude' | 'longitude'>> = {
  HK: { longitude: 114.17, latitude: 22.3 },
  'Hong Kong': { longitude: 114.17, latitude: 22.3 },
  Singapore: { longitude: 103.82, latitude: 1.35 },
  SG: { longitude: 103.82, latitude: 1.35 },
  UAE: { longitude: 54.37, latitude: 24.45 },
  UK: { longitude: -1.5, latitude: 52.35 },
  'United Kingdom': { longitude: -1.5, latitude: 52.35 },
};

const cityColors = ['#59cc99', '#ef9b38', '#d66de5', '#4b8fdf', '#7459ee'];

function formatCount(value: number) {
  return new Intl.NumberFormat('en').format(value);
}

function marketId(market: string) {
  return market.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'unknown';
}

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
  const { data: inventory, error, loading } = useProductInventory();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const totalVolume = inventory?.governanceTemplates.reduce((sum, template) => sum + template.monthlyVolume, 0) ?? 0;
  const latestCoverage = inventory?.coverageFlow.at(-1);
  const matchedMessages = latestCoverage?.matched ?? totalVolume;
  const unknownTraffic = inventory?.dashboardMetrics.unknownTrafficCount ?? 0;
  const driftExceptions = inventory?.dashboardMetrics.driftExceptionCount ?? 0;
  const ownerConfirmed = inventory?.dashboardMetrics.ownerConfirmedPercentage ?? 0;
  const evidenceComplete = inventory?.evidenceReadiness.length
    ? Math.round(
        inventory.evidenceReadiness.reduce((sum, item) => sum + item.complete, 0) /
          inventory.evidenceReadiness.length,
      )
    : 0;
  const cities = (inventory?.governanceTemplates ?? []).reduce<MapCity[]>((markets, template, index) => {
    const existing = markets.find((market) => market.name === template.market);
    if (existing) {
      existing.value = formatCount(Number(existing.value.replaceAll(',', '')) + template.monthlyVolume);
      return markets;
    }

    const coordinates = marketCoordinates[template.market] ?? { longitude: 0, latitude: 0 };
    markets.push({
      id: marketId(template.market),
      name: template.market,
      value: formatCount(template.monthlyVolume),
      color: cityColors[index % cityColors.length],
      ...coordinates,
    });
    return markets;
  }, []);
  const [selectedCityId, setSelectedCityId] = useState('');
  const visibleSelectedCity = cities.find((city) => city.id === selectedCityId) ?? cities[0];
  const liveMetrics = [
    { label: 'Matched messages', value: matchedMessages, color: '#7459ee', Icon: CircleStackIcon },
    { label: 'Unknown traffic', value: unknownTraffic, color: '#54b9e9', Icon: QuestionMarkCircleIcon },
    { label: 'Drift exceptions', value: driftExceptions, color: '#ff8455', Icon: ExclamationTriangleIcon },
  ];

  if (loading) {
    return <main className="general-statistics-page"><section className="statistics-map-loading" role="status">Loading live inventory</section></main>;
  }

  if (error || cities.length === 0) {
    return <main className="general-statistics-page"><section className="statistics-map-loading" role="alert">Live inventory API unavailable</section></main>;
  }

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
          to={totalVolume}
        />

        <div className="statistics-metrics">
          {liveMetrics.map(({ label, value, color, Icon }) => (
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
            <ProgressRing color="var(--stat-ring-owner)" percentage={ownerConfirmed} />
            <span>
              <strong>Owner status</strong>
              <small>Confirmed use cases</small>
            </span>
          </article>
          <article>
            <ProgressRing color="var(--stat-ring-evidence)" percentage={evidenceComplete} />
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
            <strong>{visibleSelectedCity.name}</strong>
            <b>{visibleSelectedCity.value} messages</b>
          </aside>
        )}
      </section>

      <Suspense fallback={<section className="statistics-map-loading" role="status">Loading map</section>}>
        <PanWorldMap
          cities={cities}
          onSelectCity={(city) => {
            const match = cities.find(({ id }) => id === city.id);
            if (match) setSelectedCityId(match.id);
          }}
          selectedCityId={visibleSelectedCity.id}
        />
      </Suspense>

      <span aria-live="polite" className="statistics-live-status">
        <i
          aria-hidden="true"
          style={{ background: visibleSelectedCity.color }}
        />
        <span>
          <small>Selected market</small>
          <strong>{visibleSelectedCity.name}</strong>
        </span>
        <b>{visibleSelectedCity.value}</b>
      </span>
    </main>
  );
}
