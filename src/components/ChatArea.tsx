'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageItem } from './ChatApp';
import MessageBubble from './MessageBubble';
import ModelSelector from './ModelSelector';
import { getModel } from '@/lib/models';

interface Props {
  messages: MessageItem[];
  setMessages: React.Dispatch<React.SetStateAction<MessageItem[]>>;
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  modelId: string;
  setModelId: (id: string) => void;
  onNewChat: () => void;
  onAfterSend: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export default function ChatArea({
  messages,
  setMessages,
  activeId,
  setActiveId,
  modelId,
  setModelId,
  onNewChat,
  onAfterSend,
  sidebarOpen,
  onToggleSidebar,
}: Props) {
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const currentModel = getModel(modelId);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (taRef.current) {
      taRef.current.style.height = 'auto';
      taRef.current.style.height = Math.min(taRef.current.scrollHeight, 240) + 'px';
    }
  }, [input]);

  const send = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    setError(null);
    setInput('');
    setIsStreaming(true);

    const userMsg: MessageItem = { role: 'user', content: text };
    const placeholder: MessageItem = {
      role: 'assistant',
      content: '',
      model: modelId,
      provider: currentModel?.provider,
    };
    setMessages((prev) => [...prev, userMsg, placeholder]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: activeId,
          modelId,
          message: text,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const errBody = await res.text();
        throw new Error(errBody || 'Falha na requisição');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (!json) continue;
          try {
            const evt = JSON.parse(json);
            if (evt.type === 'meta') {
              if (evt.isNew && evt.conversationId) {
                setActiveId(evt.conversationId);
              }
            } else if (evt.type === 'delta') {
              assistantContent += evt.text;
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = {
                  ...copy[copy.length - 1],
                  content: assistantContent,
                };
                return copy;
              });
            } else if (evt.type === 'error') {
              throw new Error(evt.message);
            }
          } catch (e) {
            if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
              throw e;
            }
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(msg);
      setMessages((prev) => {
        const copy = [...prev];
        if (copy[copy.length - 1]?.role === 'assistant' && !copy[copy.length - 1].content) {
          copy.pop();
        }
        return copy;
      });
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
      onAfterSend();
    }
  };

  const stop = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <main className="flex-1 flex flex-col h-full bg-bg-primary">
      <header className="flex items-center gap-2 px-4 h-14 border-b border-white/5">
        {!sidebarOpen && (
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg hover:bg-white/5 transition"
            title="Mostrar barra"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
        )}
        <div className="font-semibold">Entur IA</div>
        <div className="ml-auto">
          <button
            onClick={onNewChat}
            className="text-sm px-3 py-1.5 rounded-lg hover:bg-white/5 transition"
          >
            + Novo chat
          </button>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
          {messages.length === 0 ? (
            <div className="text-center mt-20">
              <h1 className="text-3xl font-semibold mb-3">Entur IA</h1>
              <p className="text-text-secondary">
                Converse com GPT, Gemini ou Claude — tudo em um só lugar.
              </p>
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
                <Suggestion
                  text="Resumir um artigo"
                  hint="Cole um texto e peça um resumo executivo"
                  onClick={(t) => setInput(t)}
                />
                <Suggestion
                  text="Comparar opções"
                  hint="Peça vantagens e desvantagens lado a lado"
                  onClick={(t) => setInput(t)}
                />
                <Suggestion
                  text="Escrever código"
                  hint="Gere ou explique trechos em qualquer linguagem"
                  onClick={(t) => setInput(t)}
                />
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <MessageBubble
                key={i}
                message={m}
                streaming={isStreaming && i === messages.length - 1 && m.role === 'assistant'}
              />
            ))
          )}
          {error && (
            <div className="text-sm text-red-400 bg-red-900/20 border border-red-900/40 rounded-lg p-3">
              Erro: {error}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-white/5">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="bg-bg-input rounded-2xl border border-white/10 p-3 focus-within:border-white/20 transition">
            <textarea
              ref={taRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Pergunte algo ao Entur IA..."
              rows={1}
              className="w-full bg-transparent outline-none resize-none placeholder:text-text-tertiary text-[15px] leading-6"
              disabled={isStreaming}
            />
            <div className="flex items-center justify-between mt-2">
              <ModelSelector modelId={modelId} setModelId={setModelId} />
              {isStreaming ? (
                <button
                  onClick={stop}
                  className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center hover:bg-white/90 transition"
                  title="Parar"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={send}
                  disabled={!input.trim()}
                  className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/90 transition"
                  title="Enviar"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 19V5M5 12l7-7 7 7" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          <div className="text-xs text-text-tertiary text-center mt-2">
            Entur IA pode cometer erros. Verifique informações importantes.
          </div>
        </div>
      </div>
    </main>
  );
}

function Suggestion({
  text,
  hint,
  onClick,
}: {
  text: string;
  hint: string;
  onClick: (t: string) => void;
}) {
  return (
    <button
      onClick={() => onClick(text)}
      className="text-left p-4 rounded-xl border border-white/10 hover:bg-white/5 transition"
    >
      <div className="font-medium text-sm">{text}</div>
      <div className="text-xs text-text-tertiary mt-1">{hint}</div>
    </button>
  );
}
