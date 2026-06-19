import { useState, useTransition } from 'react';

import { AiChatProvider } from '../features/ai/AiChatProvider';
import {
  AdministrationPage,
  GovernanceDashboardPage,
  TemplatesPage,
  UseCasesPage,
} from '../features/governance/GovernancePages';
import { ReviewQueuePage } from '../features/review-queue/ReviewQueuePage';
import { LanguageProvider } from '../i18n/LanguageProvider';
import { AppShell, type AppView } from '../layout/AppShell';

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

  if (activeView === 'review-queue') {
    return <ReviewQueuePage />;
  }

  if (activeView === 'use-cases') {
    return <UseCasesPage key={selectedObjectId ?? 'use-case-list'} initialId={selectedObjectId} onNavigate={onNavigate} />;
  }

  return <AdministrationPage />;
}

export function App() {
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
          {renderActiveView(activeView, selectedObjectId, handleNavigate)}
        </AppShell>
      </AiChatProvider>
    </LanguageProvider>
  );
}
