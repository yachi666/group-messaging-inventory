import { useI18n } from '../../i18n/LanguageProvider';

export function AiTemplateAnalysisPage() {
  const { t } = useI18n();

  return (
    <section className="analysis-page" data-testid="ai-template-analysis-page">
      <h1>{t('nav.aiTemplateAnalysis')}</h1>
    </section>
  );
}
