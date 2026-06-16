import { useState, useTransition } from 'react';

import { AiChatProvider } from '../features/ai/AiChatProvider';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { ProductWorkspace } from '../features/workspace/ProductWorkspace';
import { LanguageProvider } from '../i18n/LanguageProvider';
import { AppShell, type AppView } from '../layout/AppShell';

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
          {activeView === 'dashboard' ? (
            <DashboardPage />
          ) : (
            <ProductWorkspace activeView={activeView} />
          )}
        </AppShell>
      </AiChatProvider>
    </LanguageProvider>
  );
}
