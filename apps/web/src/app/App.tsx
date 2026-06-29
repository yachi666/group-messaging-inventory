import { lazy, Suspense, useState, useTransition } from 'react';

import { AiChatProvider } from '../features/ai/AiChatProvider';
import { LanguageProvider } from '../i18n/LanguageProvider';
import { AppShell, type AppView } from '../layout/AppShell';

const AiTemplateAnalysisPage = lazy(() =>
  import('../features/ai-analysis/AiTemplateAnalysisPage').then((module) => ({
    default: module.AiTemplateAnalysisPage,
  })),
);
const ReviewQueuePage = lazy(() =>
  import('../features/review-queue/ReviewQueuePage').then((module) => ({
    default: module.ReviewQueuePage,
  })),
);
const GeneralStatisticsPage = lazy(() =>
  import('../features/statistics/GeneralStatisticsPage').then((module) => ({
    default: module.GeneralStatisticsPage,
  })),
);
const GovernanceDashboardPage = lazy(() =>
  import('../features/governance/GovernancePages').then((module) => ({
    default: module.GovernanceDashboardPage,
  })),
);
const TemplatesPage = lazy(() =>
  import('../features/governance/GovernancePages').then((module) => ({
    default: module.TemplatesPage,
  })),
);
const UseCasesPage = lazy(() =>
  import('../features/governance/GovernancePages').then((module) => ({
    default: module.UseCasesPage,
  })),
);
const AdministrationPage = lazy(() =>
  import('../features/governance/GovernancePages').then((module) => ({
    default: module.AdministrationPage,
  })),
);

function WorkspaceLoading() {
  return (
    <section className="workspace-loading" role="status">
      Loading workspace
    </section>
  );
}

function renderActiveView(
  activeView: AppView,
  selectedObjectId: string | undefined,
  onNavigate: (view: 'use-cases' | 'templates' | 'review-queue', id?: string) => void,
) {
  if (activeView === 'dashboard') {
    return <GovernanceDashboardPage onNavigate={onNavigate} />;
  }

  if (activeView === 'templates') {
    return <TemplatesPage key={selectedObjectId ?? 'template-list'} initialId={selectedObjectId} onNavigate={onNavigate} />;
  }

  if (activeView === 'ai-template-analysis') {
    return <AiTemplateAnalysisPage />;
  }

  if (activeView === 'review-queue') {
    return <ReviewQueuePage />;
  }

  if (activeView === 'use-cases') {
    return <UseCasesPage key={selectedObjectId ?? 'use-case-list'} initialId={selectedObjectId} onNavigate={onNavigate} />;
  }

  return <AdministrationPage />;
}

function InventoryApp() {
  const [isPending, startTransition] = useTransition();
  const [activeView, setActiveView] = useState<AppView>('review-queue');
  const [selectedObjectId, setSelectedObjectId] = useState<string>();

  function handleViewChange(view: AppView) {
    startTransition(() => {
      setSelectedObjectId(undefined);
      setActiveView(view);
    });
  }

  function handleNavigate(view: 'use-cases' | 'templates' | 'review-queue', id?: string) {
    startTransition(() => {
      setSelectedObjectId(id);
      setActiveView(view);
    });
  }

  return (
    <LanguageProvider>
      <AiChatProvider>
        <AppShell activeView={activeView} isPending={isPending} onViewChange={handleViewChange}>
          <Suspense fallback={<WorkspaceLoading />}>
            {renderActiveView(activeView, selectedObjectId, handleNavigate)}
          </Suspense>
        </AppShell>
      </AiChatProvider>
    </LanguageProvider>
  );
}

export function App() {
  if (window.location.pathname === '/general-statistics') {
    return (
      <Suspense fallback={<WorkspaceLoading />}>
        <GeneralStatisticsPage />
      </Suspense>
    );
  }

  return <InventoryApp />;
}
