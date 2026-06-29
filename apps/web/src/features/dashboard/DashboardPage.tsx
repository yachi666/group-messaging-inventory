import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { StatusChip } from '../../components/StatusChip';
import { governanceTemplates, governanceUseCases } from '../../data/governanceMock';
import type { GovernanceTemplate } from '../../domain/governance';
import { useI18n } from '../../i18n/LanguageProvider';
import { formatPercentage, formatVolume } from '../../lib/format';

type PeriodMode = 'month' | 'year';
type BreakdownDimension = 'market' | 'platform' | 'channel';
type PlatformFilter = 'all' | string;
type ChannelFilter = 'all' | string;
type MarketFilter = 'all' | string;

const platformOptions = ['all', 'MDP', 'SFMC', 'ICCM', 'IRIS'] as const;
const channelOptions = ['all', 'SMS', 'Email', 'Push'] as const;
const marketOptions = ['all', 'UK', 'Hong Kong', 'Singapore'] as const;

const breakdownColors = ['#1f5f54', '#56b5a5', '#d5a756', '#7e8ac7', '#b86d68'];

const monthlyTraffic = [
  { label: 'Jan', volume: 1_180_000, previous: 1_120_000 },
  { label: 'Feb', volume: 1_260_000, previous: 1_160_000 },
  { label: 'Mar', volume: 1_350_000, previous: 1_210_000 },
  { label: 'Apr', volume: 1_480_000, previous: 1_320_000 },
  { label: 'May', volume: 1_610_000, previous: 1_450_000 },
  { label: 'Jun', volume: 1_749_900, previous: 1_540_000 },
] as const;

const yearlyTraffic = [
  { label: '2023', volume: 16_840_000, previous: 15_120_000 },
  { label: '2024', volume: 19_460_000, previous: 16_840_000 },
  { label: '2025', volume: 22_780_000, previous: 19_460_000 },
  { label: '2026 YTD', volume: 11_034_000, previous: 9_660_000 },
] as const;

const copy = {
  en: {
    title: 'Messaging traffic analytics',
    subtitle: 'See how messaging volume changes over time and where active templates are being used.',
    export: 'Export data',
    reset: 'Reset filters',
    month: 'Monthly',
    year: 'Yearly',
    period: 'View',
    market: 'Region',
    platform: 'Platform',
    channel: 'Channel',
    allMarkets: 'All regions',
    allPlatforms: 'All platforms',
    allChannels: 'All channels',
    totalVolume: 'Total message volume',
    activeTemplates: 'Active templates',
    activeUseCases: 'Active use cases',
    deliveryRate: 'Delivery rate',
    dailyAverage: 'Average daily volume',
    versus: 'vs previous period',
    templatesNote: 'Templates with traffic this period',
    useCasesNote: 'Business scenarios producing traffic',
    deliveryNote: 'Delivered across selected scope',
    dailyNote: 'Across business days',
    trendTitle: 'Traffic trend',
    trendMonth: 'Monthly message volume in 2026',
    trendYear: 'Annual message volume, 2023–2026',
    current: 'Current period',
    previous: 'Previous period',
    breakdownTitle: 'Traffic mix',
    breakdownKicker: 'Switch the dimension to understand contribution',
    topTemplates: 'Most active templates',
    topTemplatesKicker: 'Ranked by message volume in the selected scope',
    template: 'Template',
    volume: 'Volume',
    change: 'Change',
    insightTitle: 'Business signals',
    insightGrowth: 'Traffic is growing steadily',
    insightGrowthBody: 'June volume is above the comparable previous period.',
    insightConcentration: 'Volume is concentrated',
    insightConcentrationBody: 'The leading segment contributes more than half of selected traffic.',
    insightTemplate: 'Template activity is healthy',
    insightTemplateBody: 'Active-template count and concentration are based on production traffic.',
    selectedScope: 'Selected scope',
    noData: 'No traffic matches this filter combination.',
  },
  'zh-CN': {
    title: '消息流量分析',
    subtitle: '查看消息流量随时间的变化，以及活跃模板主要分布在哪些地区和平台。',
    export: '导出数据',
    reset: '重置筛选',
    month: '按月',
    year: '按年',
    period: '时间粒度',
    market: '地区',
    platform: '平台',
    channel: '渠道',
    allMarkets: '全部地区',
    allPlatforms: '全部平台',
    allChannels: '全部渠道',
    totalVolume: '消息总量',
    activeTemplates: '活跃模板',
    activeUseCases: '活跃业务场景',
    deliveryRate: '送达率',
    dailyAverage: '日均流量',
    versus: '较上一周期',
    templatesNote: '本周期内产生流量的模板',
    useCasesNote: '本周期内产生流量的业务场景',
    deliveryNote: '所选范围内已送达消息',
    dailyNote: '按工作日计算',
    trendTitle: '流量趋势',
    trendMonth: '2026 年月度消息量',
    trendYear: '2023–2026 年度消息量',
    current: '当前周期',
    previous: '对比周期',
    breakdownTitle: '流量构成',
    breakdownKicker: '切换维度，查看各部分的贡献',
    topTemplates: '最活跃模板',
    topTemplatesKicker: '按所选范围内的消息量排序',
    template: '模板',
    volume: '流量',
    change: '变化',
    insightTitle: '业务信号',
    insightGrowth: '流量保持稳定增长',
    insightGrowthBody: '6 月流量高于可比周期。',
    insightConcentration: '流量集中度较高',
    insightConcentrationBody: '贡献最高的分组占所选流量的一半以上。',
    insightTemplate: '模板活跃度健康',
    insightTemplateBody: '活跃模板数量与集中度均来自生产流量。',
    selectedScope: '当前范围',
    noData: '当前筛选组合下没有流量数据。',
  },
} as const;

function matchesFilters(
  item: GovernanceTemplate,
  market: MarketFilter,
  platform: PlatformFilter,
  channel: ChannelFilter,
) {
  return (
    (market === 'all' || item.market === market) &&
    (platform === 'all' || item.platform === platform) &&
    (channel === 'all' || item.channel === channel)
  );
}

function downloadTrafficCsv(rows: ReadonlyArray<{ label: string; volume: number; previous: number }>) {
  const csv = ['Period,Current volume,Previous period', ...rows.map((row) => `${row.label},${row.volume},${row.previous}`)].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'messaging-traffic.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}

type DashboardPageProps = {
  onNavigate?: (view: 'use-cases' | 'templates' | 'review-queue', id?: string) => void;
};

type ChartCanvasProps = {
  ariaLabel: string;
  children: (size: { height: number; width: number }) => ReactNode;
  className: string;
};

function ChartCanvas({ ariaLabel, children, className }: ChartCanvasProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ height: 0, width: 0 });

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return undefined;

    const updateSize = () => {
      const bounds = element.getBoundingClientRect();
      setSize({
        height: Math.floor(bounds.height),
        width: Math.floor(bounds.width),
      });
    };

    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    updateSize();
    return () => observer.disconnect();
  }, []);

  const canRenderChart = size.height > 0 && size.width > 0;

  return (
    <div className={className} aria-label={ariaLabel} ref={elementRef}>
      {canRenderChart ? children(size) : null}
    </div>
  );
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { locale } = useI18n();
  const c = copy[locale];
  const [periodMode, setPeriodMode] = useState<PeriodMode>('month');
  const [dimension, setDimension] = useState<BreakdownDimension>('market');
  const [marketFilter, setMarketFilter] = useState<MarketFilter>('all');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');

  const filteredTemplates = useMemo(
    () => governanceTemplates.filter((item) => matchesFilters(item, marketFilter, platformFilter, channelFilter)),
    [channelFilter, marketFilter, platformFilter],
  );
  const allVolume = governanceTemplates.reduce((sum, item) => sum + item.monthlyVolume, 0);
  const selectedVolume = filteredTemplates.reduce((sum, item) => sum + item.monthlyVolume, 0);
  const scopeRatio = allVolume === 0 ? 0 : selectedVolume / allVolume;
  const sourceTraffic = periodMode === 'month' ? monthlyTraffic : yearlyTraffic;
  const traffic = sourceTraffic.map((item) => ({
    ...item,
    volume: Math.round(item.volume * scopeRatio),
    previous: Math.round(item.previous * scopeRatio),
  }));
  const currentVolume = traffic.at(-1)?.volume ?? 0;
  const previousVolume = traffic.at(-1)?.previous ?? 0;
  const growth = previousVolume === 0 ? 0 : ((currentVolume - previousVolume) / previousVolume) * 100;
  const activeTemplates = filteredTemplates.filter(
    (item) => item.lifecycle === 'Active' && item.monthlyVolume > 0,
  ).length;
  const activeUseCaseIds = new Set(
    filteredTemplates.flatMap((item) => item.parentUseCaseId ? [item.parentUseCaseId] : []),
  );
  const activeUseCases = governanceUseCases.filter(
    (item) => activeUseCaseIds.has(item.id) && item.lifecycle !== 'Retired',
  ).length;
  const breakdown = useMemo(() => {
    const groups = new Map<string, number>();
    filteredTemplates.forEach((item) => {
      const key = item[dimension];
      groups.set(key, (groups.get(key) ?? 0) + item.monthlyVolume);
    });
    const total = [...groups.values()].reduce((sum, value) => sum + value, 0);
    return [...groups.entries()]
      .map(([label, volume]) => ({ label, volume, share: total === 0 ? 0 : (volume / total) * 100 }))
      .sort((a, b) => b.volume - a.volume);
  }, [dimension, filteredTemplates]);

  const rankedTemplates = filteredTemplates
    .filter((item) => item.lifecycle === 'Active')
    .sort((a, b) => b.monthlyVolume - a.monthlyVolume);
  const topTemplate = rankedTemplates[0];
  const topTemplateShare = selectedVolume === 0 || !topTemplate
    ? 0
    : (topTemplate.monthlyVolume / selectedVolume) * 100;
  const scopeLabel = [
    marketFilter === 'all' ? c.allMarkets : marketFilter,
    platformFilter === 'all' ? c.allPlatforms : platformFilter,
    channelFilter === 'all' ? c.allChannels : channelFilter,
  ].join(' · ');

  function resetFilters() {
    setMarketFilter('all');
    setPlatformFilter('all');
    setChannelFilter('all');
  }

  function applyBreakdown(label: string) {
    if (dimension === 'market') setMarketFilter(label);
    if (dimension === 'platform') setPlatformFilter(label as PlatformFilter);
    if (dimension === 'channel') setChannelFilter(label as ChannelFilter);
  }

  return (
    <div className="traffic-dashboard">
      <header className="traffic-header">
        <div>
          <p className="eyebrow">{locale === 'zh-CN' ? '业务驾驶舱' : 'Business dashboard'}</p>
          <h1 className="page-title">{c.title}</h1>
          <p className="page-subtitle">{c.subtitle}</p>
        </div>
        <button className="button" onClick={() => downloadTrafficCsv(traffic)} type="button">
          {c.export}
        </button>
      </header>

      <section className="traffic-filter-panel" aria-label={c.selectedScope}>
        <div className="period-switch" aria-label={c.period}>
          <span>{c.period}</span>
          <div>
            <button className={periodMode === 'month' ? 'is-active' : ''} onClick={() => setPeriodMode('month')} type="button">{c.month}</button>
            <button className={periodMode === 'year' ? 'is-active' : ''} onClick={() => setPeriodMode('year')} type="button">{c.year}</button>
          </div>
        </div>
        <label className="filter-control">
          <span>{c.market}</span>
          <select className="filter-select" onChange={(event) => setMarketFilter(event.target.value)} value={marketFilter}>
            {marketOptions.map((value) => <option key={value} value={value}>{value === 'all' ? c.allMarkets : value}</option>)}
          </select>
        </label>
        <label className="filter-control">
          <span>{c.platform}</span>
          <select className="filter-select" onChange={(event) => setPlatformFilter(event.target.value as PlatformFilter)} value={platformFilter}>
            {platformOptions.map((value) => <option key={value} value={value}>{value === 'all' ? c.allPlatforms : value}</option>)}
          </select>
        </label>
        <label className="filter-control">
          <span>{c.channel}</span>
          <select className="filter-select" onChange={(event) => setChannelFilter(event.target.value as ChannelFilter)} value={channelFilter}>
            {channelOptions.map((value) => <option key={value} value={value}>{value === 'all' ? c.allChannels : value}</option>)}
          </select>
        </label>
        <button className="traffic-reset" onClick={resetFilters} type="button">{c.reset}</button>
      </section>

      <p className="traffic-scope"><strong>{c.selectedScope}</strong><span>{scopeLabel}</span></p>

      <section className="traffic-kpis" aria-label={c.title}>
        <article><span>{c.totalVolume}</span><strong>{formatVolume(currentVolume, locale)}</strong><small className="positive">+{growth.toFixed(1)}% {c.versus}</small></article>
        <article><span>{c.activeTemplates}</span><strong>{activeTemplates}</strong><small>{c.templatesNote}</small></article>
        <article><span>{c.activeUseCases}</span><strong>{activeUseCases}</strong><small>{c.useCasesNote}</small></article>
        <article><span>{c.dailyAverage}</span><strong>{formatVolume(periodMode === 'month' ? currentVolume / 22 : currentVolume / 125, locale)}</strong><small>{c.dailyNote}</small></article>
      </section>

      <section className="traffic-main-grid">
        <article className="card traffic-trend-card">
          <div className="card-header">
            <div><h2 className="card-title">{c.trendTitle}</h2><p className="card-kicker">{periodMode === 'month' ? c.trendMonth : c.trendYear}</p></div>
            <div className="traffic-legend"><span><i className="current" />{c.current}</span><span><i />{c.previous}</span></div>
          </div>
          {traffic.length > 0 && currentVolume > 0 ? (
            <ChartCanvas ariaLabel={c.trendTitle} className="traffic-chart-canvas">
              {({ height, width }) => (
                <BarChart data={traffic} height={height} margin={{ top: 24, right: 8, bottom: 0, left: 4 }} width={width}>
                  <defs>
                    <linearGradient id="currentTrafficFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#245e55" />
                      <stop offset="100%" stopColor="#4ca99a" />
                    </linearGradient>
                    <linearGradient id="previousTrafficFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#dfe9e7" />
                      <stop offset="100%" stopColor="#eef3f2" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e9efed" strokeDasharray="2 7" vertical={false} />
                  <XAxis axisLine={false} dataKey="label" fontSize={10} tickLine={false} tickMargin={12} />
                  <YAxis axisLine={false} fontSize={9} tickFormatter={(value) => formatVolume(Number(value), locale)} tickLine={false} width={52} />
                  <Tooltip
                    contentStyle={{ background: '#173b36', border: 0, borderRadius: 12, boxShadow: '0 16px 36px rgba(23,59,54,.22)', color: '#fff', fontSize: 11 }}
                    cursor={{ fill: 'rgba(31,95,84,.045)', radius: 10 }}
                    formatter={(value) => formatVolume(Number(value), locale)}
                    labelStyle={{ color: '#b9d7d1', fontWeight: 700, marginBottom: 6 }}
                  />
                  <Bar dataKey="volume" fill="url(#currentTrafficFill)" maxBarSize={38} name={c.current} radius={[9, 9, 3, 3]} />
                  <Bar dataKey="previous" fill="url(#previousTrafficFill)" maxBarSize={38} name={c.previous} radius={[9, 9, 3, 3]} />
                </BarChart>
              )}
            </ChartCanvas>
          ) : <div className="traffic-empty">{c.noData}</div>}
        </article>

        <article className="card traffic-breakdown-card">
          <div className="card-header"><div><h2 className="card-title">{c.breakdownTitle}</h2><p className="card-kicker">{c.breakdownKicker}</p></div></div>
          <div className="dimension-switch">
            {(['market', 'platform', 'channel'] as const).map((value) => (
              <button className={dimension === value ? 'is-active' : ''} key={value} onClick={() => setDimension(value)} type="button">{c[value]}</button>
            ))}
          </div>
          {breakdown.length > 0 ? (
            <div className="traffic-mix-layout">
              <ChartCanvas ariaLabel={c.breakdownTitle} className="traffic-donut">
                {({ height, width }) => (
                  <>
                    <PieChart height={height} width={width}>
                      <Tooltip
                        contentStyle={{ background: '#173b36', border: 0, borderRadius: 12, color: '#fff', fontSize: 11 }}
                        formatter={(value) => `${Number(value).toFixed(1)}%`}
                      />
                      <Pie
                        cornerRadius={7}
                        data={breakdown}
                        dataKey="share"
                        innerRadius="67%"
                        nameKey="label"
                        outerRadius="94%"
                        paddingAngle={3}
                        stroke="transparent"
                      >
                        {breakdown.map((item, index) => <Cell fill={breakdownColors[index % breakdownColors.length]} key={item.label} />)}
                      </Pie>
                    </PieChart>
                    <div className="traffic-donut-center"><strong>{breakdown[0]?.share.toFixed(1)}%</strong><span>{breakdown[0]?.label}</span></div>
                  </>
                )}
              </ChartCanvas>
              <div className="traffic-mix-legend">
                {breakdown.map((item, index) => (
                  <button key={item.label} onClick={() => applyBreakdown(item.label)} type="button">
                    <i style={{ background: breakdownColors[index % breakdownColors.length] }} />
                    <span><strong>{item.label}</strong><small>{formatVolume(item.volume, locale)}</small></span>
                    <b>{item.share.toFixed(1)}%</b>
                  </button>
                ))}
              </div>
            </div>
          ) : <div className="traffic-empty">{c.noData}</div>}
        </article>
      </section>

      <section className="traffic-lower-grid">
        <article className="card traffic-template-card">
          <div className="card-header"><div><h2 className="card-title">{c.topTemplates}</h2><p className="card-kicker">{c.topTemplatesKicker}</p></div><StatusChip tone="info">{activeTemplates} {c.activeTemplates}</StatusChip></div>
          <div className="traffic-template-table" role="table">
            <div className="traffic-template-row traffic-template-head" role="row"><span>{c.template}</span><span>{c.market}</span><span>{c.platform}</span><span>{c.volume}</span><span>{c.change}</span></div>
            {rankedTemplates.map((item, index) => (
              <div className="traffic-template-row" key={item.uuid} role="row">
                <button className="traffic-template-name" onClick={() => onNavigate?.('templates', item.uuid)} type="button"><strong>{item.templateId}</strong><small>{item.sender}</small></button><span>{item.market}</span><span>{item.platform}</span><span>{formatVolume(item.monthlyVolume, locale)}</span>{(() => { const change = 12.4 - index * 2.1; return <span className={change >= 0 ? 'positive' : 'negative'}>{change >= 0 ? '+' : ''}{change.toFixed(1)}%</span>; })()}
              </div>
            ))}
            {rankedTemplates.length === 0 ? <div className="traffic-empty">{c.noData}</div> : null}
          </div>
        </article>

        <article className="card traffic-insights-card">
          <div className="card-header"><h2 className="card-title">{c.insightTitle}</h2></div>
          <div className="traffic-signal"><span>01</span><div><strong>{c.insightGrowth}</strong><p>{periodMode === 'month' ? 'June' : '2026 YTD'} +{growth.toFixed(1)}% · {c.insightGrowthBody}</p></div></div>
          <div className="traffic-signal"><span>02</span><div><strong>{c.insightConcentration}</strong><p>{breakdown[0]?.label ?? '—'} · {breakdown[0]?.share.toFixed(1) ?? '0'}% · {c.insightConcentrationBody}</p></div></div>
          <div className="traffic-signal"><span>03</span><div><strong>{c.insightTemplate}</strong><p>{activeTemplates} {c.activeTemplates} · {topTemplate?.templateId ?? '—'} {topTemplateShare.toFixed(1)}% · {c.insightTemplateBody}</p></div></div>
        </article>
      </section>
    </div>
  );
}
