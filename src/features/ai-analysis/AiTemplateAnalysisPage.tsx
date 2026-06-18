import { useI18n } from '../../i18n/LanguageProvider';

export function AiTemplateAnalysisPage() {
  const { t } = useI18n();

  return (
    <section>
      <h1>{t('analysis.title')}</h1>
    </section>
  );
}
