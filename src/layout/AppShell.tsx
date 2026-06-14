import type { ReactNode } from 'react';

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
  | 'inventory'
  | 'triage'
  | 'evidence'
  | 'analytics'
  | 'audit-trail'
  | 'settings';

const navItems = [
  { id: 'dashboard', labelKey: 'nav.dashboard' },
  { id: 'inventory', labelKey: 'nav.inventory' },
  { id: 'triage', labelKey: 'nav.triage' },
  { id: 'evidence', labelKey: 'nav.evidence' },
  { id: 'analytics', labelKey: 'nav.analytics' },
  { id: 'audit-trail', labelKey: 'nav.auditTrail' },
  { id: 'settings', labelKey: 'nav.settings' },
] as const satisfies ReadonlyArray<{ id: AppView; labelKey: MessageKey }>;

export function AppShell({ activeView, children, isPending, onViewChange }: AppShellProps) {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="app-canvas">
      <div className="app-shell">
        <aside className="sidebar" aria-label={t('nav.dashboard')}>
          <div className="brand-lockup">
            <div className="brand-mark" aria-hidden="true">
              GMI
            </div>
            <div className="brand-copy">
              <span className="brand-title">{t('app.brandTitle')}</span>
              <span className="brand-subtitle">{t('app.brandSubtitle')}</span>
            </div>
          </div>

          <nav className="sidebar-nav">
            {navItems.map((item) => (
              <button
                aria-current={item.id === activeView ? 'page' : undefined}
                className="nav-item"
                data-testid={`nav-${item.id}`}
                key={item.id}
                onClick={() => onViewChange(item.id)}
                type="button"
              >
                {t(item.labelKey)}
              </button>
            ))}
          </nav>

          <div className="sidebar-panel">
            <strong>{t('app.sidebar.pilotTitle')}</strong>
            <span>{t('app.sidebar.pilotText')}</span>
          </div>

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
        </aside>

        <main aria-busy={isPending} className="main">
          {children}
        </main>
      </div>
    </div>
  );
}
