import type { ReactNode } from 'react';

import { FloatingAiChat } from '../features/ai/FloatingAiChat';
import { useI18n, type Locale } from '../i18n/LanguageProvider';
import type { MessageKey } from '../i18n/messages';

type AppShellProps = {
  activeView: AppView;
  children: ReactNode;
  isPending: boolean;
  onViewChange: (view: AppView) => void;
};

export type AppView =
  | 'dashboard'
  | 'use-cases'
  | 'templates'
  | 'ai-template-analysis'
  | 'review-queue'
  | 'administration';

const navItems = [
  { id: 'dashboard', labelKey: 'nav.dashboard', icon: 'grid' },
  { id: 'use-cases', labelKey: 'nav.inventory', icon: 'rows' },
  { id: 'templates', labelKey: 'nav.templates', icon: 'file' },
  { id: 'ai-template-analysis', labelKey: 'nav.aiTemplateAnalysis', icon: 'spark' },
  { id: 'review-queue', labelKey: 'nav.triage', icon: 'queue' },
  { id: 'administration', labelKey: 'nav.settings', icon: 'dial' },
] as const satisfies ReadonlyArray<{
  id: AppView;
  icon: 'grid' | 'rows' | 'queue' | 'file' | 'bars' | 'spark' | 'ledger' | 'dial';
  labelKey: MessageKey;
}>;

const adminNavItems = navItems.slice(5);
const workspaceNavItems = navItems.slice(0, 5);

export function AppShell({ activeView, children, isPending, onViewChange }: AppShellProps) {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="app-canvas">
      <div className="app-shell">
        <aside className="sidebar" aria-label={t('nav.dashboard')}>
          <div className="sidebar-profile">
            <span className="profile-avatar" aria-hidden="true">
              G
            </span>
            <div className="brand-copy">
              <span className="brand-title">{t('app.brandTitle')}</span>
              <span className="brand-subtitle">{t('app.brandSubtitle')}</span>
            </div>
            <button className="sidebar-more" type="button" aria-label="Workspace options">
              ...
            </button>
          </div>

          <label className="sidebar-search">
            <span aria-hidden="true" />
            <input aria-label="Search inventory" placeholder="Search..." type="search" />
          </label>

          <nav className="nav-list" aria-label={t('nav.dashboard')}>
            {workspaceNavItems.map((item) => (
              <button
                aria-current={item.id === activeView ? 'page' : undefined}
                className="nav-item"
                data-testid={`nav-${item.id}`}
                key={item.id}
                onClick={() => onViewChange(item.id)}
                type="button"
              >
                <span className={`nav-glyph nav-glyph-${item.icon}`} aria-hidden="true" />
                {t(item.labelKey)}
              </button>
            ))}
          </nav>

          <div className="nav-group" aria-label="Administration">
            {adminNavItems.map((item) => (
              <button
                aria-current={item.id === activeView ? 'page' : undefined}
                className="nav-item"
                data-testid={`nav-${item.id}`}
                key={item.id}
                onClick={() => onViewChange(item.id)}
                type="button"
              >
                <span className={`nav-glyph nav-glyph-${item.icon}`} aria-hidden="true" />
                {t(item.labelKey)}
              </button>
            ))}
          </div>

          <div className="pilot-chip">
            <strong>{t('app.sidebar.pilotTitle')}</strong>
            <span>{t('app.sidebar.pilotText')}</span>
          </div>
        </aside>

        <header className="top-nav">
          <label className="top-search">
            <span aria-hidden="true" />
            <input aria-label="Search workspace" placeholder="Search something..." type="search" />
          </label>

          <div className="top-nav-actions">
            <button className="notification-button" type="button" aria-label="Notifications">
              <span aria-hidden="true" />
            </button>

            <label className="language-control">
              <span>{t('app.languageLabel')}</span>
              <select
                aria-label={t('app.languageLabel')}
                onChange={(event) => setLocale(event.target.value as Locale)}
                value={locale}
              >
                <option value="en">{t('app.language.en')}</option>
                <option value="zh-CN">{t('app.language.zh')}</option>
              </select>
            </label>

            <div className="org-switcher">
              <span className="org-mark" aria-hidden="true">
                G
              </span>
              <span>
                <strong>GMI Inc.</strong>
                <small>Brand</small>
              </span>
            </div>
          </div>
        </header>

        <main aria-busy={isPending} className="main">
          {children}
        </main>

        <FloatingAiChat />
      </div>
    </div>
  );
}
