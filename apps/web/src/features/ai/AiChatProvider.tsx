import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { useI18n } from '../../i18n/LanguageProvider';

type ChatMessage = {
  id: string;
  meta: string;
  sender: 'assistant' | 'user';
  text: string;
};

type AiChatContextValue = {
  chatMessages: ReadonlyArray<ChatMessage>;
  chatPrompt: string;
  isChatOpen: boolean;
  isReportExportReady: boolean;
  isReportGenerated: boolean;
  setChatPrompt: (prompt: string) => void;
  setIsChatOpen: (isOpen: boolean | ((currentOpen: boolean) => boolean)) => void;
  setIsReportExportReady: (isReady: boolean) => void;
  addOwnerRiskMessage: () => void;
  runQuery: () => void;
  sendChatMessage: () => void;
};

const AiChatContext = createContext<AiChatContextValue | null>(null);

type AiChatProviderProps = {
  children: ReactNode;
};

export function AiChatProvider({ children }: AiChatProviderProps) {
  const { t } = useI18n();
  const [chatPrompt, setChatPrompt] = useState('');
  const [chatMessages, setChatMessages] = useState<ReadonlyArray<ChatMessage>>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isReportGenerated, setIsReportGenerated] = useState(false);
  const [isReportExportReady, setIsReportExportReady] = useState(false);

  function runQuery() {
    setIsReportGenerated(false);
    setIsReportExportReady(false);
  }

  function sendChatMessage() {
    const prompt = chatPrompt.trim();

    if (!prompt) {
      return;
    }

    setChatMessages((currentMessages) => [
      ...currentMessages,
      {
        id: `user-${currentMessages.length}`,
        meta: t('analytics.chatUserMeta'),
        sender: 'user',
        text: prompt,
      },
      {
        id: `assistant-report-${currentMessages.length}`,
        meta: t('analytics.chatBotMeta'),
        sender: 'assistant',
        text: t('analytics.chatGeneratedReply'),
      },
    ]);
    setChatPrompt('');
    setIsChatOpen(true);
    setIsReportGenerated(true);
    setIsReportExportReady(false);
  }

  function addOwnerRiskMessage() {
    setChatMessages((currentMessages) => [
      ...currentMessages,
      {
        id: `assistant-owner-risk-${currentMessages.length}`,
        meta: t('analytics.chatBotMeta'),
        sender: 'assistant',
        text: t('analytics.chatOwnerRiskReply'),
      },
    ]);
    setIsChatOpen(true);
    setIsReportGenerated(true);
  }

  const value = useMemo(
    () => ({
      chatMessages,
      chatPrompt,
      isChatOpen,
      isReportExportReady,
      isReportGenerated,
      setChatPrompt,
      setIsChatOpen,
      setIsReportExportReady,
      addOwnerRiskMessage,
      runQuery,
      sendChatMessage,
    }),
    [chatMessages, chatPrompt, isChatOpen, isReportExportReady, isReportGenerated],
  );

  return <AiChatContext.Provider value={value}>{children}</AiChatContext.Provider>;
}

export function useAiChat() {
  const context = useContext(AiChatContext);

  if (!context) {
    throw new Error('useAiChat must be used within AiChatProvider');
  }

  return context;
}
