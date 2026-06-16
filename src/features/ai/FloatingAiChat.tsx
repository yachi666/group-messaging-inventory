import { useAiChat } from './AiChatProvider';
import { useI18n } from '../../i18n/LanguageProvider';

export function FloatingAiChat() {
  const { t } = useI18n();
  const {
    addOwnerRiskMessage,
    chatMessages,
    chatPrompt,
    isChatOpen,
    isReportGenerated,
    sendChatMessage,
    setChatPrompt,
    setIsChatOpen,
  } = useAiChat();
  const visibleChatMessages = [
    {
      id: 'assistant-welcome',
      meta: t('analytics.chatBotMeta'),
      sender: 'assistant',
      text: t('analytics.botWelcome'),
    },
    ...chatMessages,
  ] as const;

  return (
    <div className="floating-chat-widget" data-testid="analytics-chat-report">
      {isChatOpen ? (
        <section
          aria-label={t('analytics.chatReport')}
          className="floating-chat-panel"
          data-testid="floating-chat-panel"
        >
          <div className="floating-chat-header">
            <div>
              <h2>{t('analytics.chatReport')}</h2>
              <p>{t('analytics.chatReportKicker')}</p>
            </div>
            <button
              aria-label={t('analytics.closeChat')}
              className="chat-close-button"
              data-testid="close-chat-widget"
              onClick={() => setIsChatOpen(false)}
              type="button"
            >
              ×
            </button>
          </div>

          <div className="chat-thread" data-testid="chat-thread">
            {visibleChatMessages.map((message) => (
              <article className={`chat-message chat-message-${message.sender}`} key={message.id}>
                <div className="chat-avatar" aria-hidden="true">
                  {message.sender === 'assistant' ? 'AI' : 'ME'}
                </div>
                <div className="chat-bubble">
                  <span>{message.meta}</span>
                  <p>{message.text}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="chat-action-card" data-testid="chat-action-card">
            <div>
              <strong>{t('analytics.chatActionTitle')}</strong>
              <span>{t('analytics.chatActionBody')}</span>
            </div>
            <button
              className="button"
              data-testid="quick-action-owner-risk"
              onClick={addOwnerRiskMessage}
              type="button"
            >
              {t('analytics.ownerRiskAction')}
            </button>
          </div>

          <div className="chat-composer">
            <label className="form-field">
              <span>{t('analytics.naturalLanguageQuery')}</span>
              <textarea
                data-testid="chat-query-input"
                onChange={(event) => setChatPrompt(event.target.value)}
                placeholder={t('analytics.chatPlaceholder')}
                rows={3}
                value={chatPrompt}
              />
            </label>
            <button
              className="button button-primary"
              data-testid="send-chat-message"
              onClick={sendChatMessage}
              type="button"
            >
              {t('analytics.sendMessage')}
            </button>
          </div>
        </section>
      ) : null}

      <button
        aria-expanded={isChatOpen}
        aria-label={t('analytics.openChat')}
        className="chat-launcher"
        data-testid="chat-launcher"
        onClick={() => setIsChatOpen((currentOpen) => !currentOpen)}
        type="button"
      >
        <span className="chat-launcher-mark">AI</span>
        <span className="chat-launcher-copy">{t('analytics.chatLauncherLabel')}</span>
        {!isReportGenerated ? <span className="chat-launcher-dot" aria-hidden="true" /> : null}
      </button>
    </div>
  );
}
