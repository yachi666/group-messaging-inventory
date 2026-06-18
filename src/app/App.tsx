import { useState, useTransition } from 'react';

import { AiChatProvider } from '../features/ai/AiChatProvider';
import { AiTemplateAnalysisPage } from '../features/ai-analysis/AiTemplateAnalysisPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { ProductWorkspace } from '../features/workspace/ProductWorkspace';
import { LanguageProvider } from '../i18n/LanguageProvider';
import { AppShell, type AppView } from '../layout/AppShell';

function renderActiveView(activeView: AppView) {
  if (activeView === 'dashboard') {
    return <DashboardPage />;
  }

  if (activeView === 'ai-template-analysis') {
    return <AiTemplateAnalysisPage />;
  }

  return <ProductWorkspace activeView={activeView} />;
}

export function App() {
  const [isPending, startTransition] = useTransition();
  const [activeView, setActiveView] = useState<AppView>('dashboard');

  function handleViewChange(view: AppView) {
    startTransition(() => {
      setActiveView(view);
    });
  }

  return (
    <LanguageProvider>
      <AiChatProvider>
        <AppShell activeView={activeView} isPending={isPending} onViewChange={handleViewChange}>
          {renderActiveView(activeView)}
        </AppShell>
      </AiChatProvider>
    </LanguageProvider>
  );
}
