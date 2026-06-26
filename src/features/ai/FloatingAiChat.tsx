import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import gsap from 'gsap';

import { useAiChat } from './AiChatProvider';
import { useI18n } from '../../i18n/LanguageProvider';

type FloatingPosition = {
  x: number;
  y: number;
};

const floatingPositionKey = 'gmi-floating-ai-chat-position';
const viewportMargin = 16;
const panelGap = 12;
const launcherEstimate = { width: 154, height: 46 };
const panelEstimate = { width: 420, height: 560 };

export function FloatingAiChat() {
  const { t } = useI18n();
  const launcherRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const messageRefs = useRef<Array<HTMLElement | null>>([]);
  const launcherSizeRef = useRef(launcherEstimate);
  const suppressNextClickRef = useRef(false);
  const dragStateRef = useRef<{
    hasMoved: boolean;
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
  } | null>(null);
  const {
    chatMessages,
    chatPrompt,
    isChatOpen,
    sendChatMessage,
    setChatPrompt,
    setIsChatOpen,
  } = useAiChat();
  const [launcherPosition, setLauncherPosition] = useState<FloatingPosition>(() => getDefaultLauncherPosition());
  const visibleChatMessages = [
    {
      id: 'assistant-welcome',
      meta: t('analytics.chatBotMeta'),
      sender: 'assistant',
      text: t('analytics.botWelcome'),
    },
    ...chatMessages,
  ] as const;
  const messageCount = visibleChatMessages.length;
  const widgetStyle = useMemo<CSSProperties>(() => {
    const position = isChatOpen ? getPanelPosition(launcherPosition, launcherSizeRef.current) : launcherPosition;

    return {
      left: `${position.x}px`,
      top: `${position.y}px`,
    };
  }, [isChatOpen, launcherPosition]);

  useEffect(() => {
    const storedPosition = readStoredLauncherPosition();

    if (storedPosition) {
      setLauncherPosition(clampPosition(storedPosition, launcherSizeRef.current));
    }

    function handleResize() {
      setLauncherPosition((currentPosition) => clampPosition(currentPosition, launcherSizeRef.current));
    }

    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isChatOpen || !panelRef.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const context = gsap.context(() => {
      gsap.fromTo(
        panelRef.current,
        { autoAlpha: 0, filter: 'blur(10px)', scale: 0.97, y: 24 },
        { autoAlpha: 1, duration: 0.42, ease: 'power3.out', filter: 'blur(0px)', scale: 1, y: 0 },
      );
    }, panelRef);

    return () => context.revert();
  }, [isChatOpen]);

  useEffect(() => {
    if (!isChatOpen || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const latestMessage = messageRefs.current[messageCount - 1];

    if (!latestMessage) {
      return;
    }

    gsap.fromTo(
      latestMessage,
      { autoAlpha: 0, scale: 0.985, y: 12 },
      { autoAlpha: 1, duration: 0.28, ease: 'power2.out', scale: 1, y: 0 },
    );
  }, [isChatOpen, messageCount]);

  return (
    <div className="floating-chat-widget" data-testid="analytics-chat-report" style={widgetStyle}>
      {isChatOpen ? (
        <section
          aria-label={t('analytics.chatReport')}
          className="floating-chat-panel"
          data-testid="floating-chat-panel"
          ref={panelRef}
        >
          <div className="floating-chat-header">
            <div className="floating-chat-title">
              <AiAssistantAvatar />
              <div>
                <h2>{t('analytics.chatReport')}</h2>
                <span>{t('analytics.chatBotMeta')}</span>
              </div>
            </div>
            <button
              aria-label={t('analytics.closeChat')}
              className="chat-close-button"
              data-testid="close-chat-widget"
              onClick={() => setIsChatOpen(false)}
              type="button"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>

          <div className="chat-thread" data-testid="chat-thread">
            {visibleChatMessages.map((message, index) => (
              <article
                className={`chat-message chat-message-${message.sender}`}
                key={message.id}
                ref={(element) => {
                  messageRefs.current[index] = element;
                }}
              >
                <div className="chat-avatar" aria-hidden="true">
                  {message.sender === 'assistant' ? <AiAssistantAvatar /> : t('analytics.chatUserAvatar')}
                </div>
                <div className="chat-bubble">
                  <p>{message.text}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="chat-action-dock">
            <div className="chat-composer">
              <textarea
                aria-label={t('analytics.naturalLanguageQuery')}
                data-testid="chat-query-input"
                onChange={(event) => setChatPrompt(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    sendChatMessage();
                  }
                }}
                placeholder={t('analytics.chatPlaceholder')}
                rows={1}
                value={chatPrompt}
              />
              <button
                aria-label={t('analytics.sendMessage')}
                className="chat-send-button"
                data-testid="send-chat-message"
                disabled={!chatPrompt.trim()}
                onClick={sendChatMessage}
                type="button"
              >
                <BotGlyphIcon variant="arrow" />
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {!isChatOpen ? (
        <button
          aria-expanded={isChatOpen}
          aria-label={t('analytics.openChat')}
          className="chat-launcher"
          data-testid="chat-launcher"
          onClick={() => {
            if (suppressNextClickRef.current) {
              suppressNextClickRef.current = false;
              return;
            }

            updateLauncherSize(launcherRef.current, launcherSizeRef);
            setIsChatOpen((currentOpen) => !currentOpen);
          }}
          onPointerDown={(event) => handleLauncherPointerDown(event, launcherPosition)}
          onPointerMove={handleLauncherPointerMove}
          onPointerUp={handleLauncherPointerEnd}
          onPointerCancel={handleLauncherPointerEnd}
          ref={launcherRef}
          type="button"
        >
          <span className="chat-launcher-mark">
            <BotGlyphIcon variant="bot" />
          </span>
          <span className="chat-launcher-copy">{t('analytics.chatLauncherLabel')}</span>
        </button>
      ) : null}
    </div>
  );

  function handleLauncherPointerDown(event: PointerEvent<HTMLButtonElement>, currentPosition: FloatingPosition) {
    updateLauncherSize(event.currentTarget, launcherSizeRef);
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      hasMoved: false,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: currentPosition.x,
      startY: currentPosition.y,
    };
  }

  function handleLauncherPointerMove(event: PointerEvent<HTMLButtonElement>) {
    const dragState = dragStateRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - dragState.startClientX;
    const deltaY = event.clientY - dragState.startClientY;

    if (Math.hypot(deltaX, deltaY) > 3) {
      dragState.hasMoved = true;
    }

    if (!dragState.hasMoved) {
      return;
    }

    event.preventDefault();
    setLauncherPosition(
      clampPosition(
        {
          x: dragState.startX + deltaX,
          y: dragState.startY + deltaY,
        },
        launcherSizeRef.current,
      ),
    );
  }

  function handleLauncherPointerEnd(event: PointerEvent<HTMLButtonElement>) {
    const dragState = dragStateRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    suppressNextClickRef.current = dragState.hasMoved;
    window.setTimeout(() => {
      suppressNextClickRef.current = false;
    }, 0);
    dragStateRef.current = null;

    if (dragState.hasMoved) {
      setLauncherPosition((currentPosition) => {
        const clampedPosition = clampPosition(currentPosition, launcherSizeRef.current);
        storeLauncherPosition(clampedPosition);
        return clampedPosition;
      });
    }
  }
}

function getDefaultLauncherPosition(): FloatingPosition {
  if (typeof window === 'undefined') {
    return { x: viewportMargin, y: viewportMargin };
  }

  return {
    x: window.innerWidth - launcherEstimate.width - 24,
    y: window.innerHeight - launcherEstimate.height - 24,
  };
}

function getPanelPosition(anchor: FloatingPosition, launcherSize: { width: number; height: number }): FloatingPosition {
  if (typeof window === 'undefined') {
    return anchor;
  }

  const panelWidth = Math.min(panelEstimate.width, window.innerWidth - viewportMargin * 2);
  const panelHeight = Math.min(panelEstimate.height, window.innerHeight - viewportMargin * 2);
  const anchorCenterX = anchor.x + launcherSize.width / 2;
  const anchorCenterY = anchor.y + launcherSize.height / 2;
  const opensToLeft = anchorCenterX > window.innerWidth / 2;
  const opensAbove = anchorCenterY > window.innerHeight / 2;

  return clampPosition(
    {
      x: opensToLeft ? anchor.x + launcherSize.width - panelWidth : anchor.x,
      y: opensAbove ? anchor.y - panelHeight - panelGap : anchor.y + launcherSize.height + panelGap,
    },
    { width: panelWidth, height: panelHeight },
  );
}

function clampPosition(position: FloatingPosition, size: { width: number; height: number }): FloatingPosition {
  if (typeof window === 'undefined') {
    return position;
  }

  return {
    x: clamp(position.x, viewportMargin, Math.max(viewportMargin, window.innerWidth - size.width - viewportMargin)),
    y: clamp(position.y, viewportMargin, Math.max(viewportMargin, window.innerHeight - size.height - viewportMargin)),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function readStoredLauncherPosition() {
  try {
    const storedValue = window.localStorage.getItem(floatingPositionKey);

    if (!storedValue) {
      return null;
    }

    const parsedValue = JSON.parse(storedValue) as Partial<FloatingPosition>;

    if (typeof parsedValue.x !== 'number' || typeof parsedValue.y !== 'number') {
      return null;
    }

    return parsedValue as FloatingPosition;
  } catch {
    return null;
  }
}

function storeLauncherPosition(position: FloatingPosition) {
  try {
    window.localStorage.setItem(floatingPositionKey, JSON.stringify(position));
  } catch {
    // Position persistence is nice to have; dragging should still work if storage is unavailable.
  }
}

function updateLauncherSize(
  launcherElement: HTMLButtonElement | null,
  launcherSizeRef: { current: { width: number; height: number } },
) {
  const launcherBox = launcherElement?.getBoundingClientRect();

  if (!launcherBox) {
    return;
  }

  launcherSizeRef.current = {
    width: launcherBox.width,
    height: launcherBox.height,
  };
}

function AiAssistantAvatar() {
  return (
    <span className="chat-orbital-avatar">
      <span className="chat-orbital-avatar-core">
        <BotGlyphIcon variant="bot" />
      </span>
    </span>
  );
}

function BotGlyphIcon({ variant }: { variant: 'arrow' | 'bot' }) {
  if (variant === 'arrow') {
    return (
      <svg aria-hidden="true" className="chat-glyph" viewBox="0 0 24 24">
        <path d="M12 5v14" />
        <path d="m7 10 5-5 5 5" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="chat-glyph chat-glyph-bot" viewBox="0 0 24 24">
      <path d="M7 8h10v8H7z" />
      <path d="M12 5v3" />
      <path d="M9.5 11.5h.01" />
      <path d="M14.5 11.5h.01" />
      <path d="M10 14h4" />
    </svg>
  );
}
